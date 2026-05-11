/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { GAIAApp } from '../lib/gaia';
import * as path from 'path';

describe('GAIA v2 Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'GAIA v2 Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new GAIAApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-gaia-v2-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
