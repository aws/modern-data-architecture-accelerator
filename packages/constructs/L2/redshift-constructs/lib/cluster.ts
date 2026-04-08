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
import { ArnFormat, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SecurityGroup, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnCluster } from 'aws-cdk-lib/aws-redshift';
import { Construct } from 'constructs';
import { MdaaRedshiftClusterParameterGroup } from './parameter-group';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { MultiAzValidationError, sanitizeClusterName } from './utils';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';

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
  /** Enable multi-AZ deployment for high availability */
  readonly multiAz?: boolean;
  /** Target region for cross-region snapshot copies. When set, enables cross-region snapshot copy to this region. Must differ from the cluster's deployment region. */
  readonly backupRegion?: string;
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
    // Multi-AZ constraint validation (before construct creation)
    if (props.multiAz) {
      if (props.numberOfNodes !== undefined && props.numberOfNodes < 2) {
        throw new MultiAzValidationError(
          'Multi-AZ deployment requires at least 2 nodes per Availability Zone. ' +
            `Configured numberOfNodes: ${props.numberOfNodes}.`,
        );
      }
      const port = props.port;
      const validPort = (port >= 5431 && port <= 5455) || (port >= 8191 && port <= 8215);
      if (!validPort) {
        throw new MultiAzValidationError(
          'Multi-AZ deployment requires a port in range 5431-5455 or 8191-8215. ' + `Configured port: ${port}.`,
        );
      }
    }

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

    // Enable multi-AZ for high availability
    if (props.multiAz) {
      cfnCluster.addOverride('Properties.MultiAZ', true);
    }

    // Enable cross-region snapshot copy for disaster recovery
    if (props.backupRegion) {
      const deployRegion = Stack.of(scope).region;
      if (props.backupRegion === deployRegion) {
        throw new Error(
          `backupRegion (${props.backupRegion}) must differ from the deployment region (${deployRegion}).`,
        );
      }
      const clusterName = cfnCluster.ref;
      const handlerProps: Record<string, unknown> = {
        clusterIdentifier: clusterName,
        destinationRegion: props.backupRegion,
      };

      const crProps: MdaaCustomResourceProps = {
        resourceType: 'RedshiftSnapshotCopy',
        code: Code.fromAsset(`${__dirname}/../src/lambda/snapshot_copy`),
        runtime: Runtime.PYTHON_3_13,
        handler: 'snapshot_copy.lambda_handler',
        handlerRolePolicyStatements: [
          new PolicyStatement({
            actions: ['redshift:EnableSnapshotCopy', 'redshift:DisableSnapshotCopy'],
            resources: [
              Stack.of(scope).formatArn({
                service: 'redshift',
                resource: 'cluster',
                resourceName: cfnCluster.ref,
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              }),
            ],
          }),
          new PolicyStatement({
            actions: ['kms:CreateGrant', 'kms:DescribeKey'],
            resources: [props.encryptionKey.keyArn],
          }),
        ],
        handlerPolicySuppressions: [
          {
            id: 'AwsSolutions-IAM5',
            reason: 'Cluster ARN contains a CloudFormation Ref token that CDK Nag cannot resolve at synth time.',
          },
        ],
        handlerProps: handlerProps,
        naming: props.naming,
        handlerTimeout: Duration.seconds(60),
        pascalCaseProperties: true,
      };

      new MdaaCustomResource(this, 'enable-snapshot-copy', crProps);
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
