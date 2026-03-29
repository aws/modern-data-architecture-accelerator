/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectCDKApp } from '../lib/dataops-project';

test('Minimal SynthTest', () => {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-minimal.yaml',
    additional_stacks: JSON.stringify([{ account: '222222222222', region: region }]),
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

test('SageMaker SynthTest', () => {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-sagemaker.yaml',
    additional_stacks: JSON.stringify([{ account: '222222222222', region: region }]),
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

test('DataZone SynthTest', () => {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-datazone.yaml',
    additional_stacks: JSON.stringify([{ account: '222222222222', region: region }]),
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

test('Comprehensive Full-Coverage SynthTest', () => {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-comprehensive.yaml',
    additional_stacks: JSON.stringify([{ account: '222222222222', region: region }]),
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
