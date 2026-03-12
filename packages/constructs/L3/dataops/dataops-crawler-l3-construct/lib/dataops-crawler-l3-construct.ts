/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaCfnCrawler } from '@aws-mdaa/glue-constructs';
import { Construct } from 'constructs';
import { CfnCrawler } from 'aws-cdk-lib/aws-glue';
import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { EventBridgeHelper } from '@aws-mdaa/eventbridge-helper';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Rule } from 'aws-cdk-lib/aws-events';
import { ConfigurationElement } from '@aws-mdaa/config';

/**
 * Crawler target definitions for multi-source data discovery across S3, JDBC, DynamoDB, and catalog sources.
 *
 * Use cases: S3 data lake discovery, database table cataloging, DynamoDB schema inference, cross-catalog synchronization
 *
 * AWS: AWS Glue crawler targets for automated data discovery and schema inference
 *
 * Validation: At least one target type should be specified; arrays must contain valid CloudFormation target definitions
 */
export interface CrawlerTargets {
  /**
   * Glue catalog targets for discovering and synchronizing existing catalog metadata.
   *
   * Use cases: Cross-catalog synchronization, existing table discovery, metadata consolidation
   *
   * AWS: AWS Glue crawler catalog targets
   *
   * Validation: Must be array of valid CfnCrawler.CatalogTargetProperty if provided
   **/
  readonly catalogTargets?: CfnCrawler.CatalogTargetProperty[];
  /**
   * DynamoDB targets for NoSQL table schema discovery and catalog integration.
   *
   * Use cases: DynamoDB schema discovery, NoSQL table cataloging, cross-service data integration
   *
   * AWS: AWS Glue crawler DynamoDB targets
   *
   * Validation: Must be array of valid CfnCrawler.DynamoDBTargetProperty if provided
   **/
  readonly dynamoDbTargets?: CfnCrawler.DynamoDBTargetProperty[];
  /**
   * JDBC targets for relational database schema discovery and table cataloging.
   *
   * Use cases: Relational database discovery, JDBC schema cataloging, database-to-lake integration
   *
   * AWS: AWS Glue crawler JDBC targets
   *
   * Validation: Must be array of valid CfnCrawler.JdbcTargetProperty if provided
   **/
  readonly jdbcTargets?: CfnCrawler.JdbcTargetProperty[];
  /**
   * S3 targets for data lake object discovery and automatic schema inference.
   *
   * Use cases: S3 data lake discovery, automatic schema inference, partition discovery
   *
   * AWS: AWS Glue crawler S3 targets
   *
   * Validation: Must be array of valid CfnCrawler.S3TargetProperty if provided
   **/
  readonly s3Targets?: CfnCrawler.S3TargetProperty[];
}
/**
 * Configuration for a Glue crawler including execution role, targets, scheduling, and schema management.
 *
 * Use cases: Automated S3 data discovery, scheduled database cataloging, schema change detection, data lake metadata management
 *
 * AWS: AWS Glue crawler configuration for automated data discovery and Glue catalog population
 *
 * Validation: executionRoleArn, databaseName, description, and targets are required; schedule, schemaChangePolicy, and tablePrefix are optional
 */
export interface CrawlerDefinition {
  /**
   * Arn of the execution role
   */
  readonly executionRoleArn: string;
  /**
   * Name of the database to crawl from the crawler.yaml configuration.
   */
  readonly databaseName: string;
  /**
   * Description for the Crawler
   */
  readonly description: string;
  /**
   * Crawler targets specifying data sources (S3, JDBC, DynamoDB, catalog) to crawl.
   *
   * Use cases: Data source specification, multi-source crawling, comprehensive data discovery
   *
   * AWS: AWS Glue crawler targets configuration
   *
   * Validation: Must be a valid CrawlerTargets object; required
   **/
  readonly targets: CrawlerTargets;
  /**
   * Crawler configuration as a string.  See:  https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html
   */
  readonly extraConfiguration?: ConfigurationElement;
  /**
   * Cron or rate schedule for automated periodic crawler execution.
   *
   * Use cases: Automated data discovery, scheduled catalog updates, periodic schema detection
   *
   * AWS: AWS Glue crawler schedule configuration
   *
   * Validation: Must be valid CfnCrawler.ScheduleProperty if provided
   **/
  readonly schedule?: CfnCrawler.ScheduleProperty;
  /**
   * Policy controlling how the crawler handles detected schema modifications.
   *
   * Use cases: Schema evolution management, table structure change handling, metadata consistency
   *
   * AWS: AWS Glue crawler schema change policy
   *
   * Validation: Must be valid CfnCrawler.SchemaChangePolicyProperty if provided
   **/
  readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty;
  /**
   * String prefix prepended to all table names created by the crawler.
   *
   * Use cases: Table naming organization, namespace management, naming conflict avoidance
   *
   * AWS: AWS Glue crawler table prefix
   *
   * Validation: Must be a valid string if provided
   **/
  readonly tablePrefix?: string;
  /**
   * Name of the custom classifier to use from the crawler.yaml configuration
   */
  readonly classifiers?: string[];
  /**
   * Recrawl behaviour: CRAWL_NEW_FOLDERS_ONLY or CRAWL_EVERYTHING or CRAWL_EVENT_MODE
   */
  readonly recrawlBehavior?: string;
}
export interface GlueCrawlerL3ConstructProps extends MdaaL3ConstructProps {
  readonly crawlerConfigs: { [key: string]: CrawlerDefinition };
  // Glue security configuration name for crawler encryption and access control
  readonly securityConfigurationName?: string;
  // DataOps project name for crawler association and SSM parameter coordination
  readonly projectName?: string;
  readonly notificationTopicArn?: string;
}

export class GlueCrawlerL3Construct extends MdaaL3Construct {
  protected readonly props: GlueCrawlerL3ConstructProps;

  constructor(scope: Construct, id: string, props: GlueCrawlerL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Build our crawlers!
    Object.keys(this.props.crawlerConfigs).forEach(crawlerName => {
      const crawlerConfig = this.props.crawlerConfigs[crawlerName];
      // Classifiers are a bit of a special case since they're an array and may be undefined.
      let includedClassifiers = {};
      if (crawlerConfig.classifiers) {
        includedClassifiers = { classifiers: crawlerConfig.classifiers };
      }
      if (!this.props.securityConfigurationName) {
        throw new Error('Security configuration name is required for crawler configuration');
      }
      const crawler = new MdaaCfnCrawler(this.scope, `${crawlerName}-crawler`, {
        name: crawlerName,
        crawlerSecurityConfiguration: this.props.securityConfigurationName,
        role: crawlerConfig.executionRoleArn,
        targets: {
          catalogTargets: crawlerConfig.targets.catalogTargets,
          jdbcTargets: crawlerConfig.targets.jdbcTargets,
          dynamoDbTargets: crawlerConfig.targets.dynamoDbTargets,
          s3Targets: crawlerConfig.targets.s3Targets,
        },
        configuration: JSON.stringify(crawlerConfig.extraConfiguration),
        databaseName: crawlerConfig.databaseName,
        description: crawlerConfig.description,
        recrawlPolicy: {
          recrawlBehavior: crawlerConfig.recrawlBehavior,
        },
        schedule: crawlerConfig.schedule,
        schemaChangePolicy: crawlerConfig.schemaChangePolicy,
        tablePrefix: crawlerConfig.tablePrefix,
        ...includedClassifiers,
        naming: this.props.naming,
      });

      if (crawler.name && this.props.notificationTopicArn) {
        const eventRule = this.createCrawlerMonitoringEventRule(`${crawlerName}-monitor`, [crawler.name]);
        if (this.props.projectName) {
          DataOpsProjectUtils.createProjectSSMParam(
            this.scope,
            this.props.naming,
            this.props.projectName,
            `crawler/name/${crawlerName}`,
            crawler.name,
          );
        }
        eventRule.addTarget(
          new SnsTopic(MdaaSnsTopic.fromTopicArn(this.scope, `${crawlerName}-topic`, this.props.notificationTopicArn)),
        );
      }
    });
  }

  private createCrawlerMonitoringEventRule(ruleName: string, crawlerNames: string[]): Rule {
    return EventBridgeHelper.createGlueMonitoringEventRule(
      this.scope,
      this.props.naming,
      ruleName,
      'Workflow Crawler failure events',
      {
        crawlerName: crawlerNames,
        state: ['Failed'],
      },
    );
  }
}
