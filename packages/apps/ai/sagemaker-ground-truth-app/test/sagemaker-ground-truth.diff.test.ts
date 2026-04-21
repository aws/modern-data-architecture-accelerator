/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerGroundTruthApp } from '../lib/sagemaker-ground-truth';
import * as path from 'path';

describe('SageMaker Ground Truth Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Ground Truth Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerGroundTruthApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-module',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
