/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
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
    return [stack];
  }
}
