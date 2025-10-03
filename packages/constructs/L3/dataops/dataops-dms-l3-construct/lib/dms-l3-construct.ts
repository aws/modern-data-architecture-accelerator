/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DocDbSettingsProperty,
  DynamoDbSettingsProperty,
  ElasticsearchSettingsProperty,
  IbmDb2SettingsProperty,
  KinesisSettingsProperty,
  MdaaEndpoint,
  MdaaEndpointEngine,
  MdaaEndpointProps,
  MdaaEndpointType,
  MdaaReplicationInstance,
  MdaaReplicationInstanceProps,
  MicrosoftSqlServerSettingsProperty,
  MongoDbSettingsProperty,
  MySqlSettingsProperty,
  NeptuneSettingsProperty,
  OracleSettingsProperty,
  PostgreSqlSettingsProperty,
  RedshiftSettingsProperty,
  S3SettingsProperty,
  SybaseSettingsProperty,
} from '@aws-mdaa/dms-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  CfnEndpoint,
  CfnReplicationInstance,
  CfnReplicationSubnetGroup,
  CfnReplicationSubnetGroupProps,
  CfnReplicationTask,
  CfnReplicationTaskProps,
} from 'aws-cdk-lib/aws-dms';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { SuppressionProps } from '@aws-mdaa/roles-l3-construct';
import { CfnResource } from 'aws-cdk-lib';

/**
 * Q-ENHANCED-INTERFACE
 * EndpointProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface EndpointProps {
  /**
   * The type of Endpoint ("source" or "target")
   */
  readonly endpointType: MdaaEndpointType;
  /**
   * The name of the endpoint engine
   */
  readonly engineName: MdaaEndpointEngine;
  /**
   * The optional name of the endpoint database. Required for certain endpoint types.
   */
  readonly databaseName?: string;
  /**
   * Settings in JSON format for the source and target DocumentDB endpoint.
   * For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-docdbsettings
   */
  readonly docDbSettings?: DocDbSettingsProperty;
  /**
   * Settings in JSON format for the target Amazon DynamoDB endpoint.
   * For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-dynamodbsettings
   */
  readonly dynamoDbSettings?: DynamoDbSettingsProperty;
  /**
   * Settings in JSON format for the target OpenSearch endpoint.
   * For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-elasticsearchsettings
   */
  readonly elasticsearchSettings?: ElasticsearchSettingsProperty;
  /**
   * Settings in JSON format for the source IBM Db2 LUW endpoint.
   * For information about other available settings, see [Extra connection attributes when using Db2 LUW as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DB2.html#CHAP_Source.DB2.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-ibmdb2settings
   */
  readonly ibmDb2Settings?: IbmDb2SettingsProperty;
  /**
   * Settings in JSON format for the target endpoint for Amazon Kinesis Data Streams.
   * For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-kinesissettings
   */
  readonly kinesisSettings?: KinesisSettingsProperty;
  /**
   * Settings in JSON format for the source and target Microsoft SQL Server endpoint.
   * For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-microsoftsqlserversettings
   */
  readonly microsoftSqlServerSettings?: MicrosoftSqlServerSettingsProperty;
  /**
   * Settings in JSON format for the source MongoDB endpoint.
   * For more information about the available settings, see [Using MongoDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-mongodbsettings
   */
  readonly mongoDbSettings?: MongoDbSettingsProperty;
  /**
   * Settings in JSON format for the source and target MySQL endpoint.
   * For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-mysqlsettings
   */
  readonly mySqlSettings?: MySqlSettingsProperty;
  /**
   * Settings in JSON format for the target Amazon Neptune endpoint.
   * For more information about the available settings, see [Specifying endpoint settings for Amazon Neptune as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.EndpointSettings) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-neptunesettings
   */
  readonly neptuneSettings?: NeptuneSettingsProperty;
  /**
   * Settings in JSON format for the source and target Oracle endpoint.
   * For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-oraclesettings
   */
  readonly oracleSettings?: OracleSettingsProperty;
  /**
   * Settings in JSON format for the source and target PostgreSQL endpoint.
   * For information about other available settings, see [Extra connection attributes when using PostgreSQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) and [Extra connection attributes when using PostgreSQL as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html#CHAP_Target.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-postgresqlsettings
   */
  readonly postgreSqlSettings?: PostgreSqlSettingsProperty;
  /**
   * Settings in JSON format for the Amazon Redshift endpoint.
   * For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-redshiftsettings
   */
  readonly redshiftSettings?: RedshiftSettingsProperty;
  /**
   * Settings in JSON format for the source and target Amazon S3 endpoint.
   * For more information about other available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-s3settings
   */
  readonly s3Settings?: S3SettingsProperty;
  /**
   * Settings in JSON format for the source and target SAP ASE endpoint.
   * For information about other available settings, see [Extra connection attributes when using SAP ASE as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SAP.html#CHAP_Source.SAP.ConnectionAttrib) and [Extra connection attributes when using SAP ASE as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SAP.html#CHAP_Target.SAP.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-sybasesettings
   */
  readonly sybaseSettings?: SybaseSettingsProperty;
}
/**
 * Q-ENHANCED-INTERFACE
 * NamedEndpointProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface NamedEndpointProps {
  /**
   * @jsii ignore
   */
  [instanceName: string]: EndpointProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * ReplicationInstanceProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface ReplicationInstanceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required compute class specification for DMS replication instance enabling performance and capacity optimization for database migration workloads. Defines the compute capacity and performance characteristics of the replication instance for handling database migration tasks, data transfer operations, and replication workloads.
   *
   * Use cases: Performance optimization; Capacity planning; Migration workload sizing; Cost optimization; Compute resource specification
   *
   * AWS: AWS DMS replication instance class for compute capacity and performance optimization
   *
   * Validation: Must be valid DMS instance class; required for replication instance deployment; see AWS DMS documentation for supported types
   **/
  readonly instanceClass: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet identifiers for DMS replication instance deployment enabling multi-AZ availability and network distribution. Defines the subnets where the replication instance will be deployed, requiring at least two availability zones for high availability and fault tolerance in database migration operations.
   *
   * Use cases: Multi-AZ deployment; High availability; Network distribution; Fault tolerance; Availability zone redundancy
   *
   * AWS: Amazon VPC subnet identifiers for DMS replication instance multi-AZ deployment and high availability
   *
   * Validation: Must be array of valid subnet identifiers; required for replication instance deployment; must span at least two availability zones
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier for DMS replication instance deployment enabling network isolation and security boundaries. Defines the Virtual Private Cloud that will host the replication instance providing network-level security and isolation for database migration operations and data transfer workflows.
   *
   * Use cases: Network isolation; VPC deployment; Security boundaries; Private migration environments; Network-level security
   *
   * AWS: Amazon VPC identifier for DMS replication instance deployment and network isolation
   *
   * Validation: Must be valid VPC identifier; required for VPC-based replication instance deployment
   **/
  readonly vpcId: string;
  /**
   * List of ingress rules to be added to the function SG
   */
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * List of egress rules to be added to the function SG
   */
  readonly egressRules?: MdaaSecurityGroupRuleProps;
  /**
   * If true, the SG will allow traffic to and from itself
   */
  readonly addSelfReferenceRule?: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * NamedReplicationInstanceProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface NamedReplicationInstanceProps {
  /**
   * @jsii ignore
   */
  [instanceName: string]: ReplicationInstanceProps;
}
export type DmsMigrationType = `full-load` | `cdc` | `full-load-and-cdc`;
/**
 * Q-ENHANCED-INTERFACE
 * ReplicationTaskProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface ReplicationTaskProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required replication instance name reference for DMS task execution enabling task-to-instance association and resource allocation. Specifies the name of the replication instance from the replicationInstances section that will execute this migration task, providing compute resources for data transfer operations.
   *
   * Use cases: Task-instance association; Resource allocation; Migration task execution; Compute resource assignment; DMS task configuration
   *
   * AWS: AWS DMS replication instance reference for task execution and resource allocation
   *
   * Validation: Must reference valid replication instance name from replicationInstances section; required for task execution
   **/
  readonly replicationInstance: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required source endpoint name reference for DMS task data source configuration enabling source database connectivity and data extraction. Specifies the name of the source endpoint from the endpoints section that defines the source database connection for data migration operations.
   *
   * Use cases: Source database configuration; Data extraction setup; Database connectivity; Migration source definition; Endpoint reference
   *
   * AWS: AWS DMS source endpoint reference for source database connectivity and data extraction
   *
   * Validation: Must reference valid source endpoint name from endpoints section; required for source database configuration
   **/
  readonly sourceEndpoint: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required target endpoint name reference for DMS task data destination configuration enabling target database connectivity and data loading. Specifies the name of the target endpoint from the endpoints section that defines the destination database connection for data migration operations.
   *
   * Use cases: Target database configuration; Data loading setup; Database connectivity; Migration destination definition; Endpoint reference
   *
   * AWS: AWS DMS target endpoint reference for target database connectivity and data loading
   *
   * Validation: Must reference valid target endpoint name from endpoints section; required for target database configuration
   **/
  readonly targetEndpoint: string;
  /**
   * Indicates when you want a change data capture (CDC) operation to start.
   * Use either `CdcStartPosition` or `CdcStartTime` to specify when you want a CDC operation to start. Specifying both values results in an error.
   * The value can be in date, checkpoint, log sequence number (LSN), or system change number (SCN) format.
   * Here is a date example: `--cdc-start-position "2018-03-08T12:12:12"`
   * Here is a checkpoint example: `--cdc-start-position "checkpoint:V1#27#mysql-bin-changelog.157832:1975:-1:2002:677883278264080:mysql-bin-changelog.157832:1876#0#0#*#0#93"`
   * Here is an LSN example: `--cdc-start-position “mysql-bin-changelog.000024:373”`
   * > When you use this task setting with a source PostgreSQL database, a logical replication slot should already be created and associated with the source endpoint. You can verify this by setting the `slotName` extra connection attribute to the name of this logical replication slot. For more information, see [Extra Connection Attributes When Using PostgreSQL as a Source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstartposition
   */
  readonly cdcStartPosition?: string;
  /**
   * Indicates the start time for a change data capture (CDC) operation.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstarttime
   */
  readonly cdcStartTime?: number;
  /**
   * Indicates when you want a change data capture (CDC) operation to stop.
   * The value can be either server time or commit time.
   * Here is a server time example: `--cdc-stop-position "server_time:2018-02-09T12:12:12"`
   * Here is a commit time example: `--cdc-stop-position "commit_time: 2018-02-09T12:12:12"`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstopposition
   */
  readonly cdcStopPosition?: string;
  /**
   * The migration type.
   * Valid values: `full-load` | `cdc` | `full-load-and-cdc`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-migrationtype
   */
  readonly migrationType: DmsMigrationType;
  /**
   * The table mappings for the task, in JSON format.
   * For more information, see [Using Table Mapping to Specify Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-tablemappings
   */
  readonly tableMappings: { [key: string]: unknown };
  /**
   * Supplemental information that the task requires to migrate the data for certain source and target endpoints.
   * For more information, see [Specifying Supplemental Data for Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.TaskData.html) in the *AWS Database Migration Service User Guide.*
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-taskdata
   */
  readonly taskData?: { [key: string]: unknown };
  /**
   * Overall settings for the task, in JSON format.
   * For more information, see [Specifying Task Settings for AWS Database Migration Service Tasks](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-replicationtasksettings
   */
  readonly replicationTaskSettings?: { [key: string]: unknown };
}
/**
 * Q-ENHANCED-INTERFACE
 * NamedReplicationTaskProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface NamedReplicationTaskProps {
  /**
   * @jsii ignore
   */
  [taskName: string]: ReplicationTaskProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * DMSProps configuration interface for database migration and replication.
 *
 * Use cases: Database migration; Database replication; Data migration workflows; Database connectivity
 *
 * AWS: AWS Database Migration Service configuration for database migration and replication
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS DMS and MDAA requirements
 */
export interface DMSProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for AWS Database Migration Service operations enabling custom role specification for DMS service access. Provides ability to specify a custom IAM role for DMS operations when default service roles are insufficient or when specific permissions are required.
   *
   * Use cases: Custom IAM role specification; Advanced permission management; Cross-account DMS access; Custom service roles
   *
   * AWS: IAM role ARN for AWS Database Migration Service operations and resource access
   *
   * Validation: Must be valid IAM role ARN format if provided; optional for custom role specification
   **/
  readonly dmsRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to create DMS VPC service role enabling VPC-based database migration operations. Controls whether MDAA will create the required VPC service role for DMS operations in VPC environments with private database connectivity.
   *
   * Use cases: VPC-based migrations; Private database connectivity; DMS VPC role creation; Network-isolated migrations
   *
   * AWS: AWS DMS VPC service role creation for VPC-based database migration operations
   *
   * Validation: Must be boolean value if provided; optional for VPC service role management
   **/
  readonly createDmsVpcRole?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to create DMS CloudWatch Logs service role enabling migration logging and monitoring capabilities. Controls whether MDAA will create the required CloudWatch Logs service role for DMS operation logging and monitoring.
   *
   * Use cases: Migration logging; DMS monitoring; CloudWatch integration; Log management; Migration troubleshooting
   *
   * AWS: AWS DMS CloudWatch Logs service role creation for migration logging and monitoring
   *
   * Validation: Must be boolean value if provided; optional for logging service role management
   **/
  readonly createDmsLogRole?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional named replication instances configuration for DMS migration infrastructure enabling scalable database migration operations. Defines the compute resources that will perform the actual data migration tasks with appropriate sizing and configuration.
   *
   * Use cases: Migration infrastructure; Replication instance management; Migration scaling; Compute resource allocation
   *
   * AWS: AWS DMS replication instances for database migration compute infrastructure
   *
   * Validation: Must be valid NamedReplicationInstanceProps if provided; optional for replication instance configuration
   **/
  readonly replicationInstances?: NamedReplicationInstanceProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional named endpoints configuration for DMS source and target database connections enabling flexible database connectivity. Defines the database connection endpoints that DMS will use for source and target databases in migration operations.
   *
   * Use cases: Database connectivity; Source/target configuration; Connection management; Multi-database migrations
   *
   * AWS: AWS DMS endpoints for source and target database connection configuration
   *
   * Validation: Must be valid NamedEndpointProps if provided; optional for endpoint configuration
   **/
  readonly endpoints?: NamedEndpointProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional named replication tasks configuration for DMS migration job definitions enabling automated database migration workflows. Defines the specific migration tasks that will transfer data between source and target databases with appropriate settings and filters.
   *
   * Use cases: Migration task definition; Data transfer workflows; Migration automation; Task scheduling
   *
   * AWS: AWS DMS replication tasks for automated database migration job execution
   *
   * Validation: Must be valid NamedReplicationTaskProps if provided; optional for replication task configuration
   **/
  readonly replicationTasks?: NamedReplicationTaskProps;
}
export interface DMSL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for DMS integration and resource coordination enabling project-based resource organization and management. Provides the project identifier that associates DMS resources with the DataOps project for resource coordination and governance integration.
   *
   * Use cases: Project association; Resource coordination; DataOps integration; Project management
   *
   * AWS: DataOps project name for DMS association and project-based resource organization
   *
   * Validation: Must be valid project name; required for DMS project association and resource coordination
   **/
  readonly projectName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project bucket name for DMS temporary storage enabling intermediate data storage during migration operations. Provides S3 bucket for storing temporary migration data, logs, and intermediate files during database migration and replication processes.
   *
   * Use cases: Temporary storage; Migration data; Intermediate files; Log storage
   *
   * AWS: S3 bucket name for DMS temporary storage and migration data management
   *
   * Validation: Must be valid S3 bucket name; required for DMS temporary storage and migration operations
   **/
  readonly projectBucket?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for DMS resource encryption enabling customer-controlled encryption and enhanced security compliance. Provides customer-managed KMS key for encrypting DMS replication instances, storage, and migration data ensuring data protection and security compliance.
   *
   * Use cases: Migration encryption; Customer-controlled keys; Security compliance; Data protection
   *
   * AWS: KMS key ARN for DMS resource encryption and customer-controlled data protection
   *
   * Validation: Must be valid KMS key ARN; required for DMS encryption and security compliance
   **/
  readonly kmsArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DMS configuration defining database migration setup including endpoints, replication instances, and migration tasks. Provides complete DMS deployment configuration with source and target endpoints, replication infrastructure, and migration task definitions for database modernization workflows.
   *
   * Use cases: Migration configuration; Database replication; Endpoint setup; Task management
   *
   * AWS: DMS configuration for database migration and replication infrastructure deployment
   *
   * Validation: Must be valid DMSProps; required for DMS deployment and database migration operations
   **/
  readonly dms: DMSProps;
}

export class DMSL3Construct extends MdaaL3Construct {
  private static readonly engineToSettingsNameMap: { [engineName in MdaaEndpointEngine]: string | undefined } = {
    mysql: 'mySqlSettings',
    oracle: 'oracleSettings',
    postgres: 'postgreSqlSettings',
    mariadb: 'mySqlSettings',
    aurora: 'mySqlSettings',
    'aurora-postgresql': 'postgreSqlSettings',
    opensearch: undefined,
    redshift: 'redshiftSettings',
    'redshift-serverless': '',
    s3: 's3Settings',
    db2: 'ibmDb2Settings',
    azuredb: undefined,
    sybase: 'sybaseSettings',
    dynamodb: 'dynamoDbSettings',
    mongodb: 'mongoDbSettings',
    kinesis: 'kinesisSettings',
    kafka: undefined,
    elasticsearch: 'elasticsearchSettings',
    docdb: 'docDbSettings',
    sqlserver: 'microsoftSqlServerSettings',
    neptune: 'neptuneSettings',
  };

  private static readonly awsServiceEngineNames: MdaaEndpointEngine[] = [
    's3',
    'dynamodb',
    'kinesis',
    'docdb',
    'neptune',
  ];

  protected readonly props: DMSL3ConstructProps;
  protected readonly projectKms: IKey;
  protected readonly projectBucket: IBucket;

  constructor(scope: Construct, id: string, props: DMSL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    if (!this.props.kmsArn) {
      throw new Error('Please provide kmsArn');
    }
    this.projectKms = Key.fromKeyArn(this.scope, 'project-kms', this.props.kmsArn);
    if (!this.props.projectBucket) {
      throw new Error('Please provide projectBucket');
    }
    this.projectBucket = Bucket.fromBucketName(this.scope, `project-bucket`, this.props.projectBucket);
    const dmsRole = props.dms.dmsRoleArn
      ? Role.fromRoleArn(this, 'dms-role', props.dms.dmsRoleArn)
      : this.createDmsRole();
    // if user explicitly wants to create the dms-vpc-role
    const dmsVpcRole =
      props.dms.createDmsVpcRole === true ? (this.createDmsVpcRole().node.defaultChild as CfnResource) : undefined;
    // if user explicitly wants to create the dms-vpc-role
    const dmsLogRole =
      props.dms.createDmsLogRole === true ? (this.createDmsLogRole().node.defaultChild as CfnResource) : undefined;
    const replicationInstances = this.createReplicationInstances(dmsVpcRole);
    const endpoints = this.createEndpoints(dmsRole);
    this.createReplicationTasks(replicationInstances, endpoints, dmsLogRole);
  }

  private createReplicationTasks(
    replicationInstances: { [name: string]: CfnReplicationInstance },
    endpoints: { [name: string]: CfnEndpoint },
    logRole: CfnResource | undefined,
  ) {
    Object.entries(this.props.dms.replicationTasks || {}).forEach(([taskName, taskProps]) => {
      const replicationInstanceArn = taskProps.replicationInstance
        ? replicationInstances[taskProps.replicationInstance]?.ref
        : undefined;
      if (!replicationInstanceArn) {
        throw new Error(`Unable to determine replication instance Arn from config ${taskProps.replicationInstance}.`);
      }
      const sourceEndpointArn = endpoints[taskProps.sourceEndpoint]?.ref;
      if (!sourceEndpointArn) {
        throw new Error(`Unable to determine source endpoint Arn from config ${taskProps.sourceEndpoint}.`);
      }
      const targetEndpointArn = endpoints[taskProps.targetEndpoint]?.ref;
      if (!targetEndpointArn) {
        throw new Error(`Unable to determine target endpoint Arn from config ${taskProps.targetEndpoint}.`);
      }
      const cfnTaskProps: CfnReplicationTaskProps = {
        ...taskProps,
        replicationInstanceArn: replicationInstanceArn,
        sourceEndpointArn: sourceEndpointArn,
        targetEndpointArn: targetEndpointArn,
        replicationTaskIdentifier: this.props.naming.resourceName(taskName),
        taskData: taskProps.taskData ? JSON.stringify(taskProps.taskData) : undefined,
        tableMappings: JSON.stringify(taskProps.tableMappings),
        replicationTaskSettings: taskProps.replicationTaskSettings
          ? JSON.stringify(taskProps.replicationTaskSettings)
          : undefined,
      };
      const task = new CfnReplicationTask(this, `replication-task-${taskName}`, cfnTaskProps);
      if (logRole) {
        task.addDependency(logRole);
      }
    });
  }

  private createDmsRole(): IRole {
    return new MdaaRole(this, 'dms-role', {
      naming: this.props.naming,
      roleName: 'dms',
      assumedBy: new ServicePrincipal(`dms.${this.region}.amazonaws.com`),
    });
  }

  private createDmsVpcRole(): MdaaRole {
    const role = new MdaaRole(this, 'dms-vpc-role', {
      naming: this.props.naming,
      roleName: 'dms-vpc-role',
      verbatimRoleName: true,
      assumedBy: new ServicePrincipal('dms.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDMSVPCManagementRole')],
    });
    const suppressions: SuppressionProps[] = [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'AmazonDMSVPCManagementRole has explicit actions but requires wildcard resource so all VPCs would be covered by all DMS that use this role. See: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DMS_migration-IAM.dms-vpc-role.html',
      },
    ];
    MdaaNagSuppressions.addConfigResourceSuppressions(role, suppressions, true);
    return role;
  }

  private createDmsLogRole(): MdaaRole {
    const role = new MdaaRole(this, 'dms-cloudwatch-logs-role', {
      naming: this.props.naming,
      roleName: 'dms-cloudwatch-logs-role',
      verbatimRoleName: true,
      assumedBy: new ServicePrincipal('dms.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDMSCloudWatchLogsRole')],
    });
    const suppressions: SuppressionProps[] = [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'AmazonDMSCloudWatchLogsRole has explicit actions but requires wildcard resource so all logs would be covered by all DMS that use this role. See: https://docs.aws.amazon.com/dms/latest/userguide/security-iam-awsmanpol.html#security-iam-awsmanpol-AmazonDMSCloudWatchLogsRole',
      },
    ];
    MdaaNagSuppressions.addConfigResourceSuppressions(role, suppressions, true);
    return role;
  }

  private createEndpoints(dmsRole: IRole): { [name: string]: CfnEndpoint } {
    const secrets: ISecret[] = [];
    const secretKeys: IKey[] = [];
    const endpoints = Object.fromEntries(
      Object.entries(this.props.dms.endpoints || {}).map(([endpointName, endpointProps]) => {
        const engineSettingsPropName = DMSL3Construct.engineToSettingsNameMap[
          endpointProps.engineName
        ] as keyof EndpointProps;
        const engineSettingsProp = endpointProps[engineSettingsPropName];
        if (!engineSettingsProp) {
          throw new Error(`${engineSettingsPropName} must be defined for engineName ${endpointProps.engineName}`);
        }

        if (DMSL3Construct.awsServiceEngineNames.includes(endpointProps.engineName)) {
          // @ts-ignore need to figure out what type is engineSettingsProps
          engineSettingsProp['serviceAccessRoleArn'] = dmsRole.roleArn;
        }

        Object.entries(endpointProps).forEach(([, prop]) => {
          if (!prop || typeof prop !== 'object') {
            console.log(`Strange, was expecting ${prop} to be an object`);
            return;
          }
          if ('secretsManagerSecretArn' in prop && prop.secretsManagerAccessRoleArn === undefined) {
            const secretArn = prop['secretsManagerSecretArn'];
            prop.secretsManagerAccessRoleArn = dmsRole.roleArn;
            prop['secretsManagerSecretId'] = secretArn;
            secrets.push(Secret.fromSecretCompleteArn(this, `secret-import-${endpointName}`, secretArn));
            const secretKeyKMSArn = prop['secretsManagerSecretKMSArn'];
            if (secretKeyKMSArn) {
              secretKeys.push(Key.fromKeyArn(this, `secret-key-import-${endpointName}`, secretKeyKMSArn));
            }
          }

          if ('secretsManagerOracleAsmSecretArn' in prop && prop.secretsManagerOracleAsmAccessRoleArn === undefined) {
            const secretArn = prop['secretsManagerOracleAsmSecretArn'];
            prop['secretsManagerOracleAsmSecretId'] = secretArn;
            prop['secretsManagerOracleAsmAccessRoleArn'] = dmsRole.roleArn;
            secrets.push(Secret.fromSecretCompleteArn(this, `asm-secret-import-${endpointName}`, secretArn));
          }
        });

        const mdaaEndpointProps: MdaaEndpointProps = {
          ...endpointProps,
          endpointIdentifier: endpointName,
          kmsKey: this.projectKms,
          naming: this.props.naming,
        };
        const endpoint = new MdaaEndpoint(this, `endpoint-${endpointName}`, mdaaEndpointProps);
        return [endpointName, endpoint];
      }),
    );

    this.createSecretsAccessPolicy(dmsRole, secrets, secretKeys);

    return endpoints;
  }

  private createSecretsAccessPolicy(dmsRole: IRole, secrets: ISecret[], secretKeys: IKey[]) {
    if (secrets.length > 0) {
      const secretsStatement = new PolicyStatement({
        actions: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
        resources: secrets.map(x => x.secretArn),
        effect: Effect.ALLOW,
      });

      const secretKMSStatement =
        secretKeys.length > 0
          ? [
              new PolicyStatement({
                actions: ['kms:Decrypt', 'kms:DescribeKey'],
                resources: secretKeys.map(x => x.keyArn),
                effect: Effect.ALLOW,
              }),
            ]
          : [];

      new MdaaManagedPolicy(this, 'secrets-access-policy', {
        managedPolicyName: 'secrets-access',
        naming: this.props.naming,
        roles: [dmsRole],
        statements: [secretsStatement, ...secretKMSStatement],
      });
    }
  }

  private createReplicationInstances(vpcDmsRole: CfnResource | undefined): { [name: string]: CfnReplicationInstance } {
    return Object.fromEntries(
      Object.entries(this.props.dms.replicationInstances || {}).map(([instanceName, instanceProps]) => {
        const subnetGroupProps: CfnReplicationSubnetGroupProps = {
          replicationSubnetGroupIdentifier: this.props.naming.resourceName(instanceName),
          replicationSubnetGroupDescription: this.props.naming.resourceName(instanceName),
          subnetIds: instanceProps.subnetIds,
        };
        const subnetGroup = new CfnReplicationSubnetGroup(
          this,
          `replication-subnet-group-${instanceName}`,
          subnetGroupProps,
        );
        if (vpcDmsRole) {
          subnetGroup.addDependency(vpcDmsRole);
        }

        const vpc = Vpc.fromVpcAttributes(this, 'vpc of' + instanceName, {
          availabilityZones: ['dummy'],
          vpcId: instanceProps.vpcId,
        });

        const customEgress: boolean =
          (instanceProps.egressRules?.ipv4 && instanceProps.egressRules?.ipv4.length > 0) ||
          (instanceProps.egressRules?.prefixList && instanceProps.egressRules?.prefixList.length > 0) ||
          (instanceProps.egressRules?.sg && instanceProps.egressRules?.sg.length > 0) ||
          false;

        const securityGroupCreateProps: MdaaSecurityGroupProps = {
          securityGroupName: instanceName,
          vpc: vpc,
          naming: this.props.naming,
          ingressRules: instanceProps.ingressRules,
          egressRules: instanceProps.egressRules,
          allowAllOutbound: !customEgress,
          addSelfReferenceRule: instanceProps.addSelfReferenceRule,
        };

        const securityGroup = new MdaaSecurityGroup(this, `security-group-${instanceName}`, securityGroupCreateProps);

        const constructProps: MdaaReplicationInstanceProps = {
          replicationInstanceIdentifier: instanceName,
          replicationInstanceClass: instanceProps.instanceClass,
          kmsKey: this.projectKms,
          replicationSubnetGroupIdentifier: this.props.naming.resourceName(instanceName),
          naming: this.props.naming,
          vpcSecurityGroupIds: [securityGroup.securityGroupId],
        };
        const replicationInstance = new MdaaReplicationInstance(
          this,
          `replication-instance-${instanceName}`,
          constructProps,
        );
        replicationInstance.addDependency(subnetGroup);
        return [instanceName, replicationInstance];
      }),
    );
  }
}
