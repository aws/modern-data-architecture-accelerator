/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  DataProtectionProperty,
  LogRetentionDays,
  TokenUsageAlarmsProps,
} from '@aws-mdaa/bedrock-settings-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Configuration interface for Bedrock Settings application.
 * Extends the base MDAA configuration with Bedrock-specific audit logging settings.
 */
export interface BedrockSettingsConfigContents extends MdaaBaseConfigContents {
  /**
   * Enables S3 audit logging for Bedrock model invocations, delivered to the module's encrypted bucket.
   * The bucket is created either way, because it also receives the CloudWatch large-data overflow.
   * At least one logging destination must be enabled.
   *
   * Use cases: Regulatory compliance auditing, long-term log retention, security monitoring of AI usage
   *
   * AWS: Amazon Bedrock ModelInvocationLogging with S3 destination
   *
   * Validation: Required; Boolean
   * @default false
   */
  enableAuditLoggingToS3: boolean;

  /**
   * Enables CloudWatch audit logging for Bedrock model invocations.
   * Creates an encrypted CloudWatch Log Group for real-time monitoring and alerting, with PII always masked.
   * At least one logging destination must be enabled.
   *
   * Use cases: Real-time AI usage monitoring, automated alerting, performance tracking, cost analysis
   *
   * AWS: Amazon Bedrock ModelInvocationLogging with CloudWatch Logs destination
   *
   * Validation: Required; Boolean
   * @default false
   */
  enableAuditLoggingToCloudwatch: boolean;

  /**
   * Alarms on Amazon Bedrock model token use in this account and Region, per model and/or
   * in total. Token metrics count every caller in the account, not only MDAA-deployed
   * workloads, and a per-model alarm counts only the model IDs it lists.
   *
   * Use cases: token-spend spike alerting, runaway-agent detection, usage-pattern deviation alarms
   *
   * AWS: CloudWatch alarms on AWS/Bedrock InputTokenCount / OutputTokenCount + SNS notification
   *
   * Validation: Optional; TokenUsageAlarmsProps; requires a notification target and at least one threshold
   */
  tokenUsageAlarms?: TokenUsageAlarmsProps;

  /**
   * CloudWatch Logs data protection for the invocation log group, which receives the full text of every
   * prompt and completion.
   *
   * PII masking is always applied to the invocation log group: sensitive data (emails, SSNs, credit card
   * numbers, etc.) is masked in log events on ingestion. Users with the logs:Unmask permission can still
   * view unmasked data. Masking is not retroactive, and does not reach the S3 copies of the logs, which
   * only readRoles can read. This optional configuration only adds identifiers to the built-in set; it
   * can never reduce it.
   *
   * Use cases: extending PII masking of prompts and completions with additional identifiers
   *
   * AWS: CloudWatch Logs Data Protection Policy
   *
   * Validation: Optional; DataProtectionProperty; additive only; requires enableAuditLoggingToCloudwatch: true
   */
  readonly logDataProtection?: DataProtectionProperty;

  /**
   * CloudWatch Logs retention period for the invocation log group, in days. `9999` means never-expire and
   * can be set explicitly to lock indefinite retention into config; omitting the field is equivalent.
   * On accounts governed by Landing Zone Accelerator, LZA's account-wide log retention replaces this value.
   *
   * Use cases: limiting how long prompts are kept, cost management, compliance retention requirements
   *
   * AWS: CloudWatch Logs log group retention
   *
   * Validation: Optional; Number; must be a valid RetentionDays value (1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653, 9999); requires enableAuditLoggingToCloudwatch: true
   * @default 9999
   */
  readonly logRetentionDays?: LogRetentionDays;

  /**
   * Number of days to keep invocation log objects in the S3 bucket. Applies to the whole bucket: the S3
   * destination and the CloudWatch large-data overflow (bodies over 100 KB), so a value shorter than
   * logRetentionDays removes overflow bodies before the CloudWatch events that point to them. Omit to keep
   * objects indefinitely.
   *
   * Use cases: limiting how long prompts are kept, cost management, compliance retention requirements
   *
   * Setting it also expires every noncurrent object version 1 day after it becomes noncurrent, across the
   * whole bucket, so versioning can recover an overwritten or deleted object for 1 day only.
   *
   * AWS: S3 lifecycle expiration (current and noncurrent object versions)
   *
   * Validation: Optional; Integer; positive
   * @TJS-type integer
   * @minimum 1
   */
  readonly s3RetentionDays?: number;

  /**
   * Roles allowed to read the invocation logs in the module's S3 bucket. Every other principal,
   * account administrators included, is denied s3:GetObject* on the bucket's objects, although a
   * principal allowed s3:PutBucketPolicy or s3:DeleteBucketPolicy can remove the Deny. The bucket holds
   * the S3 destination and the CloudWatch destination's large-data overflow (binary data and bodies over
   * 100 KB), so the restriction applies when only CloudWatch logging is enabled too. Objects are stored
   * unmasked, so a listed role reads prompts and completions in clear text.
   *
   * Use cases: Incident-responder access to full prompts; Audit of stored conversations; Cross-account log analysis
   *
   * AWS: S3 bucket policy Deny on s3:GetObject*. Listed roles get s3:GetObject* and kms:Decrypt through S3;
   * cross-account roles also get s3:ListBucket, s3:GetBucketLocation and kms:DescribeKey through S3
   *
   * Validation: Optional; array of MdaaRoleRef; supports id, arn, and name references
   * @default - no principal can read the bucket's objects
   */
  readonly readRoles?: MdaaRoleRef[];
}

/**
 * Configuration parser for Bedrock Settings application.
 * Validates and parses YAML configuration files for Bedrock audit logging settings. * ```typescript
 * const parser = new BedrockSettingsConfigParser(stack, {
 *   configFilePath: 'bedrock-config.yaml'
 * });
 * console.log(parser.enableAuditLoggingToS3); // true/false
 * ```
 */
export class BedrockSettingsConfigParser extends MdaaAppConfigParser<BedrockSettingsConfigContents> {
  /** Flag indicating whether S3 audit logging is enabled for Bedrock model invocations */
  public readonly enableAuditLoggingToS3: boolean;

  /** Flag indicating whether CloudWatch audit logging is enabled for Bedrock model invocations */
  public readonly enableAuditLoggingToCloudwatch: boolean;

  /** Alarms on Bedrock model token use, when configured */
  public readonly tokenUsageAlarms?: TokenUsageAlarmsProps;

  /** Additional data identifiers masked in the CloudWatch invocation log group */
  public readonly logDataProtection?: DataProtectionProperty;

  /** Retention period for the CloudWatch invocation log group, in days */
  public readonly logRetentionDays?: LogRetentionDays;

  /** Retention period for invocation log objects in S3, in days */
  public readonly s3RetentionDays?: number;

  /** Roles allowed to read the invocation logs in the module's S3 bucket */
  public readonly readRoleRefs?: MdaaRoleRef[];

  /**
   * Creates a new BedrockSettingsConfigParser instance.
   * @param stack - The CDK stack context
   * @param props - Configuration parser properties including config file path
   */
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    // Extract audit logging configuration from parsed config
    this.enableAuditLoggingToS3 = this.configContents.enableAuditLoggingToS3;
    this.enableAuditLoggingToCloudwatch = this.configContents.enableAuditLoggingToCloudwatch;
    this.tokenUsageAlarms = this.configContents.tokenUsageAlarms;
    this.logDataProtection = this.configContents.logDataProtection;
    this.logRetentionDays = this.configContents.logRetentionDays;
    this.s3RetentionDays = this.configContents.s3RetentionDays;
    this.readRoleRefs = this.configContents.readRoles;
  }
}
