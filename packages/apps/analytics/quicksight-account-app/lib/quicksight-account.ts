/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { QuickSightAccountL3Construct, QuickSightAccountL3ConstructProps } from '@aws-mdaa/quicksight-account-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { QuickSightAccountConfigParser } from './quicksight-account-config';

export class QuickSightAccountCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {
        const appConfig = new QuickSightAccountConfigParser( stack, parserProps )
        const constructProps: QuickSightAccountL3ConstructProps = {
            ...{
                qsAccount: appConfig.account
            }, ...l3ConstructProps
        }
        new QuickSightAccountL3Construct( stack, "account", constructProps );
        return [ stack ]
    }
}


