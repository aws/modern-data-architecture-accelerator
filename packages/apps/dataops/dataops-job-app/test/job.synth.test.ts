/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlueJobCDKApp } from '../lib/dataops-job';
import { Template } from 'aws-cdk-lib/assertions';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './test/test-config.yaml',
  };
  const app = new GlueJobCDKApp({ context: context });
  const stack = app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();

  const template = Template.fromStack(stack);
  // only one of the two jobs has continuous logging enabled
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
});
