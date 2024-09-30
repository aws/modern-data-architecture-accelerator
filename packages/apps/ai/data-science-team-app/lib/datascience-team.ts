/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataScienceTeamL3Construct, DataScienceTeamL3ConstructProps } from '@aws-mdaa/datascience-team-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataScienceTeamConfigParser } from './datascience-team-config';


export class DataScienceTeamApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new DataScienceTeamConfigParser( stack, parserProps )

        const constructProps: DataScienceTeamL3ConstructProps = {
            ...{
                team: appConfig.team
            }, ...l3ConstructProps
        }
        new DataScienceTeamL3Construct( stack, "team", constructProps );
        return [ stack ]
    }
}