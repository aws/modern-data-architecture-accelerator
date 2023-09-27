/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';

import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { NifiConfigParser } from './dataops-nifi-config';
import { NifiL3Construct, NifiL3ConstructProps } from '@aws-caef/dataops-nifi-l3-construct';


export class NifiClusterCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-nifi", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new NifiConfigParser( stack, parserProps )
        const constructProps: NifiL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new NifiL3Construct( stack, "construct", constructProps );
        return [ stack ]

    }
}
