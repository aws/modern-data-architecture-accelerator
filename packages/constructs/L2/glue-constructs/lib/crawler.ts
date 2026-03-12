/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnCrawler, CfnCrawlerProps } from 'aws-cdk-lib/aws-glue';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { TagElement } from '@aws-mdaa/config';

export interface MdaaCfnCrawlerProps extends MdaaConstructProps {
  /** IAM role ARN that provides the crawler with permissions to access data sources and write */
  readonly role: string;
  /** Collection of data source targets for the crawler to discover and catalog */
  readonly targets: CfnCrawler.TargetsProperty | IResolvable;
  /** Array of custom classifier names for specialized data format recognition */
  readonly classifiers?: string[];
  /** JSON configuration string controlling crawler behavior and processing options */
  readonly configuration?: string;
  readonly crawlerSecurityConfiguration: string;
  /** Name of the Glue database where the crawler will store discovered table metadata */
  readonly databaseName?: string;
  /** Human-readable description of the crawler explaining its purpose and data sources */
  readonly description?: string;
  /** Name for the crawler that will be processed through MDAA naming conventions */
  readonly name?: string;
  readonly recrawlPolicy?: CfnCrawler.RecrawlPolicyProperty | IResolvable;
  /** Schedule configuration for automated crawler execution using cron expressions or rate expressions */
  readonly schedule?: CfnCrawler.ScheduleProperty | IResolvable;
  /** Policy configuration controlling how the crawler handles schema changes and table updates */
  readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty | IResolvable;
  /** Prefix string added to all table names created by the crawler for namespace organization */
  readonly tablePrefix?: string;
  readonly tags?: TagElement;
}

/**
 * Construct for creating a compliant Glue Crawler
 * Enforces the following:
 * * Security Configuration is set
 */
export class MdaaCfnCrawler extends CfnCrawler {
  private static setProps(props: MdaaCfnCrawlerProps): CfnCrawlerProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name),
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaCfnCrawlerProps) {
    super(scope, id, MdaaCfnCrawler.setProps(props));
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [{ id: 'AwsSolutions-GL1', reason: 'Log encryption configured via SecurityConfiguration' }],
      true,
    );
  }
}
