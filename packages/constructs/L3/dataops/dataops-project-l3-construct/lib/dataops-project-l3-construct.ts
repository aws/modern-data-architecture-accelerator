/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityConfiguration } from '@aws-cdk/aws-glue-alpha';
import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import { DomainConfig, MdaaDatazoneProject, MdaaDatazoneProjectProps } from '@aws-mdaa/datazone-constructs';
import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-mdaa/ec2-l3-construct';
import { MdaaSecurityConfig } from '@aws-mdaa/glue-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  GrantProps,
  LakeFormationAccessControlL3Construct,
  LakeFormationAccessControlL3ConstructProps,
  NamedGrantProps,
  NamedPrincipalProps,
  NamedResourceLinkProps,
  PermissionsConfig,
  PrincipalProps,
  ResourceLinkProps,
} from '@aws-mdaa/lakeformation-access-control-l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaSnsTopic, MdaaSnsTopicProps } from '@aws-mdaa/sns-constructs';
import { Arn, ArnComponents, ArnFormat, Tags } from 'aws-cdk-lib';
import {
  CfnDataSource,
  CfnDataSourceProps,
  CfnEnvironment,
  CfnEnvironmentActions,
  CfnEnvironmentActionsProps,
  CfnEnvironmentProps,
  CfnSubscriptionTarget,
  CfnSubscriptionTargetProps,
} from 'aws-cdk-lib/aws-datazone';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { CfnClassifier, CfnConnection, CfnDatabase } from 'aws-cdk-lib/aws-glue';
import {
  AccountPrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnPrincipalPermissions, CfnResource } from 'aws-cdk-lib/aws-lakeformation';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ConfigurationElement } from '@aws-mdaa/config';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';

/**
 * Q-ENHANCED-INTERFACE
 * Named database grant configuration interface for Lake Formation permissions management with database-level access control capabilities. Defines named database grant mappings for systematic Lake Formation permission assignment to principals with database-specific access patterns in data lake governance.
 *
 * Use cases: Database-level access control; Named permission sets; Lake Formation governance; Principal-database mapping; Data access management
 *
 * AWS: AWS Lake Formation database permissions with named grant configurations for systematic access control
 *
 * Validation: Names must be unique identifiers; each entry must map to valid DatabaseGrantProps configuration
 */
export interface NamedDatabaseGrantProps {
  /**
   * The unique name of the grant
   */
  /** @jsii ignore */
  readonly [name: string]: DatabaseGrantProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named principal ARN configuration interface for IAM role and user management with systematic principal organization capabilities. Defines named principal ARN mappings for organized role and user management in DataOps project access control and resource permissions.
 *
 * Use cases: Named role management; Principal organization; Access control mapping; Role-based permissions; Identity management
 *
 * AWS: IAM principal ARN organization with named mappings for systematic role and user management in DataOps projects
 *
 * Validation: Names must be unique identifiers; ARNs must be valid IAM principal ARNs (roles, users, or groups)
 */
export interface NamedPrincipalArnProps {
  /** @jsii ignore */
  [name: string]: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Database grant configuration interface for Lake Formation permissions with database-level access control and principal assignment capabilities. Defines database grant properties for Lake Formation permission management including database targeting, permission types, and principal assignments for data lake governance.
 *
 * Use cases: Database access permissions; Lake Formation grants; Data governance; Principal-database access; Permission management
 *
 * AWS: AWS Lake Formation database grant configuration for database-level permissions and access control
 *
 * Validation: Database and principals must be specified; permissions must be valid Lake Formation database permissions
 */
export interface DatabaseGrantProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation database-level permissions configuration for controlling database access patterns. Defines the level of database access granted to principals, supporting read-only, read-write, or administrative access patterns for data lake governance and access control.
   *
   * Use cases: Database access control; Read-only analytics access; Administrative database management; Data governance permissions
   *
   * AWS: AWS Lake Formation database permissions for database-level access control
   *
   * Validation: Must be 'read', 'write', or 'super'; defaults to 'read'; controls database-level access patterns
   *   **/
  readonly databasePermissions?: PermissionsConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation table-level permissions configuration for controlling table access patterns within the database. Defines the level of table access granted to principals, enabling fine-grained access control for individual tables while maintaining database-level organization.
   *
   * Use cases: Table-level access control; Fine-grained permissions; Table-specific analytics access; Data governance at table level
   *
   * AWS: AWS Lake Formation table permissions for table-level access control within databases
   *
   * Validation: Must be 'read', 'write', or 'super'; defaults to 'read'; controls table-level access patterns
   **/
  readonly tablePermissions?: PermissionsConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Specific table names for targeted Lake Formation grant creation within the database. Enables fine-grained access control by specifying exact tables for permission grants, supporting selective data access patterns and table-specific governance requirements.
   *
   * Use cases: Selective table access; Fine-grained permissions; Table-specific data access; Targeted governance
   *
   * AWS: AWS Lake Formation table-specific grants for targeted table access control
   *
   * Validation: Table names must exist in the database before grants can be created; must be valid Glue table identifiers
   **/
  readonly tables?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Named principal references for Lake Formation grant assignment using predefined principal configurations. References principals defined in the 'principals:' section of the configuration, enabling organized and reusable principal management for database access control.
   *
   * Use cases: Reusable principal management; Organized access control; Named principal references; Systematic permission assignment
   *
   * AWS: AWS Lake Formation principal grants using named principal configurations for organized access control
   *
   * Validation: Principal names must exist in the 'principals:' section; must reference valid named principal configurations
   **/
  readonly principals?: NamedPrincipalProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Direct principal ARN mapping for Lake Formation grant assignment with inline principal specification. Provides shorthand method for specifying principals directly by ARN without requiring separate principal definitions, simplifying configuration for straightforward access control scenarios.
   *
   * Use cases: Direct principal assignment; Simplified configuration; Inline principal specification; Straightforward access control
   *
   * AWS: AWS Lake Formation principal grants using direct ARN specification for simplified access control
   *
   * Validation: ARNs must be valid IAM principal ARNs (roles, users, or groups); names must be unique identifiers
   **/
  readonly principalArns?: NamedPrincipalArnProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation database permissions configuration interface for DataOps project database access control with automatic data admin role grant management. Enables automatic creation of Lake Formation super grants for data admin roles on project databases, simplifying permission management for DataOps teams while maintaining fine-grained access control.
 *
 * Use cases: Automated data admin permissions; DataOps team access management; Lake Formation grant automation; Database permission simplification; Project-level access control
 *
 * AWS: AWS Lake Formation database permissions with automatic super grants for data admin roles on DataOps project databases
 *
 * Validation: createSuperGrantsForDataAdminRoles must be boolean; data admin roles must exist in the account; database must be registered with Lake Formation
 */
export interface DatabaseLakeFormationProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Automatic Lake Formation super grant creation for data admin roles on project databases. When enabled, automatically creates read/write/super permissions for data admin roles, simplifying administrative access management while maintaining security boundaries for DataOps projects.
   *
   * Use cases: Automated admin access; DataOps team management; Administrative permission simplification; Project-level admin control
   *
   * AWS: AWS Lake Formation super grants for data admin roles providing database permissions
   *
   * Validation: Must be boolean; defaults to false; data admin roles must exist in the account
   **/
  readonly createSuperGrantsForDataAdminRoles?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Automatic Lake Formation read grant creation for data engineer roles on project databases. When enabled, automatically creates read-only permissions for data engineer roles, enabling data exploration and analysis while maintaining appropriate access boundaries for engineering teams.
   *
   * Use cases: Engineering team read access; Data exploration; Analysis permissions; Engineering access control
   *
   * AWS: AWS Lake Formation read grants for data engineer roles with database read permissions
   *
   * Validation: Must be boolean; defaults to false; data engineer roles must exist in the account
   **/
  readonly createReadGrantsForDataEngineerRoles?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Automatic Lake Formation read/write grant creation for project execution roles on databases and S3 locations. When enabled, automatically creates read/write permissions for project execution roles, enabling automated data processing while maintaining execution-level access control.
   *
   * Use cases: Automated data processing; Project execution access; ETL pipeline permissions; Automated workflow access
   *
   * AWS: AWS Lake Formation read/write grants for project execution roles with database and S3 location permissions
   *
   * Validation: Must be boolean; defaults to false; project execution roles must exist; databases must be registered with Lake Formation
   **/
  readonly createReadWriteGrantsForProjectExecutionRoles?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Cross-account resource link creation for multi-account Lake Formation access with automatic stack generation. Specifies target account numbers for cross-account resource link creation, enabling multi-account data sharing while maintaining governance boundaries through Lake Formation.
   *
   * Use cases: Multi-account data sharing; Cross-account analytics; Federated data access; Account boundary management
   *
   * AWS: AWS Lake Formation cross-account resource links with automatic stack creation for multi-account access
   *
   * Validation: Must be valid AWS account numbers; additional stacks created for each account; accounts must have Lake Formation enabled
   **/
  readonly createCrossAccountResourceLinkAccounts?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Custom name for cross-account resource link creation with naming convention override. Specifies the name for the resource link when creating cross-account access, enabling organized resource link management and avoiding naming conflicts in multi-account scenarios.
   *
   * Use cases: Custom resource link naming; Naming conflict avoidance; Organized multi-account access; Resource link management
   *
   * AWS: AWS Lake Formation resource link name for cross-account access organization
   *
   * Validation: Must be valid Lake Formation resource link name; defaults to database name if not specified
   **/
  readonly createCrossAccountResourceLinkName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Named Lake Formation grant collection for organized database permission management. Defines a collection of named database grants with specific permission configurations, enabling systematic and reusable permission management for complex access control scenarios.
   *
   * Use cases: Organized permission management; Named grant collections; Systematic access control; Reusable grant configurations
   *
   * AWS: AWS Lake Formation database grants with named configurations for organized permission management
   *
   * Validation: Grant names must be unique identifiers; each grant must map to valid DatabaseGrantProps configuration
   **/
  readonly grants?: NamedDatabaseGrantProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named Glue database collection interface for managing multiple databases with string-based naming for organized data catalog management. Enables configuration of multiple Glue databases with unique identifiers, supporting multi-database DataOps projects and organized metadata management for data lake governance.
 *
 * Use cases: Multi-database projects; Database collection management; Named database organization; Data catalog management; DataOps database organization; Metadata governance
 *
 * AWS: Multiple AWS Glue databases with organized naming for DataOps project data catalog and metadata management
 *
 * Validation: Database names must be valid Glue database identifiers; each DatabaseProps must be valid database configuration; names must be unique within collection
 */
export interface NamedDatabaseProps {
  /** @jsii ignore */
  readonly [name: string]: DatabaseProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Glue database configuration interface for data catalog management with S3 location mapping and naming convention control. Defines database properties for DataOps projects including description, naming options, Iceberg compliance, and S3 bucket location specification for organized data lake metadata management.
 *
 * Use cases: Data catalog creation; Database metadata management; S3 location mapping; Iceberg table support; DataOps database configuration; Data lake organization
 *
 * AWS: AWS Glue database with S3 location configuration for DataOps project data catalog and metadata management
 *
 * Validation: description must be non-empty string; locationBucketName must be valid S3 bucket name if specified; verbatimName and icebergCompliantName are mutually compatible
 */
export interface DatabaseProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Descriptive text for the Glue database providing context and purpose information for data catalog management. Enables documentation and understanding of database purpose within DataOps projects, supporting data governance and team collaboration through clear database identification.
   *
   * Use cases: Database documentation; Data catalog organization; Team collaboration; Database purpose identification
   *
   * AWS: AWS Glue database description for data catalog documentation and organization
   *
   * Validation: Must be non-empty string; required property for database creation
   **/
  readonly description: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Exact database name specification bypassing naming convention application for precise database naming control. When enabled, creates the database with the exact specified name without applying organizational naming conventions, supporting legacy system integration and specific naming requirements.
   *
   * Use cases: Legacy system integration; Exact naming requirements; Naming convention bypass; Specific database naming
   *
   * AWS: AWS Glue database name without naming convention transformation for precise naming control
   *
   * Validation: Must be boolean; defaults to false; when true, naming conventions do not apply
   **/
  readonly verbatimName?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Iceberg-compliant database naming with hyphen-to-underscore transformation for Apache Iceberg table format compatibility. When enabled, replaces hyphens with underscores in database names to ensure compatibility with Iceberg table format requirements and naming conventions.
   *
   * Use cases: Iceberg table compatibility; Database naming compliance; Apache Iceberg integration; Format-specific naming
   *
   * AWS: AWS Glue database name transformation for Apache Iceberg table format compatibility
   *
   * Validation: Must be boolean; applies to both verbatim and conventional database names; ensures Iceberg naming compliance
   **/
  readonly icebergCompliantName?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * S3 bucket name for database data storage location specification enabling organized data lake storage management. Specifies the target S3 bucket where all database data will be stored, supporting data lake organization and storage management for DataOps projects.
   *
   * Use cases: Data lake organization; S3 storage management; Database data location; Storage bucket specification
   *
   * AWS: AWS Glue database location URI pointing to S3 bucket for data storage organization
   *
   * Validation: Must be valid S3 bucket name if specified; bucket must exist and be accessible
   **/
  readonly locationBucketName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * S3 prefix for database data organization within the specified bucket enabling hierarchical data storage management. Defines the S3 prefix path where database data will be organized, supporting structured data lake storage and logical data separation within buckets.
   *
   * Use cases: Hierarchical data organization; S3 prefix management; Data separation; Storage path organization
   *
   * AWS: AWS Glue database location URI with S3 prefix for hierarchical data organization
   *
   * Validation: Must be valid S3 prefix path; combined with bucket name forms complete S3 location URI
   **/
  readonly locationPrefix?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation configuration for database access control and permission management enabling fine-grained data governance. Defines Lake Formation-specific settings including automatic grant creation, cross-account access, and permission management for data lake governance and access control.
   *
   * Use cases: Data governance; Access control; Permission management; Cross-account sharing; Lake Formation integration
   *
   * AWS: AWS Lake Formation database configuration for data governance and access control
   *
   * Validation: Must be valid DatabaseLakeFormationProps configuration; Lake Formation must be enabled in the account
   **/
  readonly lakeFormation?: DatabaseLakeFormationProps;

  /**
   * Q-ENHANCED-PROPERTY
   * DataZone data source creation for automated data discovery and cataloging integration enabling data governance. When enabled, automatically creates DataZone data sources for the database, supporting automated data discovery, cataloging, and governance workflows within DataZone domains.
   *
   * Use cases: Automated data discovery; DataZone integration; Data cataloging; Governance automation; Data source management
   *
   * AWS: AWS DataZone data source creation for automated database discovery and cataloging integration
   *
   * Validation: Must be boolean; DataZone domain must exist; database must be compatible with DataZone data source requirements
   **/
  readonly createDatazoneDatasource?: boolean;
}

export type ClassifierType = 'csv' | 'grok' | 'json' | 'xml';

// Cannot useCfnClassifier.GrokClassifierProperty as some values allow IResolvable
/**
 * Q-ENHANCED-INTERFACE
 * Glue CSV classifier configuration interface for CSV data format recognition with delimiter, header, and column parsing options. Defines CSV-specific classifier properties for DataOps projects including delimiter specification, header detection, column trimming, and quote symbol handling for accurate CSV data schema detection and parsing.
 *
 * Use cases: CSV data classification; Delimiter-based parsing; Header detection; Column schema inference; CSV format recognition; Data parsing configuration
 *
 * AWS: AWS Glue CSV classifier with configurable parsing options for CSV data format recognition and schema detection
 *
 * Validation: delimiter must be valid CSV delimiter character if specified; containsHeader must be valid header detection option; header must be valid column names if specified; quoteSymbol must be valid quote character
 */
export interface ClassifierCsvProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Single column CSV parsing allowance for simplified CSV data structure recognition enabling processing of single-column CSV files. When enabled, allows the classifier to recognize and process CSV files containing only a single column, supporting simplified data formats and edge cases in data processing workflows.
   *
   * Use cases: Single-column CSV processing; Simplified data formats; Edge case handling; Basic CSV structure recognition
   *
   * AWS: AWS Glue CSV classifier allowSingleColumn property for single-column CSV file recognition
   *
   * Validation: Must be boolean; enables recognition of single-column CSV files when true
   **/
  readonly allowSingleColumn?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Header detection configuration for CSV parsing with automatic header row recognition enabling intelligent column naming. Specifies how the classifier should detect and handle header rows in CSV files, supporting automatic column naming and schema inference for structured data processing.
   *
   * Use cases: Automatic header detection; Column naming; Schema inference; Structured CSV processing
   *
   * AWS: AWS Glue CSV classifier containsHeader property for header row detection and processing
   *
   * Validation: Must be valid header detection option ('UNKNOWN', 'PRESENT', 'ABSENT'); controls header row processing behavior
   **/
  readonly containsHeader?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * CSV field delimiter specification for column separation parsing enabling custom delimiter support. Defines the character used to separate fields in CSV files, supporting various CSV formats and regional conventions for flexible data parsing and schema detection.
   *
   * Use cases: Custom delimiter support; Regional CSV formats; Field separation; Flexible CSV parsing
   *
   * AWS: AWS Glue CSV classifier delimiter property for custom field separation in CSV parsing
   *
   * Validation: Must be valid CSV delimiter character; common values include comma, semicolon, tab, pipe
   **/
  readonly delimiter?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Value trimming control for CSV field processing with whitespace handling configuration enabling precise data parsing. When disabled, prevents automatic trimming of leading and trailing whitespace from CSV field values, preserving exact data formatting for sensitive data processing scenarios.
   *
   * Use cases: Exact data preservation; Whitespace-sensitive data; Precise formatting; Data integrity maintenance
   *
   * AWS: AWS Glue CSV classifier disableValueTrimming property for whitespace handling control
   *
   * Validation: Must be boolean; when true, disables automatic whitespace trimming from field values
   **/
  readonly disableValueTrimming?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Explicit column header specification for CSV schema definition enabling predefined column naming. Provides explicit column names for CSV files, overriding automatic header detection and enabling consistent schema application for files with varying or missing headers.
   *
   * Use cases: Predefined column naming; Consistent schema application; Header override; Schema standardization
   *
   * AWS: AWS Glue CSV classifier header property for explicit column name specification
   *
   * Validation: Must be array of valid column names; overrides automatic header detection when specified
   **/
  readonly header?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Classifier name specification for identification and management enabling organized classifier administration. Provides a unique name for the CSV classifier, supporting classifier organization and management within DataOps projects and Glue catalog administration.
   *
   * Use cases: Classifier identification; Organization; Management; Catalog administration
   *
   * AWS: AWS Glue classifier name property for classifier identification and management
   *
   * Validation: Must be valid Glue classifier name; must be unique within the account and region
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Quote symbol specification for CSV field enclosure parsing enabling quoted field support. Defines the character used to enclose fields containing special characters or delimiters, supporting complex CSV formats with embedded delimiters and special characters.
   *
   * Use cases: Quoted field support; Special character handling; Complex CSV formats; Embedded delimiter processing
   *
   * AWS: AWS Glue CSV classifier quoteSymbol property for field enclosure character specification
   *
   * Validation: Must be valid quote character; commonly double quote or single quote; enables proper parsing of enclosed fields
   **/
  readonly quoteSymbol?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Glue classifier configuration union interface for multi-format data classification with CSV, Grok, JSON, and XML classifier support. Defines classifier configuration properties for DataOps projects enabling format-specific data recognition including structured CSV, pattern-based Grok, hierarchical JSON, and XML document parsing configurations.
 *
 * Use cases: Multi-format data classification; Format-specific parsing; Data schema detection; Custom pattern recognition; Structured data parsing; Document format recognition
 *
 * AWS: AWS Glue classifier configuration with support for CSV, Grok, JSON, and XML data format classification and schema detection
 *
 * Validation: Exactly one classifier type must be specified; csvClassifier must be valid ClassifierCsvProps if specified; other classifiers must be valid CloudFormation classifier properties
 */
export interface ClassifierConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * CSV classifier configuration for comma-separated value data format recognition with delimiter and header parsing capabilities. Enables CSV-specific data classification including delimiter specification, header detection, and column parsing for structured data processing in DataOps workflows.
   *
   * Use cases: CSV data classification; Delimiter-based parsing; Header detection; Structured data processing
   *
   * AWS: AWS Glue CSV classifier configuration for CSV data format recognition and schema detection
   *
   * Validation: Must be valid ClassifierCsvProps configuration; see AWS CloudFormation CSV classifier documentation for detailed properties
   **/
  readonly csvClassifier?: ClassifierCsvProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Grok classifier configuration for pattern-based data format recognition with custom pattern matching capabilities. Enables Grok pattern-based data classification for log files and semi-structured data using regular expression patterns for flexible data parsing and schema extraction.
   *
   * Use cases: Log file parsing; Pattern-based recognition; Semi-structured data; Custom format processing
   *
   * AWS: AWS Glue Grok classifier configuration for pattern-based data format recognition and parsing
   *
   * Validation: Must be valid GrokClassifierProperty configuration; see AWS CloudFormation Grok classifier documentation for pattern specifications
   *   **/
  readonly grokClassifier?: CfnClassifier.GrokClassifierProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * JSON classifier configuration for JavaScript Object Notation data format recognition with hierarchical structure parsing. Enables JSON-specific data classification for nested and hierarchical data structures, supporting complex data parsing and schema inference for JSON-based data sources.
   *
   * Use cases: JSON data classification; Hierarchical data parsing; Nested structure recognition; API data processing
   *
   * AWS: AWS Glue JSON classifier configuration for JSON data format recognition and schema detection
   *
   * Validation: Must be valid JsonClassifierProperty configuration; see AWS CloudFormation JSON classifier documentation for path specifications
   *   **/
  readonly jsonClassifier?: CfnClassifier.JsonClassifierProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * XML classifier configuration for Extensible Markup Language data format recognition with tag-based structure parsing. Enables XML-specific data classification for document-based data structures, supporting XML parsing and schema inference for document-oriented data sources.
   *
   * Use cases: XML document parsing; Tag-based recognition; Document structure processing; Markup language handling
   *
   * AWS: AWS Glue XML classifier configuration for XML data format recognition and schema detection
   *
   * Validation: Must be valid XMLClassifierProperty configuration; see AWS CloudFormation XML classifier documentation for row tag specifications
   *   **/
  readonly xmlClassifier?: CfnClassifier.XMLClassifierProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named Glue classifier collection interface for managing multiple classifiers with string-based naming for organized data format recognition. Enables configuration of multiple Glue classifiers with unique identifiers, supporting multi-format DataOps projects and organized data classification management for diverse data source processing.
 *
 * Use cases: Multi-classifier projects; Classifier collection management; Named classifier organization; Format recognition management; DataOps classifier organization; Data format governance
 *
 * AWS: Multiple AWS Glue classifiers with organized naming for DataOps project data format recognition and classification management
 *
 * Validation: Classifier names must be valid Glue classifier identifiers; each ClassifierProps must be valid classifier configuration; names must be unique within collection
 */
export interface NamedClassifierProps {
  /** @jsii ignore */
  readonly [name: string]: ClassifierProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Glue classifier configuration interface for custom data format recognition with type-specific configuration management. Defines classifier properties for DataOps projects including classifier type selection and format-specific configuration for automated data schema detection and parsing in ETL workflows.
 *
 * Use cases: Custom data format recognition; Schema detection automation; Data parsing configuration; ETL data classification; Format-specific processing; Automated schema inference
 *
 * AWS: AWS Glue classifiers with custom configuration for automated data format recognition and schema detection in DataOps workflows
 *
 * Validation: classifierType must be valid ClassifierType enum value; configuration must be valid ClassifierConfigProps for specified type; configuration must match classifier type requirements
 */
export interface ClassifierProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Classifier type specification for data format recognition with support for CSV, Grok, JSON, and XML formats. Defines the specific type of classifier to create, enabling format-appropriate data parsing and schema detection for diverse data sources in DataOps workflows.
   *
   * Use cases: Format-specific classification; Data type recognition; Schema detection; Format-appropriate parsing
   *
   * AWS: AWS Glue classifier type selection for format-specific data recognition and parsing
   *
   * Validation: Must be valid ClassifierType enum value ('csv', 'grok', 'json', 'xml'); determines classifier behavior and configuration requirements
   *   **/
  readonly classifierType: ClassifierType;
  /**
   * Q-ENHANCED-PROPERTY
   * Type-specific classifier configuration properties for customized data format recognition and parsing behavior. Provides detailed configuration options specific to the selected classifier type, enabling fine-tuned data parsing and schema detection for optimal data processing results.
   *
   * Use cases: Custom parsing configuration; Format-specific tuning; Schema detection optimization; Data processing customization
   *
   * AWS: AWS Glue classifier configuration properties for customized data format recognition and parsing
   *
   * Validation: Must be valid ClassifierConfigProps for specified classifier type; configuration must match classifier type requirements; see AWS CloudFormation Glue classifier documentation
   **/
  readonly configuration: ClassifierConfigProps;
}

export type ConnectionType = 'JDBC' | 'KAFKA' | 'MONGODB' | 'NETWORK';

// CDK Type contains IResolvable, so we need to defin this one here!
/**
 * Q-ENHANCED-INTERFACE
 * Physical connection configuration interface for Glue connection VPC networking with availability zone and security group management. Defines physical networking properties for DataOps project connections including AZ placement, security group configuration, and subnet specification for secure external data source connectivity.
 *
 * Use cases: VPC connection configuration; Network security; External data source connectivity; Secure networking
 *
 * AWS: Glue connection physical requirements for VPC networking and security configuration
 *
 * Validation: All properties are optional; must be valid AWS networking identifiers when provided
 */
export interface ConnectionPhysical {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional availability zone specification for Glue connection placement enabling zone-specific networking and resource locality. Defines the AZ where the connection will be established affecting network latency and availability for external data source connectivity.
   *
   * Use cases: Zone-specific placement; Network locality; Availability optimization; Connection placement
   *
   * AWS: AWS Availability Zone for Glue connection placement and networking optimization
   *
   * Validation: Must be valid AWS Availability Zone string if provided; affects connection placement and network performance
   **/
  readonly availabilityZone?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of project-generated security group names for connection network access control enabling organized security management. Specifies security groups generated within the project configuration for connection access control and network security.
   *
   * Use cases: Project security groups; Network access control; Organized security; Connection security
   *
   * AWS: Project-generated security group names for Glue connection network access control
   *
   * Validation: Must be array of valid security group names if provided; references project-generated security groups
   **/
  readonly projectSecurityGroupNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of security group IDs for VPC connection access control enabling external security group integration. Specifies existing security group IDs for connection network access control and integration with external VPC security configurations.
   *
   * Use cases: External security groups; VPC integration; Network access control; Security group reuse
   *
   * AWS: AWS security group IDs for Glue connection VPC access control and network security
   *
   * Validation: Must be array of valid security group IDs if provided; must exist in the specified VPC
   **/
  readonly securityGroupIdList?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional subnet ID for connection VPC placement enabling subnet-specific networking and access control. Specifies the VPC subnet where the connection will be established for network isolation and connectivity management.
   *
   * Use cases: Subnet placement; Network isolation; VPC connectivity; Network segmentation
   *
   * AWS: AWS VPC subnet ID for Glue connection placement and network isolation
   *
   * Validation: Must be valid VPC subnet ID if provided; must be in the specified availability zone and VPC
   **/
  readonly subnetId?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named Glue connection collection interface for managing multiple external data source connections with string-based naming for organized connectivity management. Enables configuration of multiple Glue connections with unique identifiers, supporting multi-source DataOps projects and organized connection management for diverse external data systems.
 *
 * Use cases: Multi-connection projects; Connection collection management; Named connection organization; External data source management; DataOps connection organization; Data source governance
 *
 * AWS: Multiple AWS Glue connections with organized naming for DataOps project external data source connectivity and connection management
 *
 * Validation: Connection names must be valid Glue connection identifiers; each ConnectionProps must be valid connection configuration; names must be unique within collection
 */
export interface NamedConnectionProps {
  /** @jsii ignore */
  readonly [name: string]: ConnectionProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Glue connection configuration interface for external data source connectivity with multi-protocol support and connection property management. Defines connection properties for DataOps projects including connection type specification, authentication properties, and match criteria for database, streaming, and network connections.
 *
 * Use cases: External data source connectivity; Database connections; Streaming data connections; Network connectivity; Authentication management; Multi-protocol data access
 *
 * AWS: AWS Glue connections with multi-protocol support for JDBC, Kafka, MongoDB, and network connections in DataOps workflows
 *
 * Validation: connectionType must be valid ConnectionType enum value; connectionProperties must be valid for specified connection type; matchCriteria must be valid selection criteria
 */
export interface ConnectionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required connection type specification for external data source connectivity enabling multi-protocol data access. Defines the connection protocol type (JDBC, Kafka, MongoDB, Network) affecting connection properties and authentication requirements for DataOps external data integration.
   *
   * Use cases: Protocol specification; Data source connectivity; Connection type selection; Multi-protocol access
   *
   * AWS: AWS Glue connection type for external data source protocol specification and connectivity
   *
   * Validation: Must be valid ConnectionType enum value; required for connection creation and protocol specification
   *   **/
  readonly connectionType: ConnectionType;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional connection properties for authentication and configuration enabling flexible external data source integration. Defines key-value pairs for connection-specific configuration including authentication credentials, connection strings, and protocol-specific parameters.
   *
   * Use cases: Authentication configuration; Connection strings; Protocol parameters; Credential management
   *
   * AWS: AWS Glue connection properties for authentication and configuration management
   *
   * Validation: Must be valid ConfigurationElement if provided; properties must be appropriate for connection type
   **/
  readonly connectionProperties?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional connection description for documentation and management clarity enabling operational understanding of external data source purpose. Provides human-readable description of the connection's purpose and the external data source it connects to.
   *
   * Use cases: Connection documentation; Operational clarity; Data source explanation; Management understanding
   *
   * AWS: AWS Glue connection description for documentation and operational clarity
   *
   * Validation: Must be descriptive text if provided; recommended for connection documentation and operational understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional match criteria for connection selection enabling automated connection selection based on data source characteristics. Defines criteria that can be used for automatic connection selection in ETL jobs and data processing workflows.
   *
   * Use cases: Automated connection selection; Connection matching; ETL job configuration; Data source selection
   *
   * AWS: AWS Glue connection match criteria for automated connection selection and job configuration
   *
   * Validation: Must be array of valid selection criteria strings if provided; enables automated connection selection when specified
   **/
  readonly matchCriteria?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional physical connection requirements for VPC networking enabling secure external data source connectivity. Defines VPC networking configuration for connections including availability zone, security groups, and subnet specification for secure data access.
   *
   * Use cases: VPC connectivity; Secure networking; Network isolation; External data access
   *
   * AWS: AWS Glue connection physical requirements for VPC networking and secure connectivity
   *
   * Validation: Must be valid ConnectionPhysical object if provided; enables VPC networking when specified
   *   **/
  readonly physicalConnectionRequirements?: ConnectionPhysical;
}

export interface DataOpsProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 output KMS key ARN for DataOps project data encryption enabling customer-controlled encryption and security compliance. When provided, uses existing KMS key for encrypting job outputs; otherwise creates customer-managed key for data protection and security compliance.
   *
   * Use cases: Data encryption; Customer-controlled keys; Security compliance; Output protection
   *
   * AWS: KMS key ARN for DataOps project S3 output encryption and data protection
   *
   * Validation: Must be valid KMS key ARN if provided; enables customer-controlled encryption for project outputs
   **/
  readonly s3OutputKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of classifier names to classifier definitions for data format recognition and schema inference enabling automated data discovery and cataloging. Provides custom classifiers for recognizing data formats and inferring schemas during crawling and data discovery operations.
   *
   * Use cases: Data format recognition; Schema inference; Automated discovery; Data cataloging
   *
   * AWS: Glue classifiers for data format recognition and automated schema inference
   *
   * Validation: Must be valid NamedClassifierProps if provided; enables custom data format recognition and schema inference
   **/
  readonly classifiers?: NamedClassifierProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of connection names to connection definitions for external data source connectivity enabling database and system integration. Provides connection configurations for accessing databases, data warehouses, and external systems during ETL operations and data integration.
   *
   * Use cases: Database connectivity; External system integration; Data source access; ETL connectivity
   *
   * AWS: Glue connections for database and external system connectivity
   *
   * Validation: Must be valid NamedConnectionProps if provided; enables database and external system connectivity
   **/
  readonly connections?: NamedConnectionProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Glue catalog KMS key ARN for metadata encryption enabling secure catalog and connection credential protection. When provided, uses existing KMS key for encrypting Glue catalog metadata and connection credentials for enhanced security and compliance.
   *
   * Use cases: Metadata encryption; Credential protection; Catalog security; Enhanced compliance
   *
   * AWS: KMS key ARN for Glue catalog metadata and connection credential encryption
   *
   * Validation: Must be valid KMS key ARN if provided; enables catalog metadata and credential encryption
   **/
  readonly glueCatalogKmsKeyArn?: string;
  readonly projectExecutionRoleRefs: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of database names to database definitions for data catalog organization enabling structured data management and governance. Provides database configurations for organizing data assets, managing schemas, and implementing data governance within the project.
   *
   * Use cases: Data catalog organization; Schema management; Data governance; Asset organization
   *
   * AWS: Glue databases for data catalog organization and schema management
   *
   * Validation: Must be valid NamedDatabaseProps if provided; enables data catalog organization and governance
   *   **/
  readonly databases?: NamedDatabaseProps;
  readonly dataEngineerRoleRefs: MdaaRoleRef[];
  readonly dataAdminRoleRefs: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional failure notification configuration for DataOps project monitoring enabling automated alerting and operational awareness. Provides notification settings for job failures, errors, and operational issues within the project for proactive monitoring and response.
   *
   * Use cases: Failure monitoring; Automated alerting; Operational awareness; Proactive response
   *
   * AWS: Notification configuration for DataOps project monitoring and alerting
   *
   * Validation: Must be valid FailureNotificationsProps if provided; enables automated failure monitoring and alerting
   **/
  readonly failureNotifications?: FailureNotificationsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group configurations for project resource networking enabling shared network security and VPC connectivity. When specified, creates project security groups that can be shared by project resources for consistent network security and connectivity.
   *
   * Use cases: Network security; VPC connectivity; Shared security groups; Consistent networking
   *
   * AWS: Security group configurations for project resource networking and VPC connectivity
   *
   * Validation: Must be valid NamedSecurityGroupConfigProps if provided; enables shared network security and connectivity
   *   **/
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional DataZone configuration for data governance and catalog integration enabling data governance and discovery capabilities. Provides DataZone project integration for enhanced data governance, catalog management, and data discovery within the organization.
   *
   * Use cases: Data governance; Catalog integration; Data discovery; Governance capabilities
   *
   * AWS: DataZone configuration for data governance and catalog integration
   *
   * Validation: Must be valid DatazoneProps if provided; enables DataZone integration and data governance capabilities
   **/
  readonly datazone?: DatazoneProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * DataZone configuration interface for data governance.
 *
 * Use cases: DataOps project management; Glue database configuration; Lake Formation integration; Data workflow orchestration; Project resource management
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface DatazoneProps {
  readonly project?: DatazoneProjectProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * DataZone project configuration interface for data governance and catalog management with domain integration capabilities. Defines DataZone project properties for DataOps projects including domain configuration, SSM parameter references, and Lake Formation role management for data governance and catalog integration.
 *
 * Use cases: Data governance; Catalog management; Domain integration; Lake Formation integration
 *
 * AWS: DataZone project configuration with domain integration and Lake Formation role management
 *
 * Validation: All properties are optional; domain configuration must be valid when provided
 */
export interface DatazoneProjectProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain unit specification for DataZone project organization enabling hierarchical domain management and project categorization. Defines the domain unit within the DataZone domain for project organization and governance scope management.
   *
   * Use cases: Domain organization; Project categorization; Hierarchical management; Governance scope
   *
   * AWS: DataZone domain unit for project organization and governance management
   *
   * Validation: Must be valid domain unit string if provided; affects project organization and governance scope
   **/
  readonly domainUnit?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SSM parameter reference for domain configuration enabling dynamic domain configuration management. Specifies the SSM parameter containing domain configuration data for flexible domain setup and configuration management.
   *
   * Use cases: Dynamic configuration; SSM parameter reference; Configuration management; Flexible setup
   *
   * AWS: AWS Systems Manager parameter for DataZone domain configuration reference
   *
   * Validation: Must be valid SSM parameter name if provided; parameter must contain valid domain configuration
   **/
  readonly domainConfigSSMParam?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional direct domain configuration for DataZone project setup enabling inline domain configuration management. Provides direct domain configuration object for DataZone project setup and governance configuration without external parameter references.
   *
   * Use cases: Direct configuration; Inline setup; Domain configuration; Governance setup
   *
   * AWS: DataZone domain configuration for project setup and governance management
   *
   * Validation: Must be valid DomainConfig object if provided; enables direct domain configuration when specified
   *   **/
  readonly domainConfig?: DomainConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lake Formation manage access role reference for DataZone integration enabling Lake Formation permission management within DataZone projects. Provides IAM role for managing Lake Formation permissions and access control within DataZone governance workflows.
   *
   * Use cases: Lake Formation integration; Permission management; Access control; DataZone governance
   *
   * AWS: AWS IAM role for Lake Formation access management within DataZone projects
   *
   * Validation: Must be valid MdaaRoleRef object if provided; enables Lake Formation integration when specified
   **/
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named security group configuration collection interface for managing multiple security groups with string-based naming for organized network access control. Enables configuration of multiple security groups with unique identifiers, supporting multi-tier DataOps projects and organized network security management for diverse infrastructure components.
 *
 * Use cases: Multi-tier security; Security group collection management; Named security organization; Network access control; DataOps security organization; Infrastructure security governance
 *
 * AWS: Multiple EC2 security groups with organized naming for DataOps project network security and access control management
 *
 * Validation: Security group names must be valid identifiers; each SecurityGroupConfigProps must be valid security group configuration; names must be unique within collection
 */
export interface NamedSecurityGroupConfigProps {
  /** @jsii ignore */
  [name: string]: SecurityGroupConfigProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * EC2 security group configuration interface for network access control with VPC placement and egress rule management. Defines security group properties for DataOps projects including VPC specification and egress rule configuration for controlled network access and secure communication between infrastructure components.
 *
 * Use cases: Network security configuration; VPC security groups; Egress rule management; Network access control; Infrastructure security; Secure communication
 *
 * AWS: EC2 security groups with VPC placement and configurable egress rules for DataOps project network security and access control
 *
 * Validation: vpcId must be valid VPC identifier; securityGroupEgressRules must be valid MdaaSecurityGroupRuleProps if specified; egress rules must be properly configured
 */
export interface SecurityGroupConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for security group deployment enabling VPC-specific network access control and resource isolation. Specifies the VPC where the security group will be created affecting network boundaries and access control scope for DataOps project resources.
   *
   * Use cases: VPC deployment; Network isolation; Access control scope; Resource boundaries
   *
   * AWS: AWS VPC ID for security group deployment and network access control
   *
   * Validation: Must be valid VPC ID string; required for security group creation and network access control
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group egress rules for outbound traffic control enabling fine-grained network access management. Defines egress rules for the security group controlling outbound network traffic from DataOps project resources for enhanced security and compliance.
   *
   * Use cases: Outbound traffic control; Network security; Access management; Compliance requirements
   *
   * AWS: AWS security group egress rules for outbound traffic control and network security
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; configures outbound traffic control when specified
   *   **/
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * DataOps failure notification configuration interface for email-based alerting on pipeline and job failures. Defines notification properties for DataOps projects including email recipient specification for automated failure alerts and operational monitoring of data processing workflows and ETL job execution.
 *
 * Use cases: Failure alerting; Email notifications; Operational monitoring; Pipeline failure alerts; Job failure notifications; DataOps monitoring
 *
 * AWS: SNS-based email notifications for DataOps pipeline and job failure alerting with configurable recipient lists
 *
 * Validation: email must be valid email addresses if specified; email addresses must be properly formatted for SNS delivery
 */
export interface FailureNotificationsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of email addresses for failure notification delivery enabling automated alerting and operational awareness. Specifies email recipients who will receive notifications when DataOps project jobs, pipelines, or workflows fail for proactive monitoring and response.
   *
   * Use cases: Failure alerting; Email notifications; Operational monitoring; Proactive response
   *
   * AWS: SNS email notifications for DataOps failure alerting and operational monitoring
   *
   * Validation: Must be array of valid email addresses if provided; enables automated failure notifications when specified
   **/
  readonly email?: string[];
}

interface DatazoneResources {
  readonly datazoneProject: MdaaDatazoneProject;
  readonly datazoneEnv: CfnEnvironment;
  readonly lakeformationManageAccessRole: IRole;
}

export class DataOpsProjectL3Construct extends MdaaL3Construct {
  protected readonly props: DataOpsProjectL3ConstructProps;

  private projectExecutionRoles: MdaaResolvableRole[];
  private dataAdminRoles: MdaaResolvableRole[];
  private dataEngineerRoles: MdaaResolvableRole[];
  private dataAdminRoleIds: string[];

  constructor(scope: Construct, id: string, props: DataOpsProjectL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.projectExecutionRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.projectExecutionRoleRefs,
      'ProjectExRoles',
    );
    this.dataAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.dataAdminRoleRefs, 'DataAdmin');
    this.dataEngineerRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.dataEngineerRoleRefs,
      'DataEngineer',
    );
    this.dataAdminRoleIds = this.dataAdminRoles.map(x => x.id());

    const projectDeploymentRole = this.createProjectDeploymentRole();
    const lakeFormationLocationRole = this.createLakeFormationRole();
    const datazoneUserRole = this.createDatazoneUserRole();

    const projectKmsKey = this.createProjectKmsKey([
      projectDeploymentRole,
      datazoneUserRole,
      lakeFormationLocationRole,
    ]);

    const s3OutputKmsKey = props.s3OutputKmsKeyArn
      ? MdaaKmsKey.fromKeyArn(this.scope, 's3OutputKmsKey', props.s3OutputKmsKeyArn)
      : projectKmsKey;

    const projectSecurityGroups = Object.fromEntries(
      Object.entries(props.securityGroupConfigs || {}).map(entry => {
        const securityGroupName = entry[0];
        const securityGroupProps = entry[1];
        const sg = this.createProjectSecurityGroup(
          securityGroupName,
          securityGroupProps.vpcId,
          securityGroupProps.securityGroupEgressRules,
        );
        return [securityGroupName, sg];
      }),
    );

    // Create project bucket
    const projectBucket = this.createProjectBucket(
      projectKmsKey,
      s3OutputKmsKey,
      projectDeploymentRole,
      datazoneUserRole,
      lakeFormationLocationRole,
    );

    const datazoneResources = this.createDatazoneResources(projectBucket, datazoneUserRole);

    this.createAthenaWorkgroup(datazoneUserRole, projectBucket, datazoneResources?.datazoneEnv);

    this.createProjectDatabases(this.props.databases || {}, projectBucket, datazoneResources);
    this.createProjectSecurityConfig(projectKmsKey, s3OutputKmsKey);

    // create project SNS topic
    const topic = this.createSNSTopic(projectKmsKey);

    // subcribe SNS topic if failure notification config is enabled
    this.subscribeSNSTopic(topic, this.props.failureNotifications);

    // Build our custom classifiers if they are defined.
    this.createProjectClassifiers(this.props.classifiers || {});

    // Build our connectors if they are in use.
    this.createProjectConnectors(this.props.connections || {}, projectSecurityGroups);

    //If the Glue Catalog KMS key is specified, grant decrypt access to it
    //for project execution roles (direct access required to decrypt Glue connections)
    if (this.props.glueCatalogKmsKeyArn) {
      let i = 0;
      const projectExecutionRoles = this.projectExecutionRoles.map(x => {
        return MdaaRole.fromRoleArn(this.scope, `resolve-role-${i++}`, x.arn());
      });
      const keyAccessPolicy = new ManagedPolicy(this.scope, 'catalog-key-access-policy', {
        managedPolicyName: this.props.naming.resourceName('catalog-key-access'),
        roles: projectExecutionRoles,
      });
      const keyAccessStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: DECRYPT_ACTIONS,
        resources: [this.props.glueCatalogKmsKeyArn],
      });
      keyAccessPolicy.addStatements(keyAccessStatement);
    }
  }

  private createAthenaWorkgroup(datazoneUserRole: Role, projectBucket: IBucket, datazoneEnv?: CfnEnvironment) {
    const athenaWgProps: AthenaWorkgroupL3ConstructProps = {
      dataAdminRoles: this.props.dataAdminRoleRefs,
      athenaUserRoles: [
        {
          refId: 'dz-user-role',
          arn: datazoneUserRole.roleArn,
          id: datazoneUserRole.roleId,
          name: datazoneUserRole.roleName,
        },
        ...this.props.dataEngineerRoleRefs,
      ],
      workgroupBucketName: projectBucket.bucketName,
      workgroupKmsKeyArn: projectBucket.encryptionKey?.keyArn,
      ...this.props,
    };
    const athenaWg = new AthenaWorkgroupL3Construct(this, 'datazone-env-athena-wg', athenaWgProps);
    if (datazoneEnv) {
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneEnvironment', datazoneEnv.attrId);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneProject', datazoneEnv.projectIdentifier);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneDomain', datazoneEnv.domainIdentifier);
    }
  }

  private createLakeFormationRole() {
    return new MdaaRole(this.scope, 'lake-formation-role', {
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
      roleName: 'lake-formation',
      description: 'Role for accessing the data lake via LakeFormation.',
    });
  }

  private createDatazoneResources(projectBucket: IBucket, datazoneUserRole: IRole): DatazoneResources | undefined {
    if (this.props.datazone) {
      if (this.props.datazone?.project) {
        const datazoneProject = this.createDataZoneProject(this.props.datazone.project);

        datazoneUserRole.addManagedPolicy(datazoneProject.domainKmsUsagePolicy);

        const lakeformationManageAccessRole = this.props.datazone.project.lakeformationManageAccessRole
          ? this.props.roleHelper
              .resolveRoleRefWithRefId(
                this.props.datazone.project.lakeformationManageAccessRole,
                'lf-manage-access-role',
              )
              .role('lf-manage-access-role')
          : Role.fromRoleArn(
              this,
              'lf-manage-access-role',
              StringParameter.valueForStringParameter(
                this,
                LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
              ),
            );

        const datazoneEnv = this.createDataZoneEnvironment(
          projectBucket,
          datazoneProject,
          lakeformationManageAccessRole,
          datazoneUserRole,
          datazoneProject.domainConfig.glueCatalogArns,
        );

        return {
          datazoneProject,
          lakeformationManageAccessRole,
          datazoneEnv: datazoneEnv,
        };
      }
      return undefined;
    }
    return undefined;
  }

  private createDataZoneProject(mdaaProjectProps: DatazoneProjectProps): MdaaDatazoneProject {
    const constructProps: MdaaDatazoneProjectProps = {
      naming: this.props.naming,
      domainUnit: mdaaProjectProps.domainUnit,
      domainConfigSSMParam: mdaaProjectProps.domainConfigSSMParam,
      domainConfig: mdaaProjectProps.domainConfig,
    };
    return new MdaaDatazoneProject(this, 'datazone-project', constructProps);
  }

  private createDataZoneEnvironment(
    projectBucket: IBucket,
    dzProject: MdaaDatazoneProject,
    lakeformationManagedAccessRole: IRole,
    datazoneUserRole: IRole,
    glueCatalogArns: string[],
  ): CfnEnvironment {
    const subBucketLocation = projectBucket.s3UrlForObject('/data/datazone');
    // Create the database
    const subDatabaseName = this.props.naming.resourceName('datazone-sub');
    const subDatabase = new CfnDatabase(this.scope, `datazone-sub-database`, {
      catalogId: this.account,
      databaseInput: {
        name: subDatabaseName,
        description: 'For consuming Datazone subscripts',
        locationUri: subBucketLocation,
      },
    });

    const subDatabaseLFProps: DatabaseLakeFormationProps = {
      createSuperGrantsForDataAdminRoles: true,
    };

    const dataLakeEnvProps: CfnEnvironmentProps = {
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentProfileIdentifier: '',
      name: this.props.naming.resourceName(),
      projectIdentifier: dzProject.project.attrId,
    };

    const datazoneEnv = new CfnEnvironment(this, 'datalake-env', dataLakeEnvProps);
    datazoneEnv.addPropertyOverride('EnvironmentAccountIdentifier', this.account);
    datazoneEnv.addPropertyOverride('EnvironmentAccountRegion', this.region);
    datazoneEnv.addPropertyOverride('EnvironmentBlueprintId', dzProject.domainConfig.domainCustomEnvBlueprintId);
    datazoneEnv.addPropertyOverride('EnvironmentRoleArn', datazoneUserRole.roleArn);

    this.createDatabaseLakeFormationConstruct(
      'datazone-sub',
      subDatabaseName,
      subDatabase,
      subDatabaseLFProps,
      true,
      lakeformationManagedAccessRole,
      subBucketLocation,
    );

    const athenaActionProps: CfnEnvironmentActionsProps = {
      name: 'Query data',
      description: 'Amazon Athena',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        // uri: `https://${this.region}.console.aws.amazon.com/athena/home#/query-editor/domain/${datazoneEnv.attrDomainId}/domainRegion/${this.region}/environment/${datazoneEnv.attrId}`
        uri: `https://us-east-1.console.aws.amazon.com/athena/home?region=${this.region}#/query-editor`,
      },
    };
    new CfnEnvironmentActions(this, 'athena-env-action', athenaActionProps);

    const glueEtlActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue ETL jobs',
      description: 'AWS Glue ETL',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/gluestudio/home?region=${this.region}#/jobs`,
      },
    };
    new CfnEnvironmentActions(this, 'glue-etl-env-action', glueEtlActionProps);

    const glueCatalogActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue Catalogs',
      description: 'AWS Glue Catalog',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/glue/home?region=${this.region}#/v2/data-catalog/tables`,
      },
    };
    new CfnEnvironmentActions(this, 'glue-catalog-env-action', glueCatalogActionProps);

    const s3BucketActionProps: CfnEnvironmentActionsProps = {
      name: 'Project S3 Data',
      description: 'Amazon S3',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/s3/buckets/${projectBucket}/data/`,
      },
    };
    new CfnEnvironmentActions(this, 's3-env-action', s3BucketActionProps);

    const consoleActionProps: CfnEnvironmentActionsProps = {
      name: 'View AWS Console',
      description: 'AWS Console',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: 'https://console.aws.amazon.com/',
      },
    };
    new CfnEnvironmentActions(this, 'console-env-action', consoleActionProps);
    const userManagedPolicy = this.createDatazoneUserManagedPolicy(projectBucket, glueCatalogArns);
    userManagedPolicy.attachToRole(datazoneUserRole);

    this.createDatazoneSubscriptionTarget(
      datazoneEnv,
      dzProject,
      datazoneUserRole,
      lakeformationManagedAccessRole,
      subDatabaseName,
    );

    return datazoneEnv;
  }

  private createDatazoneSubscriptionTarget(
    env: CfnEnvironment,
    mdaaProject: MdaaDatazoneProject,
    envRole: IRole,
    lakeformationManagedAccessRole: IRole,
    subDatabaseName: string,
  ) {
    const subTargetProps: CfnSubscriptionTargetProps = {
      applicableAssetTypes: ['GlueTableAssetType'],
      authorizedPrincipals: [envRole.roleArn], //User role
      domainIdentifier: mdaaProject.project.domainIdentifier,
      environmentIdentifier: env.attrId,
      manageAccessRole: lakeformationManagedAccessRole.roleArn, //manage role
      name: this.props.naming.resourceName(),
      subscriptionTargetConfig: [
        {
          content: `{"databaseName":"${subDatabaseName}"}`,
          formName: 'GlueSubscriptionTargetConfigForm',
        },
      ],
      type: 'GlueSubscriptionTargetType',
    };
    new CfnSubscriptionTarget(this, 'datazone-sub-target', subTargetProps);
  }

  private createDatazoneUserRole(): Role {
    const role = new MdaaRole(this.scope, 'dz-user-role', {
      naming: this.props.naming,
      roleName: 'dz-user',
      assumedBy: new AccountPrincipal(this.account),
    });

    role.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:AssumeRole', 'sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com')],
        effect: Effect.ALLOW,
      }),
    );

    return role;
  }

  private createDatazoneUserManagedPolicy(projectBucket: IBucket, glueCatalogArns: string[]): ManagedPolicy {
    //Allow to access the glue catalog resources
    const userPolicy: ManagedPolicy = new ManagedPolicy(this, 'datazone-user-access-policy', {
      managedPolicyName: this.props.naming.resourceName('datazone-user-access-policy'),
    });

    const datazoneStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'datazone:ListDomains',
        'datazone:ListProjects',
        'datazone:ListAccountEnvironments',
        'datazone:ListEnvironments',
        'datazone:GetEnvironment',
        'datazone:*',
      ],
      resources: ['*'],
    });
    userPolicy.addStatements(datazoneStatement);

    //Allow smooth interactions with project bucket via Console
    const projectBucketConsoleStatement = new PolicyStatement({
      sid: 'ProjectBucketGet',
      effect: Effect.ALLOW,
      resources: [projectBucket.bucketArn],
      actions: [
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
        's3:GetBucketTagging',
        's3:GetEncryptionConfiguration',
        's3:GetIntelligentTieringConfiguration',
        's3:GetBucketPolicy',
      ],
    });
    userPolicy.addStatements(projectBucketConsoleStatement);

    const accessAthenaStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['athena:ListWorkGroups'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessAthenaStatement);

    const accessLFStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lakeformation:GetDataAccess'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessLFStatement);

    const accessGlueStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['glue:GetColumnStatisticsTaskRuns'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessGlueStatement);

    const accessGlueResourceStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:SearchTables',
        'glue:GetTableVersion',
        'glue:GetTableVersions',
        'glue:GetColumnStatistics*',
      ],
      resources: glueCatalogArns,
    });
    userPolicy.addStatements(accessGlueResourceStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(userPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'HIPAA.Security-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
    ]);
    return userPolicy;
  }

  private createProjectSecurityGroup(
    sgName: string,
    vpcId: string,
    securityGroupEgressRules?: MdaaSecurityGroupRuleProps,
  ): SecurityGroup {
    const ec2L3Props: Ec2L3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      adminRoles: [],
      securityGroups: {
        [sgName]: {
          vpcId: vpcId,
          egressRules: securityGroupEgressRules,
          addSelfReferenceRule: true,
        },
      },
    };
    const ec2Construct = new Ec2L3Construct(this, `ec2`, ec2L3Props);
    const securityGroup = ec2Construct.securityGroups[sgName];

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(`sg-ssm-${sgName}`, `securityGroupId/${sgName}`, securityGroup.securityGroupId);

    return securityGroup;
  }

  /** @jsii ignore */
  private createProjectConnectors(
    connections: NamedConnectionProps,
    projectSecurityGroups: { [name: string]: SecurityGroup },
  ) {
    Object.entries(connections).forEach(entry => {
      const connectionName = entry[0];
      const connectionProps = entry[1];

      const securityGroupIds = [
        ...(connectionProps.physicalConnectionRequirements?.securityGroupIdList || []),
        ...(connectionProps.physicalConnectionRequirements?.projectSecurityGroupNames?.map(name => {
          const sg = projectSecurityGroups[name];
          if (!sg) {
            throw new Error(`Non-existant project security group name specified`);
          }
          return sg.securityGroupId;
        }) || []),
      ];

      const physicalConnectionRequirements = {
        ...connectionProps.physicalConnectionRequirements,
        securityGroupIdList: securityGroupIds,
      };

      const resourceName = this.props.naming.resourceName(connectionName);
      // We'll support SSM imports for our physical connection requirements as needed.
      new CfnConnection(this.scope, `${connectionName}-connection`, {
        catalogId: this.account,
        connectionInput: {
          ...connectionProps,
          physicalConnectionRequirements: physicalConnectionRequirements,
          name: resourceName,
        },
      });

      this.createProjectSSMParam(`ssm-connection-${connectionName}`, `connections/${connectionName}`, resourceName);
    });
  }

  private createProjectClassifiers(classifiers: NamedClassifierProps) {
    Object.entries(classifiers).forEach(entry => {
      const classifierName = entry[0];
      const classifierProps = entry[1];
      const resourceName = this.props.naming.resourceName(classifierName);
      // We'll need to name our classifiers appropriately over-riding any 'name' values that exist
      for (const classifierType of ['csvClassifier', 'xmlClassifier', 'jsonClassifier', 'grokClassifier']) {
        if (classifierType in classifierProps.configuration) {
          // @ts-ignore - suppressing read only property
          classifierProps.configuration[classifierType]['name'] = resourceName;
        }
      }
      new CfnClassifier(this.scope, `${classifierName}-classifier`, {
        csvClassifier: classifierProps.configuration.csvClassifier,
        xmlClassifier: classifierProps.configuration.xmlClassifier,
        jsonClassifier: classifierProps.configuration.jsonClassifier,
        grokClassifier: classifierProps.configuration.grokClassifier,
      });

      this.createProjectSSMParam(`ssm-classifier-${classifierName}`, `classifiers/${classifierName}`, resourceName);
    });
  }

  private createProjectSecurityConfig(projectKmsKey: IMdaaKmsKey, s3OutputKmsKey: IKey): SecurityConfiguration {
    //Create project security Config
    const projectSecurityConfig = new MdaaSecurityConfig(this.scope, `security-config`, {
      cloudWatchKmsKey: projectKmsKey,
      jobBookMarkKmsKey: projectKmsKey,
      s3OutputKmsKey: s3OutputKmsKey,
      naming: this.props.naming,
    });

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(
      `ssm-securityconfig`,
      `securityConfiguration/default`,
      projectSecurityConfig.securityConfigurationName,
    );

    return projectSecurityConfig;
  }

  private createProjectDatabases(
    databases: NamedDatabaseProps,
    projectBucket: IBucket,
    datazoneResources?: DatazoneResources,
  ) {
    // Build our databases
    Object.entries(databases).forEach(entry => {
      const databaseName = entry[0];
      const databaseProps = entry[1];

      const dbName = databaseProps.verbatimName ? databaseName : this.props.naming.resourceName(databaseName);
      const dbResourceName = databaseProps.icebergCompliantName ? dbName.replace(/-/g, '_') : dbName;
      const databaseBucket = databaseProps.locationBucketName
        ? MdaaBucket.fromBucketName(this, `database-bucket-${databaseName}`, databaseProps.locationBucketName)
        : projectBucket;

      // Create the database
      const database = new CfnDatabase(this.scope, `${databaseName}-database`, {
        catalogId: this.account,
        databaseInput: {
          name: dbResourceName,
          description: databaseProps.description,
          locationUri: databaseBucket?.s3UrlForObject(databaseProps.locationPrefix),
        },
      });

      if (databaseProps.createDatazoneDatasource) {
        this.createDataZoneDatasource(databaseName, dbResourceName, database, datazoneResources);
      }

      // Use LF Access Control L3 Contruct to create LF grants and Resource Links for the database
      if (databaseProps.lakeFormation || databaseProps.createDatazoneDatasource) {
        this.createDatabaseLakeFormationConstruct(
          databaseName,
          dbResourceName,
          database,
          databaseProps.lakeFormation || {},
          databaseProps.createDatazoneDatasource || false,
          datazoneResources?.lakeformationManageAccessRole,
          databaseBucket?.arnForObjects(databaseProps.locationPrefix || ''),
        );
      }

      // Required so we can auto-wire other stacks/resources to this project resource via SSM
      this.createProjectSSMParam(`ssm-database-name-${databaseName}`, `databaseName/${databaseName}`, dbResourceName);
    });
  }

  private createDataZoneDatasource(
    databaseName: string,
    databaseResourceName: string,
    database: CfnDatabase,
    datazoneResources?: DatazoneResources,
  ) {
    if (!datazoneResources || !datazoneResources?.datazoneEnv) {
      throw new Error('DataZone Project must be defined if creating a DataZone Data Source');
    }
    const datasourceProps: CfnDataSourceProps = {
      domainIdentifier: datazoneResources.datazoneProject.project.attrDomainId,
      environmentIdentifier: datazoneResources.datazoneEnv?.attrId,
      name: this.props.naming.resourceName(databaseName),
      projectIdentifier: datazoneResources.datazoneProject.project.attrId,
      type: 'glue',
      configuration: {
        glueRunConfiguration: {
          autoImportDataQualityResult: true,
          dataAccessRole: datazoneResources.lakeformationManageAccessRole.roleArn,
          relationalFilterConfigurations: [
            {
              databaseName: databaseResourceName,
            },
          ],
        },
      },
    };
    const datasource = new CfnDataSource(this, `${databaseName}-datazone-datasource`, datasourceProps);
    datasource.addDependency(database);
  }

  private createDatabaseLakeFormationConstruct(
    databaseName: string,
    dbResourceName: string,
    database: CfnDatabase,
    databaseLakeFormationProps: DatabaseLakeFormationProps,
    createDatazoneDatasource: boolean,
    datazoneManageAccessRole?: IRole,
    locationArn?: string,
  ) {
    // Provide Project Execution Roles (principal) data location permissions to create data catalog
    // tables that point to specified data-locations
    if (databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles && locationArn) {
      this.projectExecutionRoles.forEach(role => {
        const grantId = LakeFormationAccessControlL3Construct.generateIdentifier(databaseName, role.refId());
        const grant = new CfnPrincipalPermissions(this, `lf-data-location-grant-${grantId}`, {
          principal: {
            dataLakePrincipalIdentifier: role.arn(),
          },
          resource: {
            dataLocation: {
              catalogId: this.account,
              resourceArn: locationArn,
            },
          },
          permissions: ['DATA_LOCATION_ACCESS'],
          permissionsWithGrantOption: [],
        });
        grant.addDependency(database);
      });
    }

    const projectRoleGrantProps: { [key: string]: GrantProps } = {};
    if (databaseLakeFormationProps.createSuperGrantsForDataAdminRoles) {
      projectRoleGrantProps[`data-admins-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS,
        principals: Object.fromEntries(
          this.dataAdminRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS,
      };
    }
    if (databaseLakeFormationProps.createReadGrantsForDataEngineerRoles) {
      projectRoleGrantProps[`data-engineers-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
        principals: Object.fromEntries(
          this.dataEngineerRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      };
    }

    if (databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles) {
      projectRoleGrantProps[`execution-roles-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        principals: Object.fromEntries(
          this.projectExecutionRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      };
    }

    if (createDatazoneDatasource && datazoneManageAccessRole) {
      projectRoleGrantProps[`datazone-roles-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        principals: {
          datazone: {
            role: {
              refId: 'datazone',
              arn: datazoneManageAccessRole?.roleArn,
            },
          },
        },
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
        tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      };
    }

    const lfGrantProps: NamedGrantProps =
      Object.fromEntries(
        Object.entries(databaseLakeFormationProps?.grants || {}).map(entry => {
          const dbGrantName = entry[0];
          const dbGrantProps = entry[1];
          const lakeFormationGrantProps = this.createLakeFormationGrantProps(dbResourceName, dbGrantProps);
          return [`${databaseName}-${dbGrantName}`, lakeFormationGrantProps];
        }),
      ) || {};

    const resourceLinkName = databaseLakeFormationProps.createCrossAccountResourceLinkName || dbResourceName;
    const resourceLinkProps: NamedResourceLinkProps = Object.fromEntries(
      databaseLakeFormationProps?.createCrossAccountResourceLinkAccounts?.map(account => {
        const accountPrincipalEntries = Object.entries(lfGrantProps)
          .map(lfGrantEntry => {
            const lfGrantProps = lfGrantEntry[1];
            return Object.entries(lfGrantProps.principals).filter(principalEntry => {
              const principalName = principalEntry[0];
              const principalProps = principalEntry[1];
              const principalAccount = this.determinePrincipalAccount(principalName, principalProps);
              return principalAccount == account;
            });
          })
          .flat();
        const namedAccountPrincipals: NamedPrincipalProps = Object.fromEntries(accountPrincipalEntries);
        const props: ResourceLinkProps = {
          targetDatabase: dbResourceName,
          targetAccount: this.account,
          targetRegion: this.region,
          fromAccount: account,
          grantPrincipals: namedAccountPrincipals,
        };
        return [resourceLinkName, props];
      }) || [],
    );

    const lakeFormationProps: LakeFormationAccessControlL3ConstructProps = {
      grants: { ...projectRoleGrantProps, ...lfGrantProps },
      resourceLinks: resourceLinkProps,
      externalDatabaseDependency: database,
      ...(this.props as MdaaL3ConstructProps),
    };

    //Use the LF Account Control construct to create all database grants and resource links
    const lf = new LakeFormationAccessControlL3Construct(this, `lf-grants-${databaseName}`, lakeFormationProps);
    lf.node.addDependency(database);
  }

  private determinePrincipalAccount(principalName: string, principalProps: PrincipalProps): string | undefined {
    if (principalProps.role instanceof MdaaResolvableRole) {
      return this.tryParseArn(principalProps.role.arn())?.account;
    } else if (principalProps.role) {
      return this.tryParseArn(this.props.roleHelper.resolveRoleRefWithRefId(principalProps.role, principalName).arn())
        ?.account;
    } else {
      return undefined;
    }
  }

  private tryParseArn(arnString: string): ArnComponents | undefined {
    try {
      return Arn.split(arnString, ArnFormat.NO_RESOURCE_NAME);
    } catch {
      return undefined;
    }
  }

  private createLakeFormationGrantProps(dbResourceName: string, dbGrantProps: DatabaseGrantProps): GrantProps {
    const databasePermissions =
      LakeFormationAccessControlL3Construct.DATABASE_PERMISSIONS_MAP[dbGrantProps.databasePermissions || 'read'];
    const tablePermissions =
      LakeFormationAccessControlL3Construct.TABLE_PERMISSIONS_MAP[dbGrantProps.tablePermissions || 'read'];
    const principalArns: NamedPrincipalProps = Object.fromEntries(
      Object.entries(dbGrantProps.principalArns || {}).map(entry => {
        const principalProps: PrincipalProps = {
          role: {
            arn: entry[1],
          },
        };
        return [entry[0], principalProps];
      }),
    );

    return {
      ...dbGrantProps,
      database: dbResourceName,
      databasePermissions: databasePermissions,
      tables: dbGrantProps.tables,
      tablePermissions: tablePermissions,
      principals: { ...(dbGrantProps.principals || {}), ...principalArns },
    };
  }

  private createProjectKmsKey(keyUserRoles: Role[]): IMdaaKmsKey {
    //Allow CloudWatch logs to us the project key to encrypt/decrypt log data using this key
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchLogsEncryption',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      resources: ['*'],
      //Limit access to use this key only for log groups within this account
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*`,
        },
      },
    });

    const projectDeploymentStatement = new PolicyStatement({
      sid: 'ProjectDeployment',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: keyUserRoles,
      resources: ['*'],
    });

    // Allow the account use the project KMS key for encrypting
    // messages into SQS Dead Letter Queues
    const sqsStatement = new PolicyStatement({
      sid: 'sqsEncryption',
      effect: Effect.ALLOW,
      // Actions required https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
      actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'kms:CallerAccount': this.account,
          'kms:ViaService': `sqs.${this.region}.amazonaws.com`,
        },
      },
    });
    sqsStatement.addAnyPrincipal();

    // Allow Eventbridge Service principal to use KMS key to publish to project SNS topic
    const eventBridgeStatement = new PolicyStatement({
      sid: 'eventBridgeEncryption',
      effect: Effect.ALLOW,
      actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
      principals: [new ServicePrincipal('events.amazonaws.com')],
      resources: ['*'],
    });

    // Create a KMS Key if we need to make one for the project.
    const kmsKey = new MdaaKmsKey(this.scope, 'ProjectKmsKey', {
      alias: 'cmk',
      naming: this.props.naming,
      keyAdminRoleIds: this.dataAdminRoleIds,
      keyUserRoleIds: [...this.getAllRoleIds(), ...keyUserRoles.map(x => x.roleId)],
    });
    kmsKey.addToResourcePolicy(cloudwatchStatement);
    kmsKey.addToResourcePolicy(projectDeploymentStatement);
    kmsKey.addToResourcePolicy(sqsStatement);
    kmsKey.addToResourcePolicy(eventBridgeStatement);

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam('ssm-kms-arn', `kmsArn/default`, kmsKey.keyArn);

    return kmsKey;
  }

  private createProjectDeploymentRole(): Role {
    const role = new MdaaRole(this.scope, `project-deployment-role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'deployment',
      naming: this.props.naming,
    });

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(`ssm-deployment-role`, `deploymentRole/default`, role.roleArn);
    return role;
  }

  private createProjectBucket(
    projectKmsKey: IKey,
    s3OutputKmsKey: IKey,
    projectDeploymentRole: IRole,
    datazoneUserRole: Role,
    lakeFormationRole: Role,
  ): IBucket {
    const dataEngineerRoleIds = this.dataEngineerRoles.map(x => x.id());
    const dataAdminRoleIds = this.dataAdminRoles.map(x => x.id());
    const projectExecutionRoleIds = this.projectExecutionRoles.map(x => x.id());

    //This project bucket will be used for all project-specific data
    const projectBucket = new MdaaBucket(this.scope, `Bucketproject`, {
      encryptionKey: projectKmsKey,
      additionalKmsKeyArns: [s3OutputKmsKey.keyArn],
      naming: this.props.naming,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      projectBucket,
      [
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
      ],
      true,
    );
    //Data Admins can read/write the entire bucket
    //Data Engineers can read the entire bucket
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/',
      readRoleIds: dataEngineerRoleIds,
      readWriteSuperRoleIds: dataAdminRoleIds,
    });
    rootPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Datazone env role and Data Engineers can read/write /athena-results
    const athenaPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/athena-results',
      readRoleIds: dataEngineerRoleIds,
      readWritePrincipals: [datazoneUserRole],
    });
    athenaPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Deployment role can read/write /deployment
    //Execution role can read /deployment
    const deploymentPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/deployment',
      readRoleIds: projectExecutionRoleIds,
      readWritePrincipals: [projectDeploymentRole],
    });
    deploymentPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));
    //Data Engineers and can read/write under /data
    const dataPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/data',
      readWritePrincipals: [lakeFormationRole],
      readWriteRoleIds: [...dataEngineerRoleIds, ...projectExecutionRoleIds],
    });
    dataPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Execution role and can read/write under /temp
    const tempPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/temp',
      readWriteRoleIds: projectExecutionRoleIds,
    });
    tempPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Default Deny Policy
    //Any role not specified in props is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: projectBucket,
      roleExcludeIds: [...this.getAllRoleIds(), lakeFormationRole.roleId, datazoneUserRole.roleId],
      principalExcludes: [projectDeploymentRole.roleArn],
    });
    projectBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    projectBucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam('ssm-bucket-name', `projectBucket/default`, projectBucket.bucketName);

    new CfnResource(this.scope, `lf-resource-project-data`, {
      resourceArn: projectBucket.arnForObjects('data'),
      useServiceLinkedRole: false,
      roleArn: lakeFormationRole.roleArn,
    });

    return projectBucket;
  }

  private getAllRoles(): MdaaResolvableRole[] {
    return [...new Set([...this.dataAdminRoles, ...this.dataEngineerRoles, ...this.projectExecutionRoles])];
  }

  private getAllRoleIds(): string[] {
    return this.getAllRoles().map(x => x.id());
  }

  private createSNSTopic(projectKmsKey: IMdaaKmsKey): MdaaSnsTopic {
    // create SNS topic
    const snsProps: MdaaSnsTopicProps = {
      naming: this.props.naming,
      topicName: 'dataops-sns-topic',
      masterKey: projectKmsKey,
    };
    const topic = new MdaaSnsTopic(this.scope, 'dataops-sns-topic', snsProps);
    //Allow EventBridge events to be published to the Topic
    const publishPolicyStatement = new PolicyStatement({
      sid: 'Publish Policy',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal(`events.amazonaws.com`)],
      actions: ['sns:Publish'],
      resources: [topic.topicArn],
    });
    topic.addToResourcePolicy(publishPolicyStatement);
    this.createProjectSSMParam('ssm-topic-arn', `projectTopicArn/default`, topic.topicArn);

    return topic;
  }

  private subscribeSNSTopic(topic: MdaaSnsTopic, failureNotifications?: FailureNotificationsProps) {
    // subscribe to sns topic if email-ids are present
    failureNotifications?.email?.forEach(email => {
      topic.addSubscription(new EmailSubscription(email.trim()));
    });
  }

  private createProjectSSMParam(paramId: string, ssmPath: string, paramValue: string) {
    console.log(`Creating Project SSM Param: ${ssmPath}`);
    new StringParameter(this.scope, paramId, {
      parameterName: this.props.naming.ssmPath(ssmPath, true, false),
      stringValue: paramValue,
    });
  }
}
