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
  readonly vpc: IVpc;
  readonly subnets: SubnetSelection;
  readonly region: string;
  readonly partition: string;
  readonly dbSecurityGroup: ISecurityGroup;
  readonly encryptionKey: IKey;
  readonly minCapacity?: rds.AuroraCapacityUnit;
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
