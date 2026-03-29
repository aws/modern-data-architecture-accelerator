/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { GlueWorkflowCDKApp } from '../lib/dataops-workflow';
import * as path from 'path';

describe('glue-workflow Snapshot Tests', () => {
  snapShotTestApp(
    'Glue Workflow App',
    Create.appProvider(
      context => {
        const moduleApp = new GlueWorkflowCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
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

  snapShotTestApp(
    'Glue Workflow App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new GlueWorkflowCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-glue-workflow-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Glue Workflow App Noproject',
    Create.appProvider(
      context => {
        const moduleApp = new GlueWorkflowCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-noproject.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-glue-workflow-noproject',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
