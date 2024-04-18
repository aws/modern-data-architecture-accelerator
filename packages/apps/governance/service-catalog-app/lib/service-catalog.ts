/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { ServiceCatalogL3Construct, ServiceCatalogL3ConstructProps } from '@aws-caef/service-catalog-l3-construct';

import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { CaefServiceCatalogProductConfigParser } from './service-catalog-config';


export class ServiceCatalogCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "service-catalog", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new CaefServiceCatalogProductConfigParser( stack, parserProps )
        const constructProps: ServiceCatalogL3ConstructProps = {
            ...{
                portfolios: appConfig.portfolioProps
            }, ...l3ConstructProps
        }
        new ServiceCatalogL3Construct( stack, "construct", constructProps )
        return [ stack ]
    }
}
