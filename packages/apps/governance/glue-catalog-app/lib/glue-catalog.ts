/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { GlueCatalogL3Construct, GlueCatalogL3ConstructProps } from '@aws-caef/glue-catalog-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { GlueCatalogConfigParser } from './glue-catalog-config';

export class GlueCatalogSettingsCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "glue-catalog", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new GlueCatalogConfigParser( stack, parserProps )
        const constructProps: GlueCatalogL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }

        new GlueCatalogL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}



