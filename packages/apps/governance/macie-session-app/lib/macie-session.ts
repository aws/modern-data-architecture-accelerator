/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MacieSessionL3Construct, MacieSessionL3ConstructProps } from '@aws-caef/macie-session-l3-construct';
import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { MacieSessionConfigParser } from './macie-session-config';


export class MacieSessionCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "macie-session", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new MacieSessionConfigParser( stack, parserProps )
        const constructProps: MacieSessionL3ConstructProps = {
            ...{
                session: appConfig.macieSessionConfig
            }, ...l3ConstructProps
        }

        new MacieSessionL3Construct( stack, "macie-session", constructProps );
        return [ stack ]

    }
}

