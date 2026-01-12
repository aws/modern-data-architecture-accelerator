/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { LambdaFunctionConfigParser } from './dataops-lambda-config';

export class LambdaFunctionCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new LambdaFunctionConfigParser(stack, parserProps);
    const constructProps: LambdaFunctionL3ConstructProps = {
      kmsArn: appConfig.kmsArn,
      layers: appConfig.layers,
      functions: appConfig.functions,
      ...l3ConstructProps,
    };
    new LambdaFunctionL3Construct(stack, 'construct', constructProps);

    // Add suppressions for internal CDK constructs (LogRetention Lambda)
    this.addInternalConstructSuppressions(stack);

    return [stack];
  }

  private addInternalConstructSuppressions(stack: Stack): void {
    // Add suppressions for internal CDK constructs like LogRetention
    for (const child of Stack.of(stack).node.children) {
      if (child.node.id.includes('LogRetention')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
          [
            { id: 'AwsSolutions-IAM4', reason: 'LogRetention Lambda is CDK internal construct for log management.' },
            { id: 'AwsSolutions-IAM5', reason: 'LogRetention Lambda is CDK internal construct for log management.' },
            {
              id: 'HIPAA.Security-IAMNoInlinePolicy',
              reason: 'LogRetention Lambda policy managed by CDK for log management.',
            },
            {
              id: 'PCI.DSS.321-IAMNoInlinePolicy',
              reason: 'LogRetention Lambda policy managed by CDK for log management.',
            },
            {
              id: 'NIST.800.53.R5-IAMNoInlinePolicy',
              reason: 'LogRetention Lambda policy managed by CDK for log management.',
            },
          ],
          true,
        );
      }
    }
  }
}
