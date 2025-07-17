/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe } from '@jest/globals';
import { snapShotTest, snapShotTestApp, Create } from '@aws-mdaa/testing';
import { MdaaCdkApp } from '../lib/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaAppConfigParserProps } from '../lib';

class TestMdaaCdkApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parserProps: MdaaAppConfigParserProps,
  ) {
    new StringParameter(stack, 'TestParameter', {
      parameterName: l3ConstructProps.naming.ssmPath('test-parameter', true, false),
      stringValue: 'test-value',
      description: 'Test parameter for core app snapshot testing',
    });

    return [stack];
  }
}

describe('Core App Snapshot Tests', () => {
  snapShotTest(
    'Core App Stack - Basic',
    Create.stackProvider(
      'CoreAppStack',
      (_, context) => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-core-app-basic',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  snapShotTest(
    'Core App Stack - Production',
    Create.stackProvider(
      'CoreAppStackProd',
      (_, context) => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
            env: 'prod',
            domain: 'production',
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-core-app-prod',
        org: 'enterprise',
        env: 'prod',
        domain: 'production',
      },
    ),
  );

  snapShotTest(
    'Core App Stack - Development',
    Create.stackProvider(
      'CoreAppStackDev',
      (_, context) => {
        const moduleApp = new TestMdaaCdkApp({
          context: {
            ...context,
            env: 'dev',
            domain: 'development',
          },
        });
        return moduleApp.generateStack();
      },
      {
        module_name: 'test-core-app-dev',
        org: 'test-org',
        env: 'dev',
        domain: 'development',
      },
    ),
  );

  snapShotTestApp(
    'Core App - Complete',
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
        module_name: 'test-core-app-complete',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
