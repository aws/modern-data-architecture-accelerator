/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI command baselines.
 *
 * The CLI's contract is the shell command string it emits: it resolves the config
 * hierarchy, transforms `{{...}}` references, and interpolates the result into one
 * command per module. All of that happens before any CloudFormation template exists, so
 * the golden artifact is the command rather than a synthesized template. This complements
 * the app-level template baselines under `packages/apps/(...)/test/__snapshots__/`, which
 * build their CDK context in-process and so never exercise the encode-to-argv step.
 *
 * Each `../sample_configs/sample-config-<usecase>.yaml` runs through the real CLI in
 * `--testing` mode -- which prints every command instead of executing it, so no AWS, CDK,
 * network, terraform, checkov or pip is needed -- and is diffed against the committed
 * baseline in `./__snapshots__/`.
 *
 * The baselines record current behaviour, including known defects; each is listed in the
 * header of the config that exercises it. Never hand-edit a baseline: change the CLI and
 * regenerate, so the diff evidences the change.
 *
 * Regenerate:  npm run test:update-baselines            (from packages/cli)
 * Other build: MDAA_CLI_ENTRYPOINT_OVERRIDE=/path/to/packages/cli/lib/mdaa.js npx jest ...
 */

import { compareCliBaseline, parseCliCommands } from '@aws-mdaa/testing';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** One entry per `sample_configs/sample-config-<name>.yaml`. */
interface SampleCase {
  /** Use-case name: the config filename suffix and the baseline file stem. */
  readonly name: string;
  /** MDAA action to run. Defaults to `synth`. */
  readonly action?: string;
  /** Extra CLI args (e.g. --tag for the npm dist-tag argument). */
  readonly extraArgs?: readonly string[];
  /** Extra env vars, for configs exercising `{{env_var:...}}`. */
  readonly env?: Readonly<Record<string, string>>;
}

const SAMPLE_CASES: readonly SampleCase[] = [
  { name: 'hierarchy' },
  { name: 'env-templates' },
  {
    name: 'refs',
    env: {
      MDAA_REFS_SCALAR: 'env-scalar-value',
      // Naked env_var refs holding JSON resolve to a real array, not a string.
      MDAA_REFS_JSON_LIST: '["ev-a","ev-b"]',
    },
  },
  { name: 'shell-values' },
  { name: 'orchestration' },
  // --tag populates the `--tag <dist-tag>` argument on the npm install branch.
  // --role-arn pins the `-r '<arn>'` argument: its presence, position among the other
  // cdk args, and quoting. The existing unit coverage sets role_arn but only asserts
  // `not.toThrow()`, so a regression that dropped or mis-quoted -r passes today.
  {
    name: 'npm-version',
    extraArgs: ['--tag', 'test-dist-tag', '--role-arn', 'arn:aws:iam::123456789012:role/test-deploy-role'],
  },
  // `diff` (not synth) on purpose: createTerraformCommands only appends the `-var`
  // arguments for the plan/apply actions, and TF_ACTION_MAPPINGS maps diff -> plan.
  // Under synth (-> validate) the baseline would contain the terraform/checkov
  // scaffolding but none of the config-derived -var values, which are the point.
  { name: 'terraform', action: 'diff' },
  // The cdk pushdown: `--force` is not an MDAA option, so it must survive to the end of every
  // emitted `cdk destroy`. Reuses the hierarchy config rather than adding one, since the
  // concern is how an unclaimed token renders among the other cdk args across several modules.
  // Nothing executes under --testing, so a destroy case is inert.
  { name: 'hierarchy', action: 'destroy', extraArgs: ['--force'] },
];

const SAMPLE_CONFIGS_DIR = path.join(__dirname, '..', 'sample_configs');
const BASELINES_DIR = path.join(__dirname, '__snapshots__');

/**
 * Deterministic AWS environment. These must be fixed values (not whatever the
 * developer's shell exports) or the baselines are not portable between local runs
 * and CI. Mirrors SYNTH_ENV in @aws-mdaa/testing's starter-kit harness.
 */
const SYNTH_ENV: Record<string, string> = {
  CDK_DEFAULT_ACCOUNT: 'test-account',
  CDK_DEFAULT_REGION: 'test-region',
  AWS_REGION: 'test-region',
  AWS_DEFAULT_REGION: 'test-region',
};

function getCliEntryPoint(): string {
  return process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE ?? path.join(__dirname, '..', 'lib', 'mdaa.js');
}

/**
 * On-disk assets a sample config references with a `./` path, copied into the staging dir
 * beside the config. Keyed by use-case name.
 *
 * Relative config paths are resolved by ConfigConfigPathValueTransformer against the
 * directory of the config being parsed — the staging dir, not `sample_configs/` — so an
 * asset must be staged alongside it. A `../`-relative path would resolve outside the
 * staging dir, and the CLI would emit `cp -r <nonexistent>/* …`, copying nothing.
 */
const SAMPLE_ASSETS: Readonly<Record<string, string>> = {
  // sample-config-terraform.yaml points module_path at ./tf-module.
  terraform: path.join(__dirname, 'fixtures', 'tf-module'),
};

/**
 * Stage one sample config into a temp working directory as `mdaa.yaml`, with any assets it
 * references. Running from a temp copy keeps the CLI's `.mdaa_working/` scratch output out
 * of the source tree.
 *
 * The temp dir is named `mdaa-kit-*` because that is the prefix `normalizeTemporaryPaths`
 * (applied inside `parseCliCommands`) rewrites to `/TEMP_DIR`, keeping absolute temp paths
 * out of committed baselines.
 *
 * `prepareKit` from @aws-mdaa/testing is not reused: it copies a whole kit directory and
 * applies `<YOUR_*>` placeholder substitution, which these single-file configs do not use.
 */
function stageSampleConfig(name: string): { workDir: string; configPath: string } {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `mdaa-kit-cli-${name}-`));
  const configPath = path.join(workDir, 'mdaa.yaml');
  fs.copyFileSync(path.join(SAMPLE_CONFIGS_DIR, `sample-config-${name}.yaml`), configPath);

  const assetSrc = SAMPLE_ASSETS[name];
  if (assetSrc) {
    fs.cpSync(assetSrc, path.join(workDir, path.basename(assetSrc)), { recursive: true });
  }
  return { workDir, configPath };
}

/**
 * Baseline file stem. Keyed on the action as well as the config, so one config can be exercised
 * under more than one action without the two cases overwriting each other's baseline.
 */
function baselineStem({ name, action }: SampleCase): string {
  return `cli-commands-${name}${action ? `-${action}` : ''}`;
}

// Titled by baseline stem rather than `$name`, so the two cases sharing a config are
// distinguishable in the output and each title names the file it compares against.
describe.each(SAMPLE_CASES.map(sampleCase => [baselineStem(sampleCase), sampleCase] as const))(
  'CLI command baseline: %s',
  (_stem, sampleCase) => {
    const { name, action, extraArgs, env } = sampleCase;
    test('emitted commands match baseline', () => {
      const { workDir, configPath } = stageSampleConfig(name);

      try {
        // prettier-ignore
        const proc = spawnSync( // NOSONAR
        process.execPath,
        [
          getCliEntryPoint(),
          '--action', action ?? 'synth',
          '--testing',
          // Deliberately no --nofail: it only suppresses errors from execCmd, which returns
          // before its try block in --testing mode, so it cannot change the outcome here —
          // and it would contradict the exit-status assertion below.
          '--config', configPath,
          '--working-dir', path.join(workDir, 'mdaa_working'),
          ...(extraArgs ?? []),
        ],
        {
          cwd: workDir,
          env: { ...process.env, ...SYNTH_ENV, ...env },
          encoding: 'utf-8',
          timeout: 120_000,
        },
      );

        const diagnostics = `--- stdout ---\n${proc.stdout ?? ''}\n--- stderr ---\n${proc.stderr ?? ''}`;

        // Exit status, not just command count: a config that throws partway through emission
        // still prints the earlier commands, so `length > 0` alone would pass and freeze a
        // truncated set into the baseline — ratifying a regression that drops modules.
        expect(proc.status === 0 ? '' : `CLI exited ${proc.status} for sample '${name}'.\n${diagnostics}`).toBe('');

        const commands = parseCliCommands(proc.stdout ?? '');
        // A config that fails to parse prints nothing parseable, which would otherwise
        // silently "pass" by writing an empty baseline. Assert with the CLI's own output
        // as the message so a broken sample config is diagnosable from the failure alone.
        expect(commands.length > 0 ? '' : `No commands parsed for sample '${name}'.\n${diagnostics}`).toBe('');

        // Returns null on match (or after writing a new baseline in UPDATE_BASELINES
        // mode) and a human-readable drift report otherwise, so asserting null surfaces
        // that report as the failure message.
        const drift = compareCliBaseline(
          commands,
          BASELINES_DIR,
          path.join(BASELINES_DIR, `${baselineStem(sampleCase)}.baseline.json`),
        );
        expect(drift).toBeNull();
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }, 120_000);
  },
);
