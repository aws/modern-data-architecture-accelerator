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

/**
 * Properties for creating a compliant RDS Serverless Cluster
 */
export interface MdaaRdsServerlessClusterProps extends MdaaConstructProps {
  /**
   * Kind of database to deploy
   * Valid values: "aurora-mysql" | "aurora-postgresql"
   */
  readonly engine: 'aurora-mysql' | 'aurora-postgresql';
  /**
   *
   */
  readonly engineVersion: AuroraPostgresEngineVersion | AuroraMysqlEngineVersion;
  /**
   * Monitoring Role.
   *
   */
  readonly monitoringRole: IRole;
  /**
   * The number of days during which automatic DB snapshots are retained.
   * Automatic backup retention cannot be disabled on serverless clusters.
   * @default: 1
   * Must be a value from 1 day to 35 days.
   */

  readonly backupRetention?: number;

  /**
   * Intervals in second between points of collecting metrics
   * @see: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseCluster.html#monitoringinterval
   */
  readonly monitoringIntervalsInSeconds?: number;

  /**
   * An optional identifier for the cluster.
   * @default: - A name is automatically generated.
   */
  readonly clusterIdentifier?: string;

  /**
   * Whether to copy tags to the snapshot when a snapshot is created.
   * @default: true
   */
  readonly copyTagsToSnapshot?: boolean;
  /**
   * A username for the administrative user.
   * @default: false
   */
  readonly masterUsername: string;

  /**
   * Name of a database which is automatically created inside the cluster
   * @default: Database is not created in cluster
   */
  readonly defaultDatabaseName?: string;

  /**
   * Whether to enable the Data API.
   * @see: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html
   * @default: false
   */
  readonly enableDataApi?: boolean;

  /**
   * Additional parameters to pass to the database engine.
   * @default: no parameter group
   *
   */
  readonly parameterGroup?: IParameterGroup;

  /**
   * Scaling configuration of an Aurora Serverless database cluster
   * @default: Serverless cluster is automatically paused after 5 minutes of being idle.
   * minimum capacity: 2 ACU
   * maximum capacity: 16 ACU
   *
   */
  readonly scaling?: ServerlessScalingOptions;

  /**
   * Security groups.
   *
   */
  readonly securityGroups?: ISecurityGroup[];

  /**
   * The KMS key for storage encryption.
   */
  readonly encryptionKey: IMdaaKmsKey;

  /**
   * The VPC that this Aurora Serverless cluster should be created.
   */
  readonly vpc: IVpc;

  /**
   * Where to place the instances within the VPC. If provided, the vpc property must also be specified.
   * @default: the VPC default strategy if not specified
   */
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
      readers: [ClusterInstance.serverlessV2(`${props.clusterIdentifier}-cluster-readers`)],
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
  private props: MdaaRdsServerlessClusterProps;
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
          ...{
            resourceType: 'cluster-secret',
            resourceId: props.clusterIdentifier,
            name: 'name',
            value: this.secret.secretName,
          },
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
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterIdentifier,
          name: 'endpoint',
          value: this.clusterEndpoint.socketAddress,
        },
        ...props,
      },
      scope,
    );
  }

  private addOverrides(cfnDbCluster: CfnDBCluster, suppressions: NagPackSuppression[]) {
    const _enableCloudwatchLogsExports: boolean =
      this.props.enableCloudwatchLogsExports != undefined ? this.props.enableCloudwatchLogsExports : true;

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
    const _enableIamDatabaseAuthentication: boolean =
      this.props.enableIamDatabaseAuthentication != undefined ? this.props.enableIamDatabaseAuthentication : true;

    // EnableIAMDatabaseAuthentication Override
    if (_enableIamDatabaseAuthentication) {
      cfnDbCluster.addPropertyOverride('EnableIAMDatabaseAuthentication', _enableIamDatabaseAuthentication);
      suppressions.push({ id: 'AwsSolutions-RDS6', reason: 'Remediated through property override.' });
    }
    // Override Aurora MySql
    if (this.props.engine == 'aurora-mysql') {
      const _backtrackWindowInSeconds: number =
        this.props.backtrackWindowInSeconds != undefined ? this.props.backtrackWindowInSeconds : 86400;
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
