/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SagemakerCDKApp } from '../lib/sagemaker';
import * as path from 'path';

describe('Sagemaker Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Sagemaker Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '../sample_configs/sample-config-comprehensive.yaml'),
            additional_stacks: JSON.stringify([
              { account: 'test-account-2', region: 'test-region' },
              { account: 'test-account-3', region: 'test-region' },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Sagemaker Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SagemakerCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '../sample_configs/sample-config-minimal.yaml'),
            additional_stacks: JSON.stringify([
              { account: 'test-account-2', region: 'test-region' },
              { account: 'test-account-3', region: 'test-region' },
            ]),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-sagemaker-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
