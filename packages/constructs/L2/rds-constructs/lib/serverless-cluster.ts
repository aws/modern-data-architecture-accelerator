/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { NagPackSuppression } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  AuroraMysqlEngineVersion,
  AuroraPostgresEngineVersion,
  CfnDBCluster,
  ClusterInstance,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseClusterProps,
  IParameterGroup,
  ServerlessScalingOptions,
} from 'aws-cdk-lib/aws-rds';
import { SecretRotationApplication } from 'aws-cdk-lib/aws-secretsmanager';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { getSanitizeClusterIdentifier } from './utils';

export interface MdaaRdsServerlessClusterProps extends MdaaConstructProps {
  readonly engine: 'aurora-mysql' | 'aurora-postgresql';
  /** Engine version specification controlling Aurora database version and feature availability */
  readonly engineVersion: AuroraPostgresEngineVersion | AuroraMysqlEngineVersion;
  readonly monitoringRole: IRole;
  readonly backupRetention?: number;
  readonly monitoringIntervalsInSeconds?: number;
  readonly clusterIdentifier?: string;
  readonly copyTagsToSnapshot?: boolean;
  readonly masterUsername: string;
  readonly defaultDatabaseName?: string;
  readonly enableDataApi?: boolean;
  readonly parameterGroup?: IParameterGroup;
  readonly scaling?: ServerlessScalingOptions;
  /**
   * Number of reader instances for the Aurora cluster.
   * @default 1
   */
  readonly numberOfReaderInstances?: number;
  /** Array of security groups for Aurora cluster network access control defining inbound and */
  readonly securityGroups?: ISecurityGroup[];
  readonly encryptionKey: IMdaaKmsKey;
  /** VPC for Aurora cluster deployment providing network isolation and security controls for */
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;

  /**
   * The removal policy to apply when the cluster and its instances are removed from the stack or replaced during an update.
   * @default: RemovalPolicy.SNAPSHOT (remove the cluster and instances, but retain a snapshot of the data)
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * The number of days between automatic admin/master password rotation.
   * @default: 30 days
   * */
  readonly adminPasswordRotationDays?: number;

  /**
   * The database port.
   * Port obfuscation (using a non default endpoint port) adds an additional layer of defense against non-targeted attacks
   * Avoid using the following port: MySQL/Aurora 3306, SQL Server port 1433, PostgreSQL port 5432
   */
  readonly port: number;
  /**
   * Flag to indicate DB Engine specific log types for exporting to CloudWatch Logs.
   * @default: true
   * Valid values for Aurora MySQL: audit, error, general, slowquery
   * Valid values for Aurora PostgreSQL: postgresql
   * @see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbcluster.html#cfn-rds-dbcluster-enablecloudwatchlogsexports
   */
  readonly enableCloudwatchLogsExports?: boolean;
  /**
   * Indicates whether to enable mapping of AWS Identity and Access Management (IAM) accounts to database accounts
   * @default: true for Aurora MySQL and Aurora PostgreSQL
   */
  readonly enableIamDatabaseAuthentication?: boolean;

  /**
   * The target backtrack window, in seconds
   * NOTE: Currently, Backtrack is only supported for Aurora MySQL DB clusters
   * @default: 86400 (i.e. 24 hours)
   * @minimum 0 (to disable)
   * @maximum 259200 (i.e. 72 hours)
   * @see: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbcluster.html#cfn-rds-dbcluster-backtrackwindow
   */
  readonly backtrackWindowInSeconds?: number;
}

/**
 * A construct for the creation of a compliant Rds Serverless Cluster
 * Specifically, the construct ensures the following:
 * * The cluster is encrypted at rest using KMS CMK.
 * * SSL must be utilized to connect to the cluster.
 * * The cluster is VPC connected and not publicly accessible.
 */
export class MdaaRdsServerlessCluster extends DatabaseCluster {
  private static setProps(props: MdaaRdsServerlessClusterProps): DatabaseClusterProps {
    const overrideProps = {
      engine:
        props.engine == 'aurora-mysql'
          ? DatabaseClusterEngine.auroraMysql({ version: <AuroraMysqlEngineVersion>props.engineVersion })
          : DatabaseClusterEngine.auroraPostgres({ version: <AuroraPostgresEngineVersion>props.engineVersion }),
      clusterIdentifier: getSanitizeClusterIdentifier(props),
      storageEncryptionKey: props.encryptionKey,
      removalPolicy: RemovalPolicy.RETAIN,
      writer: ClusterInstance.serverlessV2(`${props.clusterIdentifier}-cluster-writer`),
      readers:
        props.numberOfReaderInstances !== undefined && props.numberOfReaderInstances > 0
          ? Array.from({ length: props.numberOfReaderInstances }, (_, i) =>
              ClusterInstance.serverlessV2(`${props.clusterIdentifier}-cluster-reader-${i}`),
            )
          : [ClusterInstance.serverlessV2(`${props.clusterIdentifier}-cluster-readers`)],
      backup: {
        retention: Duration.days(props.backupRetention || 1),
      },
      iamAuthentication: props.enableIamDatabaseAuthentication ?? true,
      singleUserRotationApplication: {
        application: SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,
        vpc: props.vpc,
        vpcSubnets: props.vpcSubnets,
        securityGroup: props.securityGroups,
      },
      subnets: props.vpcSubnets,
      vpc: props.vpc,
      storageEncrypted: true,
      monitoringInterval: Duration.seconds(props.monitoringIntervalsInSeconds || 60),
      credentials: {
        /** The master/admin username to be configured on the cluster */
        username: props.masterUsername,
        /** The KMS key with which the generated master/admin password will be encrypted in Secrets Manager */
        encryptionKey: props.encryptionKey,
      },
      serverlessV2MaxCapacity: props.scaling?.maxCapacity || 2,
      serverlessV2MinCapacity: props.scaling?.minCapacity || 0.5,
    };
    return { ...props, ...overrideProps };
  }
  private readonly props: MdaaRdsServerlessClusterProps;
  constructor(scope: Construct, id: string, props: MdaaRdsServerlessClusterProps) {
    super(scope, id, MdaaRdsServerlessCluster.setProps(props));
    this.props = props;
    // Default rotation to 30 days.
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.RotationSingleUserOptions.html#automaticallyafter
    const rotationScheduleInDays =
      props.adminPasswordRotationDays != undefined && props.adminPasswordRotationDays > 0
        ? props.adminPasswordRotationDays
        : 30;
    this.addRotationSingleUser({
      automaticallyAfter: Duration.days(rotationScheduleInDays),
    });

    // Apply property overrides
    const cfnDbCluster = this.node.defaultChild as CfnDBCluster;
    const suppressions: NagPackSuppression[] = [];
    // Override Aurora MySql & Auroar Postgres Attributes
    if (this.props.engine == 'aurora-mysql' || this.props.engine == 'aurora-postgresql') {
      this.addOverrides(cfnDbCluster, suppressions);
    }
    if (this.secret) {
      new MdaaParamAndOutput(
        this,
        {
          resourceType: 'cluster-secret',
          resourceId: props.clusterIdentifier,
          name: 'name',
          value: this.secret.secretName,
          ...props,
        },
        scope,
      );
    }
    MdaaNagSuppressions.addCodeResourceSuppressions(this, suppressions);
    // Children specific nag suppressions to avoid bloating template:
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
        {
          id: 'NIST.800.53.R5-RDSEnhancedMonitoringEnabled',
          reason: 'Monitoring role required and monitoring intervals set with a minimum default.',
        },
        {
          id: 'HIPAA.Security-RDSEnhancedMonitoringEnabled',
          reason: 'Monitoring role required and monitoring intervals set with a minimum default.',
        },
        {
          id: 'PCI.DSS.321-RDSEnhancedMonitoringEnabled',
          reason: 'Monitoring role required and monitoring intervals set with a minimum default.',
        },
        {
          id: 'HIPAA.Security-RDSInstancePublicAccess',
          reason: 'Deployed within private subnets and vpc along with iam auth enforced and security group.',
        },
        {
          id: 'PCI.DSS.321-RDSInstancePublicAccess',
          reason: 'Deployed within private subnets and vpc along with iam auth enforced and security group.',
        },
        {
          id: 'NIST.800.53.R5-RDSInstancePublicAccess',
          reason: 'Deployed within private subnets and vpc along with iam auth enforced and security group.',
        },
        {
          id: 'NIST.800.53.R5-RDSInBackupPlan',
          reason: 'Instance is serverless and has a backup retention policy defaulting to 1.',
        },
        {
          id: 'HIPAA.Security-RDSInBackupPlan',
          reason: 'Instance is serverless and has a backup retention policy defaulting to 1.',
        },
        {
          id: 'PCI.DSS.321-RDSInBackupPlan',
          reason: 'Instance is serverless and has a backup retention policy defaulting to 1.',
        },
      ],
      true,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'cluster',
        resourceId: props.clusterIdentifier,
        name: 'endpoint',
        value: this.clusterEndpoint.socketAddress,
        ...props,
      },
      scope,
    );
  }

  private addOverrides(cfnDbCluster: CfnDBCluster, suppressions: NagPackSuppression[]) {
    const _enableCloudwatchLogsExports: boolean = this.props.enableCloudwatchLogsExports ?? true;

    // EnableCloudwatchLogsExports Override
    if (_enableCloudwatchLogsExports) {
      const dbEngineCwLogsExports: string[] =
        this.props.engine == 'aurora-mysql' ? ['audit', 'error', 'general', 'slowquery'] : ['postgresql'];

      cfnDbCluster.addPropertyOverride('EnableCloudwatchLogsExports', dbEngineCwLogsExports);

      // Add NAG suppressions for each log type
      const ruleIds: string[] = [
        'AwsSolutions-RDS16',
        'NIST.800.53.R5-RDSLoggingEnabled',
        'HIPAA.Security-RDSLoggingEnabled',
        'PCI.DSS.321-RDSLoggingEnabled',
      ];
      for (const ruleId of ruleIds) {
        dbEngineCwLogsExports.forEach(logType => {
          suppressions.push({
            id: ruleId,
            reason: `Remediated through property override. Log export for ${logType} is enabled.`,
            appliesTo: [`LogExport::${logType}`],
          });
        });
      }
    }
    const _enableIamDatabaseAuthentication: boolean = this.props.enableIamDatabaseAuthentication ?? true;

    // EnableIAMDatabaseAuthentication Override
    if (_enableIamDatabaseAuthentication) {
      cfnDbCluster.addPropertyOverride('EnableIAMDatabaseAuthentication', _enableIamDatabaseAuthentication);
      suppressions.push({ id: 'AwsSolutions-RDS6', reason: 'Remediated through property override.' });
    }
    // Override Aurora MySql
    if (this.props.engine == 'aurora-mysql') {
      const _backtrackWindowInSeconds: number = this.props.backtrackWindowInSeconds ?? 86400;
      // BacktrackWindow Override
      if (_backtrackWindowInSeconds) {
        cfnDbCluster.addPropertyOverride('BacktrackWindow', _backtrackWindowInSeconds);
        suppressions.push({
          id: 'AwsSolutions-RDS14',
          reason:
            'Remediated through property override. Currently, Backtrack is only supported for Aurora MySQL DB clusters',
        });
      }
    }
    // Port Override
    cfnDbCluster.addPropertyOverride('Port', this.props.port);
    suppressions.push({ id: 'AwsSolutions-RDS11', reason: 'Remediated through property override.' });
  }
}
