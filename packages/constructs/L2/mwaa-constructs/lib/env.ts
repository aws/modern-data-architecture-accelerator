/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnEnvironment } from 'aws-cdk-lib/aws-mwaa';
import { Construct } from 'constructs';

/**
 * Airflow logging components for which MWAA creates a service-managed
 * CloudWatch log group, named `airflow-<environmentName>-<component>`.
 *
 * The exact casing here must match the suffix MWAA appends to the environment
 * name. If it drifts, this construct's pre-created group is not the one MWAA
 * uses, and MWAA's own group is left at its never-expire retention default.
 *
 * Source of truth: https://docs.aws.amazon.com/mwaa/latest/userguide/monitoring-airflow.html
 * (section "Log types")
 *
 * The L2 compliance tests pin each component name explicitly against this
 * constant, so a casing mismatch surfaces as a test failure at build time.
 */
export const MWAA_LOG_COMPONENTS = ['DAGProcessing', 'Scheduler', 'Task', 'WebServer', 'Worker'] as const;

/** Valid Airflow log levels. */
export type MwaaLogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Valid MWAA web server access modes. Typed as a union rather than a free-form
 * string so a typo cannot silently change the environment's network exposure.
 */
export type MwaaWebserverAccessMode = 'PRIVATE_ONLY' | 'PUBLIC_ONLY';

/**
 * Log level configuration for MWAA environment components.
 * Each component can independently configure its logging verbosity.
 */
export interface MwaaLoggingConfig {
  /** Log level for the Airflow scheduler component (default: INFO) */
  readonly schedulerLogLevel?: MwaaLogLevel;
  /** Log level for the Airflow worker component (default: INFO) */
  readonly workerLogLevel?: MwaaLogLevel;
  /** Log level for the Airflow web server component (default: INFO) */
  readonly webserverLogLevel?: MwaaLogLevel;
  /** Log level for the DAG processing component (default: INFO) */
  readonly dagProcessingLogLevel?: MwaaLogLevel;
  /** Log level for Airflow task execution (default: INFO) */
  readonly taskLogLevel?: MwaaLogLevel;
}

/**
 * Network configuration for the MWAA environment.
 */
export interface MwaaNetworkConfig {
  /** VPC subnet IDs for the MWAA environment (minimum 2, must be in different AZs) */
  readonly subnetIds: string[];
  /** Security group IDs to attach to the MWAA environment */
  readonly securityGroupIds: string[];
}

/**
 * Properties for the MdaaMwaaEnvironment construct.
 */
export interface MdaaMwaaEnvironmentProps extends MdaaConstructProps {
  /**
   * Name of the MWAA environment. Processed through MDAA naming conventions.
   */
  readonly environmentName: string;

  /**
   * Apache Airflow version for the environment.
   * @example '2.10.3'
   */
  readonly airflowVersion?: string;

  /**
   * Environment class determining container and database sizing.
   * @default 'mw1.small'
   */
  readonly environmentClass?: string;

  /**
   * KMS key for encrypting environment data at rest.
   * Encrypts the metadata database, DAG storage, and CloudWatch logs.
   */
  readonly kmsKey: IKey;

  /**
   * ARN of the S3 bucket containing DAGs, plugins, and requirements.
   */
  readonly sourceBucketArn: string;

  /**
   * Relative path to the DAGs folder within the source bucket.
   * @default 'dags'
   */
  readonly dagS3Path?: string;

  /**
   * Relative path to the plugins ZIP file within the source bucket.
   */
  readonly pluginsS3Path?: string;

  /**
   * Relative path to the requirements.txt file within the source bucket.
   */
  readonly requirementsS3Path?: string;

  /**
   * Relative path to the startup shell script within the source bucket.
   */
  readonly startupScriptS3Path?: string;

  /**
   * ARN of the IAM execution role for the MWAA environment.
   */
  readonly executionRoleArn: string;

  /**
   * Network configuration for the MWAA environment.
   */
  readonly networkConfiguration: MwaaNetworkConfig;

  /**
   * Web server access mode controlling how the Airflow UI is accessed.
   *
   * WARNING: `PUBLIC_ONLY` exposes the Airflow web server to the public internet,
   * removing the VPC network-isolation control. Access is still authenticated via
   * IAM, but the endpoint is publicly reachable. Prefer the `PRIVATE_ONLY` default
   * and reach the UI over VPN/Direct Connect or a VPC endpoint.
   *
   * @default 'PRIVATE_ONLY'
   */
  readonly webserverAccessMode?: MwaaWebserverAccessMode;

  /**
   * Minimum number of workers for auto-scaling.
   * @default 1
   */
  readonly minWorkers?: number;

  /**
   * Maximum number of workers for auto-scaling.
   * @default 10
   */
  readonly maxWorkers?: number;

  /**
   * Minimum number of web servers.
   */
  readonly minWebservers?: number;

  /**
   * Maximum number of web servers.
   */
  readonly maxWebservers?: number;

  /**
   * Number of Airflow schedulers to run. When omitted, the property is left unset on
   * the environment and MWAA applies its own service default of 2 — this construct
   * does not impose a default of its own.
   */
  readonly schedulers?: number;

  /**
   * Logging configuration for each Airflow component.
   */
  readonly loggingConfiguration?: MwaaLoggingConfig;

  /**
   * Retention period for the service-managed CloudWatch log groups MWAA creates
   * for each enabled Airflow component. The construct pre-creates these log
   * groups (KMS-encrypted, with this retention) so retention is applied by
   * default rather than left at MWAA's never-expire default.
   * @default RetentionDays.TWO_YEARS
   */
  readonly logRetention?: RetentionDays;

  /**
   * Airflow configuration overrides as key-value pairs.
   * Keys use the format 'section.option' (e.g., 'core.default_timezone').
   */
  readonly airflowConfigurationOptions?: { [key: string]: string };

  /**
   * Weekly maintenance window start in 'DAY:HH:MM' format (UTC).
   * @example 'SUN:03:00'
   */
  readonly weeklyMaintenanceWindowStart?: string;
}

/**
 * MDAA L2 construct for Amazon Managed Workflows for Apache Airflow (MWAA).
 *
 * Wraps CfnEnvironment with compliance defaults:
 * - KMS encryption required (no AWS-managed key fallback)
 * - Web server access mode defaults to PRIVATE_ONLY
 * - All log levels default to INFO (no silent failures)
 * - Removal policy set to RETAIN
 * - Publishes environment ARN and web server URL via SSM/outputs
 */
export class MdaaMwaaEnvironment extends Construct {
  /** The underlying CloudFormation MWAA environment resource */
  public readonly environment: CfnEnvironment;
  /** The ARN of the created MWAA environment */
  public readonly environmentArn: string;
  /**
   * The MDAA-processed environment name. Also the prefix of the service-managed
   * CloudWatch log group names (`airflow-<environmentName>-<component>`), exposed
   * so callers can scope log-group IAM permissions to this environment.
   */
  public readonly resourceName: string;

  constructor(scope: Construct, id: string, props: MdaaMwaaEnvironmentProps) {
    super(scope, id);

    const mwaaNaming = props.naming.withResourceType(MdaaResourceType.MWAA_ENVIRONMENT);
    const environmentName = mwaaNaming.resourceName(props.environmentName, 80);
    this.resourceName = environmentName;

    const defaultLogLevel = 'INFO';
    const loggingConfig = props.loggingConfiguration || {};

    this.environment = new CfnEnvironment(this, 'Environment', {
      name: environmentName,
      airflowVersion: props.airflowVersion,
      environmentClass: props.environmentClass ?? 'mw1.small',
      kmsKey: props.kmsKey.keyArn,
      sourceBucketArn: props.sourceBucketArn,
      dagS3Path: props.dagS3Path ?? 'dags',
      pluginsS3Path: props.pluginsS3Path,
      requirementsS3Path: props.requirementsS3Path,
      startupScriptS3Path: props.startupScriptS3Path,
      executionRoleArn: props.executionRoleArn,
      networkConfiguration: {
        subnetIds: props.networkConfiguration.subnetIds,
        securityGroupIds: props.networkConfiguration.securityGroupIds,
      },
      webserverAccessMode: props.webserverAccessMode ?? 'PRIVATE_ONLY',
      minWorkers: props.minWorkers ?? 1,
      maxWorkers: props.maxWorkers ?? 10,
      minWebservers: props.minWebservers,
      maxWebservers: props.maxWebservers,
      schedulers: props.schedulers,
      loggingConfiguration: {
        schedulerLogs: {
          enabled: true,
          logLevel: loggingConfig.schedulerLogLevel ?? defaultLogLevel,
        },
        workerLogs: {
          enabled: true,
          logLevel: loggingConfig.workerLogLevel ?? defaultLogLevel,
        },
        webserverLogs: {
          enabled: true,
          logLevel: loggingConfig.webserverLogLevel ?? defaultLogLevel,
        },
        dagProcessingLogs: {
          enabled: true,
          logLevel: loggingConfig.dagProcessingLogLevel ?? defaultLogLevel,
        },
        taskLogs: {
          enabled: true,
          logLevel: loggingConfig.taskLogLevel ?? defaultLogLevel,
        },
      },
      airflowConfigurationOptions: props.airflowConfigurationOptions,
      weeklyMaintenanceWindowStart: props.weeklyMaintenanceWindowStart,
    });

    // Enabling these components causes MWAA to create service-managed CloudWatch
    // log groups named airflow-<env>-<component>.
    //
    // The control being added here is RETENTION. AWS::MWAA::Environment exposes no
    // retention property, and MWAA's own log groups default to never-expire, which
    // is a compliance and cost risk. Because the group name is derived
    // deterministically from the environment name, pre-creating a group at that
    // name with an explicit retention period is the only way to set retention from
    // CloudFormation. Retention is applied by default rather than deferred to an
    // external account-wide policy, per compliance-by-default.
    //
    // Encryption is not the gap: MWAA already encrypts its log groups with the
    // required kmsKey via the KMS grants it attaches on environment creation
    // (https://docs.aws.amazon.com/mwaa/latest/userguide/custom-keys-certs.html).
    // encryptionKey is set below so the group is CMK-encrypted from creation and
    // consistent either way.
    //
    // MWAA calls logs:CreateLogGroup, which is a no-op when a group of that name
    // already exists, so the environment writes into the group created here.
    const logRetention = props.logRetention ?? RetentionDays.TWO_YEARS;
    for (const component of MWAA_LOG_COMPONENTS) {
      const logGroup = new LogGroup(this, `LogGroup${component}`, {
        logGroupName: `airflow-${environmentName}-${component}`,
        encryptionKey: props.kmsKey,
        retention: logRetention,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      // MWAA owns the log stream and content; the environment DependsOn the log
      // group so it exists before MWAA attempts to write to it.
      this.environment.node.addDependency(logGroup);

      if (logRetention === RetentionDays.INFINITE) {
        // Default retention is RetentionDays.TWO_YEARS; INFINITE is an explicit
        // operator opt-out. Logs are never deleted, which meets the control
        // objective of avoiding premature log expiry.
        const infiniteRetentionReason =
          'The default logRetention is TWO_YEARS; INFINITE is an explicit operator override. ' +
          'Logs are never deleted, which satisfies the control objective of avoiding premature log expiry. ' +
          `Applied per component, so the opt-out covers all ${MWAA_LOG_COMPONENTS.length} MWAA log groups ` +
          `(${MWAA_LOG_COMPONENTS.join(', ')}) for this environment.`;
        MdaaNagSuppressions.addCodeResourceSuppressions(
          logGroup,
          [
            { id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod', reason: infiniteRetentionReason },
            { id: 'HIPAA.Security-CloudWatchLogGroupRetentionPeriod', reason: infiniteRetentionReason },
            { id: 'PCI.DSS.321-CloudWatchLogGroupRetentionPeriod', reason: infiniteRetentionReason },
          ],
          true,
        );
      }
    }

    this.environment.applyRemovalPolicy(RemovalPolicy.RETAIN);

    this.environmentArn = this.environment.attrArn;

    // Publish environment ARN and web server URL
    new MdaaParamAndOutput(
      this,
      {
        ...props,
        resourceType: 'mwaa',
        resourceId: props.environmentName,
        name: 'arn',
        value: this.environment.attrArn,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...props,
        resourceType: 'mwaa',
        resourceId: props.environmentName,
        name: 'webserver-url',
        value: this.environment.attrWebserverUrl,
      },
      scope,
    );
  }
}
