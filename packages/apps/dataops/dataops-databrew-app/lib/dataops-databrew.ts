/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataBrewConfigParser } from './databrew-app-config';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { DataBrewL3Construct, DataBrewL3ConstructProps } from '@aws-mdaa/dataops-databrew-l3-construct'

export class DataBrewApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {
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