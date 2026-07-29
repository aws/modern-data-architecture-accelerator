/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataopsMwaaL3Construct, DataopsMwaaL3ConstructProps } from '@aws-mdaa/dataops-mwaa-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataopsMwaaConfigParser } from './dataops-mwaa-config';

export class DataopsMwaaApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DataopsMwaaConfigParser(stack, parserProps);

    const constructProps: DataopsMwaaL3ConstructProps = {
      ...l3ConstructProps,
      environments: appConfig.environments,
      kmsArn: appConfig.kmsArn,
      bucketName: appConfig.bucketName,
      deploymentRoleArn: appConfig.deploymentRoleArn,
      dataAdminRoles: appConfig.dataAdminRoles,
    };

    new DataopsMwaaL3Construct(stack, 'construct', constructProps);

    return [stack];
  }
}
