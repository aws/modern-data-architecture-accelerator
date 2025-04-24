/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { BedrockAgentL3Construct, BedrockAgentL3ConstructProps } from '@aws-mdaa/bedrock-agent-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { BedrockBuilderConfigParser } from './bedrock-builder-config';

export class BedrockBuilderApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new BedrockBuilderConfigParser(stack, parserProps);
    const constructProps: BedrockAgentL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };
    new BedrockAgentL3Construct(stack, 'bedrock-agent', constructProps);
    return [stack];
  }
}
