/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  FederationProps,
  ScheduledActionProps,
  DatabaseUsersProps,
  EventNotificationsProps,
} from '@aws-mdaa/datawarehouse-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { ConfigurationElement } from '@aws-mdaa/config';

export interface DataWarehouseConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required admin username for the Redshift cluster providing administrative access to the data warehouse. Defines the master user account for cluster administration, database management, and initial user provisioning.
   *
   * Use cases: Cluster administration; Database management; Initial user provisioning
   *
   * AWS: Amazon Redshift cluster master username for administrative access and database management
   *
   * Validation: Must be valid Redshift username; required; used for cluster administrative access
   **/
  readonly adminUsername: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of days between automatic admin password rotations for enhanced security compliance. Enables automated credential management and compliance with password rotation policies for improved cluster security posture.
   *
   * Use cases: Automated credential rotation; Security policy compliance; Password management automation
   *
   * AWS: Amazon Redshift automatic password rotation configuration for security management
   *
   * Validation: Must be positive integer; required; defines password rotation frequency for security compliance
   **/
  readonly adminPasswordRotationDays: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of federation configurations for SAML or OIDC identity provider integration with the data warehouse. Enables federated access to Redshift through external identity providers for centralized identity management and SSO capabilities.
   *
   * Use cases: SAML federation setup; OIDC provider integration; Centralized identity management for data warehouse access
   *
   * AWS: AWS IAM identity provider configuration for federated Redshift access and SSO integration
   *
   * Validation: Must be array of valid FederationProps if provided; enables federated authentication when specified
   **/
  readonly federations?: FederationProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of admin role references with full access to cluster resources including KMS keys and S3 buckets. Provides administrative permissions for data warehouse management, security administration, and resource access control.
   *
   * Use cases: Administrative access control; Security management; Resource administration
   *
   * AWS: AWS IAM roles with full Redshift cluster and resource access permissions
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive full cluster access
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of user role references with access to data warehouse S3 buckets for data loading and unloading operations. Enables controlled access to warehouse storage resources for ETL operations and data management workflows.
   *
   * Use cases: Data loading operations; ETL workflow access; Controlled storage access
   *
   * AWS: AWS IAM roles with S3 bucket access for Redshift data operations
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; roles receive bucket access permissions
   **/
  readonly warehouseBucketUserRoles?: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of external execution role references for Redshift cluster operations and integrations. Enables cluster to assume external roles for cross-service operations, data access, and integration with other AWS services.
   *
   * Use cases: Cross-service operations; External data access; Service integration workflows
   *
   * AWS: AWS IAM roles for Redshift cluster cross-service operations and integrations
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; roles must be assumable by Redshift service
   **/
  readonly executionRoles?: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for Redshift cluster deployment providing network isolation and security controls. Ensures cluster operates within the specified VPC for secure networking and integration with other VPC resources.
   *
   * Use cases: VPC network isolation; Secure networking; VPC resource integration
   *
   * AWS: Amazon VPC for Redshift cluster network isolation and security controls
   *
   * Validation: Must be valid VPC ID; required; VPC must exist and be accessible
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet IDs for Redshift cluster node placement within the VPC. Defines the network subnets where cluster nodes will be deployed for secure VPC connectivity and availability zone distribution.
   *
   * Use cases: VPC network placement; Subnet-specific deployment; Multi-AZ cluster distribution
   *
   * AWS: Amazon VPC subnets for Redshift cluster node placement and network configuration
   *
   * Validation: Must be array of valid subnet IDs; required; subnets must exist in specified VPC
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group ingress configuration defining allowed inbound connections to the cluster. Specifies IPv4 CIDR blocks and security group IDs that can connect to the cluster port for controlled network access.
   *
   * Use cases: Network access control; Client connectivity; Security group management
   *
   * AWS: Amazon VPC security group ingress rules for Redshift cluster access control
   *
   * Validation: Must be object with ipv4 and/or sg arrays; required; defines allowed inbound connections
   *   **/
  readonly securityGroupIngress: { ipv4?: string[]; sg?: string[] };
  /**
   * Q-ENHANCED-PROPERTY
   * Required node type specification determining compute and storage capacity for cluster nodes. Controls the underlying EC2 instance type and affects performance, storage, and cost characteristics of the data warehouse.
   *
   * Use cases: Performance optimization; Cost management; Workload-specific sizing
   *
   * AWS: Amazon Redshift node type for compute and storage capacity configuration
   *
   * Validation: Must be valid Redshift node type; required; determines cluster compute and storage capacity
   **/
  readonly nodeType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of nodes for the Redshift cluster determining total compute capacity and parallel processing capability. Controls cluster size and affects performance, cost, and data distribution characteristics.
   *
   * Use cases: Cluster sizing; Performance scaling; Cost optimization
   *
   * AWS: Amazon Redshift cluster node count for compute capacity and parallel processing
   *
   * Validation: Must be positive integer; required; determines cluster size and processing capacity
   **/
  readonly numberOfNodes: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required flag enabling audit logging to S3 for compliance and security monitoring. When enabled, creates dedicated S3 bucket for Redshift audit logs with SSE-S3 encryption as required by Redshift audit logging constraints.
   *
   * Use cases: Compliance auditing; Security monitoring; Audit trail management
   *
   * AWS: Amazon Redshift audit logging to S3 for compliance and security monitoring
   *
   * Validation: Boolean value; required; creates SSE-S3 encrypted audit bucket when enabled
   **/
  readonly enableAuditLoggingToS3: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional cluster port number for client connections enabling custom port configuration and network security. Defines the TCP port on which the Redshift cluster accepts client connections, supporting custom networking requirements and security configurations.
   *
   * Use cases: Custom port configuration; Network security; Client connection management; Port standardization
   *
   * AWS: Amazon Redshift cluster port configuration for client connection management
   *
   * Validation: Must be valid port number if specified; defaults to 54390; must be accessible through security groups
   **/
  readonly clusterPort?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling cluster node configuration for single-node or multi-node deployment. When true, creates multi-node cluster for distributed processing; when false, creates single-node cluster for development or small workloads.
   *
   * Use cases: Cluster architecture selection; Development vs production deployment; Cost optimization; Performance scaling
   *
   * AWS: Amazon Redshift cluster type configuration for single-node or multi-node deployment
   *
   * Validation: Boolean value; determines cluster architecture and node distribution; affects performance and cost
   **/
  readonly multiNode?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required preferred maintenance window for automated cluster maintenance operations. Specifies the weekly time range during which system maintenance can occur, minimizing impact on business operations and ensuring predictable maintenance scheduling.
   *
   * Use cases: Maintenance scheduling; Business continuity; Operational planning; Downtime management
   *
   * AWS: Amazon Redshift preferred maintenance window for automated system maintenance
   *
   * Validation: Must be valid time window format (e.g., 'Sun:23:45-Mon:00:15'); required; defines maintenance scheduling
   **/
  readonly preferredMaintenanceWindow: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional parameter group parameters for cluster configuration customization enabling performance tuning and operational optimization. Provides additional cluster parameters while security-sensitive values are automatically overridden for compliance and security.
   *
   * Use cases: Performance tuning; Operational optimization; Custom cluster configuration; Workload-specific settings
   *
   * AWS: Amazon Redshift parameter group configuration for cluster customization and optimization
   *
   * Validation: Must be object with string key-value pairs if provided; security-sensitive values will be overridden
   *   **/
  readonly parameterGroupParams?: Record<string, string>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional workload management configuration for query performance optimization and resource allocation. Defines WLM configuration elements for managing query queues, memory allocation, and concurrency for optimal cluster performance.
   *
   * Use cases: Query performance optimization; Resource allocation; Workload management; Concurrency control
   *
   * AWS: Amazon Redshift workload management configuration for query optimization and resource control
   *
   * Validation: Must be array of valid ConfigurationElement objects if provided; defines WLM configuration
   **/
  readonly workloadManagement?: ConfigurationElement[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional KMS key ARNs for cluster bucket encryption enabling multi-key encryption scenarios and cross-account access. Provides additional KMS keys that can be used for writing to the cluster bucket beyond the default cluster encryption key.
   *
   * Use cases: Multi-key encryption; Cross-account access; Additional encryption keys; Flexible key management
   *
   * AWS: AWS KMS key ARNs for additional cluster bucket encryption and access control
   *
   * Validation: Must be array of valid KMS key ARNs if provided; keys must be accessible for bucket operations
   **/
  readonly additionalBucketKmsKeyArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional scheduled actions for automated cluster pause and resume operations enabling cost optimization and operational automation. Defines scheduled pause and resume actions for the cluster to optimize costs during non-business hours.
   *
   * Use cases: Cost optimization; Automated operations; Scheduled maintenance; Resource management
   *
   * AWS: Amazon Redshift scheduled actions for automated cluster pause and resume operations
   *
   * Validation: Must be array of valid ScheduledActionProps if provided; defines automated cluster operations
   **/
  readonly scheduledActions?: ScheduledActionProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database users for automated user creation and credential management enabling secure user provisioning and rotation. Creates database users in Redshift with automated credential storage and rotation through Secrets Manager and SSM.
   *
   * Use cases: Automated user provisioning; Credential management; Security automation; User lifecycle management
   *
   * AWS: Amazon Redshift database users with Secrets Manager and SSM integration for credential management
   *
   * Validation: Must be array of valid DatabaseUsersProps if provided; enables automated user and credential management
   *   **/
  readonly databaseUsers?: DatabaseUsersProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling data warehouse bucket creation for cluster storage operations. When enabled (default), creates dedicated S3 bucket for data warehouse operations including data loading, unloading, and backup storage.
   *
   * Use cases: Storage resource management; Data operations; Backup storage; ETL operations
   *
   * AWS: Amazon S3 bucket creation for Redshift data warehouse storage operations
   *
   * Validation: Boolean value; defaults to true; creates dedicated warehouse bucket when enabled
   **/
  readonly createWarehouseBucket?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional retention period for automated snapshots enabling backup management and data protection. Specifies the number of days automated snapshots are retained for point-in-time recovery and data protection requirements.
   *
   * Use cases: Backup management; Data protection; Point-in-time recovery; Compliance requirements
   *
   * AWS: Amazon Redshift automated snapshot retention for backup management and data protection
   *
   * Validation: Must be positive integer if specified; defines snapshot retention period for backup management
   **/
  readonly automatedSnapshotRetentionDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional event notification configuration for cluster and scheduled action monitoring enabling operational awareness and alerting. Configures SNS notifications for cluster events and scheduled action status for operational monitoring.
   *
   * Use cases: Operational monitoring; Event alerting; Cluster status tracking; Automated notifications
   *
   * AWS: Amazon SNS notifications for Redshift cluster events and operational monitoring
   *
   * Validation: Must be valid EventNotificationsProps if provided; enables cluster event monitoring and alerting
   **/
  readonly eventNotifications?: EventNotificationsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database name for initial database creation enabling custom database naming and organization. Specifies the name of the initial database created in the cluster, supporting custom naming conventions and database organization.
   *
   * Use cases: Custom database naming; Database organization; Initial database setup; Naming conventions
   *
   * AWS: Amazon Redshift initial database name for cluster database creation and organization
   *
   * Validation: Must be valid database name if specified; defaults to "default_db"; used for initial database creation
   **/
  readonly dbName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional snapshot identifier for cluster restoration from existing snapshot enabling disaster recovery and data migration. Specifies the snapshot ID to restore the cluster from, supporting disaster recovery scenarios and data migration operations.
   *
   * Use cases: Disaster recovery; Data migration; Cluster restoration; Backup recovery
   *
   * AWS: Amazon Redshift snapshot identifier for cluster restoration and disaster recovery
   *
   * Validation: Must be valid snapshot identifier if specified; only provide when restoring from snapshot
   **/
  readonly snapshotIdentifier?: string;
  /**
   * ownerAccount Refers to snapshot owner account. Applicable if restoring the cluster from snapshot and snapshot belongs to another account
   * Optional - By default, snapshots are searched within current account
   */
  readonly snapshotOwnerAccount?: number;

  readonly redshiftManageMasterPassword?: boolean;
}

export class DataWarehouseConfigParser extends MdaaAppConfigParser<DataWarehouseConfigContents> {
  public readonly adminUsername: string;
  public readonly adminPasswordRotationDays: number;
  public readonly federations: FederationProps[];
  public readonly databaseUsers: DatabaseUsersProps[];
  public readonly dataAdminRoleRefs: MdaaRoleRef[];
  public readonly warehouseBucketUserRoleRefs?: MdaaRoleRef[];
  public readonly executionRoleRefs?: MdaaRoleRef[];
  public readonly vpcId: string;
  public readonly clusterPort: number;
  public readonly subnetIds: string[];
  public readonly nodeType: string;
  public readonly enableAuditLoggingToS3: boolean;
  public readonly numberOfNodes: number;
  public readonly multiNode?: boolean;
  public readonly preferredMaintenanceWindow: string;
  public readonly securityGroupIngress: { ipv4?: string[]; sg?: string[] };
  public readonly parameterGroupParams: Record<string, string>;
  public readonly workloadManagement: ConfigurationElement[];
  public readonly additionalBucketKmsKeyArns?: string[];
  public static readonly defaultClusterPort = 54390;
  public readonly scheduledActions: ScheduledActionProps[];
  public readonly createWarehouseBucket?: boolean;
  public readonly automatedSnapshotRetentionDays?: number;
  public readonly eventNotifications?: EventNotificationsProps;
  public readonly dbName?: string;
  public readonly snapshotIdentifier?: string;
  public readonly snapshotOwnerAccount?: number;
  public readonly redshiftManageMasterPassword?: boolean;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.adminUsername = this.configContents.adminUsername;
    this.adminPasswordRotationDays = this.configContents.adminPasswordRotationDays;
    this.federations = this.configContents.federations ? this.configContents.federations : [];
    this.dataAdminRoleRefs = this.configContents.dataAdminRoles;
    this.warehouseBucketUserRoleRefs = this.configContents.warehouseBucketUserRoles;
    this.executionRoleRefs = this.configContents.executionRoles;
    this.vpcId = this.configContents.vpcId;
    this.subnetIds = this.configContents.subnetIds;
    this.securityGroupIngress = this.configContents.securityGroupIngress;
    this.nodeType = this.configContents.nodeType;
    this.numberOfNodes = this.configContents.numberOfNodes;
    this.enableAuditLoggingToS3 = this.configContents.enableAuditLoggingToS3;
    this.clusterPort = this.configContents.clusterPort
      ? this.configContents.clusterPort
      : DataWarehouseConfigParser.defaultClusterPort;
    this.multiNode = this.configContents.multiNode;
    this.preferredMaintenanceWindow = this.configContents.preferredMaintenanceWindow;
    this.parameterGroupParams = this.configContents.parameterGroupParams
      ? this.configContents.parameterGroupParams
      : {};
    this.workloadManagement = this.configContents.workloadManagement ? this.configContents.workloadManagement : [];
    this.additionalBucketKmsKeyArns = this.configContents.additionalBucketKmsKeyArns;
    this.scheduledActions = this.configContents.scheduledActions ? this.configContents.scheduledActions : [];
    this.databaseUsers = this.configContents.databaseUsers ? this.configContents.databaseUsers : [];
    this.createWarehouseBucket = this.configContents.createWarehouseBucket;
    this.automatedSnapshotRetentionDays = this.configContents.automatedSnapshotRetentionDays;
    this.eventNotifications = this.configContents.eventNotifications;
    this.dbName = this.configContents.dbName;
    this.snapshotIdentifier = this.configContents.snapshotIdentifier;
    this.snapshotOwnerAccount = this.configContents.snapshotOwnerAccount;
    this.redshiftManageMasterPassword = this.configContents.redshiftManageMasterPassword;
  }
}
