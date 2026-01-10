/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  BedrockAgentcoreRuntimeL3Construct,
  BedrockAgentcoreRuntimeL3ConstructProps,
} from '@aws-mdaa/bedrock-agentcore-runtime-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { BedrockAgentcoreRuntimeConfigParser } from './bedrock-agentcore-runtime-config';

export class BedrockAgentcoreRuntimeApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new BedrockAgentcoreRuntimeConfigParser(stack, parserProps);

    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'bedrock-agentcore-runtime', constructProps);
    return [stack];
  }
}
