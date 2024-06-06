/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { M2MApiL3Construct, M2MApiL3ConstructProps } from '@aws-mdaa/m2m-api-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { M2MApiConfigParser } from './m2m-api-config';


export class M2MApiCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( "ingestion-app", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new M2MApiConfigParser( stack, parserProps )
        const constructProps: M2MApiL3ConstructProps = {
            m2mApiProps: appConfig.m2mApiProps,
            ...l3ConstructProps
        }
        new M2MApiL3Construct( stack, "m2m-api", constructProps )
        return [ stack ]
    }
}
