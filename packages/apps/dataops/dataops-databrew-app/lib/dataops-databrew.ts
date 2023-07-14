/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataBrewConfigParser } from './databrew-app-config';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { DataBrewL3Construct, DataBrewL3ConstructProps } from '@aws-caef/dataops-databrew-l3-construct'

export class DataBrewApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-databrew", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new DataBrewConfigParser( stack, parserProps )
        const constructProps: DataBrewL3ConstructProps = {
            ...{
                datasets: appConfig.datasets,
                recipes: appConfig.recipes,
                projectName: appConfig.projectName,
                jobs: appConfig.jobs
            }, ...l3ConstructProps
        }
        new DataBrewL3Construct( stack, "jobs", constructProps );
        return [ stack ]
    }
}