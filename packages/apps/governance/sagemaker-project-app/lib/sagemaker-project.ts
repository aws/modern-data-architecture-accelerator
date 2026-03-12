/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  SagemakerProjectL3Construct,
  SagemakerProjectL3ConstructProps,
} from '@aws-mdaa/sagemaker-project-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SagemakerProjectConfigParser } from './sagemaker-project-config';

export class SagemakerProjectCDKApp extends MdaaCdkApp {
  /* istanbul ignore next */
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new SagemakerProjectConfigParser(stack, parserProps);
    const constructProps: SagemakerProjectL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    new SagemakerProjectL3Construct(stack, 'sagemaker-project', constructProps);
    return [stack];
  }
}
