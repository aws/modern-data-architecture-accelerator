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
   * Admin username for the Redshift cluster. A secret is automatically generated for the password.
   *
   * Use cases: Cluster administration; Database management; Initial user provisioning
   *
   * AWS: Redshift cluster master username
   *
   * Validation: Required; valid Redshift username
   */
  readonly adminUsername: string;
  /**
   * Days between automatic admin password rotations via Secrets Manager.
   *
   * Use cases: Automated credential rotation; Security compliance; Password policy enforcement
   *
   * AWS: Redshift admin password rotation via Secrets Manager
   *
   * Validation: Required; positive integer
   */
  readonly adminPasswordRotationDays: number;
  /**
   * SAML or OIDC federation configurations for federated Redshift access.
   * Each federation creates an IAM role with SAML trust for dynamic credential generation
   * and group-based cluster access.
   *
   * Use cases: SAML federation setup; SSO integration; Federated cluster access
   *
   * AWS: IAM SAML identity provider roles for Redshift federated access
   *
   * Validation: Optional; array of valid FederationProps
   */
  readonly federations?: FederationProps[];
  /**
   * Admin roles granted full access to cluster resources including KMS keys and S3 buckets.
   *
   * Use cases: Administrative access control; Security management; Resource administration
   *
   * AWS: IAM roles with full Redshift cluster and resource access
   *
   * Validation: Required; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Roles granted read/write access to the data warehouse S3 bucket for data loading/unloading.
   *
   * Use cases: ETL data loading; Data unloading operations; Bucket access for analytics
   *
   * AWS: IAM roles with S3 bucket access for Redshift data operations
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly warehouseBucketUserRoles?: MdaaRoleRef[];
  /**
   * External execution roles associated with the Redshift cluster for cross-service operations.
   * If a role also needs warehouse bucket access, add it to warehouseBucketUserRoles explicitly.
   *
   * Use cases: Cross-service integrations; External data access; Glue/Lambda integration
   *
   * AWS: IAM execution roles associated with the Redshift cluster
   *
   * Validation: Optional; array of valid MdaaRoleRef; roles must be assumable by Redshift
   */
  readonly executionRoles?: MdaaRoleRef[];
  /**
   * VPC ID for Redshift cluster deployment. The cluster is deployed within this VPC
   * with network access controlled by security groups.
   *
   * Use cases: Network isolation; VPC-based deployment; Secure networking
   *
   * AWS: VPC for Redshift cluster network configuration
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet IDs for Redshift cluster node placement. For automatic cluster relocation,
   * specify at least one subnet per AZ.
   *
   * Use cases: Multi-AZ placement; Subnet-specific deployment; Cluster relocation support
   *
   * AWS: VPC subnets for Redshift subnet group
   *
   * Validation: Required; array of valid subnet IDs in the specified VPC; must contain >= 3 subnets in different AZs when multiAz is true
   */
  readonly subnetIds: string[];
  /**
   * Security group ingress rules defining allowed inbound connections to the cluster port.
   * Supports IPv4 CIDR blocks and security group references. All other traffic is blocked.
   *
   * Use cases: Network access control; Client connectivity; Security group management
   *
   * AWS: VPC security group ingress rules for Redshift cluster
   *
   * Validation: Required; object with optional ipv4 and/or sg arrays
   */
  readonly securityGroupIngress: { ipv4?: string[]; sg?: string[] };
  /**
   * Redshift node type determining compute and storage capacity (e.g., RA3_4XLARGE).
   *
   * Use cases: Performance sizing; Cost optimization; Workload-specific capacity
   *
   * AWS: Redshift node type (instance type)
   *
   * Validation: Required; valid Redshift node type string
   */
  readonly nodeType: string;
  /**
   * Number of nodes in the Redshift cluster.
   *
   * Use cases: Cluster sizing; Performance scaling; Cost management
   *
   * AWS: Redshift cluster node count
   *
   * Validation: Required; positive integer; must be >= 2 when multiAz is true
   */
  readonly numberOfNodes: number;
  /**
   * Enable audit logging to a dedicated S3 bucket. The audit bucket uses SSE-S3 encryption
   * (not KMS) due to Redshift audit logging requirements.
   *
   * Use cases: Compliance auditing; Security monitoring; User activity tracking
   *
   * AWS: Redshift audit logging to S3 with SSE-S3 encryption
   *
   * Validation: Required; boolean
   */
  readonly enableAuditLoggingToS3: boolean;
  /**
   * TCP port for client connections to the cluster.
   *
   * Use cases: Custom port configuration; Network security; Port standardization
   *
   * AWS: Redshift cluster listening port
   *
   * Validation: Optional; valid port number; must be in range 5431-5455 or 8191-8215 when multiAz is true
   * @default 5440
   */
  readonly clusterPort?: number;
  /**
   * Multi-node cluster flag. When true, creates a multi-node cluster for distributed processing;
   * when false, creates a single-node cluster for development or small workloads.
   *
   * Use cases: Cluster architecture selection; Dev vs production deployment; Cost optimization
   *
   * AWS: Redshift cluster type (single-node or multi-node)
   *
   * Validation: Optional; boolean
   */
  readonly multiNode?: boolean;
  /**
   * Weekly maintenance window in ddd:hh24:mi-ddd:hh24:mi format (UTC).
   * Example: 'Sun:23:45-Mon:00:15'.
   *
   * Use cases: Maintenance scheduling; Business continuity; Downtime management
   *
   * AWS: Redshift preferred maintenance window
   *
   * Validation: Required; valid time window format
   */
  readonly preferredMaintenanceWindow: string;
  /**
   * Additional cluster parameter group parameters for performance tuning.
   * Security-sensitive values are automatically overridden for compliance (e.g., SSL enforcement).
   *
   * Use cases: Performance tuning; Custom cluster configuration; Workload optimization
   *
   * AWS: Redshift parameter group parameters
   *
   * Validation: Optional; string key-value pairs
   */
  readonly parameterGroupParams?: { [key: string]: string };
  /**
   * Workload management (WLM) configuration for query queue management and resource allocation.
   *
   * Use cases: Query performance optimization; Concurrency control; Resource allocation
   *
   * AWS: Redshift WLM configuration
   *
   * Validation: Optional; array of valid ConfigurationElement
   */
  readonly workloadManagement?: ConfigurationElement[];
  /**
   * Additional KMS key ARNs allowed to write to the cluster bucket.
   * Useful for allowing Glue jobs or other services to write encrypted data to the warehouse bucket.
   *
   * Use cases: Cross-service encryption; Glue job integration; Multi-key bucket access
   *
   * AWS: KMS key ARNs for warehouse bucket encryption
   *
   * Validation: Optional; array of valid KMS key ARNs
   */
  readonly additionalBucketKmsKeyArns?: string[];
  /**
   * Scheduled actions for automated cluster pause/resume operations.
   * Each action specifies a target action (pauseCluster/resumeCluster), cron schedule,
   * and active time window.
   *
   * Use cases: Cost optimization via scheduled pause; Automated operations; Business-hours scheduling
   *
   * AWS: Redshift scheduled actions for cluster lifecycle management
   *
   * Validation: Optional; array of valid ScheduledActionProps
   */
  readonly scheduledActions?: ScheduledActionProps[];
  /**
   * Database users created in Redshift with credentials stored in Secrets Manager.
   * Supports automated secret rotation on a configurable cycle.
   *
   * Use cases: Automated user provisioning; Credential management; Secret rotation
   *
   * AWS: Redshift database users with Secrets Manager credential storage and rotation
   *
   * Validation: Optional; array of valid DatabaseUsersProps
   */
  readonly databaseUsers?: DatabaseUsersProps[];
  /**
   * Control whether a dedicated S3 bucket is created for warehouse data operations
   * (loading, unloading, backup).
   *
   * Use cases: Storage resource management; Data operations; Bucket lifecycle control
   *
   * AWS: S3 bucket for Redshift data warehouse operations
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly createWarehouseBucket?: boolean;
  /**
   * Number of days automated snapshots are retained (1-35). Set to 0 to disable.
   *
   * Use cases: Backup management; Point-in-time recovery; Data protection compliance
   *
   * AWS: Redshift automated snapshot retention
   *
   * Validation: Optional; integer 0-35
   * @default 1
   */
  readonly automatedSnapshotRetentionDays?: number;
  /**
   * Event notification configuration for cluster and scheduled action monitoring.
   * Configures SNS notifications with email delivery, severity filtering, and event category selection.
   *
   * Use cases: Operational monitoring; Event alerting; Cluster status tracking
   *
   * AWS: SNS notifications for Redshift cluster events
   *
   * Validation: Optional; valid EventNotificationsProps
   */
  readonly eventNotifications?: EventNotificationsProps;
  /**
   * Initial database name created in the cluster.
   *
   * Use cases: Custom database naming; Initial database setup
   *
   * AWS: Redshift initial database
   *
   * Validation: Optional; valid database name
   * @default "default_db"
   */
  readonly dbName?: string;
  /**
   * Snapshot identifier for cluster restoration. Only provide when restoring from an existing snapshot.
   *
   * Use cases: Disaster recovery; Data migration; Cluster restoration
   *
   * AWS: Redshift snapshot for cluster restoration
   *
   * Validation: Optional; valid snapshot identifier
   */
  readonly snapshotIdentifier?: string;
  /**
   * ownerAccount Refers to snapshot owner account. Applicable if restoring the cluster from snapshot and snapshot belongs to another account
   * Optional - By default, snapshots are searched within current account
   */
  readonly snapshotOwnerAccount?: string | number;

  readonly redshiftManageMasterPassword?: boolean;
  /**
   * Enable multi-AZ deployment for high availability.
   *
   * Use cases: High availability; Fault tolerance; Production deployments
   *
   * AWS: Redshift multi-AZ deployment
   *
   * Validation: Optional; boolean. When true, requires: numberOfNodes >= 2, subnetIds in >= 3 AZs,
   * clusterPort in range 5431-5455 or 8191-8215, and pause/resume scheduled actions are not supported.
   */
  readonly multiAz?: boolean;
  /**
   * Target region for cross-region snapshot copies. When set, enables cross-region snapshot copy to this region.
   *
   * Use cases: Disaster recovery; Cross-region backup; Business continuity
   *
   * AWS: Redshift snapshot copy destination region
   *
   * Validation: Optional; valid AWS region string, must differ from the deployment region
   */
  readonly backupRegion?: string;
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
  public readonly parameterGroupParams: { [key: string]: string };
  public readonly workloadManagement: ConfigurationElement[];
  public readonly additionalBucketKmsKeyArns?: string[];
  public static readonly defaultClusterPort = 5440;
  public readonly scheduledActions: ScheduledActionProps[];
  public readonly createWarehouseBucket?: boolean;
  public readonly automatedSnapshotRetentionDays?: number;
  public readonly eventNotifications?: EventNotificationsProps;
  public readonly dbName?: string;
  public readonly snapshotIdentifier?: string;
  public readonly snapshotOwnerAccount?: string;
  public readonly redshiftManageMasterPassword?: boolean;
  public readonly multiAz?: boolean;
  public readonly backupRegion?: string;

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
    this.snapshotOwnerAccount = this.configContents.snapshotOwnerAccount
      ? String(this.configContents.snapshotOwnerAccount)
      : undefined;
    this.redshiftManageMasterPassword = this.configContents.redshiftManageMasterPassword;
    this.multiAz = this.configContents.multiAz;
    this.backupRegion = this.configContents.backupRegion;
  }
}
