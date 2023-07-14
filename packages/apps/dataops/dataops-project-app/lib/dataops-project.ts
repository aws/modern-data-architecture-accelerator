/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps } from '@aws-caef/dataops-project-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataOpsProjectConfigParser } from './dataops-project-config';


export class DataOpsProjectCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-project", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {


        const appConfig = new DataOpsProjectConfigParser( stack, parserProps )
        const constructProps: DataOpsProjectL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }

        new DataOpsProjectL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}
