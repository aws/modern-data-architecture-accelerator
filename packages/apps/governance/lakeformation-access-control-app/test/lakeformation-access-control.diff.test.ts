/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { LakeFormationCdkApp } from '../lib/lakeformation-access-control';
import * as path from 'path';

describe('Lakeformation Access Control Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'Lakeformation Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
            additional_stacks: '[{"account":"test-account-2"}]',
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-lakeformation-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'Lakeformation Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
            additional_stacks: '[{"account":"test-account-2"}]',
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-lakeformation-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
