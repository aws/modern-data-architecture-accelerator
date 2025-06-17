/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { GlueJobL3Construct, GlueJobL3ConstructProps } from '@aws-mdaa/dataops-job-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueJobConfigParser } from './dataops-job-config';

export class GlueJobCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new GlueJobConfigParser(stack, parserProps);
    const constructProps: GlueJobL3ConstructProps = {
      ...{
        projectKMSArn: appConfig.kmsArn,
        deploymentRoleArn: appConfig.deploymentRole,
        projectBucketName: appConfig.projectBucket,
        jobConfigs: appConfig.jobConfigs,
        securityConfigurationName: appConfig.securityConfigurationName,
        projectName: appConfig.projectName,
        notificationTopicArn: appConfig.projectTopicArn,
      },
      ...l3ConstructProps,
    };
    new GlueJobL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
