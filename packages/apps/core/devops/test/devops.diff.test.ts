/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { MdaaDevopsCDKApp } from '../lib/devops';
import * as path from 'path';

describe('DevOps Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'DevOps Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new MdaaDevopsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-devops-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'DevOps Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new MdaaDevopsCDKApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-devops-comprehensive',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
