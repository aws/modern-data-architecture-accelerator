/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { BedrockSettingsApp } from '../lib/bedrock-settings';
import * as path from 'path';

describe('Bedrock Settings Snapshot Tests', () => {
  snapShotTestApp(
    'Bedrock Settings App Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockSettingsApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-settings-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Bedrock Settings App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new BedrockSettingsApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-bedrock-settings-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
