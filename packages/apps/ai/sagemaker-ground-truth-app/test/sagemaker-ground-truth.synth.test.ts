/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SageMakerGroundTruthApp } from '../lib/sagemaker-ground-truth';

const baseContext = {
  org: 'test-org',
  env: 'test-env',
  domain: 'test-domain',
  module_name: 'test-module',
  module_configs: './test/test-config.yaml',
};

test('SynthTest — multi-job config (image + text with verification)', () => {
  const app = new SageMakerGroundTruthApp({ context: baseContext });
  app.generateStack();
  expect(() => app.synth({ force: true, validateOnSynthesis: true })).not.toThrow();
});
