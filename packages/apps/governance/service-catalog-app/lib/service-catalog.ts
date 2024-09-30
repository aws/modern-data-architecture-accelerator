/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { ServiceCatalogL3Construct, ServiceCatalogL3ConstructProps } from '@aws-mdaa/service-catalog-l3-construct';

import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { MdaaServiceCatalogProductConfigParser } from './service-catalog-config';


export class ServiceCatalogCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new MdaaServiceCatalogProductConfigParser( stack, parserProps )
        const constructProps: ServiceCatalogL3ConstructProps = {
            ...{
                portfolios: appConfig.portfolioProps
            }, ...l3ConstructProps
        }
        new ServiceCatalogL3Construct( stack, "construct", constructProps )
        return [ stack ]
    }
}
