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
import { Annotations } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MdaaRdsServerlessCluster, MdaaRdsServerlessClusterProps } from './serverless-cluster';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';

export interface MdaaAuroraPgVectorProps extends MdaaConstructProps {
  /** VPC for Aurora cluster deployment providing network isolation and security controls for */
  readonly vpc: IVpc;
  /** Subnet selection for Aurora cluster placement controlling availability zone distribution */
  readonly subnets: SubnetSelection;
  /** AWS region specification for Aurora cluster deployment controlling geographic placement and */
  readonly region: string;
  readonly partition: string;
  readonly dbSecurityGroup: ISecurityGroup;
  readonly encryptionKey: IKey;
  /**
   * Aurora PostgreSQL engine version string.
   * The default value is provided for backward-compatibility but will not be maintained long-term. Explicitly setting this is recommended.
   * @default '16.6'
   */
  readonly engineVersion?: string;
  /** Minimum Aurora capacity units for serverless scaling controlling minimum compute resources and cost management */
  readonly minCapacity?: rds.AuroraCapacityUnit;
  /** Maximum Aurora capacity units for serverless scaling controlling maximum compute resources and cost limits */
  readonly maxCapacity?: rds.AuroraCapacityUnit;
  /**
   * Number of reader instances for the Aurora cluster.
   * @default 1
   */
  readonly numberOfReaderInstances?: number;
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

    if (props.engineVersion && !/^\d+\.\d+(\.\d+)?(-limitless)?$/.test(props.engineVersion)) {
      throw new Error(
        `Invalid engineVersion format: '${props.engineVersion}'. Expected format: 'major.minor' (e.g., '16.6')`,
      );
    }

    if (props.engineVersion) {
      const knownVersions = Object.keys(rds.AuroraPostgresEngineVersion)
        .filter(k => k.startsWith('VER_'))
        .map(
          k =>
            (rds.AuroraPostgresEngineVersion as unknown as Record<string, rds.AuroraPostgresEngineVersion>)[k]
              .auroraPostgresFullVersion,
        );
      if (!knownVersions.includes(props.engineVersion)) {
        Annotations.of(scope).addWarning(
          `Aurora PostgreSQL engine version '${props.engineVersion}' is not recognized by CDK. ` +
            `Deployment will proceed, but verify this is a valid Aurora PostgreSQL version.`,
        );
      }
    }

    const engineVersion = props.engineVersion
      ? rds.AuroraPostgresEngineVersion.of(props.engineVersion, props.engineVersion.split('.')[0])
      : rds.AuroraPostgresEngineVersion.VER_16_6;

    return {
      enableDataApi: props.enableDataApi,
      defaultDatabaseName: props.defaultDatabaseName,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      engine: 'aurora-postgresql',
      engineVersion: engineVersion,
      backupRetention: 20,
      clusterIdentifier: props.clusterIdentifier,
      masterUsername: 'postgres',
      encryptionKey: props.encryptionKey,
      monitoringRole,
      numberOfReaderInstances: props.numberOfReaderInstances,
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
