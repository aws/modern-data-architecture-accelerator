/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { CrawlerDefinition } from '@aws-mdaa/dataops-crawler-l3-construct';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface GlueCrawlerConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for crawler resource autowiring (databases, roles, security).
   *
   * Use cases: Project integration; Shared infrastructure reuse
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;
  /**
   * Map of crawler names to Glue crawler definitions for data source discovery and cataloging.
   *
   * Use cases: Multi-source data discovery; Catalog population; Schema detection
   *
   * AWS: AWS Glue crawlers
   *
   * Validation: Required; map of string to CrawlerDefinition
   */
  readonly crawlers: { [key: string]: CrawlerDefinition };
}

export class GlueCrawlerConfigParser extends MdaaDataOpsConfigParser<GlueCrawlerConfigContents> {
  public readonly crawlerConfigs: { [key: string]: CrawlerDefinition };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.crawlerConfigs = this.configContents.crawlers;
  }
}
