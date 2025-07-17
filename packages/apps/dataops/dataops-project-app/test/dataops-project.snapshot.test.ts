/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, beforeAll } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { DataOpsProjectCDKApp } from '../lib/dataops-project';
import * as path from 'path';

describe('dataops-project Snapshot Tests', () => {
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
    'Dataops Project Stack',
    Create.stackProvider(
      'DataopsProjectStackMain',
      (_, context) => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_accounts: '12312412',
            // Add additional_stacks to create the cross-account stack with the correct account ID and region
            additional_stacks: [
              {
                account: '12312412',
                region: region,
              },
            ],
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-dataops-project-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Dataops Project App',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_accounts: '12312412',
            additional_stacks: [
              {
                account: '12312412',
                region: region,
              },
            ],
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
