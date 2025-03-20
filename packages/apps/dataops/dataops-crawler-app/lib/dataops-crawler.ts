/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { GlueCrawlerL3Construct, GlueCrawlerL3ConstructProps } from '@aws-mdaa/dataops-crawler-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueCrawlerConfigParser } from './dataops-crawler-config';

export class GlueCrawlerCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new GlueCrawlerConfigParser(stack, parserProps);
    const constructProps: GlueCrawlerL3ConstructProps = {
      ...{
        crawlerConfigs: appConfig.crawlerConfigs,
        securityConfigurationName: appConfig.securityConfigurationName,
        projectName: appConfig.projectName,
        notificationTopicArn: appConfig.projectTopicArn,
      },
      ...l3ConstructProps,
    };
    new GlueCrawlerL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
