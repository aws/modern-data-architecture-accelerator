/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { SageMakerMLOpsApp } from '../lib/sagemaker-mlops';

// Generate minimal test seed-code zip at module level (avoids committing binary; .gitignore excludes *.zip)
const TEST_SEED_CODE_ZIP = join(__dirname, 'test-seed-code.zip');
writeFileSync(
  TEST_SEED_CODE_ZIP,
  Buffer.from(
    'UEsDBAoAAAAAAFWye1ySOw6ZBwAAAAcAAAAJABwAUkVBRE1FLm1kVVQJAANBAsdpMwLHaXV4CwABBOgDAAAE6AMAACMgdGVzdApQSwECHgMKAAAAAABVsntckjsOmQcAAAAHAAAACQAYAAAAAAABAAAApIEAAAAAUkVBRE1FLm1kVVQFAANBAsdpdXgLAAEE6AMAAAToAwAAUEsFBgAAAAABAAEATwAAAEoAAAAAAA==',
    'base64',
  ),
);

test('SynthTest - Comprehensive config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    'account-2': '222222222222',
    'account-3': '333333333333',
    module_configs: join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
  };
  const app = new SageMakerMLOpsApp({ context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});

test('SynthTest - Minimal config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module-minimal',
    module_configs: join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
  };
  const app = new SageMakerMLOpsApp({ context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});

test('SynthTest - CodeStar Connections config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module-codestar',
    module_configs: join(__dirname, '..', 'sample_configs', 'sample-config-codestar.yaml'),
  };
  const app = new SageMakerMLOpsApp({ context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});
