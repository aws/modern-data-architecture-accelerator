/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DataSyncL3Construct, DataSyncL3ConstructProps } from '@aws-caef/datasync-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataSyncConfigParser } from './datasync-config';

export class DataSyncCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "datasync", props )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new DataSyncConfigParser( stack, parserProps )
        const constructProps: DataSyncL3ConstructProps = {
            vpc: appConfig.vpc,
            agents: appConfig.agents,
            locations: appConfig.locations,
            tasks: appConfig.tasks,
            ...l3ConstructProps
        }
        new DataSyncL3Construct( stack, "datasync", constructProps );
        return [ stack ]
    }
}