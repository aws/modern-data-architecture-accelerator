/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { MdaaRdsServerlessCluster, MdaaRdsServerlessClusterProps } from './serverless-cluster';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';

export interface MdaaAuroraPgVectorProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for Aurora cluster deployment providing network isolation and security controls for vector database operations. Defines the network environment where the Aurora PostgreSQL cluster will be deployed for secure database networking and connectivity.
   *
   * Use cases: Network isolation; VPC integration; Secure networking; Database connectivity
   *
   * AWS: Amazon VPC for Aurora PostgreSQL cluster network isolation and secure database deployment
   *
   * Validation: Must be valid IVpc interface; required for Aurora cluster network deployment and security
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  /**
   * Q-ENHANCED-PROPERTY
   * Required subnet selection for Aurora cluster placement controlling availability zone distribution and network segmentation. Defines the specific subnets within the VPC where Aurora instances will be deployed for high availability and network organization.
   *
   * Use cases: Subnet placement; Availability zone distribution; Network segmentation; High availability
   *
   * AWS: VPC subnet selection for Aurora PostgreSQL cluster placement and availability zone distribution
   *
   * Validation: Must be valid SubnetSelection; required for Aurora cluster subnet placement and availability
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.SubnetSelection.html
   **/
  readonly subnets: SubnetSelection;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS region specification for Aurora cluster deployment controlling geographic placement and service availability. Defines the AWS region where the Aurora PostgreSQL cluster will be deployed for regional compliance and latency optimization.
   *
   * Use cases: Regional deployment; Geographic placement; Compliance requirements; Latency optimization
   *
   * AWS: AWS region for Aurora PostgreSQL cluster deployment and geographic placement
   *
   * Validation: Must be valid AWS region string; required for Aurora cluster regional deployment
   **/
  readonly region: string;
  readonly partition: string;
  readonly dbSecurityGroup: ISecurityGroup;
  readonly encryptionKey: IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum Aurora capacity units for serverless scaling controlling minimum compute resources and cost management. Defines the minimum compute capacity for Aurora Serverless scaling ensuring adequate performance while managing costs.
   *
   * Use cases: Minimum capacity; Cost management; Performance baseline; Serverless scaling
   *
   * AWS: Aurora Serverless minimum capacity units for compute scaling and cost management
   *
   * Validation: Must be valid AuroraCapacityUnit if provided; controls minimum compute capacity for scaling
   *   **/
  readonly minCapacity?: rds.AuroraCapacityUnit;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum Aurora capacity units for serverless scaling controlling maximum compute resources and cost limits. Defines the maximum compute capacity for Aurora Serverless scaling ensuring performance limits and cost control.
   *
   * Use cases: Maximum capacity; Cost control; Performance limits; Serverless scaling
   *
   * AWS: Aurora Serverless maximum capacity units for compute scaling and cost control
   *
   * Validation: Must be valid AuroraCapacityUnit if provided; controls maximum compute capacity for scaling
   *   **/
  readonly maxCapacity?: rds.AuroraCapacityUnit;
  readonly defaultDatabaseName?: string;
  readonly parentClusterScope?: boolean;
  readonly enableDataApi?: boolean;
  readonly clusterIdentifier?: string;
}

export class MdaaAuroraPgVector extends MdaaRdsServerlessCluster {
  private static setAuroraPgVectorProps(
    scope: Construct,
    id: string,
    props: MdaaAuroraPgVectorProps,
  ): MdaaRdsServerlessClusterProps {
    const monitoringRole = new MdaaRole(scope, `aurora-postgres-enhanced-monitoring-role-${id}`, {
      naming: props.naming,
      roleName: `monitoring-role-${props.clusterIdentifier}`,
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole')],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      monitoringRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policy used by RDS for monitoring and is least privileged.',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'],
        },
      ],
      true,
    );

    return {
      enableDataApi: props.enableDataApi,
      defaultDatabaseName: props.defaultDatabaseName,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      engine: 'aurora-postgresql',
      engineVersion: rds.AuroraPostgresEngineVersion.VER_16_6,
      backupRetention: 20,
      clusterIdentifier: props.clusterIdentifier,
      masterUsername: 'postgres',
      encryptionKey: props.encryptionKey,
      monitoringRole,
      vpc: props.vpc,
      vpcSubnets: props.subnets,
      port: 15530,
      adminPasswordRotationDays: 60,
      securityGroups: [props.dbSecurityGroup],
      scaling: {
        minCapacity: props.minCapacity || rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: props.maxCapacity || rds.AuroraCapacityUnit.ACU_2,
      },
    };
  }

  readonly rdsClusterSecret: ISecret;

  constructor(scope: Construct, id: string, props: MdaaAuroraPgVectorProps) {
    super(scope, id, MdaaAuroraPgVector.setAuroraPgVectorProps(scope, id, props));

    if (!this.secret) {
      throw new Error('Database secret unexpectedly undefined');
    }

    this.rdsClusterSecret = this.secret;
  }
}
