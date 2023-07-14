/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DataWarehouseL3Construct, DataWarehouseL3ConstructProps } from '@aws-caef/datawarehouse-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataWarehouseConfigParser } from './datawarehouse-config';

export class DataWarehouseCDKApp extends CaefCdkApp {
  constructor( props: AppProps = {} ) {
    super( "datawarehouse", props )
  }
  protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

    const appConfig = new DataWarehouseConfigParser( stack, parserProps )
    const constructProps: DataWarehouseL3ConstructProps = {
      ...appConfig, ...l3ConstructProps
    }
    new DataWarehouseL3Construct( stack, "construct", constructProps );

    return [ stack ]
  }
}

