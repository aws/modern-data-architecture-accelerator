/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { GlueWorkflowCDKApp } from '../lib/dataops-workflow';
import * as path from 'path';

describe('glue-workflow Snapshot Tests', () => {
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
    'Glue Workflow Stack',
    Create.stackProvider(
      'GlueWorkflowStackMain',
      (_, context) => {
        const moduleApp = new GlueWorkflowCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-glue-workflow-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Glue Workflow App',
    Create.appProvider(
      context => {
        const moduleApp = new GlueWorkflowCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, 'test-config.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-glue-workflow-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
