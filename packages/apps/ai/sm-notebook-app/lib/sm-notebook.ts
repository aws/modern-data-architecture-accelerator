/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerNotebookConfigParser } from './sm-notebook-config';
import { SagemakerNotebookL3ConstructProps, SagemakerNotebookL3Construct } from '@aws-mdaa/sm-notebook-l3-construct';

export class SageMakerNotebookApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new SageMakerNotebookConfigParser(stack, parserProps);
    const constructProps: SagemakerNotebookL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };
    new SagemakerNotebookL3Construct(stack, 'notebooks', constructProps);
    return [stack];
  }
}
