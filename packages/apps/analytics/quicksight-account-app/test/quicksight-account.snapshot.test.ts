/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { QuickSightAccountCDKApp } from '../lib/quicksight-account';
import * as path from 'path';

describe('quicksight-account Snapshot Tests', () => {
  snapShotTestApp(
    'Quicksight Account App',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightAccountCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-account-main',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Quicksight Account App Enterprise Q',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightAccountCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-enterprise-q.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-account-enterprise-q',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Quicksight Account App Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightAccountCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-account-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
