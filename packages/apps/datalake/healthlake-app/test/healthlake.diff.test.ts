/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { HealthLakeApp } from '../lib/healthlake';
import * as path from 'path';

describe('HealthLake Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'HealthLake Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new HealthLakeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-healthlake-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'HealthLake Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new HealthLakeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-healthlake-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'HealthLake SMART on FHIR',
    Create.appProvider(
      context => {
        const moduleApp = new HealthLakeApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-smart.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-healthlake-smart',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        'account-2': '999999999999',
      },
    ),
  );
});
