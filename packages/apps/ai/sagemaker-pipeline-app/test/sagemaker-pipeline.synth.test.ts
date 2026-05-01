/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { SageMakerPipelineApp } from '../lib/sagemaker-pipeline-app';

test('SynthTest - Pipeline comprehensive config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    'account-2': '222222222222',
    'account-3': '333333333333',
    module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
  };
  const app = new SageMakerPipelineApp({ context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});

test('SynthTest - Pipeline minimal config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
  };
  const app = new SageMakerPipelineApp({ context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});
