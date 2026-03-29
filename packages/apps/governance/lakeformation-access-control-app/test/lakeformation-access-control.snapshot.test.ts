/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { LakeFormationCdkApp } from '../lib/lakeformation-access-control';
import * as path from 'path';

describe('lakeformation-access-control Snapshot Tests', () => {
  snapShotTestApp(
    'Lakeformation App',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
            additional_stacks: '[{"account":"222222222222"}]',
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

  snapShotTestApp(
    'Lakeformation App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationCdkApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
            additional_stacks: '[{"account":"222222222222"}]',
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
