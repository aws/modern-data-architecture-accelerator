/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StepFunctionCDKApp } from '../lib/dataops-stepfunction';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new StepFunctionCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
