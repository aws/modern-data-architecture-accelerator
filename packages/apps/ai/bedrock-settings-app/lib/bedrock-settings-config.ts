/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Configuration interface for Bedrock Settings application.
 * Extends the base MDAA configuration with Bedrock-specific audit logging settings.
 */
export interface BedrockSettingsConfigContents extends MdaaBaseConfigContents {
  /**
   * Enables S3 audit logging for Bedrock model invocations.
   * Creates an encrypted S3 bucket for storing invocation logs. At least one logging destination must be enabled.
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
   * Creates an encrypted CloudWatch Log Group for real-time monitoring and alerting. At least one logging destination must be enabled.
   *
   * Use cases: Real-time AI usage monitoring, automated alerting, performance tracking, cost analysis
   *
   * AWS: Amazon Bedrock ModelInvocationLogging with CloudWatch Logs destination
   *
   * Validation: Required; Boolean
   * @default false
   */
  enableAuditLoggingToCloudwatch: boolean;
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
  }
}
