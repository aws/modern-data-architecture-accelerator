/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { IMdaaRole, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaRedshiftCluster, MdaaRedshiftClusterParameterGroup } from '@aws-mdaa/redshift-constructs';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import {
  Cluster,
  ClusterSubnetGroup,
  ClusterType,
  RotationMultiUserOptions,
  User,
  UserProps,
} from '@aws-cdk/aws-redshift-alpha';
import { Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Port, Protocol, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  ArnPrincipal,
  Effect,
  FederatedPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnEventSubscription, CfnEventSubscriptionProps, CfnScheduledAction } from 'aws-cdk-lib/aws-redshift';
import { BlockPublicAccess, Bucket, BucketEncryption, CfnBucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnSecret, ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ConfigurationElement } from '@aws-mdaa/config';
import { ensureNodeType, sanitizeScheduledActionName } from './utils';

/**
 * Q-ENHANCED-INTERFACE
 * Redshift federated authentication configuration interface for SAML-based identity provider integration with IAM provider mapping. Defines federation properties for Redshift data warehouse including federation name specification, IAM identity provider ARN, and deprecated URL configuration for secure federated access to analytics workloads.
 *
 * Use cases: Federated authentication; SAML identity integration; IAM provider mapping; Secure data warehouse access; Identity federation; Single sign-on integration
 *
 * AWS: Redshift federated authentication with SAML identity provider integration for secure data warehouse access and identity management
 *
 * Validation: federationName must be valid federation identifier; providerArn must be valid IAM identity provider ARN; url is deprecated and should not be used
 */
export interface FederationProps {
  /**
   * Name of the federation for reference elsewhere in the config.
   */
  readonly federationName: string;
  /**
   * Arn of the IAM Identity Provider through which federation will occur
   */
  readonly providerArn: string;
  /**
   * Deprecated. No Longer used.
   */
  readonly url?: string;
}
export interface NagSuppressionProps {
  readonly id: string;
  readonly reason: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Redshift scheduled action configuration interface for automated cluster management with pause/resume scheduling and cron-based timing. Defines scheduled action properties for cost optimization through automated cluster lifecycle management including pause and resume operations based on business hours and usage patterns.
 *
 * Use cases: Cost optimization automation; Cluster lifecycle management; Business hours scheduling; Automated pause/resume; Resource cost control; Usage-based scheduling
 *
 * AWS: Amazon Redshift scheduled actions with cron scheduling for automated cluster pause and resume operations for cost optimization
 *
 * Validation: name must be valid scheduled action identifier; targetAction must be 'pauseCluster' or 'resumeCluster'; schedule must be valid cron expression; dates must be valid UTC timestamps
 */
export interface ScheduledActionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name identifier for the Redshift scheduled action enabling action identification and management. Provides a descriptive name for the scheduled action that will be used for tracking, logging, and management of automated cluster operations within the Redshift environment.
   *
   * Use cases: Action identification; Scheduled action management; Logging and tracking; Action naming; Operational visibility
   *
   * AWS: Amazon Redshift scheduled action name for action identification and management
   *
   * Validation: Must be unique string identifier; required for scheduled action creation and management
   **/
  readonly name: string;
  /**
   * Scheduled action is enabled if true
   */
  readonly enable: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required target action type for Redshift scheduled action specifying the cluster operation to be performed. Defines the specific action that will be executed on the Redshift cluster, typically either pausing or resuming the cluster for cost optimization and resource management.
   *
   * Use cases: Cluster pause operations; Cluster resume operations; Cost optimization automation; Resource lifecycle management
   *
   * AWS: Amazon Redshift scheduled action target operation for automated cluster lifecycle management
   *
   * Validation: Must be "pauseCluster" or "resumeCluster"; required for scheduled action operation specification
   **/
  readonly targetAction: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required cron expression defining the schedule for Redshift scheduled action execution enabling precise timing control. Specifies when the scheduled action will be executed using standard cron format for flexible scheduling based on business hours, usage patterns, and cost optimization requirements.
   *
   * Use cases: Business hours scheduling; Cost optimization timing; Usage pattern alignment; Automated scheduling; Precise timing control
   *
   * AWS: Amazon Redshift scheduled action cron schedule for automated execution timing
   *
   * Validation: Must be valid cron expression; required for scheduled action timing specification
   **/
  readonly schedule: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional start date and time in UTC format defining when the Redshift scheduled action becomes effective enabling time-bounded scheduling. Specifies the earliest date and time when the scheduled action will begin executing, providing control over when automated cluster operations start.
   *
   * Use cases: Time-bounded scheduling; Action activation timing; Scheduled start control; Deployment timing; Operational planning
   *
   * AWS: Amazon Redshift scheduled action start time for time-bounded execution control
   *
   * Validation: Must be valid UTC timestamp if provided; optional for scheduled action start time control
   **/
  readonly startTime?: string;
  /**
   * The scheduled action Start Date & Time in UTC format till when the scheduled action is effective.
   */
  readonly endTime?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Security group ingress rule configuration interface for Redshift cluster network access control with CIDR and security group-based permissions. Defines ingress rule properties for controlling network access to Redshift clusters including IPv4 CIDR blocks and security group references for secure database connectivity.
 *
 * Use cases: Network access control; Database security; CIDR-based access; Security group references; Redshift connectivity; Network isolation; Access restriction
 *
 * AWS: EC2 Security Group ingress rules for Amazon Redshift cluster network access control with CIDR and security group-based permissions
 *
 * Validation: ipv4 must be valid CIDR blocks if specified; sg must be valid security group IDs if specified; at least one of ipv4 or sg must be provided
 */
export interface SecurityGroupIngressProps {
  /**
   * CIDR range of the ingres definition
   */
  readonly ipv4?: string[];
  /**
   * Security Group ID of the ingres definition
   */
  readonly sg?: string[];
}
/**
 * Q-ENHANCED-INTERFACE
 * Redshift database user configuration interface for automated user management with Secrets Manager integration and password rotation. Defines database user properties including username specification, database assignment, password policy configuration, and automated secret rotation for secure Redshift user lifecycle management.
 *
 * Use cases: Database user management; Automated password rotation; Secrets management; Database access control; User lifecycle automation; Secure credential management
 *
 * AWS: Amazon Redshift database users with AWS Secrets Manager integration for automated password rotation and secure credential management
 *
 * Validation: userName must be valid Redshift username; dbName must be valid database name; excludeCharacters must be valid password exclusion pattern; secretRotationDays must be positive integer
 */
export interface DatabaseUsersProps {
  /**
   * Name of the execution role
   */
  readonly userName: string;
  /**
   * The DB to which the user will be added
   */
  readonly dbName: string;
  /**
   * Characters to exclude in the password
   */
  readonly excludeCharacters?: string;
  /**
   * Number of days between secret rotation
   */
  readonly secretRotationDays: number;
  /**
   * List of roles that need redshift secret access
   */
  readonly secretAccessRoles?: MdaaRoleRef[];
}
export interface SnapshotProps {
  /**
   * The snapshot identifier
   */
  readonly snapshotIdentifier?: string;
  /**
   * The snapshot owner account
   */
  readonly ownerAccount?: number;
}
export type EventCategories = 'configuration' | 'management' | 'monitoring' | 'security' | 'pending';
export type EventSeverity = 'ERROR' | 'INFO';
/**
 * Q-ENHANCED-INTERFACE
 * Redshift event notification configuration interface for SNS-based cluster monitoring with event category filtering and severity-based alerting. Defines event notification properties for monitoring Redshift cluster events including configuration changes, management operations, and security events with email notification integration.
 *
 * Use cases: Cluster monitoring; Event-based alerting; SNS notifications; Email alerts; Operational monitoring; Security event tracking; Cluster health monitoring
 *
 * AWS: Amazon Redshift event notifications with SNS integration for cluster monitoring and email-based alerting with event category and severity filtering
 *
 * Validation: eventCategories must be valid EventCategories enum values if specified; severity must be valid EventSeverity enum value if specified; email must be valid email addresses
 */
export interface EventNotificationsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of event categories for Redshift event notification filtering enabling selective monitoring of specific cluster events. Defines which types of Redshift events will trigger SNS notifications, allowing focused monitoring on configuration changes, management operations, security events, or maintenance activities.
   *
   * Use cases: Selective event monitoring; Event category filtering; Focused alerting; Operational monitoring; Event-based notifications
   *
   * AWS: Amazon Redshift event notification categories for selective SNS-based cluster monitoring and alerting
   *
   * Validation: Must be array of valid EventCategories enum values if provided; optional for event category filtering
   **/
  readonly eventCategories?: EventCategories[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional event severity level for Redshift event notification filtering enabling severity-based alerting and monitoring. Defines the minimum severity level of events that will trigger SNS notifications, allowing filtering based on event importance and impact level.
   *
   * Use cases: Severity-based filtering; Critical event alerting; Event importance filtering; Alert prioritization; Monitoring optimization
   *
   * AWS: Amazon Redshift event notification severity filtering for SNS-based alerting with severity-level control
   *
   * Validation: Must be valid EventSeverity enum value if provided; optional for severity-based filtering
   **/
  readonly severity?: EventSeverity;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of email addresses for Redshift event notification delivery enabling email-based alerting and monitoring. Defines email recipients for SNS notifications triggered by Redshift cluster events, providing direct email delivery of cluster alerts and operational notifications.
   *
   * Use cases: Email alerting; Direct notification delivery; Operational monitoring; Event-based notifications; Team alerting
   *
   * AWS: Amazon SNS email notification delivery for Redshift event notifications with email-based alerting
   *
   * Validation: Must be array of valid email addresses if provided; optional for email notification delivery
   **/
  readonly email?: string[];
}
export interface DataWarehouseL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required admin username for Redshift cluster administration enabling database administrative access and user management. Provides the master username for the Redshift cluster administrator account for database management, user administration, and cluster configuration operations.
   *
   * Use cases: Database administration; User management; Cluster configuration; Administrative access
   *
   * AWS: Redshift cluster master username for database administration and user management
   *
   * Validation: Must be valid database username; required for cluster administration and database management
   **/
  readonly adminUsername: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of days between admin password rotations for security compliance and access control management. Defines the password rotation frequency for the cluster administrator account ensuring regular password updates for enhanced security and compliance.
   *
   * Use cases: Password rotation; Security compliance; Access control; Credential management
   *
   * AWS: Redshift admin password rotation frequency for security compliance and credential management
   *
   * Validation: Must be positive integer; required for password rotation policy and security compliance
   **/
  readonly adminPasswordRotationDays: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of federation configurations for federated access enabling SSO integration and external identity provider connectivity. Provides federation setup for integrating with external identity providers and enabling federated access to the Redshift cluster.
   *
   * Use cases: Federated access; SSO integration; External identity providers; Identity federation
   *
   * AWS: Redshift federation configurations for SSO integration and federated access
   *
   * Validation: Must be array of valid FederationProps if provided; enables federated access and SSO integration
   **/
  readonly federations?: FederationProps[];
  readonly dataAdminRoleRefs: MdaaRoleRef[];
  readonly warehouseBucketUserRoleRefs?: MdaaRoleRef[];
  readonly executionRoleRefs?: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for Redshift cluster network deployment enabling secure VPC-based networking and isolation. Provides the VPC where the Redshift cluster will be deployed for network security, isolation, and connectivity control.
   *
   * Use cases: VPC deployment; Network security; Network isolation; Connectivity control
   *
   * AWS: VPC ID for Redshift cluster network deployment and security isolation
   *
   * Validation: Must be valid VPC ID; required for cluster network deployment and security isolation
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet IDs for Redshift cluster subnet group configuration enabling multi-AZ deployment and network distribution. Provides the subnets where the Redshift cluster will be deployed for high availability and network distribution across availability zones.
   *
   * Use cases: Multi-AZ deployment; Network distribution; High availability; Subnet configuration
   *
   * AWS: Subnet IDs for Redshift cluster subnet group and multi-AZ deployment
   *
   * Validation: Must be array of valid subnet IDs; required for cluster subnet configuration and multi-AZ deployment
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group ingress configuration for Redshift cluster network access control enabling controlled TCP traffic on the cluster port. Provides ingress rules for the cluster security group controlling network access and traffic permissions to the Redshift cluster.
   *
   * Use cases: Network access control; Traffic control; Security group configuration; Access permissions
   *
   * AWS: Security group ingress rules for Redshift cluster network access control and traffic management
   *
   * Validation: Must be valid SecurityGroupIngressProps; required for cluster network access control and security
   *   **/
  readonly securityGroupIngress: SecurityGroupIngressProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Required node type specification for Redshift cluster compute resources enabling performance optimization and cost management. Defines the instance type for cluster nodes controlling compute capacity, memory, and storage characteristics for workload optimization.
   *
   * Use cases: Performance optimization; Compute resource selection; Cost management; Workload optimization
   *
   * AWS: Redshift node type for cluster compute resources and performance optimization
   *
   * Validation: Must be valid Redshift node type; required for cluster compute resource configuration and performance
   **/
  readonly nodeType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of cluster nodes for Redshift cluster scaling and performance configuration enabling distributed processing and capacity management. Defines the cluster size for distributed query processing and storage capacity management.
   *
   * Use cases: Cluster scaling; Performance configuration; Distributed processing; Capacity management
   *
   * AWS: Redshift cluster node count for scaling and distributed processing configuration
   *
   * Validation: Must be positive integer; required for cluster scaling and performance configuration
   **/
  readonly numberOfNodes: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required flag controlling audit logging to S3 for compliance and monitoring enabling audit trail and security monitoring. When enabled, creates S3 bucket for audit logs with SSE-S3 encryption as required by Redshift for audit logging compliance.
   *
   * Use cases: Audit logging; Compliance monitoring; Security audit trail; Regulatory compliance
   *
   * AWS: Redshift audit logging to S3 for compliance monitoring and security audit trail
   *
   * Validation: Boolean value; required for audit logging configuration and compliance monitoring
   **/
  readonly enableAuditLoggingToS3: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional cluster port specification for Redshift network connectivity enabling custom port configuration and network security. Defines the TCP port for cluster connections with default value of 5440 for network connectivity and security configuration.
   *
   * Use cases: Network connectivity; Port configuration; Network security; Connection management
   *
   * AWS: Redshift cluster port for network connectivity and connection configuration
   *
   * Validation: Must be valid port number if provided; defaults to 5440 for cluster connectivity
   **/
  readonly clusterPort?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional multi-node flag controlling cluster architecture enabling single-node or multi-node deployment configuration. When true, creates multi-node cluster for distributed processing; when false, creates single-node cluster for development or small workloads.
   *
   * Use cases: Cluster architecture; Deployment configuration; Processing model; Workload sizing
   *
   * AWS: Redshift cluster architecture configuration for single-node or multi-node deployment
   *
   * Validation: Boolean value if provided; controls cluster architecture and processing model
   **/
  readonly multiNode?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required preferred maintenance window for Redshift cluster maintenance scheduling enabling controlled maintenance operations and minimal disruption. Defines the time window for automated maintenance operations ensuring minimal impact on business operations.
   *
   * Use cases: Maintenance scheduling; Operational control; Minimal disruption; Maintenance windows
   *
   * AWS: Redshift cluster preferred maintenance window for automated maintenance scheduling
   *
   * Validation: Must be valid time window format (e.g., 'Sun:23:45-Mon:00:15'); required for maintenance scheduling
   **/
  readonly preferredMaintenanceWindow: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional parameter group parameters for Redshift cluster configuration enabling performance tuning and operational optimization. Provides additional cluster parameters for performance tuning with security-sensitive values being overridden for compliance.
   *
   * Use cases: Performance tuning; Cluster configuration; Operational optimization; Parameter management
   *
   * AWS: Redshift cluster parameter group for performance tuning and configuration optimization
   *
   * Validation: Must be valid parameter name-value mapping if provided; enables cluster performance tuning
   *   **/
  readonly parameterGroupParams?: Record<string, string>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional workload management configuration for Redshift query performance enabling query queue management and resource allocation. Provides WLM configuration for managing query queues, resource allocation, and query performance optimization.
   *
   * Use cases: Query performance; Resource allocation; Queue management; Performance optimization
   *
   * AWS: Redshift workload management configuration for query performance and resource allocation
   *
   * Validation: Must be array of valid ConfigurationElement if provided; enables query performance optimization
   **/
  readonly workloadManagement?: ConfigurationElement[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional KMS key ARNs for cluster bucket encryption enabling multi-key encryption scenarios and enhanced security. Provides additional KMS keys that can be used for encrypting data written to the cluster bucket for enhanced security and key management.
   *
   * Use cases: Multi-key encryption; Enhanced security; Key management; Encryption scenarios
   *
   * AWS: Additional KMS keys for Redshift cluster bucket encryption and enhanced security
   *
   * Validation: Must be array of valid KMS key ARNs if provided; enables multi-key encryption and enhanced security
   **/
  readonly additionalBucketKmsKeyArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of scheduled action configurations for Redshift cluster automation enabling automated pause/resume operations and cost optimization. Provides scheduled actions for automating cluster operations like pause and resume for cost management and operational efficiency.
   *
   * Use cases: Cluster automation; Cost optimization; Scheduled operations; Operational efficiency
   *
   * AWS: Redshift scheduled actions for automated cluster operations and cost optimization
   *
   * Validation: Must be array of valid ScheduledActionProps if provided; enables automated cluster operations
   **/
  readonly scheduledActions?: ScheduledActionProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of database user configurations for Redshift user management enabling role-based database access and user administration. Provides database user definitions for creating users with specific permissions and access patterns within the Redshift cluster.
   *
   * Use cases: User management; Database access; Role-based access; User administration
   *
   * AWS: Redshift database users for user management and role-based database access
   *
   * Validation: Must be array of valid DatabaseUsersProps if provided; enables database user management and access control
   *   **/
  readonly databaseUsers?: DatabaseUsersProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling data warehouse bucket creation enabling custom bucket usage or automatic bucket creation. When true (default), creates dedicated S3 bucket for data warehouse operations; when false, assumes external bucket configuration.
   *
   * Use cases: Bucket management; Storage configuration; Custom bucket usage; Storage automation
   *
   * AWS: S3 bucket creation for Redshift data warehouse storage and data operations
   *
   * Validation: Boolean value if provided; defaults to true; controls warehouse bucket creation and storage configuration
   **/
  readonly createWarehouseBucket?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional automated snapshot retention period for Redshift backup management enabling data protection and recovery capabilities. Defines the number of days automated snapshots are retained for backup management and disaster recovery planning.
   *
   * Use cases: Backup management; Data protection; Disaster recovery; Snapshot retention
   *
   * AWS: Redshift automated snapshot retention for backup management and data protection
   *
   * Validation: Must be positive integer if provided; controls automated snapshot retention and backup management
   **/
  readonly automatedSnapshotRetentionDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional event notification configuration for Redshift cluster monitoring enabling automated alerting and operational awareness. Provides event notification settings for cluster events, errors, and operational status for proactive monitoring and response.
   *
   * Use cases: Event monitoring; Automated alerting; Operational awareness; Proactive response
   *
   * AWS: Redshift event notifications for cluster monitoring and automated alerting
   *
   * Validation: Must be valid EventNotificationsProps if provided; enables cluster event monitoring and alerting
   **/
  readonly eventNotifications?: EventNotificationsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling Redshift-managed admin password for enhanced security and credential management. When enabled (recommended), allows Redshift service to manage the master password automatically for improved security and credential rotation.
   *
   * Use cases: Password management; Enhanced security; Credential automation; Security best practices
   *
   * AWS: Redshift-managed master password for enhanced security and automated credential management
   *
   * Validation: Boolean value if provided; enables Redshift-managed password for enhanced security
   **/
  readonly redshiftManageMasterPassword?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database name for initial database creation enabling custom database naming and organization. Defines the name of the initial database created in the cluster with default value of "default_db" for database organization and management.
   *
   * Use cases: Database naming; Database organization; Initial database setup; Database management
   *
   * AWS: Redshift initial database name for database creation and organization
   *
   * Validation: Must be valid database name if provided; defaults to "default_db" for initial database creation
   **/
  readonly dbName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional snapshot identifier for cluster restoration enabling disaster recovery and data migration from existing snapshots. When provided, restores the cluster from the specified snapshot for disaster recovery or data migration scenarios.
   *
   * Use cases: Disaster recovery; Data migration; Snapshot restoration; Cluster recovery
   *
   * AWS: Redshift snapshot identifier for cluster restoration and disaster recovery
   *
   * Validation: Must be valid snapshot identifier if provided; enables cluster restoration from snapshot
   **/
  readonly snapshotIdentifier?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional snapshot owner account number for cross-account snapshot restoration enabling multi-account disaster recovery and data sharing. Specifies the AWS account that owns the snapshot when restoring from cross-account snapshots for multi-account scenarios.
   *
   * Use cases: Cross-account restoration; Multi-account recovery; Data sharing; Cross-account snapshots
   *
   * AWS: AWS account number for cross-account Redshift snapshot restoration and multi-account recovery
   *
   * Validation: Must be valid AWS account number if provided; enables cross-account snapshot restoration
   **/
  readonly snapshotOwnerAccount?: number;
}

//This stack creates all of the resources required for a Data Warehouse
export class DataWarehouseL3Construct extends MdaaL3Construct {
  protected readonly props: DataWarehouseL3ConstructProps;
  public static readonly defaultClusterPort = 5440;

  private dataAdminRoleIds: string[];
  private bucketUserRoleIds: string[];
  constructor(scope: Construct, id: string, props: DataWarehouseL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.dataAdminRoleIds = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.dataAdminRoleRefs, 'DataAdmin')
      .map(x => x.id());
    this.bucketUserRoleIds = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.warehouseBucketUserRoleRefs || [], 'BucketUsers')
      .map(x => x.id());
    const allRoleIds = [...new Set([...this.dataAdminRoleIds, ...this.bucketUserRoleIds])];

    //Use some private helper functions to create the warehouse resources
    const warehouseKmsKey = this.createWarehouseKMSKey(allRoleIds);
    if (this.props.createWarehouseBucket?.valueOf() == undefined || this.props.createWarehouseBucket.valueOf()) {
      this.createWarehouseBucket(warehouseKmsKey, allRoleIds);
    }
    const loggingBucket = this.props.enableAuditLoggingToS3 ? this.createLoggingBucket() : undefined;
    const executionRoles = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.executionRoleRefs || [], 'ExecutionRoleArns')
      .map(x => MdaaRole.fromRoleArn(this, x.refId(), x.arn()));
    const cluster = this.createCluster(warehouseKmsKey, executionRoles, loggingBucket);

    // Create Redshift scheduled actions - pause and resume cluster - if any were defined in config for this stack
    const scheduledActions = this.createRedshiftScheduledActions(cluster);

    if (this.props.eventNotifications) {
      this.createClusterEventNotifications(cluster.clusterName, scheduledActions, this.props.eventNotifications);
    }

    this.createClusterUsers(cluster, warehouseKmsKey);
    return this;
  }

  private createClusterEventNotifications(
    clusterName: string,
    scheduledActions: CfnScheduledAction[],
    eventNotifications: EventNotificationsProps,
  ) {
    const topic = new Topic(this.scope, 'cluster-events-sns-topic', {
      topicName: this.props.naming.resourceName('cluster-events'),
    });
    const enforceSslStatement = new PolicyStatement({
      sid: 'EnforceSSL',
      effect: Effect.DENY,
      actions: [
        'sns:Publish',
        'sns:RemovePermission',
        'sns:SetTopicAttributes',
        'sns:DeleteTopic',
        'sns:ListSubscriptionsByTopic',
        'sns:GetTopicAttributes',
        'sns:Receive',
        'sns:AddPermission',
        'sns:Subscribe',
      ],
      resources: ['*'],
      conditions: {
        Bool: {
          'aws:SecureTransport': 'false',
        },
      },
    });
    enforceSslStatement.addAnyPrincipal();
    topic.addToResourcePolicy(enforceSslStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      topic,
      [
        {
          id: 'AwsSolutions-SNS2',
          reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.',
        },
        {
          id: 'NIST.800.53.R5-SNSEncryptedKMS',
          reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.',
        },
        {
          id: 'HIPAA.Security-SNSEncryptedKMS',
          reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.',
        },
        {
          id: 'PCI.DSS.321-SNSEncryptedKMS',
          reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.',
        },
      ],
      true,
    );

    //Allow redshift events to be published to the Topic
    const publishPolicyStatement = new PolicyStatement({
      sid: 'Publish Policy',
      effect: Effect.ALLOW,
      actions: [
        'SNS:GetTopicAttributes',
        'SNS:SetTopicAttributes',
        'SNS:AddPermission',
        'SNS:RemovePermission',
        'SNS:DeleteTopic',
        'SNS:Subscribe',
        'SNS:ListSubscriptionsByTopic',
        'SNS:Publish',
      ],
      resources: [topic.topicArn],
      conditions: {
        StringEquals: {
          'AWS:SourceOwner': this.account,
        },
      },
    });
    publishPolicyStatement.addAnyPrincipal();
    topic.addToResourcePolicy(publishPolicyStatement);

    // subscribe to sns topic if email-ids are present
    eventNotifications?.email?.forEach(email => {
      topic.addSubscription(new EmailSubscription(email.trim()));
    });

    const clusterEventNotificationSubProps: CfnEventSubscriptionProps = {
      subscriptionName: clusterName,
      sourceType: 'cluster',
      sourceIds: [clusterName],
      severity: eventNotifications.severity,
      eventCategories: eventNotifications.eventCategories,
      snsTopicArn: topic.topicArn,
    };

    new CfnEventSubscription(this.scope, `cluster-event-notifications-sub`, clusterEventNotificationSubProps);

    const actionEventNotificationSubProps: CfnEventSubscriptionProps = {
      subscriptionName: `${clusterName}-scheduled-actions`,
      sourceType: 'scheduled-action',
      sourceIds: scheduledActions.map(x => x.scheduledActionName),
      severity: eventNotifications.severity,
      eventCategories: eventNotifications.eventCategories,
      snsTopicArn: topic.topicArn,
    };

    new CfnEventSubscription(this.scope, `scheduled-action-event-notifications-sub`, actionEventNotificationSubProps);
  }

  //Creates a RedShift cluster
  private createCluster(warehouseKmsKey: MdaaKmsKey, executionRoles?: IMdaaRole[], loggingBucket?: IBucket): Cluster {
    const vpc = Vpc.fromVpcAttributes(this.scope, `vpc-${this.props.vpcId}`, {
      vpcId: this.props.vpcId,
      availabilityZones: ['dummy'],
      privateSubnetIds: this.props.subnetIds,
    });

    const subnets = this.props.subnetIds.map(id => Subnet.fromSubnetId(this.scope, `subnet-${id}`, id));
    const clusterPort = this.props.clusterPort || DataWarehouseL3Construct.defaultClusterPort;
    //Create subnet group
    const subnetGroup = new ClusterSubnetGroup(this.scope, 'subnet-group', {
      description: this.props.naming.resourceName('subnet-group'),
      vpc: vpc,
      removalPolicy: RemovalPolicy.RETAIN,
      vpcSubnets: {
        subnets: subnets,
      },
    });

    const securityGroupIngress: MdaaSecurityGroupRuleProps = {
      ipv4: this.props.securityGroupIngress.ipv4?.map(x => {
        return {
          cidr: x,
          port: clusterPort,
          protocol: Protocol.TCP,
          description: `Redshift Ingress for IPV4 CIDR ${x}`,
        };
      }),
      sg: this.props.securityGroupIngress.sg?.map(x => {
        return { sgId: x, port: clusterPort, protocol: Protocol.TCP, description: `Redshift Ingress for SG ${x}` };
      }),
    };

    //Create security group
    const securityGroup = new MdaaSecurityGroup(this.scope, 'warehouse-sg', {
      naming: this.props.naming,
      securityGroupName: 'warehouse-sg',
      vpc: vpc,
      allowAllOutbound: true,
      addSelfReferenceRule: false,
      ingressRules: securityGroupIngress,
    });

    securityGroup.addIngressRule(securityGroup, Port.allTcp(), 'Self-Ref');

    let clusterType: ClusterType = ClusterType.MULTI_NODE;
    if (this.props.multiNode != undefined) {
      clusterType = this.props.multiNode ? ClusterType.MULTI_NODE : ClusterType.SINGLE_NODE;
    }

    //ClusterParameterGroup
    //Override security related parameters
    const parameters = this.props.parameterGroupParams || {};

    //Inject Workload Management Config into Param Group
    parameters['wlm_json_configuration'] = JSON.stringify(this.props.workloadManagement);
    const parameterGroup = new MdaaRedshiftClusterParameterGroup(this.scope, 'cluster-param-group', {
      parameters: parameters,
      naming: this.props.naming,
    });

    const loggingProperties = loggingBucket
      ? {
          loggingBucket: loggingBucket,
          loggingKeyPrefix: 'logging/',
        }
      : undefined;

    const dbName = this.props.dbName || 'default_db';
    // if snapshotIdentifier is provided, add to the cluster props
    // if snapshotOwnerAccount is provided add it to cluster props
    const snapshotProps: { snapshotIdentifier?: string; ownerAccount?: number } = {};
    if (this.props.snapshotIdentifier) {
      snapshotProps.snapshotIdentifier = this.props.snapshotIdentifier;
    }
    if (this.props.snapshotOwnerAccount) {
      snapshotProps.ownerAccount = this.props.snapshotOwnerAccount;
    }

    //Create the cluster
    const cluster = new MdaaRedshiftCluster(this.scope, 'cluster', {
      masterUsername: this.props.adminUsername,
      vpc: vpc,
      port: clusterPort,
      roles: executionRoles,
      encryptionKey: warehouseKmsKey,
      nodeType: ensureNodeType(this.props.nodeType),
      numberOfNodes: this.props.numberOfNodes,
      securityGroup: securityGroup,
      subnetGroup: subnetGroup,
      preferredMaintenanceWindow: this.props.preferredMaintenanceWindow,
      clusterType: clusterType,
      parameterGroup: parameterGroup,
      loggingProperties: loggingProperties,
      naming: this.props.naming,
      adminPasswordRotationDays: this.props.adminPasswordRotationDays,
      automatedSnapshotRetentionDays: this.props.automatedSnapshotRetentionDays,
      defaultDatabaseName: dbName,
      ...snapshotProps,
      redshiftManageMasterPassword: this.props.redshiftManageMasterPassword,
    });

    //Roles to grant SAML federated users access to the warehouse
    //Establishes trust with SAML identity providers
    this.props.federations?.forEach(federation => {
      this.createFederation(cluster.clusterName, federation);
    });

    if (!loggingBucket) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        cluster,
        [
          {
            id: 'AwsSolutions-RS5',
            reason:
              'Audit logging to S3 is disabled in config. Audit logging to system tables is enforced in Construct.',
          },
          {
            id: 'NIST.800.53.R5-RedshiftClusterConfiguration',
            reason: 'Audit logging to S3 is disabled in config. Cluster encryption using KMS is enforced in Construct.',
          },
        ],
        true,
      );
    }

    return cluster;
  }

  //This function creates Redshift Users -> Stores & Rotates creds in Secrets Manager -> stores SecretName in SSM
  private createClusterUsers(cluster: Cluster, warehouseKmsKey: MdaaKmsKey) {
    this.props.databaseUsers?.forEach(databaseUser => {
      //Redshift is going to force usernames to lower case.
      //Need to make sure username matches between cluster and secret contents.
      const username = databaseUser.userName.toLowerCase();
      if (username != databaseUser.userName) {
        console.log(`Modified configured username ${databaseUser.userName} to ${username} for Redshift compatability`);
      }
      const userProps: UserProps = {
        cluster: cluster,
        databaseName: databaseUser.dbName,
        username: username,
        adminUser: cluster.secret,
        encryptionKey: warehouseKmsKey,
        excludeCharacters: databaseUser.excludeCharacters,
      };
      const user = new User(this.scope, 'redshiftdbserviceuser-' + username, userProps);

      new StringParameter(user, 'ssmsecret' + username, {
        parameterName: this.props.naming.ssmPath(`datawarehouse/secret/${username}`, false),
        stringValue: user.secret.secretName,
      }); // This causes param collision with two warehouses in the same domain

      new StringParameter(user, 'ssmsecretarn' + username, {
        parameterName: this.props.naming.ssmPath(`datawarehouse/secretarn/${username}`, false),
        stringValue: user.secret.secretArn,
      }); // This causes param collision with two warehouses in the same domain

      //Redshift DatabaseSecret construct does not currently set the masterarn on the secret string,
      //which is required by the multi user rotation function
      const cfnUserSecret = user.secret.node.defaultChild as CfnSecret;
      const secretStringTemplateString = (cfnUserSecret.generateSecretString as CfnSecret.GenerateSecretStringProperty)
        .secretStringTemplate;
      const secretStringTemplate = secretStringTemplateString ? JSON.parse(secretStringTemplateString) : undefined;
      const secretStringTemplateWithMasterArn = {
        ...secretStringTemplate,
        masterarn: cluster.secret?.secretArn,
      };
      cfnUserSecret.addPropertyOverride(
        'GenerateSecretString.SecretStringTemplate',
        JSON.stringify(secretStringTemplateWithMasterArn),
      );

      if (databaseUser.secretRotationDays > 0) {
        const multiUserRotationOptions: RotationMultiUserOptions = {
          secret: user.secret,
          automaticallyAfter: Duration.days(databaseUser.secretRotationDays),
        };
        cluster.addRotationMultiUser('multiuserrotation' + username, multiUserRotationOptions);
      }

      const secretAccessRoles = databaseUser.secretAccessRoles
        ? [
            ...this.props.roleHelper.resolveRoleRefsWithOrdinals(databaseUser.secretAccessRoles, 'SecretAccessRole'),
            ...this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.dataAdminRoleRefs, 'DataAdmin'),
          ]
        : this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.dataAdminRoleRefs, 'DataAdmin');

      this.assignSecretAcessPolicies(secretAccessRoles, warehouseKmsKey, user.secret);

      this.scope.node.children.forEach(child => {
        if (child.node.id.startsWith('Query Redshift Database') || child.node.id.startsWith('redshiftdbserviceuser-')) {
          MdaaNagSuppressions.addCodeResourceSuppressions(
            child,
            [
              { id: 'AwsSolutions-IAM4', reason: 'Role is for Custom Resource Provider.' },
              {
                id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'HIPAA.Security-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'PCI.DSS.321-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              { id: 'AwsSolutions-IAM5', reason: 'Role is for Custom Resource Provider.' },
              { id: 'AwsSolutions-L1', reason: 'Role is for Custom Resource Provider.' },
              {
                id: 'NIST.800.53.R5-LambdaDLQ',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and error handling will be handled by CloudFormation',
              },
              {
                id: 'NIST.800.53.R5-LambdaInsideVPC',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will interact only with Redshift/SecretsManager',
              },
              {
                id: 'NIST.800.53.R5-LambdaConcurrency',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will only execute during stack deployement. Reserved concurrency not appropriate.',
              },
              {
                id: 'HIPAA.Security-LambdaDLQ',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and error handling will be handled by CloudFormation',
              },
              {
                id: 'PCI.DSS.321-LambdaDLQ',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and error handling will be handled by CloudFormation',
              },
              {
                id: 'HIPAA.Security-LambdaInsideVPC',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will interact only with Redshift/SecretsManager',
              },
              {
                id: 'PCI.DSS.321-LambdaInsideVPC',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will interact only with Redshift/SecretsManager',
              },
              {
                id: 'HIPAA.Security-LambdaConcurrency',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will only execute during stack deployement. Reserved concurrency not appropriate.',
              },
              {
                id: 'PCI.DSS.321-LambdaConcurrency',
                reason:
                  'Lambda Function is created by aws-redshift-alpha cdk module and will only execute during stack deployement. Reserved concurrency not appropriate.',
              },
            ],
            true,
          );
        }
      });
    });
  }

  //This function creates and assigns ploicies to specified roles for accessing redshift user secrets.
  private assignSecretAcessPolicies(
    secretAccessRoles: MdaaResolvableRole[],
    warehouseKmsKey: MdaaKmsKey,
    secret: ISecret,
  ) {
    const arnPrincipals = secretAccessRoles.map(role => new ArnPrincipal(role.arn()));
    const secretAccessStatement = new PolicyStatement({
      sid: 'AllowSecretUsageForRoles',
      effect: Effect.ALLOW,
      principals: arnPrincipals,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['*'],
    });

    const kmsUsageStatement = new PolicyStatement({
      sid: 'AllowKMSUsageForSecretRoles',
      effect: Effect.ALLOW,
      principals: arnPrincipals,
      actions: DECRYPT_ACTIONS,
      resources: ['*'],
    });

    secret.addToResourcePolicy(secretAccessStatement);
    warehouseKmsKey.addToResourcePolicy(kmsUsageStatement);
  }

  //This function creates an IAM Identity Provider and federation role
  private createFederation(clusterName: string, federation: FederationProps): Role {
    //Create a role which can be used for accessing redshift
    const role = new MdaaRole(this.scope, `federation-role-${federation.federationName}`, {
      assumedBy: new FederatedPrincipal(federation.providerArn, {}, 'sts:AssumeRoleWithSAML'),
      roleName: federation.federationName,
      naming: this.props.naming,
    });
    const redshiftPolicy = new ManagedPolicy(this.scope, `federation-pol-${federation.federationName}`, {
      managedPolicyName: this.props.naming.resourceName(`federation-${federation.federationName}`),
      roles: [role],
    });
    //Allow to describe this cluster
    const describeClusterStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['redshift:DescribeClusters'],
      resources: [`arn:${this.partition}:redshift:${this.region}:${this.account}:cluster:${clusterName}`],
    });
    redshiftPolicy.addStatements(describeClusterStatement);

    //Allow to fetch credentials for this cluster
    const getClusterCredsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['redshift:GetClusterCredentials'],
      resources: [
        `arn:${this.partition}:redshift:${this.region}:${this.account}:dbuser:${clusterName}/` + '${redshift:DbUser}',
      ],
    });
    getClusterCredsStatement.addCondition('StringEquals', { 'aws:userid': role.roleId + ':${redshift:DbUser}' });
    getClusterCredsStatement.addResources(
      `arn:${this.partition}:redshift:${this.region}:${this.account}:dbname:${clusterName}/*`,
    );

    redshiftPolicy.addStatements(getClusterCredsStatement);

    //Allow to create user for this cluster
    const createUserStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['redshift:CreateClusterUser'],
      resources: [
        `arn:${this.partition}:redshift:${this.region}:${this.account}:dbuser:${clusterName}/` + '${redshift:DbUser}',
      ],
    });
    redshiftPolicy.addStatements(createUserStatement);

    //Allow to create user for this cluster
    const joinGroupStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['redshift:JoinGroup'],
    });

    joinGroupStatement.addResources(
      `arn:${this.partition}:redshift:${this.region}:${this.account}:dbgroup:${clusterName}/*`,
    );
    redshiftPolicy.addStatements(joinGroupStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      redshiftPolicy,
      [{ id: 'AwsSolutions-IAM5', reason: 'Wildcard is for group names dynamically generated via SAML federation.' }],
      true,
    );

    return role;
  }

  private createWarehouseKMSKey(allRoleIds: string[]): MdaaKmsKey {
    return new MdaaKmsKey(this.scope, 'warehouse-key', {
      alias: 'data-warehouse',
      naming: this.props.naming,
      keyAdminRoleIds: this.dataAdminRoleIds,
      keyUserRoleIds: allRoleIds,
    });
  }

  private createWarehouseBucket(warehouseKmsKey: MdaaKmsKey, allRoleIds: string[]): Bucket {
    //This warehouse bucket will be used for data warehouse logging and other S3 offload scenarios
    const warehouseBucket = new MdaaBucket(this.scope, 'warehouse-bucket', {
      encryptionKey: warehouseKmsKey,
      bucketName: 'warehouse',
      naming: this.props.naming,
      additionalKmsKeyArns: this.props.additionalBucketKmsKeyArns,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      warehouseBucket,
      [
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
      ],
      true,
    );
    //Enable the bucket key feature which optimizes the bucket for use with KMS
    const cfnBucket = warehouseBucket.node.defaultChild as CfnBucket;
    cfnBucket.addOverride('Properties.BucketEncryption.ServerSideEncryptionConfiguration.0.BucketKeyEnabled', true);

    //Data Admins and Warehouse Execution Role can read/write
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: warehouseBucket,
      s3Prefix: '/',
      readWriteRoleIds: this.bucketUserRoleIds,
      readWriteSuperRoleIds: this.dataAdminRoleIds,
    });
    rootPolicy.statements().forEach(statement => warehouseBucket.addToResourcePolicy(statement));

    //Default Deny Policy
    //Any role not specified in config is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: warehouseBucket,
      roleExcludeIds: allRoleIds,
    });

    warehouseBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    warehouseBucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);

    return warehouseBucket;
  }

  private createLoggingBucket(): IBucket {
    //Replicate behaviour of MdaaBucket but allow for non-KMS encryption (required by Redshift)
    const uniqueBucketNamePrefixContext = this.node.tryGetContext(MdaaBucket.UNIQUE_NAME_CONTEXT_KEY);

    const uniqueBucketNamePrefix = uniqueBucketNamePrefixContext ? Boolean(uniqueBucketNamePrefixContext) : false;

    const prefix = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(this).stackId))));

    const bucketName = uniqueBucketNamePrefix
      ? prefix + '-' + this.props.naming.resourceName('logging', 63)
      : this.props.naming.resourceName('logging', 63);

    const loggingBucket = new Bucket(this.scope, bucketName, {
      bucketName: bucketName,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      loggingBucket,
      [
        { id: 'AwsSolutions-S1', reason: 'Server access logs do not support KMS on targets.' },
        { id: 'NIST.800.53.R5-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets.' },
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
        {
          id: 'NIST.800.53.R5-S3DefaultEncryptionKMS',
          reason: 'Redshift audit logging does not support KMS-encrypted buckets',
        },
        { id: 'HIPAA.Security-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets.' },
        { id: 'PCI.DSS.321-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets.' },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'MDAA Warehouse bucket does not use bucket replication.',
        },
        {
          id: 'HIPAA.Security-S3DefaultEncryptionKMS',
          reason: 'Redshift audit logging does not support KMS-encrypted buckets',
        },
        {
          id: 'PCI.DSS.321-S3DefaultEncryptionKMS',
          reason: 'Redshift audit logging does not support KMS-encrypted buckets',
        },
      ],
      true,
    );

    const AllowRedshiftLoggingPut = new PolicyStatement({
      sid: 'AllowRedshiftLoggingPut',
      effect: Effect.ALLOW,
      resources: [loggingBucket.bucketArn + '/*', loggingBucket.bucketArn],
      actions: ['s3:PutObject', 's3:GetBucketAcl'],
      principals: [
        new ServicePrincipal(`redshift.amazonaws.com`),
        new ServicePrincipal(`redshift.${this.region}.amazonaws.com`),
      ],
      conditions: {
        StringEquals: {
          'aws:SourceArn': `arn:${this.partition}:redshift:${this.region}:${
            this.account
          }:cluster:${this.props.naming.resourceName()}`,
        },
      },
    });
    loggingBucket.addToResourcePolicy(AllowRedshiftLoggingPut);

    return loggingBucket;
  }

  private createRedshiftScheduledActions(cluster: Cluster): CfnScheduledAction[] {
    // If any scheduled actions are defined in config
    if (Array.isArray(this.props.scheduledActions) && this.props.scheduledActions.length > 0) {
      // Create a managed policy to grant Pause and Resume access on the cluster in this stack
      const pauseResumePolicy = new ManagedPolicy(this.scope, 'redshiftPauseResumePolicy', {
        description: 'Allows to Pause and Resume Redshift clusters',
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['redshift:PauseCLuster', 'redshift:ResumeCluster'],
            resources: [`arn:${this.partition}:redshift:${this.region}:${this.account}:cluster:${cluster.clusterName}`],
          }),
        ],
      });

      // Create role for redshift scheduler to pause and resume cluster and attach the above managed policy to it.
      const redshiftSchedulerRole = new MdaaRole(this.scope, `scheduler-role`, {
        naming: this.props.naming,
        assumedBy: new ServicePrincipal('scheduler.redshift.amazonaws.com'),
        roleName: 'scheduler',
        managedPolicies: [pauseResumePolicy],
      });

      return this.props.scheduledActions.map(action => {
        // Pause action for cluster in this stack
        const pauseClusterAction: CfnScheduledAction.ScheduledActionTypeProperty = {
          pauseCluster: {
            clusterIdentifier: cluster.clusterName,
          },
        };
        // Resume action for cluster in this stack
        const resumeClusterAction: CfnScheduledAction.ScheduledActionTypeProperty = {
          resumeCluster: {
            clusterIdentifier: cluster.clusterName,
          },
        };

        let startTime = action.startTime ? Date.parse(action.startTime) : undefined;
        if (startTime && startTime < Date.now()) {
          console.log(
            `Configured scheduled action startTime (${action.startTime}) is in the past. Setting to one hour from now.`,
          );
          startTime = Date.now() + 3600000;
        }

        const targetAction = action.targetAction == 'pauseCluster' ? pauseClusterAction : resumeClusterAction;
        // Create Redshift Scheduled Action
        return new CfnScheduledAction(this.scope, `scheduled-action-${action.name}`, {
          scheduledActionName: sanitizeScheduledActionName(this.props.naming.resourceName(action.name, 55)),
          enable: action.enable,
          targetAction: targetAction,
          schedule: action.schedule,
          startTime: startTime ? new Date(startTime).toISOString() : undefined,
          endTime: action.endTime,
          iamRole: redshiftSchedulerRole.roleArn,
        });
      });
    }
    return [];
  }
}
