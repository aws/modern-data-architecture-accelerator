/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { SagemakerProjectCDKApp } from '../lib/sagemaker-project';
import * as path from 'path';

describe('sagemaker-project Snapshot Tests', () => {
  beforeAll(() => {
    expect.addSnapshotSerializer({
      test: (val: unknown) => typeof val === 'string' && val.includes('[CONFIG:') && val.includes('test-config.yaml]'),
      print: (val: unknown) => {
        const stringVal = val as string;
        return `"${stringVal.replace(/\[CONFIG:[^[\]]*test-config\.yaml\]/, '[CONFIG:test-config.yaml]')}"`;
      },
    });
    expect.addSnapshotSerializer({
      test: (val: unknown) => typeof val === 'object' && val !== null && 'refresh' in val,
      print: (val: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { refresh, ...rest } = val as Record<string, unknown>;
        return JSON.stringify(rest, null, 2);
      },
    });
  });
  snapShotTest(
    'SagemakerProject Stack',
    Create.stackProvider(
      'SagemakerProjectStackMain',
      (_, context) => {
        const moduleApp = new SagemakerProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-sagemaker-project-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'SagemakerProject App',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-project-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
