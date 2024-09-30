/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DMSL3Construct, DMSL3ConstructProps } from '@aws-mdaa/dataops-dms-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DMSConfigParser } from './dms-config';

export class DMSCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {
        const appConfig = new DMSConfigParser( stack, parserProps )

        const constructProps: DMSL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new DMSL3Construct( stack, "dms", constructProps );
        return [ stack ]
    }
}