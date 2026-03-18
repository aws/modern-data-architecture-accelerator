/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
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
  beforeAll(() => {
    expect.addSnapshotSerializer({
      test: (val: unknown) => typeof val === 'string' && val.includes('[CONFIG:') && val.includes('test-config.yaml]'),
      print: (val: unknown) => {
        const stringVal = val as string;
        return `"${stringVal.replace(/\[CONFIG:[^[\]]*test-config\.yaml\]/, '[CONFIG:test-config.yaml]')}"`;
      },
    });
  });
  snapShotTest(
    'DataZone Stack',
    Create.stackProvider(
      'DataZoneStackMain',
      (_, context) => {
        const moduleApp = new DataZoneCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_stacks: JSON.stringify([
              { account: '1234567890', region: 'test-region' },
              { account: '2234567890', region: 'test-region' },
            ]),
          },
        });
        return moduleApp.generateStack();
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
    'DataZone App',
    Create.appProvider(
      context => {
        const moduleApp = new DataZoneCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_stacks: JSON.stringify([
              { account: '1234567890', region: 'test-region' },
              { account: '2234567890', region: 'test-region' },
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
});
