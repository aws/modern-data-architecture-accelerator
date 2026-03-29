/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { EventBridgeCDKApp } from '../lib/eventbridge';
import * as path from 'path';

describe('eventbridge Snapshot Tests', () => {
  snapShotTestApp(
    'Eventbridge App Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new EventBridgeCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-eventbridge-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Eventbridge App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new EventBridgeCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-eventbridge-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
