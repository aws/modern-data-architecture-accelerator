/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DMSL3Construct, DMSL3ConstructProps } from '@aws-caef/dataops-dms-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DMSConfigParser } from './dms-config';

export class DMSCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dms", props )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new DMSConfigParser( stack, parserProps )

        const constructProps: DMSL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new DMSL3Construct( stack, "dms", constructProps );
        return [ stack ]
    }
}