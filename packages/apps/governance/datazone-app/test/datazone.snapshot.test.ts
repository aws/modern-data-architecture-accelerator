/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { DataZoneCDKApp } from '../lib/datazone';
import * as path from 'path';
import { TestRegionFact } from '@aws-mdaa/testing';
import { Fact } from 'aws-cdk-lib/region-info';
beforeEach(() => {
  process.env.CDK_DEFAULT_REGION = 'test-region';
  process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
  Fact.register(new TestRegionFact(), true);
});
describe('datazone Snapshot Tests', () => {
  snapShotTestApp(
    'DataZone App',
    Create.appProvider(
      context => {
        const moduleApp = new DataZoneCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
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
        module_name: 'test-datazone-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'DataZone App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new DataZoneCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
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
        module_name: 'test-datazone-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
