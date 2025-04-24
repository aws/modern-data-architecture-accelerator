/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventBridgeL3Construct, EventBridgeL3ConstructProps } from '@aws-mdaa/eventbridge-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { EventBridgeConfigParser } from './eventbridge-config';

export class EventBridgeCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new EventBridgeConfigParser(stack, parserProps);
    const constructProps: EventBridgeL3ConstructProps = {
      eventBuses: appConfig.eventBuses,
      ...l3ConstructProps,
    };

    new EventBridgeL3Construct(stack, 'eventbridge', constructProps);
    return [stack];
  }
}
