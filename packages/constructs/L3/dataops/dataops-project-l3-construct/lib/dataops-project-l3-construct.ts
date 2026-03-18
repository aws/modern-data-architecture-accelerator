/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityConfiguration } from '@aws-cdk/aws-glue-alpha';
import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import { ConfigurationElement } from '@aws-mdaa/config';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import {
  DomainConfig,
  MdaaDatazoneEnvironment,
  MdaaDatazoneEnvironmentProps,
  MdaaDatazoneProject,
  MdaaDatazoneProjectProps,
} from '@aws-mdaa/datazone-constructs';
import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-mdaa/ec2-l3-construct';
import { GlueCatalogL3Construct } from '@aws-mdaa/glue-catalog-l3-construct';
import { MdaaCfnCrawler, MdaaCfnCrawlerProps, MdaaSecurityConfig } from '@aws-mdaa/glue-constructs';
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
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { LakeFormationTagsL3Construct, LFTagConfig } from '@aws-mdaa/lakeformation-tags-l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import {
  SagemakerProjectL3Construct,
  SagemakerProjectL3ConstructProps,
  SageMakerProjectProps,
} from '@aws-mdaa/sagemaker-project-l3-construct';
import { MdaaSnsTopic, MdaaSnsTopicProps } from '@aws-mdaa/sns-constructs';
import { Arn, ArnComponents, ArnFormat, Tags } from 'aws-cdk-lib';
import { CfnDataSource, CfnDataSourceProps } from 'aws-cdk-lib/aws-datazone';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { CfnClassifier, CfnConnection, CfnCrawler, CfnDatabase } from 'aws-cdk-lib/aws-glue';
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
import { Construct } from 'constructs';
import { LakeFormationConfig, NamedTagBasedGrants } from './lake-formation-props';
import { createLakeFormationTags, processLakeFormationTagsPermissions } from './lake-formation-tags-manager';

/**
 * Named map of database grant names to grant configurations.
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
 * Named map of principal names to IAM principal ARNs.
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
 * Configuration for a Lake Formation database grant with permissions and principal assignment.
 *
 * Use cases: Database access permissions; Lake Formation grants; Data governance; Principal-database access; Permission management
 *
 * AWS: AWS Lake Formation database grant configuration for database-level permissions and access control
 *
 * Validation: Database and principals must be specified; permissions must be valid Lake Formation database permissions
 */
export interface DatabaseGrantProps {
  /** Database-level permissions: 'read', 'write', or 'super'. */
  readonly databasePermissions?: PermissionsConfig;
  /** Table-level permissions: 'read', 'write', or 'super'. */
  readonly tablePermissions?: PermissionsConfig;
  /** Specific table names for targeted grant creation. */
  readonly tables?: string[];
  /** Named principal references from the 'principals:' configuration section. */
  readonly principals?: NamedPrincipalProps;
  /** Direct principal ARN mapping for inline principal specification. */
  readonly principalArns?: NamedPrincipalArnProps;
}

/**
 * Lake Formation database permissions configuration for automatic grant management on project databases.
 *
 * Use cases: Automated data admin permissions; DataOps team access management; Lake Formation grant automation; Database permission simplification; Project-level access control
 *
 * AWS: AWS Lake Formation database permissions with automatic super grants for data admin roles on DataOps project databases
 *
 * Validation: createSuperGrantsForDataAdminRoles must be boolean; data admin roles must exist in the account; database must be registered with Lake Formation
 */
export interface DatabaseLakeFormationProps {
  /** Auto-create super grants for data admin roles on this database. */
  readonly createSuperGrantsForDataAdminRoles?: boolean;

  /** Auto-create read grants for data engineer roles on this database. */
  readonly createReadGrantsForDataEngineerRoles?: boolean;

  /** Auto-create read/write grants for project execution roles on this database and S3 locations. */
  readonly createReadWriteGrantsForProjectExecutionRoles?: boolean;

  /** Target account numbers for cross-account resource link creation. */
  readonly createCrossAccountResourceLinkAccounts?: string[];

  /** Custom name for cross-account resource links. Defaults to database name. */
  readonly createCrossAccountResourceLinkName?: string;

  /** Named Lake Formation grant configurations for this database. */
  readonly grants?: NamedDatabaseGrantProps;

  /** LF-Tag values to associate with this database for tag-based access control. */
  readonly databaseTagValues?: LFTagConfig[];

  /** Tag-based grant configurations for LF-Tag-based access control. */
  readonly tagBasedGrants?: NamedTagBasedGrants;
}

/**
 * Named map of database names to database configurations.
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
 * Configuration for a Glue database with S3 location mapping and naming options.
 *
 * Use cases: Data catalog creation; Database metadata management; S3 location mapping; Iceberg table support; DataOps database configuration; Data lake organization
 *
 * AWS: AWS Glue database with S3 location configuration for DataOps project data catalog and metadata management
 *
 * Validation: description must be non-empty string; locationBucketName must be valid S3 bucket name if specified; verbatimName and icebergCompliantName are mutually compatible
 */
export interface DatabaseProps {
  /** Description of the database's purpose. */
  readonly description: string;
  /** Use exact database name without applying naming conventions. */
  readonly verbatimName?: boolean;
  /** Replace hyphens with underscores for Apache Iceberg compatibility. */
  readonly icebergCompliantName?: boolean;
  /** S3 bucket name for database data storage location. */
  readonly locationBucketName?: string;
  /** S3 prefix for data organization within the bucket. */
  readonly locationPrefix?: string;

  /** Lake Formation configuration for access control and permission management. */
  readonly lakeFormation?: DatabaseLakeFormationProps;

  /** Auto-create DataZone data sources for this database. */
  readonly createDatazoneDatasource?: boolean;

  /** Auto-create SageMaker data sources for this database. */
  readonly createSagemakerDatasource?: boolean;

  /** Auto-create Glue Crawler for this database. */
  readonly crawler?: DatabaseCrawlerProps;
}
export interface DatabaseCrawlerProps {
  readonly role: MdaaRoleRef;
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
export type ClassifierType = 'csv' | 'grok' | 'json' | 'xml';

// Cannot useCfnClassifier.GrokClassifierProperty as some values allow IResolvable
/**
 * Configuration for a Glue CSV classifier with delimiter, header, and column parsing options.
 *
 * Use cases: CSV data classification; Delimiter-based parsing; Header detection; Column schema inference; CSV format recognition; Data parsing configuration
 *
 * AWS: AWS Glue CSV classifier with configurable parsing options for CSV data format recognition and schema detection
 *
 * Validation: delimiter must be valid CSV delimiter character if specified; containsHeader must be valid header detection option; header must be valid column names if specified; quoteSymbol must be valid quote character
 */
export interface ClassifierCsvProps {
  /** Allow recognition of single-column CSV files. */
  readonly allowSingleColumn?: boolean;
  /** Header detection: 'UNKNOWN', 'PRESENT', or 'ABSENT'. */
  readonly containsHeader?: string;
  /** Field delimiter character (e.g., comma, semicolon, tab). */
  readonly delimiter?: string;
  /** When true, disables automatic whitespace trimming from field values. */
  readonly disableValueTrimming?: boolean;
  /** Explicit column names, overriding automatic header detection. */
  readonly header?: string[];
  /** Classifier name for identification and management. */
  readonly name?: string;
  /** Quote character for field enclosure (e.g., double quote). */
  readonly quoteSymbol?: string;
}

/**
 * Configuration for classifier format-specific settings supporting CSV, Grok, JSON, and XML classifiers.
 *
 * Use cases: Multi-format data classification; Format-specific parsing; Data schema detection; Custom pattern recognition; Structured data parsing; Document format recognition
 *
 * AWS: AWS Glue classifier configuration with support for CSV, Grok, JSON, and XML data format classification and schema detection
 *
 * Validation: Exactly one classifier type must be specified; csvClassifier must be valid ClassifierCsvProps if specified; other classifiers must be valid CloudFormation classifier properties
 */
export interface ClassifierConfigProps {
  /** CSV classifier configuration. */
  readonly csvClassifier?: ClassifierCsvProps;
  /** Grok pattern-based classifier configuration. */
  readonly grokClassifier?: CfnClassifier.GrokClassifierProperty;
  /** JSON classifier configuration. */
  readonly jsonClassifier?: CfnClassifier.JsonClassifierProperty;
  /** XML classifier configuration. */
  readonly xmlClassifier?: CfnClassifier.XMLClassifierProperty;
}

/**
 * Named map of classifier names to classifier configurations.
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
 * Configuration for a Glue classifier with type selection and format-specific settings.
 *
 * Use cases: Custom data format recognition; Schema detection automation; Data parsing configuration; ETL data classification; Format-specific processing; Automated schema inference
 *
 * AWS: AWS Glue classifiers with custom configuration for automated data format recognition and schema detection in DataOps workflows
 *
 * Validation: classifierType must be valid ClassifierType enum value; configuration must be valid ClassifierConfigProps for specified type; configuration must match classifier type requirements
 */
export interface ClassifierProps {
  /** Classifier type: 'csv', 'grok', 'json', or 'xml'. */
  readonly classifierType: ClassifierType;
  /** Format-specific classifier configuration properties. */
  readonly configuration: ClassifierConfigProps;
}

export type ConnectionType = 'JDBC' | 'KAFKA' | 'MONGODB' | 'NETWORK';

// CDK Type contains IResolvable, so we need to defin this one here!
/**
 * Physical connection requirements for Glue connection VPC networking.
 *
 * Use cases: VPC connection configuration; Network security; External data source connectivity; Secure networking
 *
 * AWS: Glue connection physical requirements for VPC networking and security configuration
 *
 * Validation: All properties are optional; must be valid AWS networking identifiers when provided
 */
export interface ConnectionPhysical {
  /** Availability zone for connection placement. */
  readonly availabilityZone?: string;
  /** Project-generated security group names for connection access control. */
  readonly projectSecurityGroupNames?: string[];
  /** Existing security group IDs for VPC connection access control. */
  readonly securityGroupIdList?: string[];
  /** Subnet ID for connection VPC placement. */
  readonly subnetId?: string;
}

/**
 * Named map of connection names to connection configurations.
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
 * Configuration for a Glue connection with multi-protocol support for external data sources.
 *
 * Use cases: External data source connectivity; Database connections; Streaming data connections; Network connectivity; Authentication management; Multi-protocol data access
 *
 * AWS: AWS Glue connections with multi-protocol support for JDBC, Kafka, MongoDB, and network connections in DataOps workflows
 *
 * Validation: connectionType must be valid ConnectionType enum value; connectionProperties must be valid for specified connection type; matchCriteria must be valid selection criteria
 */
export interface ConnectionProps {
  /** Connection type: 'JDBC', 'KAFKA', 'MONGODB', or 'NETWORK'. */
  readonly connectionType: ConnectionType;
  /** Key-value pairs for authentication and connection configuration. */
  readonly connectionProperties?: ConfigurationElement;
  /** Description of the connection's purpose. */
  readonly description?: string;
  /** Criteria for automated connection selection in ETL jobs. */
  readonly matchCriteria?: string[];
  /** VPC networking requirements for the connection. */
  readonly physicalConnectionRequirements?: ConnectionPhysical;
}

export interface DataOpsProjectL3ConstructProps extends MdaaL3ConstructProps {
  /** Existing KMS key ARN for S3 output encryption. Creates a new key if not provided. */
  readonly s3OutputKmsKeyArn?: string;
  /** Map of classifier names to classifier definitions. */
  readonly classifiers?: NamedClassifierProps;
  /** Map of connection names to connection definitions. */
  readonly connections?: NamedConnectionProps;
  /** KMS key ARN for Glue catalog metadata and connection credential encryption. */
  readonly glueCatalogKmsKeyArn?: string;
  /** IAM role references for project execution permissions. */
  readonly projectExecutionRoleRefs: MdaaRoleRef[];
  /** Map of database names to database definitions. */
  readonly databases?: NamedDatabaseProps;
  /** IAM role references for data engineering team access. */
  readonly dataEngineerRoleRefs: MdaaRoleRef[];
  /** IAM role references for data administration and governance. */
  readonly dataAdminRoleRefs: MdaaRoleRef[];
  /** Failure notification configuration for automated alerting. */
  readonly failureNotifications?: FailureNotificationsProps;
  /** Security group configurations for project resource networking. */
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;
  /** DataZone configuration for data governance and catalog integration. */
  readonly datazone?: DataOpsDatazoneProps;
  /** SageMaker configuration for data governance and catalog integration. */
  readonly sagemaker?: DataOpsSageMakerProps;

  /** Project-level Lake Formation configuration for centralized tag-based access control. */
  readonly lakeFormation?: LakeFormationConfig;
}

/**
 * DataZone configuration for data governance integration.
 *
 * Use cases: DataOps project management; Glue database configuration; Lake Formation integration; Data workflow orchestration; Project resource management
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface DataOpsDatazoneProps {
  /** SSM parameter name containing domain configuration. */
  readonly domainConfigSSMParam?: string;
  /** Direct domain configuration object. */
  readonly domainConfig?: DomainConfig;
  /** DataZone project configuration for DataOps integration. */
  readonly project: DataZoneProjectProps;
}

export interface DataZoneProjectProps {
  /** SSM parameter name containing domain configuration. */
  readonly domainConfigSSMParam?: string;
  /** Direct domain configuration object. */
  readonly domainConfig?: DomainConfig;
  /** DataZone environment configuration for VPC connectivity and Lake Formation integration. */
  readonly environment?: DataZoneEnvironmentProps;
  /** Domain unit identifier for organizational hierarchy. */
  readonly domainUnit?: string;
  /** MDAA module user config names with PROJECT_OWNER designation. */
  readonly ownerUsers?: { [id: string]: string };
  /** MDAA module group config names with PROJECT_OWNER designation. */
  readonly ownerGroups?: { [id: string]: string };
  /** MDAA module user config names with PROJECT_CONTRIBUTOR designation. */
  readonly users?: { [id: string]: string };
  /** MDAA module group config names with PROJECT_CONTRIBUTOR designation. */
  readonly groups?: { [id: string]: string };
}
export interface DataZoneEnvironmentProps {
  /** Lake Formation manage access role reference for DataZone environment governance. */
  readonly lakeformationManageAccessRole: MdaaRoleRef;
}

export interface DataOpsSageMakerProps {
  /** SSM parameter name containing domain configuration. */
  readonly domainConfigSSMParam?: string;
  /** Direct domain configuration object. */
  readonly domainConfig?: DomainConfig;
  /** Auto-assign data admin roles as project owners. */
  readonly createDataAdminOwners?: boolean;
  /** SageMaker project configuration for DataOps integration. */
  readonly project: SageMakerProjectProps;
}

/**
 * Named map of security group names to security group configurations.
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
 * Configuration for a project security group with VPC placement and egress rules.
 *
 * Use cases: Network security configuration; VPC security groups; Egress rule management; Network access control; Infrastructure security; Secure communication
 *
 * AWS: EC2 security groups with VPC placement and configurable egress rules for DataOps project network security and access control
 *
 * Validation: vpcId must be valid VPC identifier; securityGroupEgressRules must be valid MdaaSecurityGroupRuleProps if specified; egress rules must be properly configured
 */
export interface SecurityGroupConfigProps {
  /** VPC ID for security group deployment. */
  readonly vpcId: string;
  /** Egress rules for outbound traffic control. */
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

/**
 * Configuration for DataOps failure notifications with email-based alerting.
 *
 * Use cases: Failure alerting; Email notifications; Operational monitoring; Pipeline failure alerts; Job failure notifications; DataOps monitoring
 *
 * AWS: SNS-based email notifications for DataOps pipeline and job failure alerting with configurable recipient lists
 *
 * Validation: email must be valid email addresses if specified; email addresses must be properly formatted for SNS delivery
 */
export interface FailureNotificationsProps {
  /** Email addresses for failure notification delivery. */
  readonly email?: string[];
}

interface DatazoneResources {
  readonly datazoneProject: MdaaDatazoneProject;
  readonly datazoneEnvId?: string;
  readonly lakeformationManageAccessRole?: IRole;
  readonly glueConnectionId?: string;
  readonly envUserRoleArn?: string;
}

export class DataOpsProjectL3Construct extends MdaaL3Construct {
  protected readonly props: DataOpsProjectL3ConstructProps;

  private readonly projectExecutionRoles: MdaaResolvableRole[];
  private readonly dataAdminRoles: MdaaResolvableRole[];
  private readonly dataEngineerRoles: MdaaResolvableRole[];
  private readonly dataAdminRoleIds: string[];
  private readonly projectLevelLFTagsConstruct?: LakeFormationTagsL3Construct;

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

    const kmsKey = this.createkmsKey([projectDeploymentRole, datazoneUserRole, lakeFormationLocationRole]);

    const s3OutputKmsKey = props.s3OutputKmsKeyArn
      ? MdaaKmsKey.fromKeyArn(this.scope, 's3OutputKmsKey', props.s3OutputKmsKeyArn)
      : kmsKey;

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
      kmsKey,
      s3OutputKmsKey,
      projectDeploymentRole,
      datazoneUserRole,
      lakeFormationLocationRole,
    );

    const datazoneResources = this.createDataZoneSageMakerResources(projectBucket, datazoneUserRole);

    this.createAthenaWorkgroup(
      datazoneUserRole,
      projectBucket,
      datazoneResources?.datazoneProject,
      datazoneResources?.datazoneEnvId,
    );

    // Create project-level Lake Formation tags BEFORE databases
    // This ensures tags exist at account level before any database associations
    this.projectLevelLFTagsConstruct = createLakeFormationTags(this, this.props);

    const securityConfiguration = this.createProjectSecurityConfig(kmsKey, s3OutputKmsKey);

    this.createProjectDatabases(this.props.databases || {}, projectBucket, securityConfiguration, datazoneResources);

    // create project SNS topic
    const topic = this.createSNSTopic(kmsKey);

    // subcribe SNS topic if failure notification config is enabled
    this.subscribeSNSTopic(topic, this.props.failureNotifications);

    // Build our custom classifiers if they are defined.
    this.createProjectClassifiers(this.props.classifiers || {});

    // Build our connectors if they are in use.
    this.createProjectConnectors(this.props.connections || {}, projectSecurityGroups);

    //If the Glue Catalog KMS key is specified, grant decrypt access to it
    //for project execution roles (direct access required to decrypt Glue connections)
    const glueCatalogKmsKeyArn = this.props.glueCatalogKmsKeyArn
      ? this.props.glueCatalogKmsKeyArn
      : MdaaStringParameter.valueForStringParameter(scope, GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH);

    if (glueCatalogKmsKeyArn) {
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
        resources: [glueCatalogKmsKeyArn],
      });
      keyAccessPolicy.addStatements(keyAccessStatement);
    }
  }
  private createDataZoneSageMakerResources(
    projectBucket: IBucket,
    datazoneUserRole: Role,
  ): DatazoneResources | undefined {
    if (this.props.datazone && this.props.sagemaker) {
      throw new Error('Only one of datazone or sagemaker properties should be defined');
    }
    if (this.props.datazone) {
      return this.createDatazoneResources(this.props.datazone, projectBucket, datazoneUserRole);
    } else if (this.props.sagemaker) {
      return this.createSageMakerResources(this.props.sagemaker);
    }
    return undefined;
  }

  private createLakeFormationRole() {
    return new MdaaRole(this.scope, 'lake-formation-role', {
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
      roleName: 'lake-formation',
      description: 'Role for accessing the data lake via LakeFormation.',
    });
  }

  private createSageMakerResources(sageMakerProps: DataOpsSageMakerProps): DatazoneResources | undefined {
    const sagemakerL3ConstructProps: SagemakerProjectL3ConstructProps = {
      domainConfigSSMParam: sageMakerProps.domainConfigSSMParam,
      domainConfig: sageMakerProps.domainConfig,
      projects: { dataops: sageMakerProps.project },
      roleHelper: this.props.roleHelper,
      naming: this.props.naming,
    };
    const sagemakerL3Construct = new SagemakerProjectL3Construct(this, 'sagemaker', sagemakerL3ConstructProps);
    if (!sagemakerL3Construct.projects?.['dataops']) {
      throw new Error('SageMaker project not created');
    }
    const project = sagemakerL3Construct.projects['dataops'];
    if (sageMakerProps.createDataAdminOwners) {
      this.dataAdminRoles.forEach(role => project.addOwnerUser(role.refId(), role.arn()));
    }

    return {
      datazoneProject: project,
      glueConnectionId: project.glueConnectionId,
      envUserRoleArn: project.envUserArn,
    };
  }

  private createDatazoneResources(
    datazoneProps: DataOpsDatazoneProps,
    projectBucket: IBucket,
    datazoneUserRole: Role,
  ): DatazoneResources {
    const project = this.createDataZoneProject(datazoneProps);
    const env = this.createDataZoneEnvironment(
      project,
      datazoneUserRole,
      projectBucket,
      datazoneProps.project.environment,
    );

    return {
      datazoneProject: project,
      datazoneEnvId: env.env.attrId,
      lakeformationManageAccessRole: env.lakeformationManageAccessRole,
    };
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
  private createDataZoneProject(datazoneProps: DataOpsDatazoneProps): MdaaDatazoneProject {
    // Check for domainConfigSSMParam at both top level and project level
    const domainConfigSSMParam = datazoneProps.domainConfigSSMParam || datazoneProps.project.domainConfigSSMParam;
    const domainConfigObj = datazoneProps.domainConfig || datazoneProps.project.domainConfig;

    const domainConfig = domainConfigSSMParam
      ? new DomainConfig(this, 'domain-config-parser', {
          ssmParamBase: domainConfigSSMParam,
          naming: this.props.naming,
        })
      : domainConfigObj;

    if (!domainConfig) {
      throw new Error('One of domainConfig or domainConfigSSMParam must be specified');
    }
    const constructProps: MdaaDatazoneProjectProps = {
      ...datazoneProps.project,
      naming: this.props.naming,
      domainConfig: domainConfig,
    };
    return new MdaaDatazoneProject(this, `datazone-project`, constructProps);
  }

  private createDataZoneEnvironment(
    project: MdaaDatazoneProject,
    envUserRole: Role,
    envBucket: IBucket,
    envProps?: DataZoneEnvironmentProps,
  ): MdaaDatazoneEnvironment {
    const lakeformationManageAccessRole = envProps?.lakeformationManageAccessRole
      ? this.props.roleHelper
          .resolveRoleRefWithRefId(envProps.lakeformationManageAccessRole, 'lf-manage-access-role')
          .role('lf-manage-access-role')
      : Role.fromRoleArn(
          this,
          'lf-manage-access-role',
          MdaaStringParameter.valueForStringParameter(
            this,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );

    envUserRole.addManagedPolicy(project.domainKmsUsagePolicy);

    const envBuildProps: MdaaDatazoneEnvironmentProps = {
      project: project,
      envUserRole: envUserRole,
      lakeformationManageAccessRole: lakeformationManageAccessRole,
      envBucket: envBucket,
      account: this.account,
      region: this.region,
      naming: this.props.naming,
    };
    const env = new MdaaDatazoneEnvironment(this, `datazone-env`, envBuildProps, true);

    const projectRoleGrantProps: { [key: string]: GrantProps } = {};

    projectRoleGrantProps[`data-admins-datazone-sub`] = {
      database: env.subDatabaseName,
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

    projectRoleGrantProps[`datazone-roles-datazone-sub`] = {
      database: env.subDatabaseName,
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
      databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
      principals: {
        datazone: {
          role: {
            refId: 'datazone',
            arn: lakeformationManageAccessRole.roleArn,
          },
        },
      },
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
    };

    const lakeFormationProps: LakeFormationAccessControlL3ConstructProps = {
      grants: { ...projectRoleGrantProps },
      externalDatabaseDependency: env.subDatabase,
      ...(this.props as MdaaL3ConstructProps),
    };

    //Use the LF Account Control construct to create all database grants and resource links
    const lf = new LakeFormationAccessControlL3Construct(this, `lf-grants-datazone-sub`, lakeFormationProps);
    lf.node.addDependency(env.subDatabase);

    return env;
  }

  private createAthenaWorkgroup(
    datazoneUserRole: Role,
    projectBucket: IBucket,
    datazoneProject?: MdaaDatazoneProject,
    datazoneEnvId?: string,
  ) {
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
    if (datazoneEnvId && datazoneProject) {
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneEnvironment', datazoneEnvId);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneProject', datazoneProject?.project.attrId);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneDomain', datazoneProject?.project.domainIdentifier);
    }
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

  private createProjectSecurityConfig(kmsKey: IMdaaKmsKey, s3OutputKmsKey: IKey): SecurityConfiguration {
    //Create project security Config
    const projectSecurityConfig = new MdaaSecurityConfig(this.scope, `security-config`, {
      cloudWatchKmsKey: kmsKey,
      jobBookMarkKmsKey: kmsKey,
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
    securityConfiguration: SecurityConfiguration,
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

      if (databaseProps.createDatazoneDatasource || databaseProps.createSagemakerDatasource) {
        this.createDataZoneDatasource(databaseName, dbResourceName, database, datazoneResources);
      }

      // Use LF Access Control L3 Contruct to create LF grants and Resource Links for the database
      if (
        databaseProps.lakeFormation ||
        databaseProps.createDatazoneDatasource ||
        databaseProps.createSagemakerDatasource
      ) {
        this.createDatabaseLakeFormationConstruct(
          databaseName,
          dbResourceName,
          database,
          databaseProps.lakeFormation || {},
          databaseProps.createDatazoneDatasource || databaseProps.createSagemakerDatasource || false,
          datazoneResources,
          databaseBucket?.arnForObjects(databaseProps.locationPrefix || ''),
        );
      }

      this.createProjectCrawler(databaseName, dbName, databaseProps, database, databaseBucket, securityConfiguration);

      // Required so we can auto-wire other stacks/resources to this project resource via SSM
      this.createProjectSSMParam(`ssm-database-name-${databaseName}`, `databaseName/${databaseName}`, dbResourceName);
    });
  }
  private createProjectCrawler(
    databaseConfigName: string,
    dbConstructName: string,
    databaseProps: DatabaseProps,
    database: CfnDatabase,
    databaseBucket: IBucket,
    securityConfiguration: SecurityConfiguration,
  ) {
    if (!databaseProps.crawler) return;
    const role = this.props.roleHelper.resolveRoleRefWithRefId(
      databaseProps.crawler.role,
      `${databaseConfigName}-crawler-role`,
    );

    const crawlerProps: MdaaCfnCrawlerProps = {
      name: databaseConfigName,
      role: role.arn(),
      databaseName: dbConstructName,
      targets: { s3Targets: [{ path: databaseBucket.s3UrlForObject(databaseProps.locationPrefix || '') }] },
      crawlerSecurityConfiguration: securityConfiguration.securityConfigurationName,
      naming: this.props.naming,
    };

    new MdaaCfnCrawler(database, 'crawler', crawlerProps);
  }

  private createDataZoneDatasource(
    databaseName: string,
    databaseResourceName: string,
    database: CfnDatabase,
    datazoneResources?: DatazoneResources,
  ) {
    if (!datazoneResources) {
      throw new Error('DataZone/SageMaker Project must be defined if creating a DataZone Data Source');
    }

    const datasourceProps: CfnDataSourceProps = {
      domainIdentifier: datazoneResources.datazoneProject.project.attrDomainId,
      environmentIdentifier: datazoneResources.datazoneEnvId, //Not required for SMUS projects
      connectionIdentifier: datazoneResources.glueConnectionId, //Need to pass glue connection id for SMUS projects
      name: this.props.naming.resourceName(databaseName),
      projectIdentifier: datazoneResources.datazoneProject.project.attrId,
      type: 'glue',
      configuration: {
        glueRunConfiguration: {
          autoImportDataQualityResult: true,
          dataAccessRole: datazoneResources.lakeformationManageAccessRole?.roleArn, //Used only for Datazone, not SUS
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
    datazoneResources?: DatazoneResources,
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

    if (createDatazoneDatasource) {
      if (datazoneResources?.lakeformationManageAccessRole) {
        projectRoleGrantProps[`datazone-roles-${databaseName}`] = {
          database: dbResourceName,
          databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
          databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
          principals: {
            datazone: {
              role: {
                refId: 'datazone',
                arn: datazoneResources?.lakeformationManageAccessRole?.roleArn,
              },
            },
          },
          tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
          tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
        };
      }
      if (datazoneResources?.envUserRoleArn) {
        projectRoleGrantProps[`datazone-user-roles-${databaseName}`] = {
          database: dbResourceName,
          databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
          databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
          principals: {
            'datazone-user': {
              role: {
                refId: 'datazone-user',
                arn: datazoneResources?.envUserRoleArn,
              },
            },
          },
          tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
          tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
        };
      }
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
        const accountPrincipalEntries = Object.entries(lfGrantProps).flatMap(lfGrantEntry => {
          const lfGrantProps = lfGrantEntry[1];
          return Object.entries(lfGrantProps.principals).filter(principalEntry => {
            const principalName = principalEntry[0];
            const principalProps = principalEntry[1];
            const principalAccount = this.determinePrincipalAccount(principalName, principalProps);
            return principalAccount == account;
          });
        });
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

    // Handle Lake Formation Tags
    // Project-level tags are created once before all databases
    // Database-level tag values associate specific tags from the project-level vocabulary to individual databases
    processLakeFormationTagsPermissions(
      this,
      {
        lakeFormationTagsConstruct: this.projectLevelLFTagsConstruct,
        databaseName: databaseName,
        dbResourceName: dbResourceName,
        database: database,
        otherProps: this.props,
        lakeFormationAccessControl: lf,
      },
      databaseLakeFormationProps,
    );
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
      principals: { ...dbGrantProps.principals, ...principalArns },
    };
  }

  private createkmsKey(keyUserRoles: Role[]): IMdaaKmsKey {
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
    kmsKey: IKey,
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
      encryptionKey: kmsKey,
      additionalKmsKeyArns: [s3OutputKmsKey.keyArn],
      naming: this.props.naming,
    });

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

  private createSNSTopic(kmsKey: IMdaaKmsKey): MdaaSnsTopic {
    // create SNS topic
    const snsProps: MdaaSnsTopicProps = {
      naming: this.props.naming,
      topicName: 'dataops-sns-topic',
      masterKey: kmsKey,
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
    new MdaaStringParameter(this.scope, paramId, {
      parameterName: this.props.naming.ssmPath(ssmPath, true, false),
      stringValue: paramValue,
    });
  }
}
