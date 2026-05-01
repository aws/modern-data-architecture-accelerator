/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerPipelineApp } from '../lib/sagemaker-pipeline-app';
import * as path from 'path';

describe('SageMaker Pipeline Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Pipeline Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerPipelineApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-pipeline',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        'account-2': '222222222222',
        'account-3': '333333333333',
      },
    ),
  );

  baselineDiffTestApp(
    'Pipeline Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerPipelineApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-pipeline-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
