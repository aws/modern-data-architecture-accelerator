/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// This test file must be run with UPDATE_BASELINES=true set BEFORE module load.
// It covers the UPDATE_BASELINES code path in diff.ts (lines 232-241).

// Set env BEFORE importing diff module (it reads at module load time)
process.env.UPDATE_BASELINES = 'true';

import { describe, afterAll, expect, it } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { baselineDiffTestApp } from '../lib/diff';

const snapshotsDir = path.join(__dirname, '__snapshots__');
const configName = 'update-bl-test';
const baselineFile = path.join(snapshotsDir, `${configName}.baseline.json`);

// Create a stale baseline that will differ from synth output
const staleBaseline = {
  Resources: {
    StaleResource: { Type: 'AWS::CloudFormation::WaitConditionHandle' },
  },
  Parameters: {
    BootstrapVersion: {
      Type: 'AWS::SSM::Parameter::Value<String>',
      Default: '/cdk-bootstrap/hnb659fds/version',
      Description:
        'Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]',
    },
  },
  Rules: {
    CheckBootstrapVersion: {
      Assertions: [
        {
          Assert: { 'Fn::Not': [{ 'Fn::Contains': [['1', '2', '3', '4', '5'], { Ref: 'BootstrapVersion' }] }] },
          AssertDescription:
            "CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI.",
        },
      ],
    },
  },
};

fs.mkdirSync(snapshotsDir, { recursive: true });
fs.writeFileSync(baselineFile, JSON.stringify(staleBaseline, null, 2) + '\n');

afterAll(() => {
  if (fs.existsSync(baselineFile)) {
    fs.unlinkSync(baselineFile);
  }
  // Restore env
  delete process.env.UPDATE_BASELINES;
});

describe('baselineDiffTestApp UPDATE_BASELINES mode', () => {
  // This will detect diffs (StaleResource removed) and update the baseline instead of failing
  baselineDiffTestApp('Update BL Test', () => {
    const app = new cdk.App({
      context: { module_configs: `${configName}.yaml` },
    });
    new cdk.Stack(app, 'TestStack');
    return app;
  });

  it('should have updated the baseline file', () => {
    // After the above test runs, the baseline should be updated
    const updated = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
    expect(updated.Resources?.StaleResource).toBeUndefined();
  });
});
