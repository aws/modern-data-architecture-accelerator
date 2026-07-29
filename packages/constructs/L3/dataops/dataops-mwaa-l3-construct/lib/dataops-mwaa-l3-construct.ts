/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaMwaaEnvironment, MwaaLoggingConfig, MwaaWebserverAccessMode } from '@aws-mdaa/mwaa-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, ISource, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'node:path';

/** Valid MWAA environment class sizes. */
export type MwaaEnvironmentClass = 'mw1.small' | 'mw1.medium' | 'mw1.large' | 'mw1.xlarge' | 'mw1.2xlarge';

/**
 * Valid MWAA web server access modes. Re-exported from the L2 construct so the
 * allowed values are defined once.
 */
export { MwaaWebserverAccessMode };

/** Valid Airflow log levels. */
export type MwaaLogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Security group ingress rules for the MWAA environment.
 */
export interface MwaaSecurityGroupIngressProps {
  /**
   * IPv4 CIDR blocks allowed inbound access to the MWAA environment.
   *
   * Use cases: VPC CIDR ranges for web server access; Corporate network access
   *
   * Validation: Optional; valid IPv4 CIDR notation
   */
  readonly ipv4?: string[];
  /**
   * Security group IDs allowed inbound access to the MWAA environment.
   *
   * Use cases: Cross-service access; Application connectivity
   *
   * Validation: Optional; valid security group IDs
   */
  readonly sg?: string[];
}

/**
 * Configuration for a single MWAA environment instance.
 */
export interface MwaaEnvironmentProps {
  /**
   * Apache Airflow version for the environment.
   *
   * Use cases: Version pinning; Upgrade testing
   *
   * AWS: MWAA environment Airflow version
   *
   * Validation: Optional; valid Airflow version string (e.g., '2.10.3')
   */
  readonly airflowVersion?: string;

  /**
   * Environment class determining container and metadata database sizing.
   *
   * Use cases: Workload sizing; Cost optimization; Performance tuning
   *
   * AWS: MWAA environment class
   *
   * Validation: Optional; enum: mw1.small, mw1.medium, mw1.large, mw1.xlarge, mw1.2xlarge
   * @default 'mw1.small'
   */
  readonly environmentClass?: MwaaEnvironmentClass;

  /**
   * IAM execution role ARN for the MWAA environment. This role is assumed by Airflow
   * workers and schedulers for DAG operations. Create this role in the Roles module
   * with an airflow-env.amazonaws.com trust policy, and configure it as an execution
   * role in the DataOps Project module when using project integration (so it receives
   * project bucket and KMS key access).
   *
   * Use cases: Airflow worker permissions; DAG execution identity
   *
   * AWS: IAM role ARN with airflow-env.amazonaws.com trust
   *
   * Validation: Required; valid IAM role ARN
   */
  readonly executionRoleArn: string;

  /**
   * VPC ID for deploying the MWAA environment.
   *
   * Use cases: VPC isolation; Network segmentation
   *
   * AWS: VPC
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;

  /**
   * Subnet IDs for the MWAA environment (minimum 2, must be in different AZs).
   *
   * Use cases: Multi-AZ deployment; High availability
   *
   * AWS: VPC subnets
   *
   * Validation: Required; minimum 2 subnet IDs in different AZs
   */
  readonly subnets: string[];

  /**
   * Web server access mode controlling how the Airflow UI is accessed.
   *
   * WARNING: `PUBLIC_ONLY` exposes the Airflow web server to the public internet,
   * removing the VPC network-isolation control. Access remains authenticated via IAM,
   * but the endpoint becomes publicly reachable. Prefer the `PRIVATE_ONLY` default and
   * reach the UI over VPN/Direct Connect or a VPC endpoint.
   *
   * Use cases: Private-only access for secure deployments; Public access for development
   *
   * AWS: MWAA web server access mode
   *
   * Validation: Optional; enum: PRIVATE_ONLY, PUBLIC_ONLY
   * @default 'PRIVATE_ONLY'
   */
  readonly webserverAccessMode?: MwaaWebserverAccessMode;

  /**
   * Relative path to the DAGs folder within the source bucket, under the
   * environment prefix (deployment/airflow/<env-name>/). For example, 'dags' resolves to
   * 'deployment/airflow/<env-name>/dags' in the project bucket.
   *
   * Use cases: DAG file organization; Multiple DAG directories
   *
   * AWS: MWAA DAG S3 path
   *
   * Validation: Optional; valid S3 key prefix (no leading slash)
   * @default 'dags'
   */
  readonly dagS3Path?: string;

  /**
   * Relative path to the plugins ZIP file within the source bucket, under the
   * environment prefix (deployment/airflow/<env-name>/).
   *
   * Use cases: Custom Airflow operators; Plugin distribution
   *
   * AWS: MWAA plugins S3 path
   *
   * Validation: Optional; valid S3 key ending in .zip
   */
  readonly pluginsS3Path?: string;

  /**
   * Relative path to the requirements.txt file within the source bucket, under the
   * environment prefix (deployment/airflow/<env-name>/).
   *
   * Use cases: Python dependency management; Package installation
   *
   * AWS: MWAA requirements S3 path
   *
   * Validation: Optional; valid S3 key ending in .txt
   */
  readonly requirementsS3Path?: string;

  /**
   * Relative path to the startup shell script within the source bucket, under the
   * environment prefix (deployment/airflow/<env-name>/).
   *
   * Use cases: Environment initialization; Custom setup commands
   *
   * AWS: MWAA startup script S3 path
   *
   * Validation: Optional; valid S3 key ending in .sh
   */
  readonly startupScriptS3Path?: string;

  /**
   * Minimum number of workers for auto-scaling.
   *
   * Use cases: Baseline capacity; Cost control
   *
   * AWS: MWAA min workers
   *
   * Validation: Optional; integer >= 1
   * @default 1
   */
  readonly minWorkers?: number;

  /**
   * Maximum number of workers for auto-scaling.
   *
   * Use cases: Peak load handling; Cost ceiling
   *
   * AWS: MWAA max workers
   *
   * Validation: Optional; integer >= minWorkers
   * @default 10
   */
  readonly maxWorkers?: number;

  /**
   * Minimum number of web servers (Airflow 2.10+).
   *
   * Use cases: Web UI availability; High availability
   *
   * AWS: MWAA min web servers
   *
   * Validation: Optional; integer >= 2
   */
  readonly minWebservers?: number;

  /**
   * Maximum number of web servers (Airflow 2.10+).
   *
   * Use cases: Web UI scaling; Load handling
   *
   * AWS: MWAA max web servers
   *
   * Validation: Optional; integer >= minWebservers
   */
  readonly maxWebservers?: number;

  /**
   * Number of Airflow schedulers to run. When omitted, MWAA applies its own service
   * default of 2; this module does not set the property.
   *
   * Use cases: DAG parsing performance; Scheduling throughput
   *
   * AWS: MWAA scheduler count
   *
   * Validation: Optional; integer (2-5)
   */
  readonly schedulers?: number;

  /**
   * Logging configuration for each Airflow component.
   *
   * Use cases: Debug troubleshooting; Audit compliance; Cost optimization
   *
   * AWS: CloudWatch log groups per Airflow component
   *
   * Validation: Optional; valid log levels per component
   */
  readonly logging?: MwaaLoggingConfig;

  /**
   * Airflow configuration overrides as key-value pairs.
   * Keys use the format 'section.option' (e.g., 'core.default_timezone').
   *
   * Use cases: Custom Airflow behavior; Performance tuning; Plugin configuration
   *
   * AWS: MWAA Airflow configuration options
   *
   * Validation: Optional; valid Airflow configuration keys
   */
  readonly airflowConfigurationOptions?: { [key: string]: string };

  /**
   * Security group ingress rules for the MWAA environment.
   *
   * Use cases: Web server access control; Worker connectivity
   *
   * AWS: VPC security group rules
   *
   * Validation: Optional; valid CIDR or security group references
   */
  readonly securityGroupIngress?: MwaaSecurityGroupIngressProps;

  /**
   * Per-environment roles granted Airflow web login and CLI access.
   *
   * Use cases: Operator access; Developer access; Team-based access control
   *
   * AWS: IAM roles with Airflow access managed policy attached
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly airflowAccessRoles?: MdaaRoleRef[];

  /**
   * Weekly maintenance window start in 'DAY:HH:MM' format (UTC).
   *
   * Use cases: Planned maintenance scheduling; Availability management
   *
   * AWS: MWAA weekly maintenance window
   *
   * Validation: Optional; format 'DAY:HH:MM' (e.g., 'SUN:03:00')
   */
  readonly weeklyMaintenanceWindowStart?: string;

  /**
   * Local path to a directory containing DAG files to deploy to the environment's
   * DAG prefix (`deployment/airflow/<env-name>/dags/`). All `.py` files in this directory will
   * be uploaded to S3 using the deployment role.
   *
   * When not specified, a default placeholder DAG is deployed so the MWAA environment
   * can start successfully (MWAA requires at least one `.py` file in the DAGs path).
   *
   * Use cases: DAG deployment; Initial environment bootstrapping; CI/CD DAG delivery
   *
   * AWS: S3 DAG path via BucketDeployment
   *
   * Validation: Optional; valid local directory path containing .py files
   */
  readonly dagPath?: string;

  /**
   * Retention period (in days) for the CloudWatch log groups MWAA creates for
   * each Airflow component. The construct pre-creates these log groups with this
   * retention (and KMS encryption) so retention is applied by default instead of
   * MWAA's never-expire default. Set to `0` for infinite retention.
   *
   * Use cases: Log cost control; Audit retention compliance
   *
   * AWS: CloudWatch log group retention
   *
   * Validation: Optional; valid CloudWatch retention day value or 0 for infinite
   * @default 731 (two years)
   */
  readonly logRetentionDays?: number;
}

/** Map of named MWAA environment configurations. */
export type MwaaEnvironmentMap = { [environmentName: string]: MwaaEnvironmentProps };

/**
 * Props for the DataOps MWAA L3 Construct.
 */
export interface DataopsMwaaL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Map of named MWAA environment configurations. Each key becomes the
   * environment identifier processed through MDAA naming conventions.
   *
   * Use cases: Multi-environment deployment; Named environment management
   *
   * AWS: MWAA environments
   *
   * Validation: Required; at least one environment entry
   */
  readonly environments: MwaaEnvironmentMap;

  /**
   * KMS key ARN for encrypting all MWAA resources. Auto-resolved from project
   * when projectName is set. When not provided and no project is configured,
   * a dedicated KMS key is created.
   *
   * Use cases: Shared encryption key; Project-level key management
   *
   * AWS: KMS key ARN
   *
   * Validation: Optional; valid KMS key ARN; auto-wired from project if projectName provided
   */
  readonly kmsArn?: string;

  /**
   * S3 bucket name for Airflow artifacts (DAGs, plugins, requirements, scripts).
   * Auto-resolved from project when projectName is set. Artifacts are placed under
   * `deployment/airflow/<environment-name>/` in this bucket.
   *
   * Use cases: Shared project bucket; DAG storage; Plugin distribution
   *
   * AWS: S3 bucket name
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly bucketName?: string;

  /**
   * Data admin roles granted Airflow access for ALL environments.
   *
   * Use cases: Platform admin access; Cross-environment administration
   *
   * AWS: IAM roles with Airflow access managed policies attached
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles?: MdaaRoleRef[];

  /**
   * IAM role ARN for deploying DAG files to S3. Auto-resolved from project
   * when projectName is set. Used by BucketDeployment to upload DAGs to the
   * `deployment/airflow/<env-name>/dags/` prefix.
   *
   * Use cases: DAG deployment; CI/CD artifact upload; Project deployment coordination
   *
   * AWS: IAM role ARN with S3 write access to the project bucket
   *
   * Validation: Optional; valid IAM role ARN; auto-wired from project if projectName provided
   */
  readonly deploymentRoleArn?: string;
}

/**
 * Deploys compliant MWAA environments with KMS encryption, VPC isolation,
 * per-environment IAM access policies, per-environment CloudWatch log groups with
 * default retention, and per-environment SSM parameters (environment ARN and web
 * server URL) for cross-module references.
 *
 * Uses the DataOps project bucket for Airflow artifacts, organized under
 * `deployment/airflow/<environment-name>/` prefixes. Execution roles are created externally
 * (in the Roles module) and referenced by ARN — following the same pattern as
 * Glue jobs.
 *
 * Supports DataOps project integration for shared KMS key and bucket auto-wiring,
 * or standalone mode with explicit KMS and bucket configuration.
 */
export class DataopsMwaaL3Construct extends MdaaL3Construct {
  protected readonly props: DataopsMwaaL3ConstructProps;

  /** The KMS key used for encrypting all MWAA resources. */
  public readonly encryptionKey: IKey;

  /** The S3 bucket used for Airflow artifacts. */
  public readonly artifactsBucket: IBucket;

  /** The deployed MWAA environments, keyed by environment name. */
  public readonly mwaaEnvironments: { [name: string]: MdaaMwaaEnvironment } = {};

  /**
   * True when this construct created the artifacts bucket (standalone mode) rather
   * than importing a project/named bucket. When we own the bucket, DAG deployment
   * can use a CDK-generated role granted write access to it; when the bucket is
   * imported, an externally-managed deploymentRoleArn is required instead.
   */
  private readonly ownsArtifactsBucket: boolean;

  constructor(scope: Construct, id: string, props: DataopsMwaaL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.encryptionKey = this.resolveKmsKey();
    this.ownsArtifactsBucket = !props.bucketName;
    this.artifactsBucket = this.resolveBucket();

    // Create each MWAA environment sequentially (DependsOn chain) to avoid
    // MWAA API rate limiting (429 Too Many Requests) during parallel creation.
    let previousEnvironment: MdaaMwaaEnvironment | undefined;
    for (const [envName, envProps] of Object.entries(props.environments)) {
      const mwaaEnv = this.createMwaaEnvironment(envName, envProps);
      if (previousEnvironment) {
        mwaaEnv.environment.addDependency(previousEnvironment.environment);
      }
      this.mwaaEnvironments[envName] = mwaaEnv;
      previousEnvironment = mwaaEnv;
    }
  }

  private resolveKmsKey(): IKey {
    if (this.props.kmsArn) {
      return Key.fromKeyArn(this, 'mwaa-kms-key', this.props.kmsArn);
    }

    // Create a dedicated KMS key for this module
    const kmsKey = new MdaaKmsKey(this.scope, 'mwaa-kms-key', {
      alias: 'mwaa',
      naming: this.props.naming,
    });

    // Allow CloudWatch Logs to use the key for log group encryption
    const allowLogsEncryption = new PolicyStatement({
      sid: 'AllowMwaaLogEncryption',
      effect: Effect.ALLOW,
      resources: ['*'],
      // CloudWatch Logs only needs to generate/read data keys to encrypt log data;
      // Encrypt*/ReEncrypt* are not required by the service.
      actions: ['kms:Decrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      conditions: {
        ArnLike: {
          // Scoped to the airflow-* log groups MWAA owns, so no unrelated log
          // group in this account can use the MWAA CMK for encryption.
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:airflow-*`,
        },
      },
    });
    kmsKey.addToResourcePolicy(allowLogsEncryption);

    return kmsKey;
  }

  private resolveBucket(): IBucket {
    if (this.props.bucketName) {
      return Bucket.fromBucketName(this, 'mwaa-artifacts-bucket', this.props.bucketName);
    }

    // Create a dedicated bucket when no project bucket is available
    return new MdaaBucket(this.scope, 'mwaa-dags-bucket', {
      encryptionKey: this.encryptionKey,
      bucketName: 'mwaa-dags',
      naming: this.props.naming,
    });
  }

  private createMwaaEnvironment(envName: string, envProps: MwaaEnvironmentProps): MdaaMwaaEnvironment {
    // Create security group
    const vpc = Vpc.fromVpcAttributes(this, `vpc-${envName}`, {
      vpcId: envProps.vpcId,
      availabilityZones: envProps.subnets.map((_s, i) => `az-${i}`),
      privateSubnetIds: envProps.subnets,
    });

    const ingressRules: MdaaSecurityGroupRuleProps = {
      ipv4: envProps.securityGroupIngress?.ipv4?.map(cidr => ({
        cidr,
        protocol: 'TCP',
        port: 443,
        description: `HTTPS ingress for ${cidr}`,
      })),
      sg: envProps.securityGroupIngress?.sg?.map(sgId => ({
        sgId,
        protocol: 'TCP',
        port: 443,
        description: `HTTPS ingress for SG ${sgId}`,
      })),
    };

    // securityGroupName supplies the per-environment suffix, so the base naming is
    // used here — passing naming.withSuffix(envName) as well would apply envName twice.
    const securityGroup = new MdaaSecurityGroup(this, `sg-${envName}`, {
      naming: this.props.naming,
      vpc,
      securityGroupName: envName,
      description: `Security group for MWAA environment ${envName}`,
      ingressRules,
      addSelfReferenceRule: true,
    });

    // Resolve S3 paths under deployment/airflow/<env-name>/ prefix
    const envPrefix = `deployment/airflow/${envName}`;
    const dagS3Path = `${envPrefix}/${envProps.dagS3Path ?? 'dags'}`;
    const pluginsS3Path = envProps.pluginsS3Path ? `${envPrefix}/${envProps.pluginsS3Path}` : undefined;
    const requirementsS3Path = envProps.requirementsS3Path ? `${envPrefix}/${envProps.requirementsS3Path}` : undefined;
    const startupScriptS3Path = envProps.startupScriptS3Path
      ? `${envPrefix}/${envProps.startupScriptS3Path}`
      : undefined;

    // Create the MWAA environment. environmentName supplies the per-environment
    // suffix, so the base naming is used here — passing naming.withSuffix(envName)
    // as well would apply envName twice (and push the 80-char name into truncation).
    const mwaaEnvironment = new MdaaMwaaEnvironment(this, `mwaa-${envName}`, {
      naming: this.props.naming,
      environmentName: envName,
      airflowVersion: envProps.airflowVersion,
      environmentClass: envProps.environmentClass,
      kmsKey: this.encryptionKey,
      sourceBucketArn: this.artifactsBucket.bucketArn,
      dagS3Path,
      pluginsS3Path,
      requirementsS3Path,
      startupScriptS3Path,
      executionRoleArn: envProps.executionRoleArn,
      networkConfiguration: {
        subnetIds: envProps.subnets,
        securityGroupIds: [securityGroup.securityGroupId],
      },
      webserverAccessMode: envProps.webserverAccessMode,
      minWorkers: envProps.minWorkers,
      maxWorkers: envProps.maxWorkers,
      minWebservers: envProps.minWebservers,
      maxWebservers: envProps.maxWebservers,
      schedulers: envProps.schedulers,
      loggingConfiguration: envProps.logging,
      logRetention: this.resolveLogRetention(envProps.logRetentionDays),
      airflowConfigurationOptions: envProps.airflowConfigurationOptions,
      weeklyMaintenanceWindowStart: envProps.weeklyMaintenanceWindowStart,
    });

    // Create access managed policy for this environment
    this.createAccessPolicy(envName, envProps, mwaaEnvironment);

    // Create and attach execution role managed policy
    this.createExecutionRolePolicy(envName, envProps, mwaaEnvironment);

    // Deploy DAG files to the environment's DAG prefix
    this.deployDags(envName, envProps, dagS3Path);

    return mwaaEnvironment;
  }

  /**
   * Resolve the configured retention days to a RetentionDays enum value.
   * Undefined defaults to two years; 0 selects infinite retention. Matches the
   * logGroupRetentionDays convention used by the dataops-stepfunction module.
   */
  private resolveLogRetention(logRetentionDays?: number): RetentionDays {
    if (logRetentionDays === undefined) {
      return RetentionDays.TWO_YEARS;
    }
    if (logRetentionDays === 0) {
      return RetentionDays.INFINITE;
    }
    // RetentionDays is an enum of the specific day counts CloudWatch accepts. A value
    // outside that set would otherwise be cast through and only rejected by
    // CloudFormation at deploy time with InvalidParameterException, so fail at synth
    // with an actionable message instead.
    const allowed = Object.values(RetentionDays).filter((v): v is number => typeof v === 'number');
    if (!allowed.includes(logRetentionDays)) {
      // Sort a copy: Array.prototype.sort mutates in place, and the sort is hoisted
      // out of the message expression rather than chained inline.
      const supportedValues = [...allowed].sort((a, b) => a - b).join(', ');
      throw new Error(
        `Invalid logRetentionDays value ${logRetentionDays}. ` +
          `Use 0 for infinite retention, or one of the CloudWatch-supported values: ${supportedValues}.`,
      );
    }
    return logRetentionDays;
  }

  private createExecutionRolePolicy(
    envName: string,
    envProps: MwaaEnvironmentProps,
    mwaaEnv: MdaaMwaaEnvironment,
  ): void {
    const envPrefix = `deployment/airflow/${envName}`;
    const bucketArn = this.artifactsBucket.bucketArn;

    const executionPolicy = new MdaaManagedPolicy(this, `exec-policy-${envName}`, {
      naming: this.props.naming.withSuffix(envName),
      managedPolicyName: 'mwaa-exec',
      description: `MWAA execution role policy for environment ${envName}`,
    });

    // S3 object read on the environment's artifact prefix only.
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowS3ReadObjects',
        effect: Effect.ALLOW,
        actions: ['s3:GetObject*'],
        resources: [`${bucketArn}/${envPrefix}/*`],
      }),
    );

    // Bucket-level metadata. GetBucket* actions (e.g. GetBucketLocation) do not
    // support an s3:prefix condition, so they target the bucket ARN directly.
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowS3Bucket',
        effect: Effect.ALLOW,
        actions: ['s3:GetBucket*'],
        resources: [bucketArn],
      }),
    );

    // Bucket listing constrained to this environment's prefix so a shared project
    // bucket cannot be enumerated for other environments' artifacts.
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowS3List',
        effect: Effect.ALLOW,
        actions: ['s3:List*'],
        resources: [bucketArn],
        conditions: {
          StringLike: {
            's3:prefix': [`${envPrefix}/*`],
          },
        },
      }),
    );

    // KMS decrypt/generate for reading encrypted objects and writing logs
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowKmsAccess',
        effect: Effect.ALLOW,
        // Least privilege per AWS's reference MWAA execution policy: Decrypt reads
        // KMS-encrypted S3 artifacts, GenerateDataKey* writes to KMS-encrypted
        // CloudWatch log groups, DescribeKey resolves key metadata. Encrypt and
        // ReEncrypt* are not required by the MWAA runtime and are omitted.
        actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey*'],
        resources: [this.encryptionKey.keyArn],
      }),
    );

    // CloudWatch Logs for all Airflow components
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowLogs',
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:CreateLogGroup',
          'logs:PutLogEvents',
          'logs:GetLogEvents',
          'logs:GetLogRecord',
          'logs:GetLogGroupFields',
          'logs:GetQueryResults',
        ],
        // Scoped to this environment's own component log groups
        // (airflow-<environmentName>-*) rather than every airflow-* group in the account.
        resources: [
          `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:airflow-${mwaaEnv.resourceName}-*`,
        ],
      }),
    );

    // Airflow metrics publishing
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowMetrics',
        effect: Effect.ALLOW,
        actions: ['airflow:PublishMetrics'],
        resources: [mwaaEnv.environmentArn],
      }),
    );

    // SQS access for Celery executor
    executionPolicy.addStatements(
      new PolicyStatement({
        sid: 'AirflowCelery',
        effect: Effect.ALLOW,
        actions: [
          'sqs:ChangeMessageVisibility',
          'sqs:DeleteMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:ReceiveMessage',
          'sqs:SendMessage',
        ],
        resources: [`arn:${this.partition}:sqs:${this.region}:*:airflow-celery-*`],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      executionPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'MWAA execution role wildcards are scoped by a service-specific prefix, not by actions lacking resource-level support. ' +
            'S3 (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html): s3:GetObject* is scoped to the environment object prefix <bucket>/deployment/airflow/<env>/*; s3:List* targets the bucket but is constrained by an s3:prefix condition to deployment/airflow/<env>/* so it cannot enumerate other environments; s3:GetBucket* metadata actions do not support resource-level or prefix scoping and so target the bucket ARN. ' +
            "CloudWatch Logs (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html): logs:Create*/Put*/Get* are scoped to this environment's own log groups via the airflow-<env>-* log-group name prefix. " +
            'SQS (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsqs.html): Celery queue actions are scoped to the airflow-celery-* queue-name prefix; the account ID is wildcarded because MWAA provisions the Celery queues in an AWS service-owned account, so the queue account cannot be pinned to this account.',
        },
      ],
      true,
    );

    // Attach to the execution role. Use the MDAA role wrapper for consistency
    // with deployDags' MdaaRole.fromRoleArn deployment-role import.
    const executionRole = MdaaRole.fromRoleArn(this, `exec-role-${envName}`, envProps.executionRoleArn);
    executionRole.addManagedPolicy(executionPolicy);
  }

  private deployDags(envName: string, envProps: MwaaEnvironmentProps, dagS3Path: string): void {
    // MWAA requires at least one .py file at the DAGs path or the environment fails
    // to start, so DAGs must be deployed in every mode.
    //
    // With an imported bucket (project or bucketName), writes must go through the
    // externally-managed deployment role that already holds scoped write access to
    // the /deployment prefix. Without that role there is no sanctioned way to write
    // to a bucket this construct does not own, so deployment is skipped.
    //
    // In standalone mode this construct owns the bucket, so no external role is
    // needed: CDK generates a role for the BucketDeployment and it is granted write
    // access to our own bucket below.
    const deploymentRole = this.props.deploymentRoleArn
      ? MdaaRole.fromRoleArn(this.scope, `dag-deploy-role-${envName}`, this.props.deploymentRoleArn)
      : undefined;

    if (!deploymentRole && !this.ownsArtifactsBucket) {
      return;
    }

    let dagSource: ISource;
    if (envProps.dagPath) {
      // User-specified DAG directory
      dagSource = Source.asset(envProps.dagPath);
    } else {
      // Default placeholder DAG so MWAA can start
      dagSource = Source.asset(path.join(__dirname, '..', 'assets', 'default-dag'));
    }

    new BucketDeployment(this.scope, `dag-deployment-${envName}`, {
      sources: [dagSource],
      destinationBucket: this.artifactsBucket,
      destinationKeyPrefix: dagS3Path,
      // Omitted in standalone mode so CDK generates a role, which it then grants
      // write access to the bucket this construct created.
      role: deploymentRole,
      extract: true,
    });

    if (deploymentRole) {
      // Remove the inline policy CDK adds to the imported deployment role —
      // the deployment role already has S3 write access to /deployment via
      // the dataops-project construct.
      for (const child of deploymentRole.node.children) {
        if (child.node.id === 'Policy') {
          deploymentRole.node.tryRemoveChild(child.node.id);
          break;
        }
      }
    }

    // The Nag violations fire on the stack-level singleton Lambda that CDK
    // synthesizes for all BucketDeployments (Custom::CDKBucketDeployment...),
    // NOT on the BucketDeployment construct instance. Scope the suppressions to
    // that singleton (its construct node ID starts with 'Custom::CDKBucketDeployment')
    // rather than the whole stack, so these Lambda rules are not masked for
    // other constructs sharing the stack.
    // Shared reason prefix for all BucketDeployment singleton suppression rules.
    const bdBase =
      'This is the shared CDK BucketDeployment framework singleton Lambda (Custom::CDKBucketDeployment), ' +
      'provisioned and controlled entirely by aws-cdk-lib/aws-s3-deployment. It only performs deploy-time ' +
      'S3 asset upload and is not part of the runtime data plane; its runtime, VPC placement, DLQ, and ' +
      'concurrency are not configurable by this construct.';
    // Applies to the CDK-generated service role, which only exists in standalone mode
    // where no external deploymentRoleArn is supplied.
    const bdInlinePolicy =
      'The inline policy is on the service role the CDK framework generates for this Lambda, containing the ' +
      'S3 and KMS grants it derives from the deployment source and destination buckets. Both the role and its ' +
      'policy are emitted by aws-cdk-lib/aws-s3-deployment and cannot be replaced with a managed policy from ' +
      'this construct.';
    const bucketDeploymentSuppressions = [
      {
        id: 'AwsSolutions-L1',
        reason: `${bdBase} Runtime version is managed by the CDK framework.`,
      },
      {
        id: 'NIST.800.53.R5-LambdaDLQ',
        reason: `${bdBase} DLQ not applicable: errors are surfaced as CloudFormation failures, not async invocations.`,
      },
      {
        id: 'NIST.800.53.R5-LambdaInsideVPC',
        reason: `${bdBase} Only interacts with S3 over AWS APIs; VPC placement is not required.`,
      },
      {
        id: 'NIST.800.53.R5-LambdaConcurrency',
        reason: `${bdBase} Runs only during stack deployment; reserved concurrency is not appropriate.`,
      },
      {
        id: 'HIPAA.Security-LambdaDLQ',
        reason: `${bdBase} DLQ not applicable: errors are surfaced as CloudFormation failures, not async invocations.`,
      },
      {
        id: 'HIPAA.Security-LambdaInsideVPC',
        reason: `${bdBase} Only interacts with S3 over AWS APIs; VPC placement is not required.`,
      },
      {
        id: 'HIPAA.Security-LambdaConcurrency',
        reason: `${bdBase} Runs only during stack deployment; reserved concurrency is not appropriate.`,
      },
      {
        id: 'PCI.DSS.321-LambdaDLQ',
        reason: `${bdBase} DLQ not applicable: errors are surfaced as CloudFormation failures, not async invocations.`,
      },
      {
        id: 'PCI.DSS.321-LambdaInsideVPC',
        reason: `${bdBase} Only interacts with S3 over AWS APIs; VPC placement is not required.`,
      },
      {
        id: 'PCI.DSS.321-LambdaConcurrency',
        reason: `${bdBase} Runs only during stack deployment; reserved concurrency is not appropriate.`,
      },
      {
        id: 'NIST.800.53.R5-IAMNoInlinePolicy',
        reason: `${bdBase} ${bdInlinePolicy}`,
      },
      {
        id: 'HIPAA.Security-IAMNoInlinePolicy',
        reason: `${bdBase} ${bdInlinePolicy}`,
      },
      {
        id: 'PCI.DSS.321-IAMNoInlinePolicy',
        reason: `${bdBase} ${bdInlinePolicy}`,
      },
      {
        id: 'AwsSolutions-IAM4',
        reason:
          `${bdBase} The AWSLambdaBasicExecutionRole managed policy is attached to the service role by the CDK ` +
          'framework and cannot be replaced from this construct.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason:
          `${bdBase} The wildcards are in the CDK-generated service role policy, derived by the framework from ` +
          'grantRead/grantReadWrite on the deployment source and destination buckets: s3:GetObject*/GetBucket*/List* ' +
          "and s3:DeleteObject*/PutObject* scoped to the CDK assets bucket and this module's own artifacts bucket " +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html), plus the KMS ' +
          'actions required to write to the CMK-encrypted destination ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awskeymanagementservice.html). ' +
          'Emitted by aws-cdk-lib/aws-s3-deployment and not narrowable from this construct.',
      },
    ];
    this.scope.node.children
      .filter(child => child.node.id.startsWith('Custom::CDKBucketDeployment'))
      .forEach(singleton =>
        MdaaNagSuppressions.addCodeResourceSuppressions(singleton, bucketDeploymentSuppressions, true),
      );
  }

  private createAccessPolicy(envName: string, envProps: MwaaEnvironmentProps, mwaaEnv: MdaaMwaaEnvironment): void {
    // Deduplicate role refs by serializing to JSON to handle identical refs in both lists
    const combinedRoleRefs = [...(this.props.dataAdminRoles ?? []), ...(envProps.airflowAccessRoles ?? [])];
    const seen = new Set<string>();
    const allRoleRefs = combinedRoleRefs.filter(ref => {
      const key = JSON.stringify(ref);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    if (allRoleRefs.length === 0) {
      return;
    }

    const accessPolicy = new MdaaManagedPolicy(this, `access-policy-${envName}`, {
      naming: this.props.naming.withSuffix(envName),
      managedPolicyName: 'mwaa-access',
      description: `Airflow access policy for MWAA environment ${envName}`,
    });

    accessPolicy.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['airflow:CreateWebLoginToken', 'airflow:CreateCliToken', 'airflow:GetEnvironment'],
        resources: [mwaaEnv.environmentArn],
      }),
    );

    // No AwsSolutions-IAM5 suppression needed here: the statement uses three
    // explicit airflow actions scoped to a single concrete environment ARN, with
    // no action or resource wildcards, so IAM5 does not fire. Suppressing it
    // anyway would mask a genuine finding if the statement were later broadened.

    // Attach to all specified roles (skip immutable roles)
    const resolvedRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(allRoleRefs, `${envName}-access`);
    for (const resolvedRole of resolvedRoles) {
      if (!resolvedRole.immutable()) {
        const iamRole = resolvedRole.role(`access-role-${envName}-${resolvedRole.refId()}`);
        iamRole.addManagedPolicy(accessPolicy);
      }
    }
  }
}
