/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fact } from 'aws-cdk-lib/region-info';
import { DataZoneCDKApp } from '../lib/datazone';
import { TestRegionFact } from '@aws-mdaa/testing';
beforeEach(() => {
  process.env.CDK_DEFAULT_REGION = 'test-region';
  process.env.CDK_DEFAULT_ACCOUNT = 'test-account';
  Fact.register(new TestRegionFact(), true);
});
test('SynthTest - minimal config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-minimal.yaml',
  };
  const app = new DataZoneCDKApp({ context: context });
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
    additional_stacks: JSON.stringify([
      { account: '222222222222', region: 'test-region' },
      { account: '333333333333', region: 'test-region' },
    ]),
  };
  const app = new DataZoneCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
