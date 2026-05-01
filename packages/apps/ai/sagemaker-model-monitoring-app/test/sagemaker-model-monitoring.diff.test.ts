/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerModelMonitoringApp } from '../lib/sagemaker-model-monitoring';
import * as path from 'path';

describe('SageMaker Model Monitoring Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Model Monitoring Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerModelMonitoringApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-model-monitoring',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Model Monitoring Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerModelMonitoringApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-model-monitoring-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
