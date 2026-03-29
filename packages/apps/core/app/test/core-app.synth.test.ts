/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCdkApp } from '../lib';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaAppConfigParserProps } from '../lib';

class TestMdaaCdkApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    _parserProps: MdaaAppConfigParserProps,
  ) {
    new MdaaStringParameter(stack, 'TestParameter', {
      parameterName: l3ConstructProps.naming.ssmPath('test-parameter', true, false),
      stringValue: 'test-value',
      description: 'Test parameter for core app synth testing',
    });
  }
}

const baseContext = {
  org: 'test-org',
  env: 'test-env',
  domain: 'test-domain',
  module_name: 'test-module',
};

test('SynthTest - Direct deployment with nag suppressions', () => {
  const context = {
    ...baseContext,
    module_configs: './sample_configs/sample-config.yaml',
  };
  const app = new TestMdaaCdkApp({ context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest - Service Catalog deployment mode', () => {
  const context = {
    ...baseContext,
    module_configs: './sample_configs/sample-config-service-catalog.yaml',
  };
  const app = new TestMdaaCdkApp({ context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});

test('SynthTest - SageMaker Blueprint deployment mode', () => {
  const context = {
    ...baseContext,
    module_configs: './sample_configs/sample-config-sagemaker-blueprint.yaml',
  };
  const app = new TestMdaaCdkApp({ context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
