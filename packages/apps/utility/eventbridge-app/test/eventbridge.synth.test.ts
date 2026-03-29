/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventBridgeCDKApp } from '../lib/eventbridge';

const BASE_CONTEXT = {
  org: 'test-org',
  env: 'test-env',
  domain: 'test-domain',
  module_name: 'test-module',
};

test('SynthTest-comprehensive', () => {
  const context = {
    ...BASE_CONTEXT,
    module_configs: './sample_configs/sample-config-comprehensive.yaml',
  };
  const app = new EventBridgeCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest-minimal', () => {
  const context = {
    ...BASE_CONTEXT,
    module_configs: './sample_configs/sample-config-minimal.yaml',
  };
  const app = new EventBridgeCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
