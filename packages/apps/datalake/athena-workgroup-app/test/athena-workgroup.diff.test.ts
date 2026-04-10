/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { AthenaWorkgroupCDKApp } from '../lib/athena-workgroup';
import * as path from 'path';

describe('Athena Workgroup Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Athena Workgroup Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new AthenaWorkgroupCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-athena-workgroup-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Athena Workgroup Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new AthenaWorkgroupCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-athena-workgroup-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
