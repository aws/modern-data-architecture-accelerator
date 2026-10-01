/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Writable } from 'node:stream';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as cxapi from 'aws-cdk-lib/cx-api';
import { fullDiff, formatDifferences } from '@aws-cdk/cloudformation-diff';
import { expect, test } from '@jest/globals';
import { normalizeTemplate, stripIgnoredContent } from './diff';

const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';

/**
 * Global placeholder shape map.
 *
 * Maps a standardized placeholder token (the lowercased `<YOUR_TOKEN>` name) to a
 * generator that produces a deterministic, shape-correct test value. This exists
 * only for placeholders where the generic `test-<token>` fallback would bake a
 * malformed or meaningless value into the synthesized template (account IDs in
 * cross-account ARNs, CIDRs in WAF rules, ARNs, cron hours/rates).
 *
 * Tokens may carry a numeric suffix (`account_id`, `account_id_2`, ...) denoting a
 * distinct instance of the same type. The generator receives the 1-based index and
 * must return a distinct value per index so that, e.g., three accounts differ.
 *
 * Resolution order in resolvePlaceholder(): explicit context override → this map →
 * generic `test-<token>` fallback. To extend: add an entry here (see the
 * "Placeholder Resolution in Tests" section of starter-kit-standards.md).
 */
type ShapeGenerator = (index: number) => string;

const PLACEHOLDER_SHAPE_MAP: Record<string, ShapeGenerator> = {
  // 12-digit AWS account ids, distinct per index: 111111111111, 222222222222, ...
  account_id: index => String(index).repeat(12),
  // IPv4 CIDR blocks, distinct per index: 10.1.0.0/16, 10.2.0.0/16, ...
  cidr: index => `10.${index}.0.0/16`,
  // VPC CIDR (same shape as `cidr`; named token used by kits whose context key is `vpc_cidr`)
  vpc_cidr: index => `10.${index}.0.0/16`,
  // KMS key ARN (account segment matches account_id #1 for cross-reference realism)
  kms_arn: index => `arn:test-partition:kms:test-region:111111111111:key/test-key-${index}`,
  // Secrets Manager secret ARN. The trailing 6-character segment after the final
  // hyphen is required: Secret.fromSecretCompleteArn validates a complete ARN ends
  // with a 6-char random suffix. "testN0" keeps it deterministic and 6 chars.
  secret_arn: index => `arn:test-partition:secretsmanager:test-region:111111111111:secret:test-secret-test${index}0`,
  // Hour of day (0-23) for cron expressions; distinct per index, wrapped at 24
  hour: index => `${(index - 1) % 24}`,
  // Small positive integer (e.g. a rate/cadence)
  int: index => `${index}`,
  // Bedrock foundation model id (validated into an AWS::Bedrock model ARN). Must be
  // a real-format model id; distinct per index from a small known-valid set.
  bedrock_model_id: index => {
    const models = [
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'amazon.titan-embed-text-v2:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
    ];
    return models[(index - 1) % models.length];
  },
};

/**
 * Split a lowercased placeholder token into its base name and 1-based instance
 * index. `account_id` -> ['account_id', 1]; `account_id_2` -> ['account_id', 2].
 * A bare `_1` suffix is also treated as index 1 (e.g. `cidr_1`).
 */
export function parsePlaceholderToken(token: string): { base: string; index: number } {
  const match = /^(.*?)_(\d+)$/.exec(token);
  if (match) {
    return { base: match[1], index: Number.parseInt(match[2], 10) };
  }
  return { base: token, index: 1 };
}

/**
 * Resolve a single `<YOUR_TOKEN>` placeholder to a test value.
 * Order: explicit context override → global shape map → generic `test-<token>`.
 */
export function resolvePlaceholder(token: string, context: Record<string, string>): string {
  if (context[token] !== undefined) {
    return context[token];
  }
  const { base, index } = parsePlaceholderToken(token);
  const generator = PLACEHOLDER_SHAPE_MAP[base];
  if (generator) {
    return generator(index);
  }
  return `test-${token.replace(/_/g, '-')}`;
}

/**
 * Replace all <YOUR_...> placeholders in YAML files with test values,
 * and uncomment CDK Nag suppression blocks.
 */
export function preprocessKitConfigs(kitDir: string, context: Record<string, string>): void {
  const yamlFiles = findFiles(kitDir, /\.(yaml|yml)$/);

  for (const file of yamlFiles) {
    let content = fs.readFileSync(file, 'utf-8');

    // Replace <YOUR_...> placeholders with test values
    // prettier-ignore
    content = content.replace(/<YOUR_([A-Z0-9_]+)>/g, (_match, key) => { // NOSONAR
      return resolvePlaceholder(key.toLowerCase(), context);
    });

    // Uncomment CDK Nag suppressions
    // prettier-ignore
    content = content.replace(/^(\s*)# (suppressions:)/gm, '$1$2'); // NOSONAR
    // prettier-ignore
    content = content.replace(/^(\s*)# {3}(- id:.*)/gm, '$1  $2'); // NOSONAR
    // prettier-ignore
    content = content.replace(/^(\s*)# {5}(reason:.*)/gm, '$1    $2'); // NOSONAR

    fs.writeFileSync(file, content);
  }
}

export function findFiles(dir: string, pattern: RegExp, excludeDirs: string[] = ['node_modules', 'test']): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
      results.push(...findFiles(fullPath, pattern, excludeDirs));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function normalizeTemporaryPaths(json: string): string {
  // Strip temp directory paths — everything up to and including the mdaa-kit-<name> segment
  // Handles /tmp/, /private/tmp/, /var/folders/... across macOS and Linux
  //
  // The match begins at a quote or `/` and runs up to the `mdaa-kit-<name>` segment,
  // so the character class has to stop it from running THROUGH surrounding command
  // text into a later path. Two exclusions beyond the quotes:
  //
  //   `=`  keeps the key prefix of a CDK context argument. Without it,
  //        `-c 'key=/var/folders/.../mdaa-kit-x/file'` matches from the opening quote
  //        through `key=` and collapses to `-c '/TEMP_DIR/file'`, losing which
  //        context key was being set.
  //   `\s` keeps whole commands intact when one temp path is followed by another.
  //        Without it, `export PYTHONPATH='<tmp>/python' && <tmp>/python/bin/checkov
  //        -d <tmp>/terraform/m` matches from the CLOSING quote across ` && ` into the
  //        second path, deleting `&& `, `bin/checkov`, `-d` and every following flag —
  //        silently dropping the entire checkov invocation from the baseline.
  //
  // A space inside a quoted path (e.g. `'…/config dir with spaces/roles.yaml'`) is
  // unaffected: that match starts at the OPENING quote and reaches `mdaa-kit-` before
  // any space, so the excluded `\s` is never encountered.
  // prettier-ignore
  let normalized = json.replace(/['"/][^'"=\s]*\/mdaa-kit-[a-zA-Z0-9_-]+/g, match => { // NOSONAR
    const prefix = match[0];
    return prefix === '/' ? '/TEMP_DIR' : `${prefix}/TEMP_DIR`;
  });
  // Strip the repo root path from CLI commands (varies between local dev and CI)
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  normalized = normalized.split(repoRoot).join('/REPO_ROOT');
  // Normalize CDK file-asset content hashes in S3 asset URLs (e.g. SMUS blueprint
  // product template_source_url). The hash is computed over un-normalized template
  // content (including version strings), so it drifts across environments even when
  // the meaningful content is identical. The product template itself is diffed
  // directly, so the content is still validated.
  // prettier-ignore
  normalized = normalized.replace(/(cdk-[a-z0-9]+-assets-[^/'"]*\/)[a-f0-9]{64}(\.(?:json|yaml|zip))/g, '$1ASSET_HASH$2'); // NOSONAR
  return normalized;
}

export interface StarterKitTestOptions {
  readonly ignoreResourcePatterns?: string[];
  readonly ignoreResourceProperties?: Record<string, string[]>;
  /**
   * CDK context values to pre-seed into the synth subprocess via CDK_CONTEXT_JSON.
   * Use this to satisfy context-provider lookups (e.g. SSM `valueFromLookup`) that
   * would otherwise record a "missing context" entry and cause the diff toolkit to
   * reject the assembly. Keys must match CDK's provider cache key format, e.g.
   * `ssm:account=<acct>:parameterName=<path>:region=<region>`.
   */
  readonly cdkContext?: Record<string, string>;
}

export interface StarterKitTestContext {
  [key: string]: string;
}

/** Resolve the on-disk source and baselines directories for a kit. */
export function resolveKitDirs(kitName: string): { kitSrc: string; baselinesDir: string } {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const kitSrc = path.join(repoRoot, 'starter_kits', kitName);
  // Test artifacts (diff test files + baselines) live under the single
  // @aws-mdaa/starter-kits package at starter_kits/test/<kit>/, keeping the kit
  // source directories limited to shippable configuration.
  const baselinesDir = path.join(repoRoot, 'starter_kits', 'test', kitName, 'baselines');
  return { kitSrc, baselinesDir };
}

/**
 * Prepare a temp copy of the kit with placeholders replaced.
 * Returns the temp dir path (caller must clean up).
 */
export function prepareKit(
  kitName: string,
  context: StarterKitTestContext,
  kitSrc: string = resolveKitDirs(kitName).kitSrc,
): { workDir: string; kitWorkDir: string } {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `mdaa-kit-${kitName}-`));
  const kitWorkDir = path.join(workDir, kitName);

  fs.cpSync(kitSrc, kitWorkDir, {
    recursive: true,
    filter: src => !src.includes('/test/') && !src.includes('/node_modules/'),
  });
  preprocessKitConfigs(kitWorkDir, { org_name: 'test-org', ...context });

  return { workDir, kitWorkDir };
}

function getCliEntryPoint(): string {
  if (process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE) {
    return process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE;
  }
  /* istanbul ignore next */
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  /* istanbul ignore next */
  return path.join(repoRoot, 'packages', 'cli', 'lib', 'mdaa.js');
}

/**
 * Resolve the path to the synth-setup file to inject via NODE_OPTIONS=--require.
 *
 * The setup is authored in TypeScript (starter-kit-synth-setup.ts) so it is
 * type-checked, linted, and license-header managed like the rest of the package.
 * The standard tsc build compiles it to a sibling .js (gitignored like all lib
 * output), which is what --require loads since Node cannot require .ts directly.
 * This path already depends on the build (getCliEntryPoint resolves the compiled
 * CLI, and consumers import the package via its compiled main), so relying on the
 * compiled sibling here introduces no new build-order assumption.
 */
function getSynthSetupPath(): string {
  return path.join(__dirname, 'starter-kit-synth-setup.js');
}

/**
 * Placeholder region for kits whose `region` is `default`. A kit that pins a concrete
 * `region` still synthesizes in it, because the CLI's own CDK_DEPLOY_REGION export
 * overrides this one inside the synth shell, so its baselines carry real region and
 * partition values.
 */
const SYNTH_ENV = {
  CDK_DEPLOY_REGION: 'test-region',
  CDK_DEFAULT_REGION: 'test-region',
  AWS_REGION: 'test-region',
  AWS_DEFAULT_REGION: 'test-region',
};

/**
 * 15-minute cap on a single module synth, shared by the `spawnSync` timeout and the jest
 * timeout of the test that drives it. The etl-job synth normally completes in ~50s, but
 * under heavy CI runner contention it can balloon past a tighter cap and get SIGTERM'd
 * (spawnSync returns `status: null`), producing a flaky failure. 900s gives generous
 * headroom while still bounding a genuinely hung synth.
 *
 * One constant for both so the jest timeout cannot drift below the subprocess timeout —
 * jest would then kill the test first, and the "killed by SIGTERM (ETIMEDOUT)" diagnostic
 * in {@link synthFailureMessage} would never be reached.
 */
export const SYNTH_TIMEOUT_MS = 900_000;

/**
 * Discover the directory the CDK CLI runs from for a given module by invoking
 * mdaa in --testing mode (which prints the command it would run, prefixed with
 * `cd '<modulePath>' && npx cdk synth ...`) without executing any synth.
 * CDK reads cdk.context.json from this directory.
 *
 * The action verb may be quoted (`cdk 'synth'`) or bare (`cdk synth`) depending on how
 * the CLI assembles the command, so the match accepts either.
 */
export function discoverModuleCdkDir(
  kitWorkDir: string,
  mdaaWorkingDir: string,
  cdkAccount: string,
  extraArgs: string,
): string | undefined {
  const cliEntryPoint = getCliEntryPoint();
  // prettier-ignore
  const probe = spawnSync( // NOSONAR
    process.execPath,
    [cliEntryPoint, '--action', 'synth', '--testing', '--nofail', '--config', path.join(kitWorkDir, 'mdaa.yaml'), '--working-dir', mdaaWorkingDir, ...extraArgs.split(' ').filter(Boolean)],
    {
      cwd: kitWorkDir,
      env: { ...process.env, CDK_DEFAULT_ACCOUNT: cdkAccount, ...SYNTH_ENV },
      encoding: 'utf-8',
      timeout: 120_000,
    },
  );
  const output = `${probe.stdout ?? ''}`;
  // Match the cd that immediately precedes the `npx ... cdk synth` invocation. The verb
  // is optionally single-quoted, which is a shell no-op but changes the text.
  const match = /cd '([^']+)'\s*&&\s*npx[^\n]*cdk '?synth'?/.exec(output);
  return match?.[1];
}

/**
 * Seed CDK context-provider lookups (e.g. SSM valueFromLookup) into the module's
 * cdk.context.json so synth resolves them from cache instead of recording "missing
 * context" entries that the diff toolkit rejects. CDK reads cdk.context.json from
 * the directory it runs in, discovered via --testing. Returns the seeded file path
 * (for later cleanup) or undefined when no seeding was needed.
 */
export function seedCdkContext(
  kitWorkDir: string,
  mdaaWorkingDir: string,
  cdkAccount: string,
  extraArgs: string,
  cdkContext?: Record<string, string>,
): string | undefined {
  if (!cdkContext || Object.keys(cdkContext).length === 0) {
    return undefined;
  }
  const moduleCdkDir = discoverModuleCdkDir(kitWorkDir, mdaaWorkingDir, cdkAccount, extraArgs);
  if (!moduleCdkDir) {
    throw new Error(`Could not determine module CDK directory for context seeding (args: ${extraArgs}).`);
  }
  const contextFile = path.join(moduleCdkDir, 'cdk.context.json');
  const existing = fs.existsSync(contextFile)
    ? (JSON.parse(fs.readFileSync(contextFile, 'utf-8')) as Record<string, string>)
    : undefined;
  fs.writeFileSync(contextFile, JSON.stringify({ ...existing, ...cdkContext }, null, 2));
  return contextFile;
}

/** Build the failure message for a non-zero mdaa synth exit. */
export function synthFailureMessage(
  result: {
    status: number | null;
    stderr?: Buffer | null;
    stdout?: Buffer | null;
    /**
     * Set when the child was killed — SIGTERM for a spawnSync timeout, SIGKILL for an OOM kill.
     * Derived from `SpawnSyncReturns` rather than written as `NodeJS.Signals`: that namespace is
     * a type-only global from `@types/node`, invisible to eslint's scope analysis, so naming it
     * directly trips `no-undef`.
     */
    signal?: SpawnSyncReturns<Buffer>['signal'];
    /** Set when the child could not be spawned, or `ETIMEDOUT` when the timeout fired */
    error?: Error & { code?: string };
  },
  kitWorkDir: string,
  extraArgs: string,
): string {
  // mdaa runs the cdk child with stdio:'inherit', so the real CDK error is mixed
  // into stdout/stderr ahead of mdaa's own "=== End Error Details ===" block and the
  // re-thrown Node stack trace. Capture a generous tail of both so the underlying
  // cause (not just the trailing wrapper) is visible in CI logs.
  const stderr = result.stderr ? result.stderr.toString().slice(-8000) : '';
  const stdout = result.stdout ? result.stdout.toString().slice(-8000) : '';
  // `status: null` on its own cannot tell a timeout from an OOM kill: a spawnSync timeout
  // reports SIGTERM with error.code ETIMEDOUT, while the runner's memory limit reports
  // SIGKILL. Raising the timeout only helps the former, so the message has to say which.
  const errorCode = result.error?.code ? ` (${result.error.code})` : '';
  const killedBy = `killed by ${result.signal ?? 'unknown signal'}${errorCode}`;
  const cause = result.signal || result.error ? killedBy : `exit ${result.status}`;
  const hint =
    result.signal === 'SIGKILL' && !result.error?.code
      ? '  Hint: SIGKILL with no ETIMEDOUT is an out-of-memory kill, not a timeout — raise ' +
        'KUBERNETES_MEMORY_LIMIT for this kit rather than the synth timeout.\n'
      : '';
  return (
    `CDK synth failed (${cause}):\n` +
    `  Command: mdaa synth ${extraArgs}\n` +
    `  Working dir: ${kitWorkDir}\n` +
    hint +
    (stderr ? `  stderr (tail):\n${stderr}\n` : '') +
    (stdout ? `  stdout (tail):\n${stdout}\n` : '')
  );
}

export function runMdaaCli(
  kitWorkDir: string,
  workDir: string,
  context: StarterKitTestContext,
  extraArgs: string = '',
  cdkContext?: Record<string, string>,
): void {
  const cliEntryPoint = getCliEntryPoint();
  const synthSetup = getSynthSetupPath();
  const mdaaWorkingDir = path.join(workDir, 'mdaa_working');
  const cdkAccount = context._cdk_default_account || 'test-account';

  const seededContextFile = seedCdkContext(kitWorkDir, mdaaWorkingDir, cdkAccount, extraArgs, cdkContext);

  try {
    // Note: --nofail is intentionally NOT passed. In the real synth path we want a
    // CDK synth failure to surface its error (captured in stderr) and fail the test,
    // rather than being swallowed by mdaa (which would exit 0 and produce no cloud
    // assembly, manifesting later as a confusing "No cloud assembly found" error).
    // prettier-ignore
    const result = spawnSync( // NOSONAR
      process.execPath,
      [cliEntryPoint, '--action', 'synth', '--config', path.join(kitWorkDir, 'mdaa.yaml'), '--working-dir', mdaaWorkingDir, ...extraArgs.split(' ').filter(Boolean)],
      {
        cwd: kitWorkDir,
        env: {
          ...process.env,
          CDK_DEFAULT_ACCOUNT: cdkAccount,
          ...SYNTH_ENV,
          NODE_OPTIONS: `--require "${synthSetup}"`,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: SYNTH_TIMEOUT_MS,
      },
    );

    if (result.status !== 0) {
      throw new Error(synthFailureMessage(result, kitWorkDir, extraArgs));
    }
  } finally {
    // Remove the seeded cache so it does not leak into other tests sharing the module dir.
    if (seededContextFile && fs.existsSync(seededContextFile)) {
      fs.rmSync(seededContextFile, { force: true });
    }
  }
}

/** Compare current commands against baseline and produce meaningful diff descriptions. */
export function diffCliCommands(
  current: Array<{ index: number; command: string }>,
  baseline: Array<{ index: number; command: string }>,
): string[] {
  const diffs: string[] = [];
  const maxLen = Math.max(current.length, baseline.length);

  for (let i = 0; i < maxLen; i++) {
    const curr = current[i];
    const base = baseline[i];

    if (!base && curr) {
      diffs.push(`  + [${i}] ADDED:\n    ${curr.command}`);
    } else if (!curr && base) {
      diffs.push(`  - [${i}] REMOVED:\n    ${base.command}`);
    } else if (curr && base && curr.command !== base.command) {
      diffs.push(`  ~ [${i}] CHANGED:\n    was: ${base.command}\n    now: ${curr.command}`);
    }
  }

  return diffs;
}

/**
 * Parse mdaa --testing stdout into the structured, normalized command list.
 *
 * mdaa prints each CDK command across multiple physical lines joined with the
 * separator `' \\\n\t'` (see MdaaDeploy.createCdkCommand). A logical command
 * therefore starts on a line beginning with `npx`/`cd ` and continues on the
 * following tab-indented lines for as long as the previous line ends with a
 * trailing backslash. Those continuation lines carry the meaningful CDK context
 * (`-c 'org=...'`, `module_config_data`, `permissions_boundary_arn`, role ARNs,
 * etc.), so they must be folded into one logical command before diffing —
 * otherwise the baseline only captures the first line and cannot detect drift in
 * any context parameter.
 *
 * A logical command is recognised by its leading token — see {@link COMMAND_OPENERS}.
 * Any emitted command whose opener is not listed there is SILENTLY DROPPED from the
 * baseline, which under-records the CLI's actual behaviour, so the list must cover
 * every shape mdaa can print.
 */

/**
 * Leading tokens that begin a logical command in `mdaa --testing` output.
 *
 * `npx` / `cd ` cover the CDK path (`cd '<modulePath>' && npx cdk ...`) and the local
 * lerna build. The other two exist because the CLI has paths the starter kits never
 * take, so they would otherwise vanish from a baseline:
 *
 *   `mkdir ` — the NPM-install branch of prepNpmPackage emits
 *              `mkdir -p '<prefix>' && npm install ... '<package>@<version>'`, the only
 *              place the resolved `mdaa_version` is composed into a package specifier.
 *              Starter kits all resolve to local workspace packages, so they never
 *              emit it.
 *   `cp `    — createModuleTfWorkingConfig emits `cp -r <modulePath>/* <workingDir>`
 *              when staging a Terraform module. This is the ONLY place the configured
 *              Terraform `module_path` appears in a command, so without it a broken or
 *              changed module source is invisible.
 */
const COMMAND_OPENERS = ['npx', 'cd ', 'mkdir ', 'cp '] as const;
export function parseCliCommands(output: string): Array<{ index: number; command: string }> {
  const commands: Array<{ index: number; command: string }> = [];
  let index = 0;
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('Testing Mode:')) {
      continue;
    }
    if (COMMAND_OPENERS.some(opener => trimmed.startsWith(opener))) {
      // Fold backslash-continued lines into a single logical command. Strip the
      // trailing backslash from each continued segment and the leading tabs from
      // the next, joining with a single space for a stable, readable baseline.
      let command = trimmed;
      while (command.endsWith('\\') && i + 1 < lines.length) {
        command = command.slice(0, -1).trimEnd();
        i += 1;
        command = `${command} ${lines[i].trim()}`;
      }
      // Strip any trailing backslash left when the command ends the output with
      // no following continuation line (defensive — real mdaa output always has one).
      if (command.endsWith('\\')) {
        command = command.slice(0, -1).trimEnd();
      }
      commands.push({ index: index++, command: normalizeTemporaryPaths(command) });
    }
  }
  return commands;
}

/**
 * Compare parsed commands against a committed baseline file. Writes the baseline on
 * first run or in UPDATE_BASELINES mode. Returns a drift error message, or null when
 * the baseline matches (or was just written).
 */
export function compareCliBaseline(
  commands: Array<{ index: number; command: string }>,
  baselinesDir: string,
  baselineFile: string,
): string | null {
  const normalizedJson = JSON.stringify(commands, null, 2);
  fs.mkdirSync(baselinesDir, { recursive: true });

  const baselineExists = fs.existsSync(baselineFile);
  if (!baselineExists || UPDATE_BASELINES) {
    fs.writeFileSync(baselineFile, normalizedJson + '\n');
    console.log(`[baseline-${baselineExists ? 'updated' : 'created'}] ${baselineFile}`);
    return null;
  }

  const baselineJson = fs.readFileSync(baselineFile, 'utf-8').trim();
  if (normalizedJson === baselineJson) return null;

  const current = JSON.parse(normalizedJson) as Array<{ index: number; command: string }>;
  const baseline = JSON.parse(baselineJson) as Array<{ index: number; command: string }>;
  const diffs = diffCliCommands(current, baseline);

  return (
    `CLI command baseline has drifted (${diffs.length} difference(s)):\n\n` +
    `${diffs.join('\n\n')}\n\n` +
    `  Baseline: ${baselineFile}\n` +
    `  Run UPDATE_BASELINES=true npm test to accept changes.`
  );
}

/**
 * Test 1: CLI command baseline.
 * Runs mdaa in --testing mode (no CDK execution), captures the commands
 * it would run, and diffs against a committed baseline.
 *
 * Integration entry point: composes unit-tested helpers (prepareKit,
 * parseCliCommands, compareCliBaseline) and spawns the real mdaa CLI. It is
 * exercised end-to-end by each kit's *.diff.test.ts, so the test()-registration
 * body is excluded from unit coverage.
 */
/* istanbul ignore next */
export function baselineCliCommands(kitName: string, context: StarterKitTestContext): void {
  const { baselinesDir } = resolveKitDirs(kitName);
  const baselineFile = path.join(baselinesDir, 'cli-commands.baseline.json');

  test('CLI command baseline', () => {
    const { workDir, kitWorkDir } = prepareKit(kitName, context);

    try {
      const cliEntryPoint = getCliEntryPoint();
      const mdaaWorkingDir = path.join(workDir, 'mdaa_working');

      // prettier-ignore
      const proc = spawnSync( // NOSONAR
        process.execPath,
        [cliEntryPoint, '--action', 'synth', '--testing', '--nofail', '--config', path.join(kitWorkDir, 'mdaa.yaml'), '--working-dir', mdaaWorkingDir],
        {
          cwd: kitWorkDir,
          env: { ...process.env, CDK_DEFAULT_ACCOUNT: 'test-account', ...SYNTH_ENV },
          encoding: 'utf-8',
          timeout: 120_000,
        },
      );

      const commands = parseCliCommands(proc.stdout ?? '');
      expect(commands.length).toBeGreaterThan(0);

      const drift = compareCliBaseline(commands, baselinesDir, baselineFile);
      if (drift) {
        throw new Error(drift);
      }
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);
}

/**
 * Render a human-readable, ANSI-free diff between a baseline template and the
 * current synthesized template (read from disk). Used to enrich baseline-drift
 * failure messages so the actual changed resources/properties are visible in CI
 * logs (the toolkit's own diff dump is suppressed via logLevel 'error').
 * Returns an indented diff block, or '' if it can't be produced.
 */
export function renderTemplateDiff(baselineFile: string, currentTemplateFile: string): string {
  try {
    const baselineTemplate = JSON.parse(fs.readFileSync(baselineFile, 'utf-8')) as Record<string, unknown>;
    const currentTemplate = JSON.parse(fs.readFileSync(currentTemplateFile, 'utf-8')) as Record<string, unknown>;
    const diff = fullDiff(baselineTemplate, currentTemplate);

    let captured = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        captured += chunk.toString();
        callback();
      },
    });
    formatDifferences(sink, diff);

    // Strip ANSI color codes for clean CI logs and indent under the message.
    // Build the escape-sequence pattern without a literal control char in source.
    const ansiPattern = new RegExp(String.raw`${String.fromCodePoint(27)}\[[0-9;]*m`, 'g');
    const plain = captured.replace(ansiPattern, '').trimEnd();
    if (!plain) return '';
    return plain
      .split('\n')
      .map(line => `    ${line}`)
      .join('\n');
  } catch {
    // Diagnostics are best-effort; never let rendering failure mask the drift.
    return '';
  }
}

/**
 * Diff a non-selectable template file (nested CfnStack asset, SMUS blueprint
 * product) against its baseline using CDK's semantic diff engine.
 * Returns a failure message if drifted.
 */
export function diffTemplateFile(templateFile: string, baselineFile: string): string | null {
  const currentJson = fs.readFileSync(templateFile, 'utf-8').trim();

  const baselineExists = fs.existsSync(baselineFile);
  if (!baselineExists || UPDATE_BASELINES) {
    fs.writeFileSync(baselineFile, currentJson + '\n');
    console.log(`[baseline-${baselineExists ? 'updated' : 'created'}] ${baselineFile}`);
    return null;
  }

  const baselineTemplate = JSON.parse(fs.readFileSync(baselineFile, 'utf-8')) as Record<string, unknown>;
  const currentTemplate = JSON.parse(currentJson) as Record<string, unknown>;
  const diff = fullDiff(baselineTemplate, currentTemplate);

  // Match the stack-level diff behavior: only resource and output differences are
  // failures. Metadata, parameters, conditions, and mappings are ignored.
  const resourceDiffs = diff.resources.differenceCount;
  const outputDiffs = diff.outputs.differenceCount;
  if (resourceDiffs + outputDiffs === 0) return null;

  const renderedDiff = renderTemplateDiff(baselineFile, templateFile);

  return (
    `Template "${path.basename(templateFile)}" has ${resourceDiffs} resource and ` +
    `${outputDiffs} output difference(s) from baseline.\n` +
    (renderedDiff ? `${renderedDiff}\n` : '') +
    `  Baseline: ${baselineFile}\n` +
    `  Run UPDATE_BASELINES=true npm test to accept changes.`
  );
}

/** Diff a single stack against its baseline, returning a failure message if drifted. */
export async function diffStack(
  toolkit: InstanceType<typeof import('@aws-cdk/toolkit-lib').Toolkit>,
  source: unknown,
  DiffMethod: typeof import('@aws-cdk/toolkit-lib').DiffMethod,
  stack: { hierarchicalId: string; stackName: string; templateFullPath: string },
  baselineFile: string,
): Promise<string | null> {
  const writeBaseline = (label: string): void => {
    const normalized = JSON.parse(fs.readFileSync(stack.templateFullPath, 'utf-8'));
    fs.writeFileSync(baselineFile, JSON.stringify(normalized, null, 2) + '\n');
    console.log(`[baseline-${label}] ${baselineFile}`);
  };

  const baselineExists = fs.existsSync(baselineFile);
  if (!baselineExists || UPDATE_BASELINES) {
    writeBaseline(baselineExists ? 'updated' : 'created');
    return null;
  }

  const result = await toolkit.diff(source as Parameters<typeof toolkit.diff>[0], {
    method: DiffMethod.LocalFile(baselineFile),
    stacks: { strategy: 'pattern-must-match-single' as never, patterns: [stack.hierarchicalId] },
  });

  const stackDiff = result[stack.stackName];
  if (!stackDiff) return null;

  const resourceDiffs = stackDiff.resources.differenceCount;
  const outputDiffs = stackDiff.outputs.differenceCount;
  if (resourceDiffs + outputDiffs === 0) return null;

  const renderedDiff = renderTemplateDiff(baselineFile, stack.templateFullPath);

  return (
    `Stack "${stack.stackName}" has ${resourceDiffs} resource and ${outputDiffs} output difference(s).\n` +
    (renderedDiff ? `${renderedDiff}\n` : '') +
    `  Baseline: ${baselineFile}\n` +
    `  Run UPDATE_BASELINES=true npm test to accept changes.`
  );
}

/** Normalize all template files in an assembly dir in place (strip versions, ignored content, temp paths). */
export function normalizeAssemblyTemplates(templateFiles: string[], options?: StarterKitTestOptions): void {
  for (const templateFile of templateFiles) {
    const raw = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
    const normalized = stripIgnoredContent(
      normalizeTemplate(raw),
      options?.ignoreResourcePatterns,
      options?.ignoreResourceProperties,
    );
    const stableJson = normalizeTemporaryPaths(JSON.stringify(normalized, null, 2));
    fs.writeFileSync(templateFile, stableJson);
  }
}

/**
 * Diff every selectable stack in the assembly (by hierarchicalId) plus any remaining
 * non-selectable template files (nested CfnStack assets, SMUS blueprint products)
 * against their committed baselines. Returns the list of drift failure messages.
 */
export async function diffAssembly(
  assemblyDir: string,
  baselinesDir: string,
  templateFiles: string[],
  toolkit: InstanceType<typeof import('@aws-cdk/toolkit-lib').Toolkit>,
  source: unknown,
  DiffMethod: typeof import('@aws-cdk/toolkit-lib').DiffMethod,
): Promise<string[]> {
  fs.mkdirSync(baselinesDir, { recursive: true });
  const assembly = new cxapi.CloudAssembly(assemblyDir);
  const failures: string[] = [];

  const diffedTemplatePaths = new Set<string>();
  for (const stackArtifact of assembly.stacksRecursively) {
    const baselineName = path.basename(stackArtifact.templateFullPath, '.template.json');
    const baselineFile = path.join(baselinesDir, `${baselineName}.baseline.json`);
    diffedTemplatePaths.add(path.resolve(stackArtifact.templateFullPath));
    const failure = await diffStack(
      toolkit,
      source,
      DiffMethod,
      {
        hierarchicalId: stackArtifact.hierarchicalId,
        stackName: stackArtifact.stackName,
        templateFullPath: stackArtifact.templateFullPath,
      },
      baselineFile,
    );
    if (failure) failures.push(failure);
  }

  // Template files that are not selectable cloud-assembly stacks (e.g. nested
  // CfnStack assets, SMUS blueprint product templates) cannot be diffed via the
  // toolkit. Compare them directly so their coverage is preserved.
  for (const templateFile of templateFiles) {
    if (diffedTemplatePaths.has(path.resolve(templateFile))) continue;
    const baselineName = path.basename(templateFile, '.template.json');
    const baselineFile = path.join(baselinesDir, `${baselineName}.baseline.json`);
    const failure = diffTemplateFile(templateFile, baselineFile);
    if (failure) failures.push(failure);
  }

  return failures;
}

/**
 * Test 2: Per-module synth baseline.
 * Runs mdaa synth for a single module and diffs the template against baseline
 * using CDK's semantic diff engine (same as module-level baselineDiffTestApp).
 *
 * Integration entry point: composes unit-tested helpers (prepareKit, runMdaaCli,
 * findAssemblyDir, normalizeAssemblyTemplates, diffAssembly) and runs a real CDK
 * synth + toolkit diff. It is exercised end-to-end by each kit's *.diff.test.ts,
 * so the test()-registration body is excluded from unit coverage.
 */
/* istanbul ignore next */
export function baselineModuleSynth(
  kitName: string,
  domain: string,
  module: string,
  context: StarterKitTestContext,
  options?: StarterKitTestOptions,
): void {
  const { baselinesDir } = resolveKitDirs(kitName);

  const runBaseline = async () => {
    const { Toolkit, DiffMethod, NonInteractiveIoHost } = await import('@aws-cdk/toolkit-lib');
    const { workDir, kitWorkDir } = prepareKit(kitName, context);

    try {
      const mdaaWorkingDir = path.join(workDir, 'mdaa_working');
      runMdaaCli(kitWorkDir, workDir, context, `--domain ${domain} --module ${module}`, options?.cdkContext);

      const assemblyDir = findAssemblyDir(mdaaWorkingDir);
      if (!assemblyDir) {
        throw new Error(
          `No cloud assembly found in ${mdaaWorkingDir}. ` +
            `Module ${domain}/${module} may not produce a CloudFormation stack.`,
        );
      }

      const templateFiles = findFiles(assemblyDir, /\.template\.json$/, []);
      expect(templateFiles.length).toBeGreaterThan(0);
      normalizeAssemblyTemplates(templateFiles, options);

      // logLevel 'error' suppresses the toolkit's verbose diff dump (the IAM
      // security-change table) — we compute and report our own concise diff
      // summary, so the human-readable diff would only be noise in CI logs.
      const ioHost = new NonInteractiveIoHost({ isCI: true, logLevel: 'error' });
      const toolkit = new Toolkit({ ioHost });
      const source = await toolkit.fromAssemblyDirectory(assemblyDir);

      const failures = await diffAssembly(assemblyDir, baselinesDir, templateFiles, toolkit, source, DiffMethod);
      if (failures.length > 0) {
        throw new Error(`${failures.length} baseline diff(s):\n\n${failures.join('\n\n')}`);
      }
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  };

  // The same constant as the runMdaaCli spawnSync cap, so jest cannot kill the test before
  // the synth subprocess timeout fires on a genuinely hung synth — and the two cannot drift.
  test(`${domain}/${module} synth baseline`, runBaseline, SYNTH_TIMEOUT_MS);
}

/** Find the cloud assembly directory (deepest directory containing manifest.json). */
export function findAssemblyDir(baseDir: string): string | null {
  if (!fs.existsSync(baseDir)) return null;

  function walk(dir: string): string | null {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === 'manifest.json') return dir;
      if (entry.isDirectory()) {
        const found = walk(fullPath);
        if (found) return found;
      }
    }
    return null;
  }

  return walk(baseDir);
}
