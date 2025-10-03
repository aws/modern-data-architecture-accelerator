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
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC security group for controlling network access to the Redshift cluster. Provides network-level security controls and enables secure connectivity from authorized sources within the VPC environment.
   *
   * Use cases: Network access control; VPC security isolation; Authorized client connectivity
   *
   * AWS: Amazon Redshift cluster VPC security group for network access control
   *
   * Validation: Must be valid SecurityGroup instance; required for VPC network security
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.SecurityGroup.html
   **/
  readonly securityGroup: SecurityGroup;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of days between automatic master password rotation for enhanced security. Enables automated credential management and compliance with password rotation policies for improved cluster security posture.
   *
   * Use cases: Automated credential rotation; Security policy compliance; Password management automation
   *
   * AWS: Amazon Redshift automatic password rotation configuration for security management
   *
   * Validation: Must be positive integer if provided; enables automatic password rotation when specified
   **/
  readonly adminPasswordRotationDays?: number;
  readonly clusterName?: string;
  readonly parameterGroup: MdaaRedshiftClusterParameterGroup;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of compute nodes for multi-node cluster configurations providing scalable processing power. Must be between 2 and 100 nodes for multi-node clusters, enabling horizontal scaling for large data warehouse workloads.
   *
   * Use cases: Horizontal scaling; Large data warehouse workloads; Performance optimization for concurrent queries
   *
   * AWS: Amazon Redshift cluster node count for compute capacity and parallel processing
   *
   * Validation: Must be integer between 2 and 100 if provided; only valid for multi-node cluster types
   **/
  readonly numberOfNodes?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional node type specification determining compute and storage capacity for cluster nodes. Controls the underlying EC2 instance type and affects performance, storage, and cost characteristics of the data warehouse.
   *
   * Use cases: Performance optimization; Cost management; Workload-specific sizing
   *
   * AWS: Amazon Redshift node type for compute and storage capacity configuration
   *
   * Validation: Must be valid NodeType enum value if provided; defaults to DC2_LARGE
   **/
  readonly nodeType?: NodeType;
  readonly clusterType?: ClusterType;
  /**
   * Q-ENHANCED-PROPERTY
   * Required port number for database connections controlling client access to the Redshift cluster. Must be accessible through security group rules and enables client applications to connect to the data warehouse.
   *
   * Use cases: Database connectivity; Security group configuration; Client application integration
   *
   * AWS: Amazon Redshift cluster port for database connection configuration
   *
   * Validation: Must be valid port number; required; typically 5439 for Redshift; must be allowed in security groups
   **/
  readonly port: number;
  readonly encryptionKey: IMdaaKmsKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Required maintenance window specification in ddd:hh24:mi-ddd:hh24:mi format controlling when cluster maintenance occurs. Enables predictable maintenance scheduling and minimizes impact on business operations through controlled timing.
   *
   * Use cases: Maintenance scheduling; Business continuity; Operational planning
   *
   * AWS: Amazon Redshift cluster maintenance window for automated maintenance timing
   *
   * Validation: Must be valid maintenance window format (ddd:hh24:mi-ddd:hh24:mi); required; uses 24-hour UTC format
   **/
  readonly preferredMaintenanceWindow: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for placing the Redshift cluster providing network isolation and security controls. Enables secure deployment within private network infrastructure with controlled access and enhanced security posture.
   *
   * Use cases: Network isolation; VPC security controls; Private network deployment
   *
   * AWS: Amazon Redshift cluster VPC placement for network security and isolation
   *
   * Validation: Must be valid IVpc instance; required for secure network deployment
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional security groups for network access control. Provides layered security through multiple security group rules and enables complex network access patterns for different client types.
   *
   * Use cases: Layered security controls; Multiple client access patterns; Complex network requirements
   *
   * AWS: Amazon Redshift cluster security group associations for network access control
   *
   * Validation: Must be array of valid ISecurityGroup instances if provided; combined with primary security group
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
  readonly securityGroups?: ISecurityGroup[];
  readonly subnetGroup: ClusterSubnetGroup;
  readonly masterUsername: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM roles for cluster service integration enabling secure access to other AWS services. Provides the cluster with permissions to access S3, Lambda, and other AWS services for data loading, unloading, and integration operations.
   *
   * Use cases: S3 data loading; Cross-service integration; Secure service access; Data pipeline operations
   *
   * AWS: Amazon Redshift cluster IAM roles for AWS service integration and data operations
   *
   * Validation: Must be array of valid IRole instances if provided; maximum 10 roles; enables service integration
   * @default - No role is attached to the cluster.
   */
  readonly roles?: IRole[];
  readonly defaultDatabaseName?: string;
  readonly loggingProperties?: LoggingProperties;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional retention period for automated snapshots enabling backup management and data protection. Specifies the number of days automated snapshots are retained for point-in-time recovery and data protection requirements.
   *
   * Use cases: Backup management; Data protection; Point-in-time recovery; Compliance requirements
   *
   * AWS: Amazon Redshift automated snapshot retention for backup management and data protection
   *
   * Validation: Must be integer between 0 and 35 if provided; defaults to 1; defines snapshot retention period
   * @default - 1
   */
  readonly automatedSnapshotRetentionDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional snapshot identifier for cluster restoration from existing snapshot enabling disaster recovery and data migration. Specifies the snapshot ID to restore the cluster from, supporting disaster recovery scenarios and data migration operations.
   *
   * Use cases: Disaster recovery; Data migration; Cluster restoration; Backup recovery
   *
   * AWS: Amazon Redshift snapshot identifier for cluster restoration and disaster recovery
   *
   * Validation: Must be valid snapshot identifier if specified; only provide when restoring from snapshot
   */
  readonly snapshotIdentifier?: string;
  readonly ownerAccount?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling Redshift-managed master password for enhanced security and automated credential management. When enabled, Redshift manages the master password automatically with rotation and secure storage in Secrets Manager.
   *
   * Use cases: Automated credential management; Enhanced security; Managed password rotation; Simplified administration
   *
   * AWS: Amazon Redshift managed master password for automated credential management and security
   *
   * Validation: Boolean value; enables Redshift-managed password when true; provides automated credential management
   */
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
