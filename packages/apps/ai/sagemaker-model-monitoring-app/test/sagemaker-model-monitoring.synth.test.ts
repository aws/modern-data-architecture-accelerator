/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { SageMakerModelMonitoringApp } from '../lib/sagemaker-model-monitoring';

test('SynthTest - Comprehensive', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
  };
  const app = new SageMakerModelMonitoringApp({ context: context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});

test('SynthTest - Minimal', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module-minimal',
    module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
  };
  const app = new SageMakerModelMonitoringApp({ context: context });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});
