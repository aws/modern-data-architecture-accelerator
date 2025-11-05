/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectCDKApp } from '../lib/dataops-project';

test('SynthTest', () => {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
    additional_stacks: JSON.stringify([{ account: '12312412', region: region }]),
  };
  const app = new DataOpsProjectCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
