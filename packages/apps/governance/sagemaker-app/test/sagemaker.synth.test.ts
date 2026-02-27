/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fact } from 'aws-cdk-lib/region-info';
import { SagemakerCDKApp } from '../lib/sagemaker';
import { TestRegionFact } from '@aws-mdaa/testing';
beforeEach(() => {
  process.env.CDK_DEFAULT_REGION = 'test-region';
  Fact.register(new TestRegionFact(), true);
});
test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new SagemakerCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
