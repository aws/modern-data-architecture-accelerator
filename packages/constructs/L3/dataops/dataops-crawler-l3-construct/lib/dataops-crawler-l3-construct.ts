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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Glue crawler target definitions enabling multi-source data discovery across S3, JDBC, DynamoDB, and catalog sources. Defines the specific data sources that Glue crawlers will scan for automated schema inference and metadata cataloging in data lake operations.
 *
 * Use cases: S3 data lake discovery; Database table cataloging; DynamoDB schema inference; Cross-catalog metadata synchronization
 *
 * AWS: AWS Glue crawler targets for automated data discovery and schema inference across multiple data source types
 *
 * Validation: At least one target type must be specified; all target arrays must contain valid CloudFormation target definitions
 */
export interface CrawlerTargets {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Glue catalog target configurations for cross-catalog metadata synchronization and existing table discovery. Enables crawlers to discover and synchronize metadata from existing Glue catalog tables and databases for comprehensive data catalog management.
   *
   * Use cases: Cross-catalog synchronization; Existing table discovery; Metadata consolidation; Catalog-to-catalog migration
   *
   * AWS: AWS Glue crawler catalog targets for discovering and synchronizing existing Glue catalog metadata
   *
   * Validation: Must be array of valid CfnCrawler.CatalogTargetProperty if provided; optional for catalog-based discovery
   **/
  readonly catalogTargets?: CfnCrawler.CatalogTargetProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of DynamoDB target configurations for NoSQL table schema discovery and metadata cataloging. Enables crawlers to discover DynamoDB table structures and create corresponding Glue catalog entries for analytics and ETL operations.
   *
   * Use cases: DynamoDB schema discovery; NoSQL table cataloging; DynamoDB analytics enablement; Cross-service data integration
   *
   * AWS: AWS Glue crawler DynamoDB targets for NoSQL table schema discovery and catalog integration
   *
   * Validation: Must be array of valid CfnCrawler.DynamoDBTargetProperty if provided; optional for DynamoDB discovery
   **/
  readonly dynamoDbTargets?: CfnCrawler.DynamoDBTargetProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of JDBC target configurations for relational database schema discovery and table cataloging. Enables crawlers to connect to JDBC-compatible databases and discover table schemas for data lake integration and analytics.
   *
   * Use cases: Relational database discovery; JDBC schema cataloging; Database-to-lake integration; Cross-database analytics
   *
   * AWS: AWS Glue crawler JDBC targets for relational database schema discovery and catalog integration
   *
   * Validation: Must be array of valid CfnCrawler.JdbcTargetProperty if provided; optional for JDBC database discovery
   **/
  readonly jdbcTargets?: CfnCrawler.JdbcTargetProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of S3 target configurations for data lake object discovery and schema inference. Enables crawlers to scan S3 buckets and prefixes to automatically discover data files and infer schemas for Glue catalog population.
   *
   * Use cases: S3 data lake discovery; Automatic schema inference; Data file cataloging; Partition discovery
   *
   * AWS: AWS Glue crawler S3 targets for data lake object discovery and automatic schema inference
   *
   * Validation: Must be array of valid CfnCrawler.S3TargetProperty if provided; optional for S3 data discovery
   **/
  readonly s3Targets?: CfnCrawler.S3TargetProperty[];
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Glue crawler definition with automated data discovery and cataloging capabilities for data lake operations. Defines crawler configuration including execution roles, target data sources, scheduling, and metadata management for systematic data catalog population.
 *
 * Use cases: Automated S3 data discovery; Scheduled database cataloging; Schema change detection; Data lake metadata management
 *
 * AWS: AWS Glue crawler configuration for automated data discovery, schema inference, and Glue catalog population
 *
 * Validation: executionRoleArn, databaseName, description, and targets are required; schedule and extraConfiguration are optional
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
   * Q-ENHANCED-PROPERTY
   * Required crawler targets configuration specifying data sources to be crawled and cataloged. Defines the specific data locations including S3 buckets, databases, and other data sources that the crawler will scan for schema discovery and metadata extraction.
   *
   * Use cases: Data source specification; Multi-source crawling; Target data location definition; Comprehensive data discovery
   *
   * AWS: AWS Glue crawler targets configuration for specifying data sources to crawl and catalog
   *
   * Validation: Must be valid CrawlerTargets configuration; required for crawler data source specification
   **/
  readonly targets: CrawlerTargets;
  /**
   * Crawler configuration as a string.  See:  https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html
   */
  readonly extraConfiguration?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional crawler execution schedule configuration enabling automated periodic data discovery and catalog updates. Defines when and how frequently the crawler will run to discover new data and update the Glue catalog with schema changes and new partitions.
   *
   * Use cases: Automated data discovery; Scheduled catalog updates; Periodic schema detection; Regular metadata refresh
   *
   * AWS: AWS Glue crawler schedule configuration for automated execution timing and frequency
   *
   * Validation: Must be valid CfnCrawler.ScheduleProperty if provided; optional for on-demand crawler execution
   **/
  readonly schedule?: CfnCrawler.ScheduleProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional schema change policy configuration controlling how the crawler handles detected schema modifications and table structure changes. Defines behavior for schema evolution including update actions, deletion policies, and change detection sensitivity.
   *
   * Use cases: Schema evolution management; Table structure change handling; Metadata consistency; Schema change detection
   *
   * AWS: AWS Glue crawler schema change policy for handling table structure modifications and schema evolution
   *
   * Validation: Must be valid CfnCrawler.SchemaChangePolicyProperty if provided; optional for default schema change handling
   **/
  readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional string prefix to prepend to all table names created by the crawler enabling organized table naming and namespace management. Provides consistent table naming convention and helps avoid naming conflicts in shared Glue catalogs.
   *
   * Use cases: Table naming organization; Namespace management; Naming conflict avoidance; Consistent table naming
   *
   * AWS: AWS Glue crawler table prefix for systematic table naming and catalog organization
   *
   * Validation: Must be valid string if provided; optional for default table naming without prefix
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
  /**
   * Q-ENHANCED-PROPERTY
   * Required Glue security configuration name for crawler security and encryption enabling secure data discovery and compliance. Provides the security configuration that will be used by all crawlers for encryption, access control, and security compliance during data discovery operations.
   *
   * Use cases: Crawler security; Data encryption; Compliance configuration; Secure discovery
   *
   * AWS: Glue security configuration for crawler security and encryption compliance
   *
   * Validation: Must be valid security configuration name; required for crawler security and encryption compliance
   **/
  readonly securityConfigurationName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for crawler association and resource coordination enabling project-based resource organization and management. Provides the project identifier that associates crawlers with the DataOps project for resource coordination and governance integration.
   *
   * Use cases: Project association; Resource coordination; DataOps integration; Project management
   *
   * AWS: DataOps project name for crawler association and project-based resource organization
   *
   * Validation: Must be valid project name; required for crawler project association and resource coordination
   **/
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
