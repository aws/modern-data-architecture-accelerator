/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataSyncL3Construct, DataSyncL3ConstructProps } from '@aws-mdaa/datasync-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataSyncConfigParser } from './datasync-config';

export class DataSyncCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {
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