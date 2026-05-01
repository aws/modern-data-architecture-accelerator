/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { SageMakerMLOpsApp } from '../lib/sagemaker-mlops';
import * as path from 'path';

// Generate minimal test seed-code zip at module level (avoids committing binary; .gitignore excludes *.zip)
const TEST_SEED_CODE_ZIP = join(__dirname, 'test-seed-code.zip');
writeFileSync(
  TEST_SEED_CODE_ZIP,
  Buffer.from(
    'UEsDBAoAAAAAAFWye1ySOw6ZBwAAAAcAAAAJABwAUkVBRE1FLm1kVVQJAANBAsdpMwLHaXV4CwABBOgDAAAE6AMAACMgdGVzdApQSwECHgMKAAAAAABVsntckjsOmQcAAAAHAAAACQAYAAAAAAABAAAApIEAAAAAUkVBRE1FLm1kVVQFAANBAsdpdXgLAAEE6AMAAAToAwAAUEsFBgAAAAABAAEATwAAAEoAAAAAAA==',
    'base64',
  ),
);

describe('SageMaker MLOps Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'MLOps Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerMLOpsApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-mlops',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        'account-2': '222222222222',
        'account-3': '333333333333',
      },
    ),
  );

  baselineDiffTestApp(
    'MLOps Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new SageMakerMLOpsApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-mlops-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
