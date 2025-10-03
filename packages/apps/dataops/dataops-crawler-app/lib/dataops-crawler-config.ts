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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for crawler integration and resource autowiring with existing project infrastructure. Enables seamless integration with deployed project resources including databases, IAM roles, and security configurations for coordinated data operations.
   *
   * Use cases: Project resource integration; Coordinated data operations; Infrastructure autowiring and resource sharing
   *
   * AWS: AWS Glue crawler project integration for resource coordination and shared infrastructure
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of crawler names to crawler definitions enabling multiple data source discovery and cataloging operations. Provides crawler configuration for different data sources, formats, and discovery patterns within the data lake architecture.
   *
   * Use cases: Multi-source data discovery; cataloging; Data source-specific crawler configuration
   *
   * AWS: AWS Glue crawler definitions for data source discovery and catalog population
   *
   * Validation: Must be object with string keys and valid CrawlerDefinition values; required; defines all crawler operations
   *   **/
  readonly crawlers: { [key: string]: CrawlerDefinition };
}

export class GlueCrawlerConfigParser extends MdaaDataOpsConfigParser<GlueCrawlerConfigContents> {
  public readonly crawlerConfigs: { [key: string]: CrawlerDefinition };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.crawlerConfigs = this.configContents.crawlers;
  }
}
