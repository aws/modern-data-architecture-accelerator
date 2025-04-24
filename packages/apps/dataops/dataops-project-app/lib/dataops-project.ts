/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps } from '@aws-mdaa/dataops-project-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataOpsProjectConfigParser } from './dataops-project-config';

export class DataOpsProjectCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DataOpsProjectConfigParser(stack, parserProps);
    const constructProps: DataOpsProjectL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    new DataOpsProjectL3Construct(stack, 'construct', constructProps);
    return [stack];
  }
}
