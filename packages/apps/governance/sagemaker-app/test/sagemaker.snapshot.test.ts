/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create, isS3BucketWithSuffix } from '@aws-mdaa/testing';
import { SagemakerCDKApp } from '../lib/sagemaker';
import * as path from 'path';
import { TestRegionFact } from '@aws-mdaa/testing';
import { Fact } from 'aws-cdk-lib/region-info';
beforeEach(() => {
  process.env.CDK_DEFAULT_REGION = 'test-region';
  process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
  Fact.register(new TestRegionFact(), true);
});
describe('sagemaker Snapshot Tests', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer({
      test: isS3BucketWithSuffix,
      print: (): string => '"REPLACED-S3-BUCKET-NAME"',
    });
  });
  snapShotTestApp(
    'Sagemaker App',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '../sample_configs/sample-config-comprehensive.yaml'),
            additional_stacks: JSON.stringify([
              { account: '222222222222', region: 'test-region' },
              { account: '333333333333', region: 'test-region' },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Sagemaker App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '../sample_configs/sample-config-minimal.yaml'),
            additional_stacks: JSON.stringify([
              { account: '222222222222', region: 'test-region' },
              { account: '333333333333', region: 'test-region' },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
