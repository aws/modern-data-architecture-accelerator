/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { DataopsMwaaApp } from '../lib/dataops-mwaa';
import * as path from 'path';

describe('DataOps MWAA Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'DataOps MWAA Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new DataopsMwaaApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-mwaa-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'DataOps MWAA Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new DataopsMwaaApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-mwaa-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'DataOps MWAA NoProject',
    Create.appProvider(
      context => {
        const moduleApp = new DataopsMwaaApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-noproject.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-mwaa-noproject',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
