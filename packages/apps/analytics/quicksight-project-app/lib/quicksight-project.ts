/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { QuickSightProjectL3Construct, QuickSightProjectL3ConstructProps } from '@aws-caef/quicksight-project-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { QuickSightProjectConfigParser } from './quicksight-project-config';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';

export class QuickSightProjectCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "quicksight-project", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new QuickSightProjectConfigParser( stack, parserProps )
        const constructProps: QuickSightProjectL3ConstructProps = {
            ...appConfig, ...l3ConstructProps
        }
        new QuickSightProjectL3Construct( stack, "project", constructProps );
        return [ stack ]
    }
}