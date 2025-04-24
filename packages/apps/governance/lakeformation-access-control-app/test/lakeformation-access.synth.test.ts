/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LakeFormationCdkApp } from '../lib/lakeformation-access-control';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
    additional_accounts: '123456789012',
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
