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
   * Q-ENHANCED-PROPERTY
   * Enables audit logging to S3 for Bedrock model invocations providing audit trail and compliance support for generative AI usage. Creates a dedicated encrypted S3 bucket for storing detailed model invocation logs including request/response data, timestamps, and user context for regulatory compliance and security monitoring.
   *
   * Use cases: HIPAA compliance for healthcare AI applications; Financial services regulatory audit requirements; Government security monitoring for AI model usage; Enterprise governance for generative AI adoption
   *
   * AWS: Amazon Bedrock ModelInvocationLogging configuration with S3 destination
   *
   * Validation: Boolean value (true/false); When true, requires S3 bucket creation permissions and KMS encryption configuration
   * @default false
   */
  enableAuditLoggingToS3: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Enables audit logging to CloudWatch for Bedrock model invocations providing real-time monitoring and alerting capabilities for generative AI usage. Creates a dedicated CloudWatch Log Group for storing model invocation logs with configurable retention periods enabling real-time analysis, alerting, and operational monitoring of AI model usage patterns.
   *
   * Use cases: Real-time monitoring of AI model usage patterns; Automated alerting for unusual AI activity; Performance monitoring for model response times; Cost tracking for model invocation volumes
   *
   * AWS: Amazon Bedrock ModelInvocationLogging configuration with CloudWatch Logs destination
   *
   * Validation: Boolean value (true/false); When true, requires CloudWatch Logs permissions and log group creation capabilities
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
