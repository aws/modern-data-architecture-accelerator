/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { QuickSightNamespaceL3Construct, QuickSightNamespaceL3ConstructProps } from '@aws-caef/quicksight-namespace-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { QuickSightNamespaceConfigParser } from './quicksight-namespace-config';


export class QuickSightNamespaceCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "quicksight-namespace", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new QuickSightNamespaceConfigParser( stack, parserProps )
        const constructProps: QuickSightNamespaceL3ConstructProps = {
            ...{
                federations: appConfig.federations,
                glueResourceAccess: appConfig.glueResourceAccess
            }, ...l3ConstructProps
        }
        new QuickSightNamespaceL3Construct( stack, "namespace", constructProps );
        return [ stack ]
    }
}
