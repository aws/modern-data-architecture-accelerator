/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DataScienceTeamL3Construct, DataScienceTeamL3ConstructProps } from '@aws-caef/datascience-team-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataScienceTeamConfigParser } from './datascience-team-config';


export class DataScienceTeamApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "datascience-team", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

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