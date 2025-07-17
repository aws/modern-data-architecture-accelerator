/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { LakeFormationCdkApp } from '../lib/lakeformation-access-control';
import * as path from 'path';

describe('lakeformation-access-control Snapshot Tests', () => {
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
    'Lakeformation Stack',
    Create.stackProvider(
      'LakeformationStackMain',
      (_, context) => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_accounts: 'xxxxxxxxxxxxx',
            additional_stacks: [
              {
                account: 'xxxxxxxxxxxxx',
                region: region,
              },
            ],
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-lakeformation-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Lakeformation App',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
            additional_accounts: 'xxxxxxxxxxxxx',
            additional_stacks: [
              {
                account: 'xxxxxxxxxxxxx',
                region: region,
              },
            ],
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-lakeformation-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
