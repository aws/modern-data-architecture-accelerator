/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DynamodbCDKApp } from '../lib/dataops-dynamodb';
import { Template } from 'aws-cdk-lib/assertions';

test('SynthTest without projectName', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-noproject.yaml',
  };
  const app = new DynamodbCDKApp({ context: context });
  const stack = app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
});

test('SynthTest - minimal config', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-minimal.yaml',
  };
  const app = new DynamodbCDKApp({ context: context });
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
  };
  const app = new DynamodbCDKApp({ context: context });
  const stack = app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::DynamoDB::Table', 3);
});
