/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroup, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefRole, ICaefRole } from '@aws-caef/iam-constructs';
import { CaefResolvableRole, CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey, DECRYPT_ACTIONS } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefRedshiftCluster, CaefRedshiftClusterParameterGroup } from '@aws-caef/redshift-constructs';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-caef/s3-bucketpolicy-helper';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { Cluster, ClusterSubnetGroup, ClusterType, NodeType, RotationMultiUserOptions, User, UserProps } from '@aws-cdk/aws-redshift-alpha';
import { Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Port, Protocol, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ArnPrincipal, Effect, FederatedPrincipal, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnEventSubscription, CfnEventSubscriptionProps, CfnScheduledAction } from 'aws-cdk-lib/aws-redshift';
import { BlockPublicAccess, Bucket, BucketEncryption, CfnBucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnSecret, ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';


export interface FederationProps {
  /**
   * Name of the federation for reference elsewhere in the config.
   */
  readonly federationName: string,
  /**
   * Arn of the IAM Identity Provider through which federation will occur
   */
  readonly providerArn: string,
  /**
   * Deprecated. No Longer used.
   */
  readonly url?: string
}

export interface NagSuppressionProps {
  readonly id: string,
  readonly reason: string
}

export interface ScheduledActionProps {
  /**
   * Named of the scheduled action
   */
  readonly name: string,
  /**
   * Scheduled action is enabled if true
   */
  readonly enable: boolean,
  /**
   * One of "pauseCluster", "resumeCluster"
   */
  readonly targetAction: string,
  /**
   * The scheduled action schedule in cron format
   */
  readonly schedule: string,
  /**
   * The scheduled action Start Date & Time in UTC format from when the scheduled action is effective.
   */
  readonly startTime?: string,
  /**
   * The scheduled action Start Date & Time in UTC format till when the scheduled action is effective.
   */
  readonly endTime?: string
}

export interface SecurityGroupIngressProps {
  /**
   * CIDR range of the ingres definition
   */
  readonly ipv4?: string[];
  /**
   * Security Group ID of the ingres definition
   */
  readonly sg?: string[]
}

export interface DatabaseUsersProps {
  /**
   * Name of the execution role
   */
  readonly userName: string,
  /**
   * The DB to which the user will be added
   */
  readonly dbName: string,
  /**
   * Number of days between secret rotation
   */
  readonly secretRotationDays: number
  /**
  * List of roles that need redshift secret access
   */
  readonly secretAccessRoles?: CaefRoleRef[]
}

export type EventCategories = "configuration" | "management" | "monitoring" | "security" | "pending"
export type EventSeverity = "ERROR" | "INFO"

export interface EventNotificationsProps {
  readonly eventCategories?: EventCategories[]
  readonly severity?: EventSeverity
  readonly email?: string[]
}

export interface DataWarehouseL3ConstructProps extends CaefL3ConstructProps {

  /**
   * Set the admin user name for the cluster
   */
  readonly adminUsername: string
  /**
   * Set the number of days between admin password rotations
   */
  readonly adminPasswordRotationDays: number
  /**
   * List of federations/roles to be created for federated access to the cluster
   */
  readonly federations?: FederationProps[]
  /**
   * List of admin roles which will be provided access to cluster resources (like KMS/Bucket)
   */
  readonly dataAdminRoleRefs: CaefRoleRef[]
  /**
 * List of user roles which will be provided access to cluster resources (like KMS/Bucket)
 */
  readonly warehouseBucketUserRoleRefs?: CaefRoleRef[]
  /**
   * List of external roles which will be associated to the redshift cluster
   * If a role requires access to datawarehouse bucket, then role should be added to 'warehouseBucketUserRoles' in application config
   */
  readonly executionRoleRefs?: CaefRoleRef[]
  /**
   * The ID of the VPC on which the cluster will be deployed.
   */
  readonly vpcId: string
  /**
   * The ID of the subnets on which the cluster will be deployed.
   */
  readonly subnetIds: string[]
  /**
   * Additional ingress rules to be added to the cluster security group, permitting tcp traffic on the cluster port
   */
  readonly securityGroupIngress: SecurityGroupIngressProps
  /**
   * Node type of the cluster.
   */
  readonly nodeType: string
  /**
   * Number of cluster nodes
   */
  readonly numberOfNodes: number
  /**
   * If enabled, cluster audit logging will be written to an S3 bucket created for this purpose. 
   * Note that Redshift supports audit logging only to SSE-S3 encrypted buckets, so this audit bucket
   * will not be created with SSE-KMS or use a customer master key.
   */
  readonly enableAuditLoggingToS3: boolean
  /**
   * The cluster port (default: 54390)
   */
  readonly clusterPort?: number
  /**
   * If true, cluster will be of type MULTI_NODE, otherwise SINGLE_NODE
   */
  readonly multiNode?: boolean
  /**
   * The preferred maintenance window for the cluster
   * Example: 'Sun:23:45-Mon:00:15'
   */
  readonly preferredMaintenanceWindow: string
  /**
   * Additional parameters for the cluster parameter group. Certain security-sensitive values will be overridden.
   */
  readonly parameterGroupParams?: { [ key: string ]: any }
  /**
   * The cluster workload management configuration.
   */
  readonly workloadManagement?: { [ key: string ]: any }[]
  /**
   * Additional KMS keys which can be used to write to the cluster bucket
   */
  readonly additionalBucketKmsKeyArns?: string[]
  /**
   * List of scheduled actions (pause,resume) which can be applied to the cluster
   */
  readonly scheduledActions?: ScheduledActionProps[]
  /**
   * List of database users to be created in the cluster
   */
  readonly databaseUsers?: DatabaseUsersProps[]
  /**
   * If true(default), a Data Warehouse bucket will be created
   */
  readonly createWarehouseBucket?: boolean
  /**
   * The number of days that automated snapshots are retained
   */
  readonly automatedSnapshotRetentionDays?: number
  /**
   * Event notification configuration
   */
  readonly eventNotifications?: EventNotificationsProps
}

//This stack creates all of the resources required for a Data Warehouse
export class DataWarehouseL3Construct extends CaefL3Construct {
  protected readonly props: DataWarehouseL3ConstructProps
  public static readonly defaultClusterPort = 54390
  private dataAdminRoleIds: string[]
  private bucketUserRoleIds: string[]
  constructor( scope: Construct, id: string, props: DataWarehouseL3ConstructProps ) {
    super( scope, id, props )
    this.props = props

    this.dataAdminRoleIds = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataAdminRoleRefs, "DataAdmin" ).map( x => x.id() )
    this.bucketUserRoleIds = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.warehouseBucketUserRoleRefs || [], "BucketUsers" ).map( x => x.id() )
    let allRoleIds = [ ...new Set( [ ...this.dataAdminRoleIds, ...this.bucketUserRoleIds ] ) ]

    //Use some private helper functions to create the warehouse resources
    const warehouseKmsKey = this.createWarehouseKMSKey( allRoleIds )
    if ( this.props.createWarehouseBucket?.valueOf() == undefined || this.props.createWarehouseBucket.valueOf() ) {
      this.createWarehouseBucket( warehouseKmsKey, allRoleIds )
    }
    const loggingBucket = this.props.enableAuditLoggingToS3 ? this.createLoggingBucket() : undefined
    const executionRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.executionRoleRefs || [], "ExecutionRoleArns" ).map( x => CaefRole.fromRoleArn( this, x.refId(), x.arn() ) )
    const cluster = this.createCluster( warehouseKmsKey, executionRoles, loggingBucket )

    // Create Redshift scheduled actions - pause and resume cluster - if any were defined in config for this stack
    const scheduledActions = this.createRedshiftScheduledActions( cluster )

    if ( this.props.eventNotifications ) {
      this.createClusterEventNotifications( cluster.clusterName, scheduledActions, this.props.eventNotifications )
    }

    this.createClusterUsers( cluster, warehouseKmsKey )
    return this
  }

  private createClusterEventNotifications ( clusterName: string, scheduledActions: CfnScheduledAction[], eventNotifications: EventNotificationsProps ) {

    const topic = new Topic( this.scope, "cluster-events-sns-topic", {
      topicName: this.props.naming.resourceName( "cluster-events" )
    } )
    const enforceSslStatement = new PolicyStatement( {
      sid: "EnforceSSL",
      effect: Effect.DENY,
      actions: [
        "sns:Publish",
        "sns:RemovePermission",
        "sns:SetTopicAttributes",
        "sns:DeleteTopic",
        "sns:ListSubscriptionsByTopic",
        "sns:GetTopicAttributes",
        "sns:Receive",
        "sns:AddPermission",
        "sns:Subscribe" ],
      resources: [ "*" ],
      conditions: {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    } )
    enforceSslStatement.addAnyPrincipal()
    topic.addToResourcePolicy( enforceSslStatement )

    NagSuppressions.addResourceSuppressions(
      topic,
      [
        { id: 'AwsSolutions-SNS2', reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.' },
        { id: 'NIST.800.53.R5-SNSEncryptedKMS', reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.' },
        { id: 'HIPAA.Security-SNSEncryptedKMS', reason: 'Redshift event subscriptions do not currently support an encrypted SNS topic.' }
      ],
      true
    );

    //Allow redshift events to be published to the Topic
    const publishPolicyStatement = new PolicyStatement(
      {
        "sid": "Publish Policy",
        "effect": Effect.ALLOW,
        actions: [
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:AddPermission",
          "SNS:RemovePermission",
          "SNS:DeleteTopic",
          "SNS:Subscribe",
          "SNS:ListSubscriptionsByTopic",
          "SNS:Publish"
        ],
        resources: [ topic.topicArn ],
        conditions: {
          "StringEquals": {
            "AWS:SourceOwner": this.account
          }
        }
      }
    )
    publishPolicyStatement.addAnyPrincipal()
    topic.addToResourcePolicy( publishPolicyStatement )

    // subscribe to sns topic if email-ids are present
    eventNotifications?.email?.forEach( email => {
      topic.addSubscription( new EmailSubscription( email.trim() ) );
    } );

    const clusterEventNotificationSubProps: CfnEventSubscriptionProps = {
      subscriptionName: clusterName,
      sourceType: 'cluster',
      sourceIds: [ clusterName ],
      severity: eventNotifications.severity,
      eventCategories: eventNotifications.eventCategories,
      snsTopicArn: topic.topicArn
    }

    new CfnEventSubscription( this.scope, `cluster-event-notifications-sub`, clusterEventNotificationSubProps )

    const actionEventNotificationSubProps: CfnEventSubscriptionProps = {
      subscriptionName: `${ clusterName }-scheduled-actions`,
      sourceType: 'scheduled-action',
      sourceIds: scheduledActions.map( x => x.scheduledActionName ),
      severity: eventNotifications.severity,
      eventCategories: eventNotifications.eventCategories,
      snsTopicArn: topic.topicArn
    }

    new CfnEventSubscription( this.scope, `scheduled-action-event-notifications-sub`, actionEventNotificationSubProps )
  }



  //Creates a RedShift cluster
  private createCluster ( warehouseKmsKey: CaefKmsKey,
    executionRoles?: ICaefRole[],
    loggingBucket?: IBucket ): Cluster {
    const vpc = Vpc.fromVpcAttributes( this.scope, `vpc-${ this.props.vpcId }`, {
      vpcId: this.props.vpcId,
      availabilityZones: [ "dummy" ],
      privateSubnetIds: this.props.subnetIds
    } )

    const subnets = this.props.subnetIds.map( id => Subnet.fromSubnetId( this.scope, `subnet-${ id }`, id ) )
    const clusterPort = this.props.clusterPort || DataWarehouseL3Construct.defaultClusterPort
    //Create subnet group
    const subnetGroup = new ClusterSubnetGroup( this.scope, "subnet-group", {
      description: this.props.naming.resourceName( "subnet-group" ),
      vpc: vpc,
      removalPolicy: RemovalPolicy.RETAIN,
      vpcSubnets: {
        subnets: subnets
      }
    } )

    const securityGroupIngress: CaefSecurityGroupRuleProps = {
      ipv4: this.props.securityGroupIngress.ipv4?.map( x => { return { cidr: x, port: clusterPort, protocol: Protocol.TCP, description: `Redshift Ingress for IPV4 CIDR ${ x }` } } ),
      sg: this.props.securityGroupIngress.sg?.map( x => { return { sgId: x, port: clusterPort, protocol: Protocol.TCP, description: `Redshift Ingress for SG ${ x }` } } )
    }

    //Create security group
    const securityGroup = new CaefSecurityGroup( this.scope, "warehouse-sg", {
      naming: this.props.naming,
      securityGroupName: "warehouse-sg",
      vpc: vpc,
      allowAllOutbound: true,
      addSelfReferenceRule: false,
      ingressRules: securityGroupIngress
    } )

    securityGroup.addIngressRule( securityGroup, Port.allTcp(), 'Self-Ref' )

    let clusterType: ClusterType = ClusterType.MULTI_NODE
    if ( this.props.multiNode != undefined ) {
      clusterType = this.props.multiNode ? ClusterType.MULTI_NODE : ClusterType.SINGLE_NODE
    }

    //ClusterParameterGroup
    //Override security related parameters
    const parameters = this.props.parameterGroupParams || {}

    //Inject Workload Management Config into Param Group
    parameters[ 'wlm_json_configuration' ] = JSON.stringify( this.props.workloadManagement )
    const parameterGroup = new CaefRedshiftClusterParameterGroup( this.scope, "cluster-param-group", {
      parameters: parameters,
      naming: this.props.naming
    } )

    const loggingProperties = loggingBucket ? {
      loggingBucket: loggingBucket,
      loggingKeyPrefix: "logging/"
    } : undefined

    //Create the cluster
    const cluster = new CaefRedshiftCluster( this.scope, "cluster", {
      masterUsername: this.props.adminUsername,
      vpc: vpc,
      port: clusterPort,
      roles: executionRoles,
      encryptionKey: warehouseKmsKey,
      nodeType: ( <any>NodeType )[ this.props.nodeType ],
      numberOfNodes: this.props.numberOfNodes,
      securityGroup: securityGroup,
      subnetGroup: subnetGroup,
      preferredMaintenanceWindow: this.props.preferredMaintenanceWindow,
      clusterType: clusterType,
      parameterGroup: parameterGroup,
      loggingProperties: loggingProperties,
      naming: this.props.naming,
      adminPasswordRotationDays: this.props.adminPasswordRotationDays,
      automatedSnapshotRetentionDays: this.props.automatedSnapshotRetentionDays
    } );

    //Roles to grant SAML federated users access to the warehouse
    //Establishes trust with SAML identity providers
    this.props.federations?.forEach( federation => {
      this.createFederation( cluster.clusterName, federation )
    } )

    if ( !loggingBucket ) {
      NagSuppressions.addResourceSuppressions(
        cluster,
        [
          { id: 'AwsSolutions-RS5', reason: 'Audit logging to S3 is disabled in config. Audit logging to system tables is enforced in Construct.' },
          { id: 'NIST.800.53.R5-RedshiftClusterConfiguration', reason: 'Audit logging to S3 is disabled in config. Cluster encryption using KMS is enforced in Construct.' }
        ],
        true
      );
    }

    return cluster
  }

  //This function creates Redshift Users -> Stores & Rotates creds in Secrets Manager -> stores SecretName in SSM
  private createClusterUsers ( cluster: Cluster, warehouseKmsKey: CaefKmsKey ) {

    this.props.databaseUsers?.forEach( databaseUser => {
      //Redshift is going to force usernames to lower case. 
      //Need to make sure username matches between cluster and secret contents.
      const username = databaseUser.userName.toLowerCase()
      if ( username != databaseUser.userName ) {
        console.log( `Modified configured username ${ databaseUser.userName } to ${ username } for Redshift compatability` )
      }
      const userProps: UserProps = {
        cluster: cluster,
        databaseName: databaseUser.dbName,
        username: username,
        adminUser: cluster.secret,
        encryptionKey: warehouseKmsKey
      }
      const user = new User( this.scope, "redshiftdbserviceuser-" + username, userProps )

      new StringParameter( user, "ssmsecret" + username, {
        parameterName: this.props.naming.ssmPath( `datawarehouse/secret/${ username }`, false ),
        stringValue: user.secret.secretName
      } )

      //Redshift DatabaseSecret construct does not currently set the masterarn on the secret string, 
      //which is required by the multi user rotation function
      const cfnUserSecret = user.secret.node.defaultChild as CfnSecret
      const secretStringTemplateString = ( cfnUserSecret.generateSecretString as CfnSecret.GenerateSecretStringProperty ).secretStringTemplate
      const secretStringTemplate = secretStringTemplateString ? JSON.parse( secretStringTemplateString ) : undefined
      const secretStringTemplateWithMasterArn = {
        ...secretStringTemplate,
        masterarn: cluster.secret?.secretArn
      }
      cfnUserSecret.addPropertyOverride( "GenerateSecretString.SecretStringTemplate", JSON.stringify( secretStringTemplateWithMasterArn ) )

      if ( databaseUser.secretRotationDays > 0 ) {
        const multiUserRotationOptions: RotationMultiUserOptions = {
          secret: user.secret,
          automaticallyAfter: Duration.days( databaseUser.secretRotationDays )
        }
        cluster.addRotationMultiUser( "multiuserrotation" + username, multiUserRotationOptions );
      }

      const secretAccessRoles = databaseUser.secretAccessRoles ? [
        ...this.props.roleHelper.resolveRoleRefsWithOrdinals( databaseUser.secretAccessRoles, "SecretAccessRole" ),
        ...this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataAdminRoleRefs, "DataAdmin" )
      ] : this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataAdminRoleRefs, "DataAdmin" )

      this.assignSecretAcessPolicies( secretAccessRoles, warehouseKmsKey, user.secret )

      this.scope.node.children.forEach( child => {
        if ( child.node.id.startsWith( "Query Redshift Database" ) || child.node.id.startsWith( "redshiftdbserviceuser-" ) ) {
          NagSuppressions.addResourceSuppressions(
            child,
            [
              { id: 'AwsSolutions-IAM4', reason: 'Role is for Custom Resource Provider.' },
              { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' },
              { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' },
              { id: 'AwsSolutions-IAM5', reason: 'Role is for Custom Resource Provider.' },
              { id: 'AwsSolutions-L1', reason: 'Role is for Custom Resource Provider.' },
              { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and error handling will be handled by CloudFormation' },
              { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and will interact only with Redshift/SecretsManager' },
              { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and will only execute during stack deployement. Reserved concurrency not appropriate.' },
              { id: 'HIPAA.Security-LambdaDLQ', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and error handling will be handled by CloudFormation' },
              { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and will interact only with Redshift/SecretsManager' },
              { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Lambda Function is created by aws-redshift-alpha cdk module and will only execute during stack deployement. Reserved concurrency not appropriate.' },
            ],
            true
          );
        }
      } )
    } )
  }

  //This function creates and assigns ploicies to specified roles for accessing redshift user secrets.     
  private assignSecretAcessPolicies ( secretAccessRoles: CaefResolvableRole[], warehouseKmsKey: CaefKmsKey, secret: ISecret ) {

    const arnPrincipals = secretAccessRoles.map( role => new ArnPrincipal( role.arn() ) )
    const secretAccessStatement = new PolicyStatement( {
      sid: "AllowSecretUsageForRoles",
      effect: Effect.ALLOW,
      principals: arnPrincipals,
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ "*" ]
    } )

    const kmsUsageStatement = new PolicyStatement( {
      sid: "AllowKMSUsageForSecretRoles",
      effect: Effect.ALLOW,
      principals: arnPrincipals,
      actions: DECRYPT_ACTIONS,
      resources: [ "*" ]
    } )

    secret.addToResourcePolicy( secretAccessStatement )
    warehouseKmsKey.addToResourcePolicy( kmsUsageStatement )
  }

  //This function creates an IAM Identity Provider and federation role
  private createFederation ( clusterName: string, federation: FederationProps ): Role {

    //Create a role which can be used for accessing redshift
    const role = new CaefRole( this.scope, `federation-role-${ federation.federationName }`, {
      assumedBy: new FederatedPrincipal( federation.providerArn, {}, "sts:AssumeRoleWithSAML" ),
      roleName: federation.federationName,
      naming: this.props.naming
    } )
    const redshiftPolicy = new ManagedPolicy( this.scope, `federation-pol-${ federation.federationName }`, {
      managedPolicyName: this.props.naming.resourceName( `federation-${ federation.federationName }` ),
      roles: [ role ]
    } )
    //Allow to describe this cluster
    const describeClusterStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      actions: [
        "redshift:DescribeClusters"
      ],
      resources: [
        `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:cluster:${ clusterName }`
      ]
    } )
    redshiftPolicy.addStatements( describeClusterStatement )

    //Allow to fetch credentials for this cluster
    const getClusterCredsStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      actions: [
        "redshift:GetClusterCredentials"
      ],
      resources: [
        `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:dbuser:${ clusterName }/` + "${redshift:DbUser}"
      ]
    } )
    getClusterCredsStatement.addCondition( "StringEquals", { "aws:userid": role.roleId + ":${redshift:DbUser}" } )
    getClusterCredsStatement.addResources( `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:dbname:${ clusterName }/*` )

    redshiftPolicy.addStatements( getClusterCredsStatement )

    //Allow to create user for this cluster
    const createUserStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      actions: [
        "redshift:CreateClusterUser"
      ],
      resources: [
        `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:dbuser:${ clusterName }/` + "${redshift:DbUser}"
      ]
    } )
    redshiftPolicy.addStatements( createUserStatement )

    //Allow to create user for this cluster
    const joinGroupStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      actions: [
        "redshift:JoinGroup"
      ]
    } )

    joinGroupStatement.addResources( `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:dbgroup:${ clusterName }/*` )
    redshiftPolicy.addStatements( joinGroupStatement )

    NagSuppressions.addResourceSuppressions(
      redshiftPolicy,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Wildcard is for group names dynamically generated via SAML federation.' }
      ],
      true
    );

    return role
  }

  private createWarehouseKMSKey ( allRoleIds: string[] ): CaefKmsKey {

    const kmsKey = new CaefKmsKey( this.scope, 'warehouse-key', {
      alias: "data-warehouse",
      naming: this.props.naming,
      keyAdminRoleIds: this.dataAdminRoleIds,
      keyUserRoleIds: allRoleIds
    } )

    return kmsKey
  }

  private createWarehouseBucket ( warehouseKmsKey: CaefKmsKey, allRoleIds: string[] ): Bucket {

    //This warehouse bucket will be used for data warehouse logging and other S3 offload scenarios
    let warehouseBucket = new CaefBucket( this.scope, "warehouse-bucket", {
      encryptionKey: warehouseKmsKey,
      bucketName: 'warehouse',
      naming: this.props.naming,
      additionalKmsKeyArns: this.props.additionalBucketKmsKeyArns
    } )
    NagSuppressions.addResourceSuppressions(
      warehouseBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF Warehouse bucket does not use bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF Warehouse bucket does not use bucket replication.' }
      ],
      true
    );
    //Enable the bucket key feature which optimizes the bucket for use with KMS
    const cfnBucket = warehouseBucket.node.defaultChild as CfnBucket;
    cfnBucket.addOverride( 'Properties.BucketEncryption.ServerSideEncryptionConfiguration.0.BucketKeyEnabled', true )

    //Data Admins and Warehouse Execution Role can read/write
    const rootPolicy = new RestrictObjectPrefixToRoles( {
      s3Bucket: warehouseBucket,
      s3Prefix: "/",
      readWriteRoleIds: this.bucketUserRoleIds,
      readWriteSuperRoleIds: this.dataAdminRoleIds
    } )
    rootPolicy.statements().forEach( statement => warehouseBucket.addToResourcePolicy( statement ) )

    //Default Deny Policy
    //Any role not specified in config is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles( {
      s3Bucket: warehouseBucket,
      roleExcludeIds: allRoleIds,
    } )

    warehouseBucket.addToResourcePolicy( bucketRestrictPolicy.denyStatement )
    warehouseBucket.addToResourcePolicy( bucketRestrictPolicy.allowStatement )

    return warehouseBucket
  }

  private createLoggingBucket (): IBucket {
    //Replicate behaviour of CaefBucket but allow for non-KMS encryption (required by Redshift)
    const uniqueBucketNamePrefixContext = this.node.tryGetContext( CaefBucket.UNIQUE_NAME_CONTEXT_KEY )

    const uniqueBucketNamePrefix = uniqueBucketNamePrefixContext ? Boolean( uniqueBucketNamePrefixContext ) : false

    const prefix = Fn.select( 0, Fn.split( "-", Fn.select( 2, Fn.split( "/", Stack.of( this ).stackId ) ) ) )

    const bucketName = uniqueBucketNamePrefix ?
      prefix + '-' + this.props.naming.resourceName( "logging", 63 )
      : this.props.naming.resourceName( "logging", 63 )

    const loggingBucket = new Bucket( this.scope, bucketName, {
      bucketName: bucketName,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true
    } )

    NagSuppressions.addResourceSuppressions(
      loggingBucket,
      [
        { id: 'AwsSolutions-S1', reason: 'Server access logs do not support KMS on targets.' },
        { id: 'NIST.800.53.R5-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets.' },
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF Warehouse bucket does not use bucket replication.' },
        { id: 'NIST.800.53.R5-S3DefaultEncryptionKMS', reason: 'Redshift audit logging does not support KMS-encrypted buckets' },
        { id: 'HIPAA.Security-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF Warehouse bucket does not use bucket replication.' },
        { id: 'HIPAA.Security-S3DefaultEncryptionKMS', reason: 'Redshift audit logging does not support KMS-encrypted buckets' }
      ],
      true
    );

    const AllowRedshiftLoggingPut = new PolicyStatement( {
      sid: "AllowRedshiftLoggingPut",
      effect: Effect.ALLOW,
      resources: [
        loggingBucket.bucketArn + "/*",
        loggingBucket.bucketArn
      ],
      actions: [
        "s3:PutObject",
        "s3:GetBucketAcl"
      ],
      principals: [
        new ServicePrincipal( `redshift.amazonaws.com` ),
        new ServicePrincipal( `redshift.${ this.region }.amazonaws.com` ),
      ],
      conditions: {
        "StringEquals": {
          "aws:SourceArn": `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:cluster:${ this.props.naming.resourceName() }`
        }
      }
    } )
    loggingBucket.addToResourcePolicy( AllowRedshiftLoggingPut )

    return loggingBucket
  }

  private createRedshiftScheduledActions ( cluster: Cluster ): CfnScheduledAction[] {
    // If any scheduled actions are defined in config
    if ( Array.isArray( this.props.scheduledActions ) && this.props.scheduledActions.length > 0 ) {

      // Create a managed policy to grant Pause and Resume access on the cluster in this stack
      const pauseResumePolicy = new ManagedPolicy( this.scope, 'redshiftPauseResumePolicy', {
        description: 'Allows to Pause and Resume Redshift clusters',
        statements: [
          new PolicyStatement( {
            effect: Effect.ALLOW,
            actions: [
              "redshift:PauseCLuster",
              "redshift:ResumeCluster"
            ],
            resources: [ `arn:${ this.partition }:redshift:${ this.region }:${ this.account }:cluster:${ cluster.clusterName }` ]
          } )
        ]
      } )

      // Create role for redshift scheduler to pause and resume cluster and attach the above managed policy to it.
      const redshiftSchedulerRole = new CaefRole( this.scope, `scheduler-role`, {
        naming: this.props.naming,
        assumedBy: new ServicePrincipal( "scheduler.redshift.amazonaws.com" ),
        roleName: "scheduler",
        managedPolicies: [ pauseResumePolicy ]
      } )

      const scheduledActions = this.props.scheduledActions.map( action => {
        // Pause action for cluster in this stack
        const pauseClusterAction: CfnScheduledAction.ScheduledActionTypeProperty = {
          pauseCluster: {
            clusterIdentifier: cluster.clusterName,
          }
        }
        // Resume action for cluster in this stack
        const resumeClusterAction: CfnScheduledAction.ScheduledActionTypeProperty = {
          resumeCluster: {
            clusterIdentifier: cluster.clusterName,
          }
        }

        let startTime = action.startTime ? Date.parse( action.startTime ) : undefined
        if ( startTime && startTime < Date.now() ) {
          console.log( `Configured scheduled action startTime (${ action.startTime }) is in the past. Setting to one hour from now.` )
          startTime = Date.now() + 3600000
        }

        const targetAction = action.targetAction == "pauseCluster" ? pauseClusterAction : resumeClusterAction
        // Create Redshift Scheduled Action
        return new CfnScheduledAction( this.scope, `scheduled-action-${ action.name }`, {
          scheduledActionName: this.props.naming.resourceName( action.name ),
          enable: action.enable,
          targetAction: targetAction,
          schedule: action.schedule,
          startTime: startTime ? new Date( startTime ).toISOString() : undefined,
          endTime: action.endTime,
          iamRole: redshiftSchedulerRole.roleArn
        } )
      } )
      return scheduledActions
    }
    return []
  }
}
