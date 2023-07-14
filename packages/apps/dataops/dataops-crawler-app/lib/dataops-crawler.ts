/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { GlueCrawlerL3Construct, GlueCrawlerL3ConstructProps } from '@aws-caef/dataops-crawler-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueCrawlerConfigParser } from './dataops-crawler-config';

export class GlueCrawlerCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-crawler", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new GlueCrawlerConfigParser( stack, parserProps )
        const constructProps: GlueCrawlerL3ConstructProps = {
            ...{
                crawlerConfigs: appConfig.crawlerConfigs,
                securityConfigurationName: appConfig.securityConfigurationName,
                projectName: appConfig.projectName,
                notificationTopicArn: appConfig.projectTopicArn
            }, ...l3ConstructProps
        }
        new GlueCrawlerL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}
