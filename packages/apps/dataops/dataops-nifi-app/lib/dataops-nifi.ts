/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';

import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { NifiConfigParser } from './dataops-nifi-config';
import { NifiL3Construct, NifiL3ConstructProps } from '@aws-mdaa/dataops-nifi-l3-construct';


export class NifiClusterCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-nifi", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new NifiConfigParser( stack, parserProps )
        const constructProps: NifiL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new NifiL3Construct( stack, "construct", constructProps );
        return [ stack ]

    }
}
