/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { QuickSightAccountL3Construct, QuickSightAccountL3ConstructProps } from '@aws-caef/quicksight-account-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { QuickSightAccountConfigParser } from './quicksight-account-config';

export class QuickSightAccountCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "quicksight-account", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
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


