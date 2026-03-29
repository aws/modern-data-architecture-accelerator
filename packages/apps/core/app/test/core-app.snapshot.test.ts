/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTestApp, Create } from '@aws-mdaa/testing';
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
      description: 'Test parameter for core app snapshot testing',
    });

    return [stack];
  }
}

describe('Core App Snapshot Tests', () => {
  snapShotTestApp(
    'Core App - Basic',
    Create.appProvider(
      context => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-core-app-basic',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTestApp(
    'Core App - Production',
    Create.appProvider(
      context => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
            env: 'prod',
            domain: 'production',
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-core-app-prod',
        org: 'enterprise',
        env: 'prod',
        domain: 'production',
      },
    ),
  );

  snapShotTestApp(
    'Core App - Development',
    Create.appProvider(
      context => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
            env: 'dev',
            domain: 'development',
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-core-app-dev',
        org: 'test-org',
        env: 'dev',
        domain: 'development',
      },
    ),
  );
});
