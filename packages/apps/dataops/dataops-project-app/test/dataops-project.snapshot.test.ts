/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { DataOpsProjectCDKApp } from '../lib/dataops-project';
import * as path from 'path';

describe('dataops-project Snapshot Tests', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer({
      test: (val: unknown) => typeof val === 'object' && val !== null && 'refresh' in val,
      print: (val: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { refresh, ...rest } = val as Record<string, unknown>;
        return JSON.stringify(rest, null, 2);
      },
    });
  });
  snapShotTestApp(
    'Dataops Project App Comprehensive',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
            additional_accounts: '222222222222',
            additional_stacks: JSON.stringify([
              {
                account: '222222222222',
                region: region,
              },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Dataops Project App Datazone',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-datazone.yaml'),
            additional_accounts: '222222222222',
            additional_stacks: JSON.stringify([
              {
                account: '222222222222',
                region: region,
              },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-datazone',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Dataops Project App Sagemaker',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-sagemaker.yaml'),
            additional_accounts: '222222222222',
            additional_stacks: JSON.stringify([
              {
                account: '222222222222',
                region: region,
              },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-sagemaker',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Dataops Project App Minimal',
    Create.appProvider(
      context => {
        const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
        const moduleApp = new DataOpsProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
            additional_accounts: '222222222222',
            additional_stacks: JSON.stringify([
              {
                account: '222222222222',
                region: region,
              },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-dataops-project-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
