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

export interface MdaaRedshiftClusterProps extends MdaaConstructProps {
  /** VPC security group for controlling network access to the Redshift cluster */
  readonly securityGroup: SecurityGroup;

  /** Number of days between automatic master password rotation for enhanced security */
  readonly adminPasswordRotationDays?: number;
  readonly clusterName?: string;
  readonly parameterGroup: MdaaRedshiftClusterParameterGroup;
  /** Number of compute nodes for multi-node cluster configurations providing scalable processing power */
  readonly numberOfNodes?: number;
  /** Node type specification determining compute and storage capacity for cluster nodes */
  readonly nodeType?: NodeType;
  readonly clusterType?: ClusterType;
  /** Port number for database connections controlling client access to the Redshift cluster */
  readonly port: number;
  readonly encryptionKey: IMdaaKmsKey;
  /** Maintenance window specification in ddd:hh24:mi-ddd:hh24:mi format controlling when cluster maintenance occurs */
  readonly preferredMaintenanceWindow: string;
  /** VPC for placing the Redshift cluster providing network isolation and security controls */
  readonly vpc: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  /** Array of additional security groups for network access control */
  readonly securityGroups?: ISecurityGroup[];
  readonly subnetGroup: ClusterSubnetGroup;
  readonly masterUsername: string;
  /** Array of IAM roles for cluster service integration enabling secure access to other AWS services */
  readonly roles?: IRole[];
  readonly defaultDatabaseName?: string;
  readonly loggingProperties?: LoggingProperties;
  readonly automatedSnapshotRetentionDays?: number;
  /** Snapshot identifier for cluster restoration from existing snapshot enabling disaster recovery */
  readonly snapshotIdentifier?: string;
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
