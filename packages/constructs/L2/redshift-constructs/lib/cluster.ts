/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import {
  Cluster,
  ClusterProps,
  ClusterSubnetGroup,
  ClusterType,
  LoggingProperties,
  NodeType,
} from '@aws-cdk/aws-redshift-alpha';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SecurityGroup, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { CfnCluster } from 'aws-cdk-lib/aws-redshift';
import { Construct } from 'constructs';
import { MdaaRedshiftClusterParameterGroup } from './parameter-group';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { sanitizeClusterName } from './utils';

/**
 * Properties for creating a compliant Redshift Cluster
 */
export interface MdaaRedshiftClusterProps extends MdaaConstructProps {
  /** The security group with which cluster interfaces will be configured. */
  readonly securityGroup: SecurityGroup;

  /** The number of days between automatic admin/master password rotation. */
  readonly adminPasswordRotationDays?: number;
  /**
   * An optional identifier for the cluster
   *
   * @default - A name is automatically generated.
   */
  readonly clusterName?: string;
  /**
   * Additional parameters to pass to the database engine
   * https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
   *
   * @default - No parameter group.
   */
  readonly parameterGroup: MdaaRedshiftClusterParameterGroup;
  /**
   * Number of compute nodes in the cluster. Only specify this property for multi-node clusters.
   *
   * Value must be at least 2 and no more than 100.
   *
   * @default - 2 if `clusterType` is ClusterType.MULTI_NODE, undefined otherwise
   */
  readonly numberOfNodes?: number;
  /**
   * The node type to be provisioned for the cluster.
   *
   * @default {@link NodeType.DC2_LARGE}
   */
  readonly nodeType?: NodeType;
  /**
   * Settings for the individual instances that are launched
   *
   * @default {@link ClusterType.MULTI_NODE}
   */
  readonly clusterType?: ClusterType;
  /**
   * What port to listen on
   *
   * @default - The default for the engine is used.
   */
  readonly port: number;
  /**
   * The KMS key to use for encryption of data at rest.
   *
   * @default - AWS-managed key, if encryption at rest is enabled
   */
  readonly encryptionKey: IMdaaKmsKey;
  /**
   * A preferred maintenance window day/time range. Should be specified as a range ddd:hh24:mi-ddd:hh24:mi (24H Clock UTC).
   *
   * Example: 'Sun:23:45-Mon:00:15'
   *
   * @default - 30-minute window selected at random from an 8-hour block of time for
   * each AWS Region, occurring on a random day of the week.
   * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.Maintenance.html#Concepts.DBMaintenance
   */
  readonly preferredMaintenanceWindow: string;
  /**
   * The VPC to place the cluster in.
   */
  readonly vpc: IVpc;
  /**
   * Where to place the instances within the VPC
   *
   * @default - private subnets
   */
  readonly vpcSubnets?: SubnetSelection;
  /**
   * Security groups.
   *
   */
  readonly securityGroups?: ISecurityGroup[];
  /**
   * A cluster subnet group to use with this cluster.
   *
   * @default - a new subnet group will be created.
   */
  readonly subnetGroup: ClusterSubnetGroup;
  /**
   * Username for the administrative user
   */
  readonly masterUsername: string;
  /**
   * A list of AWS Identity and Access Management (IAM) role that can be used by the cluster to access other AWS services.
   * Specify a maximum of 10 roles.
   *
   * @default - No role is attached to the cluster.
   */
  readonly roles?: IRole[];
  /**
   * Name of a database which is automatically created inside the cluster
   *
   * @default - default_db
   */
  readonly defaultDatabaseName?: string;
  /**
   * Bucket details for log files to be sent to, including prefix.
   *
   * @default - No logging bucket is used
   */
  readonly loggingProperties?: LoggingProperties;
  /**
   * The number of days that automated snapshots are retained
   *
   * Value must be between 0 and 35
   *
   * @default - 1
   */
  readonly automatedSnapshotRetentionDays?: number;
  /**
   * SnapshotIdentifier id, if restoring the cluster from snapshot
   * Optional - only provide this if restoring from snapshot
   */
  readonly snapshotIdentifier?: string;
  /**
   * ownerAccount Refers to snapshot owner account. Applicable if restoring the cluster from snapshot and snapshot belongs to another account
   * Optional - By default, snapshots are searched within current account
   */
  readonly ownerAccount?: number;

  readonly redshiftManageMasterPassword?: boolean;
}

/**
 * A construct for the creation of a compliant Redshift Cluster
 * Specifically, the construct ensures the following:
 * * The cluster is encrypted at rest using KMS CMK.
 * * SSL must be utilized to connect to the cluster.
 * * The cluster is VPC connected and not publicly accessible.
 */
export class MdaaRedshiftCluster extends Cluster {
  private static setProps(props: MdaaRedshiftClusterProps): ClusterProps {
    const overrideProps = {
      clusterName: sanitizeClusterName(props.naming.resourceName(props.clusterName, 63)),
      publiclyAccessible: false,
      encrypted: true,
      removalPolicy: RemovalPolicy.RETAIN,
      securityGroups: [props.securityGroup, ...(props.securityGroups || [])],
      loggingKeyPrefix: 'logging/',
      masterUser: {
        /** The master/admin username to be configured on the cluster */
        masterUsername: props.masterUsername,
        /** The KMS key with which the generated master/admin password will be encrypted in Secrets Manager */
        encryptionKey: props.encryptionKey,
      },
    };
    return { ...props, ...overrideProps };
  }

  public readonly secret?: ISecret;

  constructor(scope: Construct, id: string, props: MdaaRedshiftClusterProps) {
    super(scope, id, MdaaRedshiftCluster.setProps(props));
    MdaaNagSuppressions.addCodeResourceSuppressions(this, [
      {
        id: 'CdkNagValidationFailure',
        reason: 'Some cluster properties will reference intrinsic functions.',
      },
    ]);

    const cfnCluster = this.node.defaultChild as CfnCluster;
    cfnCluster.addOverride('Properties.EnhancedVpcRouting', true);
    if (props.automatedSnapshotRetentionDays && props.automatedSnapshotRetentionDays >= 0) {
      cfnCluster.addOverride('Properties.AutomatedSnapshotRetentionPeriod', props.automatedSnapshotRetentionDays);
    }
    // If restoring from snapshot admin password should be managed by Redshift
    if (props.snapshotIdentifier) {
      cfnCluster.addOverride('Properties.SnapshotIdentifier', props.snapshotIdentifier);
      cfnCluster.addDeletionOverride('Properties.MasterUserPassword');
      cfnCluster.addPropertyOverride('ManageMasterPassword', true);
    }
    if (props.ownerAccount) {
      cfnCluster.addOverride('Properties.OwnerAccount', props.ownerAccount);
    }

    if (props.redshiftManageMasterPassword) {
      // Find and delete the existing admin secret created by the L2 construct
      this.node.tryRemoveChild('Secret');
      cfnCluster.addPropertyOverride('ManageMasterPassword', true);
      cfnCluster.addPropertyDeletionOverride('MasterUserPassword');
      cfnCluster.addPropertyOverride('MasterPasswordSecretKmsKeyId', props.encryptionKey.keyArn);
      this.secret = Secret.fromSecretCompleteArn(
        this,
        'redshift-manage-secret-import',
        cfnCluster.attrMasterPasswordSecretArn,
      );
      cfnCluster.addPropertyOverride('MasterUsername', props.masterUsername);
    } else {
      if (props.adminPasswordRotationDays && props.adminPasswordRotationDays > 0) {
        this.addRotationSingleUser(Duration.days(props.adminPasswordRotationDays));
      }
    }

    if (this.secret) {
      new MdaaParamAndOutput(
        this,
        {
          ...{
            resourceType: 'cluster-secret',
            resourceId: props.clusterName,
            name: 'name',
            value: this.secret.secretName,
          },
          ...props,
        },
        scope,
      );
    }
    MdaaNagSuppressions.addCodeResourceSuppressions(this, [
      {
        id: 'NIST.800.53.R5-RedshiftEnhancedVPCRoutingEnabled',
        reason: 'Remediated through property override.',
      },
      {
        id: 'HIPAA.Security-RedshiftEnhancedVPCRoutingEnabled',
        reason: 'Remediated through property override.',
      },
      {
        id: 'PCI.DSS.321-RedshiftEnhancedVPCRoutingEnabled',
        reason: 'Remediated through property override.',
      },
      {
        id: 'CdkNagValidationFailure',
        reason: 'Some cluster properties will reference intrinsic functions.',
      },
    ]);

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterName,
          name: 'endpoint',
          value: this.clusterEndpoint.socketAddress,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterName,
          name: 'security-group-id',
          value: props.securityGroup.securityGroupId,
        },
        ...props,
      },
      scope,
    );
  }
}
