/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Cluster,
  ClusterSubnetGroup,
  ClusterType,
  RotationMultiUserOptions,
  User,
  UserProps,
} from '@aws-cdk/aws-redshift-alpha';
import { ConfigurationElement } from '@aws-mdaa/config';
import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { IMdaaRole, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaRedshiftCluster, MdaaRedshiftClusterParameterGroup } from '@aws-mdaa/redshift-constructs';
import { MultiAzValidationError } from '@aws-mdaa/redshift-constructs/lib/utils';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket, PUBLIC_ACCESS_BLOCK_NAG_SUPPRESSIONS } from '@aws-mdaa/s3-constructs';
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
import { Construct } from 'constructs';
import { ensureNodeType, sanitizeScheduledActionName } from './utils';

const REDSHIFT_CUSTOM_RESOURCE_NAG_SUPPRESSIONS = [
  {
    id: 'AwsSolutions-IAM4',
    reason:
      'Custom Resource Provider role uses AWSLambdaBasicExecutionRole managed policy for CloudWatch Logs access (logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents). These are standard Lambda execution permissions. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html',
  },
  {
    id: 'NIST.800.53.R5-IAMNoInlinePolicy',
    reason: 'Role is for Custom Resource Provider. Inline policy automatically added by CDK framework.',
  },
  {
    id: 'HIPAA.Security-IAMNoInlinePolicy',
    reason: 'Role is for Custom Resource Provider. Inline policy automatically added by CDK framework.',
  },
  {
    id: 'PCI.DSS.321-IAMNoInlinePolicy',
    reason: 'Role is for Custom Resource Provider. Inline policy automatically added by CDK framework.',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason:
      'Custom Resource Provider role uses wildcard resource (*) for redshift-data:DescribeStatement and redshift-data:ExecuteStatement actions. These actions do not support resource-level permissions per https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonredshiftdata.html. Role is scoped to deployment lifecycle only.',
  },
  {
    id: 'AwsSolutions-L1',
    reason:
      'Lambda runtime version is controlled by the aws-redshift-alpha CDK module and cannot be overridden by the consumer. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslambda.html',
  },
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
];

/**
 * SAML federation configuration for Redshift cluster access.
 * Creates IAM roles with SAML trust for dynamic credential generation and group-based access.
 *
 * Use cases: SAML SSO integration; Federated cluster access; Identity provider mapping
 *
 * AWS: IAM SAML roles for Redshift federated authentication
 *
 * Validation: federationName and providerArn required; url deprecated
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
 * Scheduled action for automated Redshift cluster pause/resume.
 * Supports cron-based scheduling with configurable active time windows.
 *
 * Use cases: Cost optimization via scheduled pause; Business-hours automation; Cluster lifecycle management
 *
 * AWS: Redshift scheduled actions (pauseCluster/resumeCluster)
 *
 * Validation: name, targetAction, schedule required; times in UTC ISO format
 */
export interface ScheduledActionProps {
  /**
   * Unique name for the scheduled action.
   *
   * Use cases: Action identification; Operational tracking
   *
   * AWS: Redshift scheduled action name
   *
   * Validation: Required; unique string identifier
   */
  readonly name: string;
  /**
   * Scheduled action is enabled if true
   */
  readonly enable: boolean;
  /**
   * Target operation: 'pauseCluster' or 'resumeCluster'. resizeCluster is not supported.
   *
   * Use cases: Cluster pause for cost savings; Cluster resume for availability
   *
   * AWS: Redshift scheduled action target operation
   *
   * Validation: Required; 'pauseCluster' or 'resumeCluster'
   */
  readonly targetAction: string;
  /**
   * Cron expression for schedule timing in format: cron(Minutes Hours Day-of-month Month Day-of-week Year).
   *
   * Use cases: Business-hours scheduling; Weekend pause; Custom timing
   *
   * AWS: Redshift scheduled action cron schedule
   *
   * Validation: Required; valid cron expression
   */
  readonly schedule: string;
  /**
   * UTC start date/time when the schedule becomes active (ISO 8601 format).
   *
   * Use cases: Deferred activation; Time-bounded scheduling
   *
   * AWS: Redshift scheduled action start time
   *
   * Validation: Optional; valid UTC timestamp (e.g., '2023-12-31T00:00:00Z')
   */
  readonly startTime?: string;
  /**
   * The scheduled action Start Date & Time in UTC format till when the scheduled action is effective.
   */
  readonly endTime?: string;
}
// Security group ingress rules for Redshift cluster network access
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
 * Redshift database user with Secrets Manager credential storage and automated rotation.
 *
 * Use cases: Automated user provisioning; Credential rotation; Service account management
 *
 * AWS: Redshift database users with Secrets Manager integration
 *
 * Validation: userName, dbName, secretRotationDays required
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
 * Event notification configuration for Redshift cluster monitoring via SNS.
 * Supports event category filtering, severity-based alerting, and email delivery.
 *
 * Use cases: Cluster health monitoring; Security event alerting; Operational notifications
 *
 * AWS: SNS notifications for Redshift cluster events
 *
 * Validation: All fields optional
 */
export interface EventNotificationsProps {
  /**
   * Event categories to monitor. Valid values: 'configuration', 'management', 'monitoring', 'security', 'pending'.
   *
   * Use cases: Selective event monitoring; Category-based alerting
   *
   * AWS: Redshift event notification category filter
   *
   * Validation: Optional; array of valid EventCategories values
   */
  readonly eventCategories?: EventCategories[];
  /**
   * Minimum event severity level: 'ERROR' or 'INFO'.
   *
   * Use cases: Severity-based filtering; Critical-only alerting
   *
   * AWS: Redshift event notification severity filter
   *
   * Validation: Optional; 'ERROR' | 'INFO'
   */
  readonly severity?: EventSeverity;
  /**
   * Email addresses for SNS notification delivery.
   * An SNS topic is created regardless; emails are added as subscriptions.
   *
   * Use cases: Team alerting; Operational monitoring; Event notification delivery
   *
   * AWS: SNS email subscriptions for Redshift events
   *
   * Validation: Optional; array of valid email addresses
   */
  readonly email?: string[];
}
export interface DataWarehouseL3ConstructProps extends MdaaL3ConstructProps {
  // Admin username for the Redshift cluster
  readonly adminUsername: string;
  // Days between admin password rotations
  readonly adminPasswordRotationDays: number;
  // SAML federation configurations for federated cluster access
  readonly federations?: FederationProps[];
  readonly dataAdminRoleRefs: MdaaRoleRef[];
  readonly warehouseBucketUserRoleRefs?: MdaaRoleRef[];
  readonly executionRoleRefs?: MdaaRoleRef[];
  // VPC ID for cluster deployment
  readonly vpcId: string;
  // Subnet IDs for cluster subnet group
  readonly subnetIds: string[];
  // Security group ingress rules for cluster access
  readonly securityGroupIngress: SecurityGroupIngressProps;
  // Redshift node type (e.g., RA3_4XLARGE)
  readonly nodeType: string;
  // Number of cluster nodes
  readonly numberOfNodes: number;
  // Enable audit logging to S3 (SSE-S3 encrypted bucket)
  readonly enableAuditLoggingToS3: boolean;
  // Cluster port (default 5440)
  readonly clusterPort?: number;
  // Multi-node cluster flag
  readonly multiNode?: boolean;
  // Preferred maintenance window (ddd:hh24:mi-ddd:hh24:mi UTC)
  readonly preferredMaintenanceWindow: string;
  // Additional parameter group parameters
  readonly parameterGroupParams?: { [key: string]: string };
  // WLM configuration elements
  readonly workloadManagement?: ConfigurationElement[];
  // Additional KMS key ARNs for warehouse bucket encryption
  readonly additionalBucketKmsKeyArns?: string[];
  // Scheduled pause/resume actions
  readonly scheduledActions?: ScheduledActionProps[];
  // Database users with Secrets Manager credential management
  readonly databaseUsers?: DatabaseUsersProps[];
  // Control warehouse bucket creation (default true)
  readonly createWarehouseBucket?: boolean;
  // Automated snapshot retention days (1-35, 0 to disable)
  readonly automatedSnapshotRetentionDays?: number;
  // Event notification configuration
  readonly eventNotifications?: EventNotificationsProps;
  // Enable Redshift-managed admin password
  readonly redshiftManageMasterPassword?: boolean;
  // Initial database name (default "default_db")
  readonly dbName?: string;
  // Snapshot ID for cluster restoration
  readonly snapshotIdentifier?: string;
  // Snapshot owner account for cross-account restoration
  readonly snapshotOwnerAccount?: string;
  // Enable multi-AZ deployment for high availability
  readonly multiAz?: boolean;
  // Target region for cross-region snapshot copies. Must differ from the deployment region.
  readonly backupRegion?: string;
  /**
   * When true, omits the explicit blockPublicAccess setting on S3 buckets so CDK does not emit
   * a PutBucketPublicAccessBlock API call. Use when public access block is managed externally
   * (e.g., by AWS defaults and/or SCPs).
   * @default false
   */
  readonly publicAccessBlockManagedExternally?: boolean;
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
    // prettier-ignore
    const topic = new Topic(this.scope, 'cluster-events-sns-topic', { // NOSONAR — Redshift event notifications do not support encrypted topics
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

    // Multi-AZ requires subnets in at least 3 AZs
    if (this.props.multiAz && this.props.subnetIds.length < 3) {
      throw new MultiAzValidationError(
        'Multi-AZ deployment requires subnets in at least 3 Availability Zones. ' +
          `Configured subnetIds count: ${this.props.subnetIds.length}.`,
      );
    }
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
    const snapshotProps: { snapshotIdentifier?: string; ownerAccount?: string } = {};
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
      multiAz: this.props.multiAz,
      backupRegion: this.props.backupRegion,
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
          {
            id: 'PCI.DSS.321-RedshiftClusterConfiguration',
            reason: 'Audit logging to S3 is disabled in config. Cluster encryption using KMS is enforced in Construct.',
          },
          {
            id: 'HIPAA.Security-RedshiftClusterConfiguration',
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

      new MdaaStringParameter(user, 'ssmsecret' + username, {
        parameterName: this.props.naming.ssmPath(`datawarehouse/secret/${username}`, false),
        stringValue: user.secret.secretName,
      }); // This causes param collision with two warehouses in the same domain

      new MdaaStringParameter(user, 'ssmsecretarn' + username, {
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
          MdaaNagSuppressions.addCodeResourceSuppressions(child, REDSHIFT_CUSTOM_RESOURCE_NAG_SUPPRESSIONS, true);
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
    // Backwards compat for existing deployments, but construct ID should not use the name if the name contains tokens
    const loggingBucket = new Bucket(this.scope, bucketName.includes('Token') ? 'logging-bucket' : bucketName, {
      bucketName: bucketName,
      encryption: BucketEncryption.S3_MANAGED,
      ...(this.props.publicAccessBlockManagedExternally ? {} : { blockPublicAccess: BlockPublicAccess.BLOCK_ALL }),
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

    if (this.props.publicAccessBlockManagedExternally) {
      MdaaNagSuppressions.addCodeResourceSuppressions(loggingBucket, PUBLIC_ACCESS_BLOCK_NAG_SUPPRESSIONS, true);
    }

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
