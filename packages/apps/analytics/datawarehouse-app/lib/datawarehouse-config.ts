/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { FederationProps, ScheduledActionProps, DatabaseUsersProps, EventNotificationsProps } from '@aws-mdaa/datawarehouse-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataWarehouseConfigContents extends MdaaBaseConfigContents {
  /**
   * Set the admin user name for the cluster
   */
  adminUsername: string
  /**
   * Set the number of days between admin password rotations
   */
  adminPasswordRotationDays: number
  /**
   * List of federations/roles to be created for federated access to the cluster
   */
  federations?: FederationProps[]
  /**
   * List of admin roles which will be provided access to cluster resources (like KMS/Bucket)
   */
  dataAdminRoles: MdaaRoleRef[]
  /**
   * List of user roles which will be provided access to cluster resources (like KMS/Bucket)
   */
  warehouseBucketUserRoles?: MdaaRoleRef[]
  /**
   * List of external roles which will be associated to the redshift cluster
   * If a role requires access to datawarehouse bucket, then role should be added to 'warehouseBucketUserRoles' in application config
   */
  executionRoles?: MdaaRoleRef[]
  /**
   * The ID of the VPC on which the cluster will be deployed.
   */
  vpcId: string
  /**
   * The ID of the subnets on which the cluster will be deployed.
   */
  subnetIds: string[]
  /**
   * Additional ingress rules to be added to the cluster security group, permitting tcp traffic on the cluster port
   */
  securityGroupIngress: { ipv4?: string[]; sg?: string[] }
  /**
   * Node type of the cluster.
   */
  nodeType: string
  /**
   * Number of cluster nodes
   */
  numberOfNodes: number
  /**
   * If enabled, cluster audit logging will be written to an S3 bucket created for this purpose. 
   * Note that Redshift supports audit logging only to SSE-S3 encrypted buckets, so this audit bucket
   * will not be created with SSE-KMS or use a customer master key.
   */
  enableAuditLoggingToS3: boolean
  /**
   * The cluster port (default: 54390)
   */
  clusterPort?: number
  /**
   * If true, cluster will be of type MULTI_NODE, otherwise SINGLE_NODE
   */
  multiNode?: boolean
  /**
   * The preferred maintenance window for the cluster
   * Example: 'Sun:23:45-Mon:00:15'
   */
  preferredMaintenanceWindow: string
  /**
   * Additional parameters for the cluster parameter group. Certain security-sensitive values will be overridden.
   */
  parameterGroupParams?: { [ key: string ]: any }
  /**
   * The cluster workload management configuration.
   */
  workloadManagement?: { [ key: string ]: any }[]
  /**
   * Additional KMS keys which can be used to write to the cluster bucket
   */
  additionalBucketKmsKeyArns?: string[]
  /**
   * List of scheduled actions (pause,resume) which can be applied to the cluster
   */
  scheduledActions?: ScheduledActionProps[]
  /**
   * List of Users to be created in Redshift Database, then stored & rotated in secrets manager -> ssm
   */
  databaseUsers?: DatabaseUsersProps[]
  /**
   * If true(default), a Data Warehouse bucket will be created
   */
  createWarehouseBucket?: boolean
  /**
   * Number of days that automated snapshots are retained
   */
  automatedSnapshotRetentionDays?: number
  /**
   * Configuration of cluster and scheduled action event notifications
   */
  eventNotifications?: EventNotificationsProps
}

export class DataWarehouseConfigParser extends MdaaAppConfigParser<DataWarehouseConfigContents> {
  public readonly adminUsername: string
  public readonly adminPasswordRotationDays: number
  public readonly federations: FederationProps[]
  public readonly databaseUsers: DatabaseUsersProps[]
  public readonly dataAdminRoleRefs: MdaaRoleRef[]
  public readonly warehouseBucketUserRoleRefs?: MdaaRoleRef[]
  public readonly executionRoleRefs?: MdaaRoleRef[]
  public readonly vpcId: string
  public readonly clusterPort: number
  public readonly subnetIds: string[]
  public readonly nodeType: string
  public readonly enableAuditLoggingToS3: boolean
  public readonly numberOfNodes: number
  public readonly multiNode?: boolean
  public readonly preferredMaintenanceWindow: string
  public readonly securityGroupIngress: { ipv4?: string[], sg?: string[] }
  public readonly parameterGroupParams: { [ key: string ]: any }
  public readonly workloadManagement: { [ key: string ]: any }[]
  public readonly additionalBucketKmsKeyArns?: string[]
  public static readonly defaultClusterPort = 54390
  public readonly scheduledActions: ScheduledActionProps[]
  public readonly createWarehouseBucket?: boolean
  public readonly automatedSnapshotRetentionDays?: number
  public readonly eventNotifications?: EventNotificationsProps
  constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
    super( stack, props, configSchema as Schema )

    this.adminUsername = this.configContents.adminUsername
    this.adminPasswordRotationDays = this.configContents.adminPasswordRotationDays
    this.federations = this.configContents.federations ? this.configContents.federations : []
    this.dataAdminRoleRefs = this.configContents.dataAdminRoles
    this.warehouseBucketUserRoleRefs = this.configContents.warehouseBucketUserRoles
    this.executionRoleRefs = this.configContents.executionRoles
    this.vpcId = this.configContents.vpcId
    this.subnetIds = this.configContents.subnetIds
    this.securityGroupIngress = this.configContents.securityGroupIngress
    this.nodeType = this.configContents.nodeType
    this.numberOfNodes = this.configContents.numberOfNodes
    this.enableAuditLoggingToS3 = this.configContents.enableAuditLoggingToS3
    this.clusterPort = this.configContents.clusterPort ? this.configContents.clusterPort : DataWarehouseConfigParser.defaultClusterPort
    this.multiNode = this.configContents.multiNode
    this.preferredMaintenanceWindow = this.configContents.preferredMaintenanceWindow
    this.parameterGroupParams = this.configContents.parameterGroupParams ? this.configContents.parameterGroupParams : {}
    this.workloadManagement = this.configContents.workloadManagement ? this.configContents.workloadManagement : []
    this.additionalBucketKmsKeyArns = this.configContents.additionalBucketKmsKeyArns
    this.scheduledActions = this.configContents.scheduledActions ? this.configContents.scheduledActions : []
    this.databaseUsers = this.configContents.databaseUsers ? this.configContents.databaseUsers : []
    this.createWarehouseBucket = this.configContents.createWarehouseBucket
    this.automatedSnapshotRetentionDays = this.configContents.automatedSnapshotRetentionDays
    this.eventNotifications = this.configContents.eventNotifications
  }

}

