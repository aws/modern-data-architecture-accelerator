/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { QuickSightNamespaceL3Construct, QuickSightNamespaceL3ConstructProps } from '@aws-mdaa/quicksight-namespace-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { QuickSightNamespaceConfigParser } from './quicksight-namespace-config';


export class QuickSightNamespaceCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

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
