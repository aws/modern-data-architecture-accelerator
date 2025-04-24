/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataWarehouseL3Construct, DataWarehouseL3ConstructProps } from '@aws-mdaa/datawarehouse-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataWarehouseConfigParser } from './datawarehouse-config';

export class DataWarehouseCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DataWarehouseConfigParser(stack, parserProps);
    const constructProps: DataWarehouseL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };
    new DataWarehouseL3Construct(stack, 'construct', constructProps);

    return [stack];
  }
}
