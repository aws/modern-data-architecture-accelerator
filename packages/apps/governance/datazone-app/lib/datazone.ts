/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataZoneConfigParser } from './datazone-config';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '@aws-caef/datazone-l3-construct';


export class DataZoneCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "datazone", props )
    }
    
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new DataZoneConfigParser( stack, parserProps )
        const constructProps: DataZoneL3ConstructProps = {
            domains: appConfig.domains,
            ...l3ConstructProps
        }

        new DataZoneL3Construct( stack, "datazone", constructProps );
        return [ stack ]
    }
}

