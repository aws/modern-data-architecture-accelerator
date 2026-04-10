/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SagemakerProjectCDKApp } from '../lib/sagemaker-project';
import * as path from 'path';

const IGNORE_DOMAIN_CONFIG_REFRESH = { ignoreResourcePatterns: ['domainConfigcr'] };

describe('SagemakerProject Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'SagemakerProject Comprehensive',
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
    IGNORE_DOMAIN_CONFIG_REFRESH,
  );

  baselineDiffTestApp(
    'SagemakerProject Minimal',
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
    IGNORE_DOMAIN_CONFIG_REFRESH,
  );
});
