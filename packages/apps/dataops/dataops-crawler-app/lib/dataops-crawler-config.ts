/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { CrawlerDefinition } from '@aws-mdaa/dataops-crawler-l3-construct';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface GlueCrawlerConfigContents extends MdaaDataOpsConfigContents {
    /**
     * Name of the Data Ops project. The crawler config will be autowired to use existing resources deployed by the project.
     */
    projectName: string
    /**
     * Map of crawler names to crawler definitions 
     */
    crawlers: { [ key: string ]: CrawlerDefinition }
}

export class GlueCrawlerConfigParser extends MdaaDataOpsConfigParser<GlueCrawlerConfigContents> {
    public readonly crawlerConfigs: { [ key: string ]: CrawlerDefinition }

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.crawlerConfigs = this.configContents.crawlers

    }

}