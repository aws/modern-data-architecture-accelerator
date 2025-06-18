/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DynamodbL3Construct, DynamodbL3ConstructProps } from '@aws-mdaa/dataops-dynamodb-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DynamodbConfigParser } from './dataops-dynamodb-config';

export class DynamodbCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DynamodbConfigParser(stack, parserProps);
    const constructProps: DynamodbL3ConstructProps = {
      ...{
        tableDefinitions: appConfig.tableDefinitions,
        projectName: appConfig.projectName,
        projectKMSArn: appConfig.kmsArn,
      },
      ...l3ConstructProps,
    };
    new DynamodbL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
