/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deploy-level coverage for the `terraform` config cascade.
 *
 * `computeEffectiveTerraformConfig` is unit-tested in `config-resolver.test.ts`, but what a
 * customer actually sees is the `mdaa_override.tf.json` the deploy writes into the module's
 * working directory — it decides which S3 backend the module's state lands in. The emitted
 * commands carry no trace of the override, so `cli-commands.diff.test.ts` cannot show this
 * effect; only reading the written file can. This runs the real CLI in `--testing` mode
 * (no terraform, checkov, python or AWS needed) and pins child-over-parent precedence at
 * the level where getting it wrong retargets Terraform state.
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Fixed AWS environment so the run doesn't depend on the developer's shell. */
const SYNTH_ENV: Record<string, string> = {
  CDK_DEFAULT_ACCOUNT: 'test-account',
  CDK_DEFAULT_REGION: 'test-region',
  AWS_REGION: 'test-region',
  AWS_DEFAULT_REGION: 'test-region',
};

const CONFIG = [
  'region: us-east-1',
  'organization: test-org',
  '# Parent sets bucket + region; the child overrides only bucket.',
  'terraform:',
  '  override:',
  '    terraform:',
  '      backend:',
  '        s3:',
  '          bucket: parent-bucket',
  '          region: parent-region',
  'domains:',
  '  tf-domain:',
  '    environments:',
  '      tf-env:',
  '        account: default',
  '        use_bootstrap: false',
  '        modules:',
  '          tf-child-override:',
  '            module_type: tf',
  '            module_path: ./tf-module',
  '            terraform:',
  '              override:',
  '                terraform:',
  '                  backend:',
  '                    s3:',
  '                      bucket: child-bucket',
  '',
].join('\n');

describe('terraform config hierarchy', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-tf-hierarchy-'));
    fs.writeFileSync(path.join(workDir, 'mdaa.yaml'), CONFIG);
    fs.cpSync(path.join(__dirname, 'fixtures', 'tf-module'), path.join(workDir, 'tf-module'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  test('a child terraform override beats the parent and inherits the keys it leaves unset', () => {
    const workingDir = path.join(workDir, 'mdaa_working');

    // prettier-ignore
    const proc = spawnSync( // NOSONAR
      process.execPath,
      [
        process.env.MDAA_CLI_ENTRYPOINT_OVERRIDE ?? path.join(__dirname, '..', 'lib', 'mdaa.js'),
        '--action', 'diff',
        '--testing',
        '--config', path.join(workDir, 'mdaa.yaml'),
        '--working-dir', workingDir,
      ],
      { cwd: workDir, env: { ...process.env, ...SYNTH_ENV }, encoding: 'utf-8', timeout: 120_000 },
    );

    expect(
      proc.status === 0
        ? ''
        : `CLI exited ${proc.status}\n--- stdout ---\n${proc.stdout}\n--- stderr ---\n${proc.stderr}`,
    ).toBe('');

    const overridePath = path.join(
      workingDir,
      'terraform',
      'tf-domain',
      'tf-env',
      'tf-child-override',
      'mdaa_override.tf.json',
    );
    expect(fs.existsSync(overridePath)).toBe(true);

    expect(JSON.parse(fs.readFileSync(overridePath, 'utf-8'))).toEqual({
      terraform: {
        backend: {
          s3: {
            // Child wins on the key both levels set. Before 1.8.0 the parent won here,
            // which pointed the module's state at the wrong bucket.
            bucket: 'child-bucket',
            // Inherited from the parent, which the child left unset
            region: 'parent-region',
            // Injected by the CLI for every terraform module
            encrypt: true,
            key: 'test-org-tf-domain-tf-env-tf-child-override',
          },
        },
      },
    });
  }, 120_000);
});
