/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, afterEach, jest } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ArtifactMetadataEntryType } from 'aws-cdk-lib/cloud-assembly-schema';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as fs from 'fs';
import * as path from 'path';
import { runBaselineDiff } from '../lib/diff';

const snapshotsDir = path.join(__dirname, '__snapshots__');
const configName = 'error-annotations';
const baselineFile = path.join(snapshotsDir, `${configName}.baseline.json`);

/** An app whose only stack has an unsuppressed AwsSolutions-IAM5 finding (wildcard action and resource). */
function nagErrorApp(): cdk.App {
  const app = new cdk.App({ context: { module_configs: `${configName}.yaml` } });
  const stack = new cdk.Stack(app, 'TestStack');
  const role = new iam.Role(stack, 'Role', { assumedBy: new iam.AccountRootPrincipal() });
  new iam.Policy(stack, 'Policy', {
    statements: [new iam.PolicyStatement({ actions: ['s3:*'], resources: ['*'] })],
  }).attachToRole(role);
  cdk.Aspects.of(app).add(new AwsSolutionsChecks());
  return app;
}

const expectedErrors = [
  '[Nag Error] synth produced 2 error annotation(s):',
  '  /TestStack/Policy/Resource: AwsSolutions-IAM5[Action::s3:*]',
  '  /TestStack/Policy/Resource: AwsSolutions-IAM5[Resource::*]',
];

afterEach(() => {
  fs.rmSync(baselineFile, { force: true });
  delete process.env.UPDATE_BASELINES;
});

describe('runBaselineDiff with error annotations', () => {
  it('fails naming each rule and construct path, and writes no baseline on a first run', async () => {
    const result = runBaselineDiff('Nag Error', nagErrorApp);

    for (const line of expectedErrors) {
      await expect(result).rejects.toThrow(line);
    }
    expect(fs.existsSync(baselineFile)).toBe(false);
  });

  it('fails and leaves an existing baseline untouched with UPDATE_BASELINES=true', async () => {
    const stale = JSON.stringify({ Resources: { Stale: { Type: 'AWS::CloudFormation::WaitConditionHandle' } } });
    fs.mkdirSync(snapshotsDir, { recursive: true });
    fs.writeFileSync(baselineFile, stale);

    // UPDATE_BASELINES is read when the module loads, so load a fresh copy with it set
    process.env.UPDATE_BASELINES = 'true';
    let isolated!: typeof import('../lib/diff');
    jest.isolateModules(() => {
      isolated = require('../lib/diff'); // eslint-disable-line @typescript-eslint/no-require-imports
    });

    await expect(isolated.runBaselineDiff('Nag Error', nagErrorApp)).rejects.toThrow(expectedErrors[0]);
    expect(fs.readFileSync(baselineFile, 'utf-8')).toBe(stale);
  });

  it('prints non-string annotation data as JSON', async () => {
    const app = new cdk.App({ context: { module_configs: `${configName}.yaml` } });
    const stack = new cdk.Stack(app, 'TestStack');
    new cdk.CfnResource(stack, 'Handle', { type: 'AWS::CloudFormation::WaitConditionHandle' }).node.addMetadata(
      ArtifactMetadataEntryType.ERROR,
      { reason: 'structured' },
    );

    await expect(runBaselineDiff('Object Error', () => app)).rejects.toThrow(
      '  /TestStack/Handle: {"reason":"structured"}',
    );
  });
});

describe('runBaselineDiff with a drifted baseline', () => {
  it('fails asking for a baseline update and leaves the baseline untouched', async () => {
    const stale = JSON.stringify({ Resources: { Stale: { Type: 'AWS::CloudFormation::WaitConditionHandle' } } });
    fs.mkdirSync(snapshotsDir, { recursive: true });
    fs.writeFileSync(baselineFile, stale);

    const result = runBaselineDiff('Drift', () => {
      const app = new cdk.App({ context: { module_configs: `${configName}.yaml` } });
      new cdk.Stack(app, 'TestStack');
      return app;
    });

    await expect(result).rejects.toThrow(
      '[Drift] Stack "TestStack" has 1 resource and 0 output difference(s). Run npm run test:update-baselines to accept.',
    );
    expect(fs.readFileSync(baselineFile, 'utf-8')).toBe(stale);
  });
});
