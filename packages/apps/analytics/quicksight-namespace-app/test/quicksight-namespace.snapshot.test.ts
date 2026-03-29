/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
import { QuickSightNamespaceCDKApp } from '../lib/quicksight-namespace';
import * as path from 'path';

describe('quicksight-namespace Snapshot Tests', () => {
  snapShotTestApp(
    'Quicksight Namespace Comprehensive App',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-namespace-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Quicksight Namespace Minimal App',
    Create.appProvider(
      context => {
        const moduleApp = new QuickSightNamespaceCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-quicksight-namespace-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
