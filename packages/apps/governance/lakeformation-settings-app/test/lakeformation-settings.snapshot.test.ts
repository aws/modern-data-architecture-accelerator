/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { LakeFormationSettingsCDKApp } from '../lib/lakeformation-settings';
import * as path from 'path';

describe('lakeformation-settings Snapshot Tests', () => {
  snapShotTestApp(
    'Lakeformation Settings App',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationSettingsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-lakeformation-settings-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Lakeformation Settings App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new LakeFormationSettingsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-lakeformation-settings-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
