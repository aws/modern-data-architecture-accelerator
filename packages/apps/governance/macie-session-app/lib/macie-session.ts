/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MacieSessionL3Construct, MacieSessionL3ConstructProps } from '@aws-mdaa/macie-session-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { MacieSessionConfigParser } from './macie-session-config';


export class MacieSessionCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

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

