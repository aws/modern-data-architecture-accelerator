/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LakeFormationCdkApp } from '../lib/lakeformation-access-control';

test('SynthTest - minimal config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-minimal.yaml',
    additional_stacks: '[{"account":"222222222222"}]',
  };
  const app = new LakeFormationCdkApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest - comprehensive config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-comprehensive.yaml',
    additional_stacks: '[{"account":"222222222222"}]',
  };
  const app = new LakeFormationCdkApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
