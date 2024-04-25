/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { GAIAL3Construct, GAIAL3ConstructProps } from '@aws-caef/gaia-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GAIAConfigParser } from './gaia-config';


export class GAIAApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "gaia", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new GAIAConfigParser( stack, parserProps )

        const constructProps: GAIAL3ConstructProps = {
            ...{
                gaia: appConfig.gaia
            }, ...l3ConstructProps
        }
        new GAIAL3Construct( stack, "gaia", constructProps );
        return [ stack ]
    }
}