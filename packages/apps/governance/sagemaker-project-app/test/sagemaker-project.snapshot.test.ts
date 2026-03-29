/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { SagemakerProjectCDKApp } from '../lib/sagemaker-project';
import * as path from 'path';

describe('sagemaker-project Snapshot Tests', () => {
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
    'SagemakerProject App',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
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

  snapShotTestApp(
    'SagemakerProject App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerProjectCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-project-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
