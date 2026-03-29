/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerNotebookApp } from '../lib/sm-notebook';
import * as path from 'path';

describe('sm-notebook Snapshot Tests', () => {
  snapShotTestApp(
    'Sagemaker Notebook App',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerNotebookApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-notebook-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Sagemaker Notebook App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerNotebookApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-notebook-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
