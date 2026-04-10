/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { DataWarehouseCDKApp } from '../lib/datawarehouse';
import * as path from 'path';

const IGNORE_SCHEDULED_ACTION_TIMESTAMPS = { ignoreResourcePatterns: ['scheduledaction'] };

describe('Data Warehouse Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Data Warehouse Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new DataWarehouseCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-datawarehouse-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
    IGNORE_SCHEDULED_ACTION_TIMESTAMPS,
  );

  baselineDiffTestApp(
    'Data Warehouse Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new DataWarehouseCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-datawarehouse-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
