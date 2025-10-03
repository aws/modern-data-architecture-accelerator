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
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN that provides the crawler with permissions to access data sources and write metadata to the Glue catalog. Must have appropriate permissions for S3 access, Glue catalog operations, and any other target data sources.
   *
   * Use cases: Secure data source access; Glue catalog write permissions; Cross-service access control
   *
   * AWS: AWS Glue crawler IAM role for data source access and catalog operations
   *
   * Validation: Must be valid IAM role ARN; role must be assumable by glue.amazonaws.com service principal
   **/
  readonly role: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required collection of data source targets for the crawler to discover and catalog. Defines S3 locations, databases, or other data sources that the crawler will scan for schema discovery and metadata extraction.
   *
   * Use cases: S3 data lake discovery; Database schema cataloging; Multi-source data discovery
   *
   * AWS: AWS Glue crawler targets configuration for data source discovery and cataloging
   *
   * Validation: Must be valid CfnCrawler.TargetsProperty or IResolvable; at least one target required
   *   **/
  readonly targets: CfnCrawler.TargetsProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of custom classifier names for specialized data format recognition. Enables crawler to recognize and process custom data formats beyond standard formats for data discovery.
   *
   * Use cases: Custom data format recognition; Specialized file type processing; Enhanced schema detection
   *
   * AWS: AWS Glue custom classifiers for specialized data format recognition during crawling
   *
   * Validation: Must be array of valid Glue classifier names if provided; classifiers must exist in the account
   **/
  readonly classifiers?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional JSON configuration string controlling crawler behavior and processing options. Enables fine-tuned control over crawler operations including sampling, partitioning, and schema inference settings.
   *
   * Use cases: Crawler behavior customization; Performance optimization; Schema inference tuning
   *
   * AWS: AWS Glue crawler configuration for behavior control and processing optimization
   *
   * Validation: Must be valid JSON string if provided; follows Glue crawler configuration schema
   **/
  readonly configuration?: string;
  readonly crawlerSecurityConfiguration: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional name of the Glue database where the crawler will store discovered table metadata. Specifies the target database for catalog entries created by the crawler, enabling organized metadata storage and data discovery.
   *
   * Use cases: Organized metadata storage; Database-specific cataloging; Data discovery organization
   *
   * AWS: AWS Glue database name for crawler output storage and metadata organization
   *
   * Validation: Must be valid Glue database name if provided; database must exist or be created before crawler execution
   **/
  readonly databaseName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the crawler explaining its purpose and data sources. Provides documentation for crawler management and helps users understand the crawler's role in the data discovery process.
   *
   * Use cases: Crawler documentation; Operational clarity; Data discovery understanding
   *
   * AWS: AWS Glue crawler description for management and operational documentation
   *
   * Validation: Must be descriptive text if provided; recommended for crawler management clarity
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional name for the crawler that will be processed through MDAA naming conventions. If not specified, a name will be generated automatically following organizational naming standards for consistent resource identification.
   *
   * Use cases: Predictable crawler naming; Cross-service integration; Operational management
   *
   * AWS: AWS Glue crawler name for resource identification and management
   *
   * Validation: Must be valid Glue crawler name if provided; processed through MDAA naming conventions
   **/
  readonly name?: string;
  readonly recrawlPolicy?: CfnCrawler.RecrawlPolicyProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional schedule configuration for automated crawler execution using cron expressions or rate expressions. Enables regular data discovery updates and automated metadata refresh for evolving data sources.
   *
   * Use cases: Automated data discovery; Regular metadata updates; Scheduled schema evolution tracking
   *
   * AWS: AWS Glue crawler schedule for automated execution and regular data discovery
   *
   * Validation: Must be valid CfnCrawler.ScheduleProperty or IResolvable if provided; uses cron or rate expressions
   *   **/
  readonly schedule?: CfnCrawler.ScheduleProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional policy configuration controlling how the crawler handles schema changes and table updates. Defines behavior for schema evolution scenarios including column additions, deletions, and type changes for robust metadata management.
   *
   * Use cases: Schema evolution management; Table update control; Metadata consistency maintenance
   *
   * AWS: AWS Glue crawler schema change policy for handling data structure evolution
   *
   * Validation: Must be valid CfnCrawler.SchemaChangePolicyProperty or IResolvable if provided; controls schema change handling
   *   **/
  readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional prefix string added to all table names created by the crawler for namespace organization and collision avoidance. Enables systematic table naming and helps organize discovered tables within the Glue catalog.
   *
   * Use cases: Table namespace organization; Naming collision avoidance; Systematic table identification
   *
   * AWS: AWS Glue crawler table prefix for systematic table naming and organization
   *
   * Validation: Must be valid table name prefix if provided; prepended to all discovered table names
   **/
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
