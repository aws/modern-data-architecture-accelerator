/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  normalizeTemporaryPaths,
  diffCliCommands,
  synthFailureMessage,
  diffTemplateFile,
  renderTemplateDiff,
  findFiles,
  findAssemblyDir,
  preprocessKitConfigs,
  prepareKit,
  resolveKitDirs,
  parseCliCommands,
  compareCliBaseline,
  discoverModuleCdkDir,
  seedCdkContext,
  runMdaaCli,
  diffStack,
  diffAssembly,
  normalizeAssemblyTemplates,
  parsePlaceholderToken,
  resolvePlaceholder,
} from '../lib/starter-kit-diff';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-unit-'));
  delete process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE;
});

describe('normalizeTemporaryPaths', () => {
  test('replaces mdaa-kit temp dir paths with /TEMP_DIR', () => {
    const input = JSON.stringify({ path: '/var/folders/xx/mdaa-kit-basic_datalake-AbC123/foo' });
    const result = normalizeTemporaryPaths(input);
    expect(result).toContain('/TEMP_DIR/foo');
    expect(result).not.toContain('mdaa-kit-basic_datalake-AbC123');
  });

  test('preserves the context key prefix of a -c key=<temp path> argument', () => {
    // Regression: the match starts at the opening quote, so a character class of
    // [^'"] greedily consumed `naming_module=` and rewrote the whole argument to
    // `-c '/TEMP_DIR/naming.js'`, losing which context key was being set.
    const input = "-c 'naming_module=/var/folders/xx/mdaa-kit-cli-shell-values-AbC123/naming.js'";
    const result = normalizeTemporaryPaths(input);
    expect(result).toBe("-c 'naming_module=/TEMP_DIR/naming.js'");
  });

  test('does not swallow command text between two temp paths', () => {
    // Regression: the match can start at a CLOSING quote, so without `\s` excluded it
    // ran across ` && ` into the next absolute path — deleting `bin/checkov`, `-d` and
    // every following flag, which silently dropped the whole checkov invocation
    // (and the terraform `--out tfplan.binary` path) from the terraform baseline.
    const tmp = '/var/folders/xx/mdaa-kit-cli-terraform-AbC123/.mdaa_working';
    const input = `export PYTHONPATH='${tmp}/python' && ${tmp}/python/bin/checkov -d ${tmp}/terraform/m --quiet`;
    expect(normalizeTemporaryPaths(input)).toBe(
      "export PYTHONPATH='/TEMP_DIR/.mdaa_working/python' && /TEMP_DIR/.mdaa_working/python/bin/checkov " +
        '-d /TEMP_DIR/.mdaa_working/terraform/m --quiet',
    );
  });

  test('normalizes a quoted temp path that itself contains spaces', () => {
    // The `\s` exclusion must not break paths with spaces: that match starts at the
    // OPENING quote and reaches `mdaa-kit-` before any space.
    const input = '-c \'module_configs="/var/folders/xx/mdaa-kit-cli-shell-values-AbC123/dir with spaces/r.yaml"\'';
    expect(normalizeTemporaryPaths(input)).toBe('-c \'module_configs="/TEMP_DIR/dir with spaces/r.yaml"\'');
  });

  test('normalizes CDK file-asset content hashes in S3 asset URLs', () => {
    const hash = 'a'.repeat(64);
    const input = `https://s3.test-region.amazonaws.com/cdk-hnb659fds-assets-111111111111-test-region/${hash}.json`;
    const result = normalizeTemporaryPaths(input);
    expect(result).toContain('cdk-hnb659fds-assets-111111111111-test-region/ASSET_HASH.json');
    expect(result).not.toContain(hash);
  });

  test('normalizes .zip and .yaml asset extensions', () => {
    const hash = 'b'.repeat(64);
    expect(normalizeTemporaryPaths(`cdk-x-assets-acct-region/${hash}.zip`)).toContain('ASSET_HASH.zip');
    expect(normalizeTemporaryPaths(`cdk-x-assets-acct-region/${hash}.yaml`)).toContain('ASSET_HASH.yaml');
  });

  test('leaves content without temp paths or asset hashes unchanged', () => {
    const input = JSON.stringify({ Resources: { Bucket: { Type: 'AWS::S3::Bucket' } } });
    expect(normalizeTemporaryPaths(input)).toBe(input);
  });

  test('does not normalize hashes that are not 64 hex chars', () => {
    const input = 'cdk-x-assets-acct-region/short123.json';
    expect(normalizeTemporaryPaths(input)).toBe(input);
  });
});

describe('diffCliCommands', () => {
  const cmd = (index: number, command: string) => ({ index, command });

  test('returns no diffs for identical command lists', () => {
    const a = [cmd(0, 'npx cdk synth'), cmd(1, 'cd /foo')];
    expect(diffCliCommands(a, a)).toEqual([]);
  });

  test('detects an added command', () => {
    const diffs = diffCliCommands([cmd(0, 'a'), cmd(1, 'b')], [cmd(0, 'a')]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('ADDED');
  });

  test('detects a removed command', () => {
    const diffs = diffCliCommands([cmd(0, 'a')], [cmd(0, 'a'), cmd(1, 'b')]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('REMOVED');
  });

  test('detects a changed command', () => {
    const diffs = diffCliCommands([cmd(0, 'new')], [cmd(0, 'old')]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('CHANGED');
    expect(diffs[0]).toContain('was: old');
    expect(diffs[0]).toContain('now: new');
  });
});

describe('synthFailureMessage', () => {
  test('includes exit status, args, working dir, and stderr/stdout tails', () => {
    const msg = synthFailureMessage(
      { status: 1, stderr: Buffer.from('boom-stderr'), stdout: Buffer.from('boom-stdout') },
      '/work/dir',
      '--domain d --module m',
    );
    expect(msg).toContain('exit 1');
    expect(msg).toContain('--domain d --module m');
    expect(msg).toContain('/work/dir');
    expect(msg).toContain('boom-stderr');
    expect(msg).toContain('boom-stdout');
  });

  test('omits stderr/stdout lines when buffers are empty', () => {
    const msg = synthFailureMessage({ status: 2, stderr: null, stdout: null }, '/work', '');
    expect(msg).toContain('exit 2');
    expect(msg).not.toContain('stderr (tail):');
    expect(msg).not.toContain('stdout (tail):');
  });

  test('names the signal instead of the exit status when the child was killed', () => {
    const msg = synthFailureMessage({ status: null, signal: 'SIGTERM' }, '/work', '');
    expect(msg).toContain('killed by SIGTERM');
    expect(msg).not.toContain('exit null');
  });

  test('appends the error code so a timeout is distinguishable from a bare kill', () => {
    const msg = synthFailureMessage(
      { status: null, signal: 'SIGTERM', error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }) },
      '/work',
      '',
    );
    expect(msg).toContain('killed by SIGTERM (ETIMEDOUT)');
  });

  test('falls back to "unknown signal" when an error is set but no signal is reported', () => {
    const msg = synthFailureMessage(
      { status: null, signal: null, error: Object.assign(new Error('spawn failed'), { code: 'ENOENT' }) },
      '/work',
      '',
    );
    expect(msg).toContain('killed by unknown signal (ENOENT)');
  });

  test('hints at the memory limit for a SIGKILL with no error code (an OOM kill)', () => {
    const msg = synthFailureMessage({ status: null, signal: 'SIGKILL' }, '/work', '');
    expect(msg).toContain('killed by SIGKILL');
    expect(msg).toContain('out-of-memory kill');
    expect(msg).toContain('KUBERNETES_MEMORY_LIMIT');
  });

  test('suppresses the memory hint when SIGKILL carries an error code', () => {
    const msg = synthFailureMessage(
      { status: null, signal: 'SIGKILL', error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }) },
      '/work',
      '',
    );
    expect(msg).toContain('killed by SIGKILL (ETIMEDOUT)');
    expect(msg).not.toContain('KUBERNETES_MEMORY_LIMIT');
  });
});

describe('findFiles', () => {
  test('finds matching files recursively and skips node_modules and test dirs', () => {
    fs.mkdirSync(path.join(tmp, 'a', 'b'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'test'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'a', 'one.yaml'), 'x');
    fs.writeFileSync(path.join(tmp, 'a', 'b', 'two.yaml'), 'x');
    fs.writeFileSync(path.join(tmp, 'a', 'skip.txt'), 'x');
    fs.writeFileSync(path.join(tmp, 'node_modules', 'skip.yaml'), 'x');
    fs.writeFileSync(path.join(tmp, 'test', 'skip.yaml'), 'x');

    const found = findFiles(tmp, /\.yaml$/)
      .map(f => path.basename(f))
      .sort();
    expect(found).toEqual(['one.yaml', 'two.yaml']);
  });
});

describe('findAssemblyDir', () => {
  test('returns null when base dir does not exist', () => {
    expect(findAssemblyDir(path.join(tmp, 'missing'))).toBeNull();
  });

  test('returns the directory containing manifest.json', () => {
    const asmDir = path.join(tmp, 'out', 'assembly');
    fs.mkdirSync(asmDir, { recursive: true });
    fs.writeFileSync(path.join(asmDir, 'manifest.json'), '{}');
    expect(findAssemblyDir(tmp)).toBe(asmDir);
  });

  test('returns null when no manifest.json exists anywhere', () => {
    fs.mkdirSync(path.join(tmp, 'out'), { recursive: true });
    expect(findAssemblyDir(tmp)).toBeNull();
  });
});

describe('parsePlaceholderToken', () => {
  test('returns index 1 for an unsuffixed token', () => {
    expect(parsePlaceholderToken('account_id')).toEqual({ base: 'account_id', index: 1 });
  });

  test('parses a numeric suffix as the instance index', () => {
    expect(parsePlaceholderToken('account_id_2')).toEqual({ base: 'account_id', index: 2 });
    expect(parsePlaceholderToken('cidr_3')).toEqual({ base: 'cidr', index: 3 });
  });

  test('treats a _1 suffix as index 1 on the base name', () => {
    expect(parsePlaceholderToken('subnet_id_1')).toEqual({ base: 'subnet_id', index: 1 });
  });
});

describe('resolvePlaceholder', () => {
  test('explicit context override wins over everything', () => {
    expect(resolvePlaceholder('account_id', { account_id: 'override' })).toBe('override');
  });

  test('generates distinct 12-digit account ids per index', () => {
    expect(resolvePlaceholder('account_id', {})).toBe('111111111111');
    expect(resolvePlaceholder('account_id_2', {})).toBe('222222222222');
    expect(resolvePlaceholder('account_id_3', {})).toBe('333333333333');
  });

  test('generates distinct CIDRs per index', () => {
    expect(resolvePlaceholder('cidr_1', {})).toBe('10.1.0.0/16');
    expect(resolvePlaceholder('cidr_2', {})).toBe('10.2.0.0/16');
  });

  test('resolves vpc_cidr to a valid CIDR (not the generic test-<token> fallback)', () => {
    expect(resolvePlaceholder('vpc_cidr', {})).toBe('10.1.0.0/16');
  });

  test('generates KMS and Secrets Manager ARNs', () => {
    expect(resolvePlaceholder('kms_arn', {})).toMatch(/^arn:test-partition:kms:test-region:\d{12}:key\/test-key-1$/);
    expect(resolvePlaceholder('secret_arn', {})).toMatch(
      /^arn:test-partition:secretsmanager:.*:secret:test-secret-test10$/,
    );
  });

  test('generates a valid cron hour (0-23) and small int', () => {
    expect(resolvePlaceholder('hour', {})).toBe('0');
    expect(resolvePlaceholder('hour_2', {})).toBe('1');
    expect(resolvePlaceholder('int', {})).toBe('1');
    expect(resolvePlaceholder('int_2', {})).toBe('2');
  });

  test('falls back to test-<token> for unmapped placeholders', () => {
    expect(resolvePlaceholder('datascience_team_name', {})).toBe('test-datascience-team-name');
    expect(resolvePlaceholder('org_name', {})).toBe('test-org-name');
  });

  test('generates valid distinct Bedrock model ids per index', () => {
    expect(resolvePlaceholder('bedrock_model_id', {})).toBe('anthropic.claude-3-5-sonnet-20240620-v1:0');
    expect(resolvePlaceholder('bedrock_model_id_2', {})).toBe('amazon.titan-embed-text-v2:0');
    expect(resolvePlaceholder('bedrock_model_id_3', {})).toBe('anthropic.claude-3-haiku-20240307-v1:0');
  });
});

describe('preprocessKitConfigs', () => {
  test('replaces <YOUR_*> placeholders using context, falling back to test- defaults', () => {
    const file = path.join(tmp, 'mdaa.yaml');
    fs.writeFileSync(file, 'org: <YOUR_ORG_NAME>\nvpc: <YOUR_VPC_ID>\n');
    preprocessKitConfigs(tmp, { org_name: 'my-org' });
    const result = fs.readFileSync(file, 'utf-8');
    expect(result).toContain('org: my-org');
    expect(result).toContain('vpc: test-vpc-id');
  });

  test('uncomments CDK Nag suppression blocks', () => {
    const file = path.join(tmp, 'roles.yaml');
    fs.writeFileSync(
      file,
      ['        # suppressions:', '        #   - id: AwsSolutions-IAM5', '        #     reason: ok'].join('\n'),
    );
    preprocessKitConfigs(tmp, {});
    const result = fs.readFileSync(file, 'utf-8');
    expect(result).toContain('suppressions:');
    expect(result).toContain('- id: AwsSolutions-IAM5');
    expect(result).toContain('reason: ok');
    expect(result).not.toMatch(/#\s*suppressions:/);
  });
});

describe('resolveKitDirs', () => {
  test('builds kitSrc and baselinesDir under starter_kits/<kit>', () => {
    const { kitSrc, baselinesDir } = resolveKitDirs('basic_datalake');
    expect(kitSrc.endsWith(path.join('starter_kits', 'basic_datalake'))).toBe(true);
    expect(baselinesDir.endsWith(path.join('starter_kits', 'test', 'basic_datalake', 'baselines'))).toBe(true);
  });
});

describe('prepareKit', () => {
  test('copies kit source (excluding test/node_modules) and applies placeholders', () => {
    const kitSrc = path.join(tmp, 'kitsrc');
    fs.mkdirSync(path.join(kitSrc, 'test'), { recursive: true });
    fs.mkdirSync(path.join(kitSrc, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(kitSrc, 'mdaa.yaml'), 'org: <YOUR_ORG_NAME>\n');
    fs.writeFileSync(path.join(kitSrc, 'test', 'should-not-copy.yaml'), 'x');
    fs.writeFileSync(path.join(kitSrc, 'node_modules', 'skip.yaml'), 'x');

    const { workDir, kitWorkDir } = prepareKit('mykit', { org_name: 'acme' }, kitSrc);
    try {
      expect(fs.readFileSync(path.join(kitWorkDir, 'mdaa.yaml'), 'utf-8')).toContain('org: acme');
      expect(fs.existsSync(path.join(kitWorkDir, 'test', 'should-not-copy.yaml'))).toBe(false);
      expect(fs.existsSync(path.join(kitWorkDir, 'node_modules', 'skip.yaml'))).toBe(false);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  });
});

describe('parseCliCommands', () => {
  test('extracts npx and cd lines, skipping the Testing Mode header', () => {
    const output = ['Testing Mode:', " cd '/repo' && npx cdk synth", 'noise', 'npx cdk deploy'].join('\n');
    const commands = parseCliCommands(output);
    expect(commands).toHaveLength(2);
    expect(commands[0].index).toBe(0);
    expect(commands[0].command).toContain('npx cdk synth');
    expect(commands[1].command).toBe('npx cdk deploy');
  });

  test('returns an empty list when there are no command lines', () => {
    expect(parseCliCommands('nothing here\njust text')).toEqual([]);
  });

  test('captures the npm-install branch so mdaa_version composition is baselined', () => {
    // prepNpmPackage's install branch emits `mkdir -p '<prefix>' && npm install ...
    // '<pkg>@<version>'` — the only place the resolved mdaa_version is composed into
    // a package specifier. Starter kits always resolve to local workspace packages,
    // so this line only appears for non-workspace module_paths.
    const output = [
      'Testing Mode:',
      " mkdir -p '/tmp/prefix' && npm install --no-fund --tag 'dist-tag' --prefix '/tmp/prefix' '@scope/mod@1.2.3'  > /dev/null",
    ].join('\n');
    const commands = parseCliCommands(output);
    expect(commands).toHaveLength(1);
    expect(commands[0].command).toContain("'@scope/mod@1.2.3'");
    expect(commands[0].command).toContain("--tag 'dist-tag'");
  });

  test('captures the terraform working-dir copy so the tf module source is baselined', () => {
    // createModuleTfWorkingConfig emits `cp -r <modulePath>/* <workingDir>` — the only
    // command carrying the configured Terraform module_path. Without `cp ` as an opener
    // the line vanished, so a broken/nonexistent module source was invisible in the
    // baseline (the terraform config recorded 10 of the 12 commands actually emitted).
    const output = ['Testing Mode:', ' cp -r /tmp/src/tf-module/* /tmp/work/terraform/d/e/m'].join('\n');
    const commands = parseCliCommands(output);
    expect(commands).toHaveLength(1);
    expect(commands[0].command).toBe('cp -r /tmp/src/tf-module/* /tmp/work/terraform/d/e/m');
  });

  test('folds backslash-continued lines into a single logical command', () => {
    // mdaa prints each cdk command joined with " \\\n\t" — the continuation
    // lines carry the meaningful context params and must be folded in.
    const output = [
      'Testing Mode:',
      " cd '/repo/packages/apps/governance/roles-app' && npx  cdk synth  --require-approval never \\",
      "\t-o '/tmp/out' \\",
      "\t-c 'org=test-org' \\",
      "\t-c 'env=dev' \\",
      "\t-c 'module_name=roles'",
    ].join('\n');
    const commands = parseCliCommands(output);
    expect(commands).toHaveLength(1);
    expect(commands[0].command).toContain('module_name=roles');
    expect(commands[0].command).toContain('org=test-org');
    expect(commands[0].command).toContain('env=dev');
    // No dangling backslash should remain in the folded command.
    expect(commands[0].command).not.toContain('\\');
  });

  test('folds multiple distinct multi-line commands independently', () => {
    const output = [
      'npx  cdk synth a \\',
      "\t-c 'module_name=a'",
      "cd '/x' && npx  cdk synth b \\",
      "\t-c 'module_name=b'",
    ].join('\n');
    const commands = parseCliCommands(output);
    expect(commands).toHaveLength(2);
    expect(commands[0].command).toContain('module_name=a');
    expect(commands[1].command).toContain('module_name=b');
  });

  test('handles a trailing backslash with no following continuation line', () => {
    const commands = parseCliCommands('npx cdk synth \\');
    expect(commands).toHaveLength(1);
    expect(commands[0].command).toBe('npx cdk synth');
  });
});

describe('compareCliBaseline', () => {
  let baselinesDir: string;
  let baselineFile: string;
  const cmds = [{ index: 0, command: 'npx cdk synth' }];

  beforeEach(() => {
    baselinesDir = path.join(tmp, 'baselines');
    baselineFile = path.join(baselinesDir, 'cli-commands.baseline.json');
  });

  test('creates the baseline on first run and returns null', () => {
    expect(compareCliBaseline(cmds, baselinesDir, baselineFile)).toBeNull();
    expect(fs.existsSync(baselineFile)).toBe(true);
  });

  test('returns null when commands match the baseline', () => {
    compareCliBaseline(cmds, baselinesDir, baselineFile);
    expect(compareCliBaseline(cmds, baselinesDir, baselineFile)).toBeNull();
  });

  test('returns a drift message when commands differ', () => {
    compareCliBaseline(cmds, baselinesDir, baselineFile);
    const drift = compareCliBaseline([{ index: 0, command: 'npx cdk deploy' }], baselinesDir, baselineFile);
    expect(drift).not.toBeNull();
    expect(drift).toContain('drifted');
    expect(drift).toContain('CHANGED');
  });
});

describe('diffTemplateFile', () => {
  let templateFile: string;
  let baselineFile: string;

  const template = (propValue: number) =>
    JSON.stringify({ Resources: { R: { Type: 'AWS::S3::Bucket', Properties: { Versioning: propValue } } } });

  beforeEach(() => {
    templateFile = path.join(tmp, 'stack.template.json');
    baselineFile = path.join(tmp, 'stack.baseline.json');
  });

  test('creates baseline on first run and returns null', () => {
    fs.writeFileSync(templateFile, template(1));
    expect(diffTemplateFile(templateFile, baselineFile)).toBeNull();
    expect(fs.existsSync(baselineFile)).toBe(true);
  });

  test('returns null when template is semantically unchanged', () => {
    fs.writeFileSync(templateFile, template(1));
    diffTemplateFile(templateFile, baselineFile);
    expect(diffTemplateFile(templateFile, baselineFile)).toBeNull();
  });

  test('returns a failure message when a resource property changes', () => {
    fs.writeFileSync(templateFile, template(1));
    diffTemplateFile(templateFile, baselineFile);
    fs.writeFileSync(templateFile, template(2));
    const result = diffTemplateFile(templateFile, baselineFile);
    expect(result).not.toBeNull();
    expect(result).toContain('resource');
    expect(result).toContain(baselineFile);
    // The failure message now embeds the human-readable diff so CI logs show
    // exactly what changed (the changed resource id and the property delta).
    expect(result).toContain('AWS::S3::Bucket');
    expect(result).toContain('R');
  });

  test('ignores non-semantic metadata differences', () => {
    const withMeta = (meta: string) =>
      JSON.stringify({
        Resources: { R: { Type: 'AWS::S3::Bucket', Properties: { Versioning: 1 } } },
        Metadata: { 'aws:cdk:path': meta },
      });
    fs.writeFileSync(templateFile, withMeta('path-a'));
    diffTemplateFile(templateFile, baselineFile);
    fs.writeFileSync(templateFile, withMeta('path-b'));
    expect(diffTemplateFile(templateFile, baselineFile)).toBeNull();
  });
});

describe('renderTemplateDiff', () => {
  test('renders a readable, ANSI-free, indented diff of resource changes', () => {
    const baseline = path.join(tmp, 'b.json');
    const current = path.join(tmp, 'c.json');
    fs.writeFileSync(
      baseline,
      JSON.stringify({ Resources: { Bkt: { Type: 'AWS::S3::Bucket', Properties: { Versioning: 'Enabled' } } } }),
    );
    fs.writeFileSync(
      current,
      JSON.stringify({ Resources: { Bkt: { Type: 'AWS::S3::Bucket', Properties: { Versioning: 'Suspended' } } } }),
    );
    const out = renderTemplateDiff(baseline, current);
    expect(out).toContain('AWS::S3::Bucket');
    expect(out).toContain('Bkt');
    expect(out).toContain('Enabled');
    expect(out).toContain('Suspended');
    // No ANSI escape sequences (clean CI logs).
    const ansiPattern = new RegExp(String.raw`${String.fromCodePoint(27)}\[`);
    expect(ansiPattern.test(out)).toBe(false);
    // Indented under the failure message.
    expect(out.split('\n').every(l => l === '' || l.startsWith('    '))).toBe(true);
  });

  test('returns empty string when a template file is unreadable', () => {
    expect(renderTemplateDiff(path.join(tmp, 'missing-a.json'), path.join(tmp, 'missing-b.json'))).toBe('');
  });
});

describe('normalizeAssemblyTemplates', () => {
  test('rewrites template files with version-stable, ignored-content-stripped JSON', () => {
    const tpl = path.join(tmp, 'stack.template.json');
    fs.writeFileSync(
      tpl,
      JSON.stringify({
        Resources: { R: { Type: 'AWS::S3::Bucket' } },
        Description: 'Built with Version 1.2.3',
      }),
    );
    normalizeAssemblyTemplates([tpl]);
    const result = fs.readFileSync(tpl, 'utf-8');
    expect(result).toContain('VERSION');
    expect(result).not.toContain('1.2.3');
  });
});

/**
 * A fake mdaa CLI used to exercise the subprocess-spawning helpers without invoking
 * the real CLI or CDK. It prints a Testing Mode command line so discoverModuleCdkDir
 * can parse the module directory, and exits 0 (or non-zero when told to).
 */
function writeFakeCli(moduleDir: string, exitCode = 0, verb = 'synth'): string {
  const script = path.join(tmp, 'fake-cli.js');
  const body = [
    `const moduleDir = ${JSON.stringify(moduleDir)};`,
    `process.stdout.write("Testing Mode:\\n cd '" + moduleDir + "' && npx  cdk ${verb} --all\\n");`,
    `process.exit(${exitCode});`,
  ].join('\n');
  fs.writeFileSync(script, body);
  return script;
}

describe('discoverModuleCdkDir', () => {
  test('parses the module directory from the Testing Mode output', () => {
    const moduleDir = path.join(tmp, 'modules', 'dynamodb');
    fs.mkdirSync(moduleDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir);

    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    const result = discoverModuleCdkDir(kitWorkDir, path.join(tmp, 'work'), 'test-account', '--domain d --module m');
    expect(result).toBe(moduleDir);
  });

  test('parses the module directory when the action verb is quoted', () => {
    // The CLI emits `npx cdk 'synth'` (quoting a bareword verb is a shell no-op). A
    // pattern expecting only the unquoted `cdk synth` fails to match, and the starter-kit
    // synth tests then abort with "Could not determine module CDK directory".
    const moduleDir = path.join(tmp, 'modules', 'quoted-verb');
    fs.mkdirSync(moduleDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir, 0, "'synth'");

    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    expect(discoverModuleCdkDir(kitWorkDir, path.join(tmp, 'work'), 'test-account', '')).toBe(moduleDir);
  });

  test('returns undefined when the output has no cd ... cdk synth line', () => {
    const script = path.join(tmp, 'noop-cli.js');
    fs.writeFileSync(script, 'process.stdout.write("nothing useful\\n");');
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = script;

    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    expect(discoverModuleCdkDir(kitWorkDir, path.join(tmp, 'work'), 'test-account', '')).toBeUndefined();
  });

  test('runs the CLI with the placeholder CDK_DEPLOY_REGION over an exported one', () => {
    // The fake CLI reports the CDK_DEPLOY_REGION it received as the module directory name.
    const script = path.join(tmp, 'region-cli.js');
    fs.writeFileSync(
      script,
      `process.stdout.write("Testing Mode:\\n cd '" + ${JSON.stringify(tmp)} + "/" + process.env.CDK_DEPLOY_REGION + "' && npx cdk synth --all\\n");`,
    );
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = script;
    const prevRegion = process.env.CDK_DEPLOY_REGION;
    process.env.CDK_DEPLOY_REGION = 'eu-west-2';

    try {
      const kitWorkDir = path.join(tmp, 'kit');
      fs.mkdirSync(kitWorkDir, { recursive: true });
      expect(discoverModuleCdkDir(kitWorkDir, path.join(tmp, 'work'), 'test-account', '')).toBe(`${tmp}/test-region`);
    } finally {
      if (prevRegion === undefined) {
        delete process.env.CDK_DEPLOY_REGION;
      } else {
        process.env.CDK_DEPLOY_REGION = prevRegion;
      }
    }
  });
});

describe('seedCdkContext', () => {
  let kitWorkDir: string;
  let moduleDir: string;

  beforeEach(() => {
    kitWorkDir = path.join(tmp, 'kit');
    moduleDir = path.join(tmp, 'modules', 'm');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    fs.mkdirSync(moduleDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir);
  });

  test('returns undefined when no context is provided', () => {
    expect(seedCdkContext(kitWorkDir, path.join(tmp, 'work'), 'acct', '', undefined)).toBeUndefined();
    expect(seedCdkContext(kitWorkDir, path.join(tmp, 'work'), 'acct', '', {})).toBeUndefined();
  });

  test('writes cdk.context.json into the discovered module dir', () => {
    const file = seedCdkContext(kitWorkDir, path.join(tmp, 'work'), 'acct', '', { 'ssm:k': 'v' });
    expect(file).toBe(path.join(moduleDir, 'cdk.context.json'));
    expect(JSON.parse(fs.readFileSync(file!, 'utf-8'))).toEqual({ 'ssm:k': 'v' });
  });

  test('merges into an existing cdk.context.json', () => {
    fs.writeFileSync(path.join(moduleDir, 'cdk.context.json'), JSON.stringify({ existing: 'keep' }));
    const file = seedCdkContext(kitWorkDir, path.join(tmp, 'work'), 'acct', '', { added: 'new' });
    expect(JSON.parse(fs.readFileSync(file!, 'utf-8'))).toEqual({ existing: 'keep', added: 'new' });
  });

  test('throws when the module dir cannot be discovered', () => {
    const script = path.join(tmp, 'noop-cli.js');
    fs.writeFileSync(script, 'process.stdout.write("nope\\n");');
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = script;
    expect(() => seedCdkContext(kitWorkDir, path.join(tmp, 'work'), 'acct', '', { k: 'v' })).toThrow(
      /Could not determine module CDK directory/,
    );
  });
});

describe('runMdaaCli', () => {
  test('completes successfully when the CLI exits zero', () => {
    const moduleDir = path.join(tmp, 'm');
    fs.mkdirSync(moduleDir, { recursive: true });
    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir, 0);

    expect(() => runMdaaCli(kitWorkDir, tmp, { _cdk_default_account: '111' }, '--domain d --module m')).not.toThrow();
  });

  test('throws a synth failure message when the CLI exits non-zero', () => {
    const moduleDir = path.join(tmp, 'm');
    fs.mkdirSync(moduleDir, { recursive: true });
    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir, 3);

    expect(() => runMdaaCli(kitWorkDir, tmp, {}, '--domain d --module m')).toThrow(/CDK synth failed \(exit 3\)/);
  });

  test('seeds and cleans up cdk.context.json when cdkContext is provided', () => {
    const moduleDir = path.join(tmp, 'm');
    fs.mkdirSync(moduleDir, { recursive: true });
    const kitWorkDir = path.join(tmp, 'kit');
    fs.mkdirSync(kitWorkDir, { recursive: true });
    process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE = writeFakeCli(moduleDir, 0);

    runMdaaCli(kitWorkDir, tmp, {}, '--domain d --module m', { 'ssm:k': 'v' });
    // The seeded file is removed in the finally block.
    expect(fs.existsSync(path.join(moduleDir, 'cdk.context.json'))).toBe(false);
  });
});

/** Minimal fake toolkit + DiffMethod for diffStack / diffAssembly. */
function fakeToolkit(differenceCount: number) {
  return {
    diff: async () => ({
      'test-stack': {
        resources: { differenceCount },
        outputs: { differenceCount: 0 },
      },
    }),
  } as unknown as InstanceType<typeof import('@aws-cdk/toolkit-lib').Toolkit>;
}

const fakeDiffMethod = {
  LocalFile: (f: string) => ({ file: f }),
} as unknown as typeof import('@aws-cdk/toolkit-lib').DiffMethod;

describe('diffStack', () => {
  let templateFile: string;
  let baselineFile: string;

  beforeEach(() => {
    templateFile = path.join(tmp, 'test-stack.template.json');
    baselineFile = path.join(tmp, 'test-stack.baseline.json');
    fs.writeFileSync(templateFile, JSON.stringify({ Resources: {} }));
  });

  const stack = () => ({ hierarchicalId: 'test-stack', stackName: 'test-stack', templateFullPath: templateFile });

  test('writes the baseline and returns null on first run', async () => {
    const result = await diffStack(fakeToolkit(0), {}, fakeDiffMethod, stack(), baselineFile);
    expect(result).toBeNull();
    expect(fs.existsSync(baselineFile)).toBe(true);
  });

  test('returns null when the toolkit reports no differences', async () => {
    fs.writeFileSync(baselineFile, JSON.stringify({ Resources: {} }));
    const result = await diffStack(fakeToolkit(0), {}, fakeDiffMethod, stack(), baselineFile);
    expect(result).toBeNull();
  });

  test('returns a failure message when the toolkit reports differences', async () => {
    fs.writeFileSync(baselineFile, JSON.stringify({ Resources: {} }));
    const result = await diffStack(fakeToolkit(2), {}, fakeDiffMethod, stack(), baselineFile);
    expect(result).not.toBeNull();
    expect(result).toContain('test-stack');
    expect(result).toContain('2 resource');
  });

  test('returns null when the toolkit returns no diff for the stack', async () => {
    fs.writeFileSync(baselineFile, JSON.stringify({ Resources: {} }));
    const emptyToolkit = { diff: async () => ({}) } as unknown as InstanceType<
      typeof import('@aws-cdk/toolkit-lib').Toolkit
    >;
    const result = await diffStack(emptyToolkit, {}, fakeDiffMethod, stack(), baselineFile);
    expect(result).toBeNull();
  });
});

describe('diffAssembly', () => {
  test('diffs non-selectable template files against their baselines', async () => {
    // Assembly dir with a manifest that has no stacks -> stacksRecursively is empty,
    // so only the non-selectable template-file path is exercised.
    const asmDir = path.join(tmp, 'asm');
    fs.mkdirSync(asmDir, { recursive: true });
    fs.writeFileSync(path.join(asmDir, 'manifest.json'), JSON.stringify({ version: '36.0.0', artifacts: {} }));

    const productTpl = path.join(asmDir, 'blueprint.product.template.json');
    fs.writeFileSync(productTpl, JSON.stringify({ Resources: { R: { Type: 'X', Properties: { a: 1 } } } }));
    const baselinesDir = path.join(tmp, 'baselines');

    // First run creates the baseline.
    let failures = await diffAssembly(asmDir, baselinesDir, [productTpl], fakeToolkit(0), {}, fakeDiffMethod);
    expect(failures).toEqual([]);
    expect(fs.existsSync(path.join(baselinesDir, 'blueprint.product.baseline.json'))).toBe(true);

    // Unchanged second run passes.
    failures = await diffAssembly(asmDir, baselinesDir, [productTpl], fakeToolkit(0), {}, fakeDiffMethod);
    expect(failures).toEqual([]);

    // Drift is reported.
    fs.writeFileSync(productTpl, JSON.stringify({ Resources: { R: { Type: 'X', Properties: { a: 2 } } } }));
    failures = await diffAssembly(asmDir, baselinesDir, [productTpl], fakeToolkit(0), {}, fakeDiffMethod);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('blueprint.product.template.json');
  });

  test('diffs selectable stacks from the assembly via the toolkit', async () => {
    const asmDir = path.join(tmp, 'asm2');
    fs.mkdirSync(asmDir, { recursive: true });
    const stackTpl = path.join(asmDir, 'test-stack.template.json');
    fs.writeFileSync(stackTpl, JSON.stringify({ Resources: { R: { Type: 'AWS::S3::Bucket' } } }));
    // Minimal cloud-assembly manifest with a single CloudFormation stack artifact.
    fs.writeFileSync(
      path.join(asmDir, 'manifest.json'),
      JSON.stringify({
        version: '36.0.0',
        artifacts: {
          'test-stack': {
            type: 'aws:cloudformation:stack',
            environment: 'aws://111111111111/test-region',
            properties: { templateFile: 'test-stack.template.json' },
          },
        },
      }),
    );
    const baselinesDir = path.join(tmp, 'baselines2');

    // First run creates the stack baseline.
    let failures = await diffAssembly(asmDir, baselinesDir, [stackTpl], fakeToolkit(0), {}, fakeDiffMethod);
    expect(failures).toEqual([]);
    expect(fs.existsSync(path.join(baselinesDir, 'test-stack.baseline.json'))).toBe(true);

    // A toolkit reporting differences yields a failure for the stack.
    failures = await diffAssembly(asmDir, baselinesDir, [stackTpl], fakeToolkit(3), {}, fakeDiffMethod);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('test-stack');
  });
});
