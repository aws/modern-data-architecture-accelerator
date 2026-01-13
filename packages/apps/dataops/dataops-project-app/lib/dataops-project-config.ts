/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  DatazoneProps,
  FailureNotificationsProps,
  LakeFormationConfig,
  NamedClassifierProps,
  NamedConnectionProps,
  NamedDatabaseProps,
  NamedSecurityGroupConfigProps,
} from '@aws-mdaa/dataops-project-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataOpsProjectConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of data engineer role references with operational access to project resources for data pipeline development and maintenance. Provides controlled access to project infrastructure for data engineering operations, pipeline development, and operational management.
   *
   * Use cases: Data engineering operations; Pipeline development access; Operational resource management
   *
   * AWS: AWS IAM roles with DataOps project operational access and resource management permissions
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; roles receive operational project access
   **/
  readonly dataEngineerRoles?: MdaaRoleRef[];

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of data admin role references with full administrative access to all project resources including databases, security, and configuration management. Provides administrative permissions for project management, security administration, and resource configuration.
   *
   * Use cases: Project administration; Security management; Resource configuration and administrative control
   *
   * AWS: AWS IAM roles with full DataOps project administrative access and management permissions
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive full project administrative access
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of database names to Glue database definitions enabling centralized metadata management and catalog organization. Provides database configuration for data catalog organization, table management, and metadata coordination within the project.
   *
   * Use cases: Centralized metadata management; Data catalog organization; Database-specific configuration and table coordination
   *
   * AWS: AWS Glue database definitions for metadata management and catalog organization
   *
   * Validation: Must be valid NamedDatabaseProps if provided; defines project database infrastructure
   *   **/
  readonly databases?: NamedDatabaseProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of classifier names to custom Glue classifier definitions enabling specialized data format recognition and parsing. Provides custom classification logic for non-standard data formats, proprietary file types, and specialized parsing requirements.
   *
   * Use cases: Custom data format recognition; Specialized parsing logic; Non-standard file type classification
   *
   * AWS: AWS Glue custom classifier definitions for specialized data format recognition and parsing
   *
   * Validation: Must be valid NamedClassifierProps if provided; defines custom classification logic
   **/
  readonly classifiers?: NamedClassifierProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of connection names to Glue connection definitions enabling secure connectivity to external data sources and databases. Provides connection configuration for JDBC databases, data warehouses, and other external systems requiring authentication.
   *
   * Use cases: External data source connectivity; Database connection management; Secure authentication configuration
   *
   * AWS: AWS Glue connection definitions for external data source connectivity and authentication
   *
   * Validation: Must be valid NamedConnectionProps if provided; defines external system connections
   **/
  readonly connections?: NamedConnectionProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of pre-defined execution role references for project resource operations enabling consistent role usage across project components. Provides standardized execution roles for Glue jobs, crawlers, and other project resources requiring specific permissions.
   *
   * Use cases: Standardized execution roles; Consistent permission management; Cross-component role coordination
   *
   * AWS: AWS IAM roles for project resource execution and cross-service operations
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; roles used for project resource execution
   **/
  readonly projectExecutionRoles?: MdaaRoleRef[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for S3 output encryption ensuring data protection compliance for all project output data. Provides encryption at rest for project-generated data with customer-controlled key management for enhanced security posture.
   *
   * Use cases: Output data encryption; Data protection compliance; Customer key management for project outputs
   *
   * AWS: AWS KMS key for S3 output encryption and data protection in project operations
   *
   * Validation: Must be valid KMS key ARN if provided; used for all project S3 output encryption
   **/
  readonly s3OutputKmsKeyArn?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for Glue Catalog encryption ensuring metadata protection compliance for all project catalog operations. Provides encryption at rest for catalog metadata with customer-controlled key management for enhanced security.
   *
   * Use cases: Catalog metadata encryption; Metadata protection compliance; Customer key management for catalog data
   *
   * AWS: AWS KMS key for Glue Catalog encryption and metadata protection in project operations
   *
   * Validation: Must be valid KMS key ARN if provided; used for all project catalog encryption
   **/
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional failure notification configuration for Glue job monitoring and alerting enabling proactive error management and operational visibility. Provides notification setup for job failures, errors, and operational issues within the project.
   *
   * Use cases: Proactive error management; Operational alerting; Job failure notification and monitoring
   *
   * AWS: AWS SNS and CloudWatch integration for Glue job failure notifications and monitoring
   *
   * Validation: Must be valid FailureNotificationsProps if provided; enables failure alerting and monitoring
   **/
  readonly failureNotifications?: FailureNotificationsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of security group names to configuration definitions enabling shared network security controls across project resources. Provides centralized security group management for consistent network access control and resource coordination.
   *
   * Use cases: Shared network security controls; Centralized security group management; Consistent access control across resources
   *
   * AWS: Amazon VPC security groups for project resource network access control and coordination
   *
   * Validation: Must be valid NamedSecurityGroupConfigProps if provided; defines shared security group infrastructure
   *   **/
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional DataZone configuration for data governance and catalog integration enabling data discovery and governance capabilities. Provides DataZone domain integration for data asset management, governance workflows, and collaborative data discovery.
   *
   * Use cases: Data governance integration; Collaborative data discovery; Data asset management and governance workflows
   *
   * AWS: Amazon DataZone integration for data governance and collaborative discovery capabilities
   *
   * Validation: Must be valid DatazoneProps if provided; enables DataZone governance integration
   **/
  readonly datazone?: DatazoneProps;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional project-level Lake Formation configuration for centralized tag-based access control management. Defines project-wide Lake Formation resources including tag vocabulary that is shared across all databases in the project.
   *
   * Use cases: Centralized tag management; Project-wide TBAC vocabulary; Shared governance configuration
   *
   * AWS: AWS Lake Formation project-level configuration for centralized tag-based access control
   *
   * Validation: Must be valid ProjectLakeFormationConfig if provided; lfTags define project-wide tag vocabulary
   **/
  readonly lakeFormation?: LakeFormationConfig;
}

export class DataOpsProjectConfigParser extends MdaaAppConfigParser<DataOpsProjectConfigContents> {
  public readonly dataAdminRoleRefs: MdaaRoleRef[];
  public readonly dataEngineerRoleRefs: MdaaRoleRef[];
  public readonly databases?: NamedDatabaseProps;
  public readonly projectExecutionRoleRefs: MdaaRoleRef[];
  public readonly connections?: NamedConnectionProps;
  public readonly classifiers?: NamedClassifierProps;
  public readonly s3OutputKmsKeyArn?: string;
  public readonly glueCatalogKmsKeyArn?: string;
  public readonly failureNotifications?: FailureNotificationsProps;
  public readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;
  public readonly datazone?: DatazoneProps;
  public readonly lakeFormation?: LakeFormationConfig;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.dataAdminRoleRefs = this.configContents.dataAdminRoles;
    this.dataEngineerRoleRefs = this.configContents.dataEngineerRoles ?? [];
    this.projectExecutionRoleRefs = this.configContents.projectExecutionRoles ?? [];
    this.classifiers = this.configContents.classifiers;
    this.databases = this.configContents.databases;
    this.connections = this.configContents.connections;
    this.s3OutputKmsKeyArn = this.configContents.s3OutputKmsKeyArn;
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.failureNotifications = this.configContents.failureNotifications;
    this.securityGroupConfigs = this.configContents.securityGroupConfigs;
    this.datazone = this.configContents.datazone;
    this.lakeFormation = this.configContents.lakeFormation;
  }
}
