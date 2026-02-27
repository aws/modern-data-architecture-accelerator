/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArnPrincipal,
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';

// Lambda configuration constants for the custom resource
const LAMBDA_RUNTIME = Runtime.PYTHON_3_13;
const LAMBDA_HANDLER = 'bedrock_settings.lambda_handler';
const LAMBDA_SRC_DIR = '../src/python/bedrock-settings';

/**
 * Configuration properties for the Bedrock Settings L3 Construct
 */
export interface BedrockSettingsL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Enable S3 bucket creation for model invocation audit logs providing audit trail and compliance support for generative AI usage. Creates an encrypted S3 bucket with appropriate IAM policies and KMS encryption to store detailed Bedrock model invocation logs for regulatory compliance, security monitoring, and long-term audit retention.
   *
   * Use cases: HIPAA compliance for healthcare AI applications; Financial services regulatory audit requirements; Government security monitoring for AI model usage; Long-term audit retention for compliance frameworks
   *
   * AWS: Amazon Bedrock ModelInvocationLogging configuration with S3 destination and encrypted bucket storage
   *
   * Validation: Boolean value (true/false); When true, creates encrypted S3 bucket with Bedrock service permissions and KMS key policies
   **/
  readonly enableAuditLoggingToS3: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Enable CloudWatch Log Group creation for model invocation audit logs providing real-time monitoring and alerting capabilities for generative AI usage. Creates an encrypted CloudWatch Log Group with infinite retention for real-time log analysis, automated alerting, and operational monitoring of AI model usage patterns and performance metrics.
   *
   * Use cases: Real-time monitoring of AI model usage patterns; Automated alerting for unusual AI activity; Performance monitoring for model response times; Cost tracking and analysis for model invocation volumes
   *
   * AWS: Amazon Bedrock ModelInvocationLogging configuration with CloudWatch Logs destination and encrypted log group
   *
   * Validation: Boolean value (true/false); When true, creates encrypted CloudWatch Log Group with infinite retention and Bedrock service permissions
   **/
  readonly enableAuditLoggingToCloudwatch: boolean;
}

/**
 * Bedrock Settings L3 Construct
 * This construct configures Amazon Bedrock model invocation logging to capture audit trails
 * of all model interactions. It supports logging to S3 buckets for long-term storage and/or
 * CloudWatch Log Groups for real-time monitoring and analysis.
 * Features:
 * - Creates encrypted storage resources (S3 bucket and/or CloudWatch Log Group)
 * - Configures appropriate IAM roles and policies for Bedrock service access
 * - Implements security best practices with KMS encryption
 * - Uses custom resource to configure Bedrock logging settings * new BedrockSettingsL3Construct(this, 'BedrockSettings', {
 *   enableAuditLoggingToS3: true,
 *   enableAuditLoggingToCloudwatch: true,
 *   naming: namingConvention
 * });
 */
export class BedrockSettingsL3Construct extends MdaaL3Construct {
  protected readonly props: BedrockSettingsL3ConstructProps;

  /**
   * Creates a new Bedrock Settings L3 Construct
   * @param scope - The parent construct
   * @param id - The construct identifier
   * @param props - Configuration properties
   */
  constructor(scope: Construct, id: string, props: BedrockSettingsL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Validate configuration before proceeding
    this.validateProps();

    // Create storage resources (KMS key, S3 bucket, CloudWatch Log Group)
    const { encryptionKey, loggingBucket, logGroup } = this.createStorageResources();

    // Create IAM resources for Bedrock service access
    const { serviceRole } = this.createIamResources(encryptionKey, logGroup);

    // Configure Bedrock logging settings via custom resource
    this.createBedrockSettingsCustomResource(loggingBucket, logGroup, serviceRole);
  }

  /**
   * Validates the construct properties to ensure at least one logging destination is enabled
   * @throws Error if both logging options are disabled
   */
  private validateProps(): void {
    if (!this.props.enableAuditLoggingToCloudwatch && !this.props.enableAuditLoggingToS3) {
      throw new Error('At least one of enableAuditLoggingToCloudwatch or enableAuditLoggingToS3 must be true.');
    }
  }

  /**
   * Creates all storage resources needed for Bedrock logging
   * @returns Object containing the created encryption key, logging bucket, and log group
   */
  private createStorageResources() {
    // Create KMS key for encrypting all logging resources
    const encryptionKey = this.createEncryptionKey();

    // Create CloudWatch Log Group if enabled
    const logGroup = this.createLogGroup(encryptionKey);

    // Create S3 bucket for log storage
    const loggingBucket = this.createLoggingBucket(encryptionKey);

    return { encryptionKey, loggingBucket, logGroup };
  }

  /**
   * Creates a KMS key for encrypting Bedrock logging resources
   * @returns The created KMS key with appropriate policies for Bedrock, CloudWatch, and S3 access
   */
  private createEncryptionKey(): MdaaKmsKey {
    const keyPolicy = this.createKmsKeyPolicy();

    return new MdaaKmsKey(this, 'bedrock-kms-key', {
      alias: 'bedrock-kms-key',
      description: 'KMS key for bedrock invocation logs',
      naming: this.props.naming,
      policy: keyPolicy,
    });
  }

  /**
   * Creates the KMS key policy allowing access from Bedrock, CloudWatch Logs, and S3
   * @returns PolicyDocument with statements for all required services
   */
  private createKmsKeyPolicy(): PolicyDocument {
    const kmsActions = ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'];

    return new PolicyDocument({
      statements: [
        // Allow account root full access to the key
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ArnPrincipal(`arn:aws:iam::${this.account}:root`)],
          actions: ['kms:*'],
          resources: ['*'],
        }),
        // Allow Bedrock service to generate data keys for encryption
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal('bedrock.amazonaws.com')],
          actions: ['kms:GenerateDataKey'],
          resources: ['*'],
          conditions: {
            ArnLike: { 'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:*` },
            StringEquals: { 'aws:SourceAccount': this.account },
          },
        }),
        // Allow CloudWatch Logs service to encrypt/decrypt log data
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal('logs.amazonaws.com')],
          actions: kmsActions,
          resources: ['*'],
          conditions: {
            ArnLike: {
              'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${this.region}:${this.account}:log-group:*`,
            },
          },
        }),
        // Allow S3 logging service to encrypt/decrypt log objects
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal('logging.s3.amazonaws.com')],
          actions: kmsActions,
          resources: ['*'],
          conditions: {
            ArnLike: {
              'kms:EncryptionContext:aws:s3:arn': `arn:aws:s3:::*bedrock-logs-${this.account}-${this.region}`,
            },
          },
        }),
      ],
    });
  }

  /**
   * Creates a CloudWatch Log Group for Bedrock model invocation logs if enabled
   * @param encryptionKey - KMS key for encrypting log data
   * @returns The created log group or undefined if CloudWatch logging is disabled
   */
  private createLogGroup(encryptionKey: MdaaKmsKey): MdaaLogGroup | undefined {
    if (!this.props.enableAuditLoggingToCloudwatch) {
      return undefined;
    }

    return new MdaaLogGroup(this, 'bedrock-invocation-logs', {
      logGroupName: 'bedrock-model-invocation',
      retention: RetentionDays.INFINITE, // Retain logs indefinitely for audit purposes
      encryptionKey,
      logGroupNamePathPrefix: '/aws/bedrock/model-invocation-logs',
      naming: this.props.naming,
    });
  }

  /**
   * Creates an S3 bucket for storing Bedrock model invocation logs
   * @param encryptionKey - KMS key for encrypting bucket contents
   * @returns The created S3 bucket with appropriate policies and suppressions
   */
  private createLoggingBucket(encryptionKey: MdaaKmsKey): MdaaBucket {
    const loggingBucket = new MdaaBucket(this, 'bedrock-invocation-logs-s3', {
      bucketName: 'logs-model-invocation',
      encryptionKey,
      naming: this.props.naming,
    });

    // Add bucket policy to allow Bedrock service access
    this.addBucketPolicy(loggingBucket);

    return loggingBucket;
  }

  /**
   * Adds a bucket policy allowing Bedrock service to write log objects
   * @param bucket - The S3 bucket to add the policy to
   */
  private addBucketPolicy(bucket: MdaaBucket): void {
    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject'],
        principals: [new ServicePrincipal('bedrock.amazonaws.com')],
        resources: [bucket.arnForObjects('*')],
        conditions: {
          StringEquals: { 'aws:SourceAccount': this.account },
          ArnLike: { 'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:*` },
        },
      }),
    );
  }

  /**
   * Creates IAM resources required for Bedrock logging service
   * @param encryptionKey - KMS key for encryption permissions
   * @param logGroup - CloudWatch Log Group for logging permissions (optional)
   * @returns Object containing the created service role
   */
  private createIamResources(encryptionKey: MdaaKmsKey, logGroup: MdaaLogGroup | undefined) {
    const serviceRolePolicy = this.createServiceRolePolicy(encryptionKey, logGroup);
    const serviceRole = this.createServiceRole(serviceRolePolicy);

    return { serviceRole };
  }

  /**
   * Creates a managed policy for the Bedrock logging service role
   * @param encryptionKey - KMS key for encryption permissions
   * @param logGroup - CloudWatch Log Group for logging permissions (optional)
   * @returns The created managed policy with appropriate permissions
   */
  private createServiceRolePolicy(encryptionKey: MdaaKmsKey, logGroup: MdaaLogGroup | undefined): ManagedPolicy {
    const statements = [
      // Allow KMS operations for encrypting/decrypting log data
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
        resources: [encryptionKey.keyArn],
      }),
    ];

    // Add CloudWatch Logs permissions if log group is enabled
    if (logGroup) {
      statements.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          resources: [logGroup.logGroupArn],
        }),
      );
    }

    return new ManagedPolicy(this, 'bedrock-logging-service-role-policy', {
      description: 'Bedrock logging service role policy',
      statements,
    });
  }

  /**
   * Creates the IAM service role for Bedrock logging
   * @param serviceRolePolicy - The managed policy to attach to the role
   * @returns The created service role that Bedrock can assume for logging operations
   */
  private createServiceRole(serviceRolePolicy: ManagedPolicy): MdaaRole {
    return new MdaaRole(this, 'bedrock-logging-service-role', {
      description: 'Bedrock logging service role',
      roleName: 'bedrock-logging-service-role',
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
      createParams: false,
      createOutputs: false,
      managedPolicies: [serviceRolePolicy],
    });
  }

  /**
   * Creates a custom resource to configure Bedrock model invocation logging settings
   * @param loggingBucket - S3 bucket for log storage
   * @param logGroup - CloudWatch Log Group for real-time logs (optional)
   * @param serviceRole - IAM role for Bedrock logging service
   * @returns The created custom resource that manages Bedrock logging configuration
   */
  private createBedrockSettingsCustomResource(
    loggingBucket: MdaaBucket,
    logGroup: MdaaLogGroup | undefined,
    serviceRole: MdaaRole,
  ): MdaaCustomResource {
    const crProps: MdaaCustomResourceProps = {
      resourceType: 'logs-model-invocation',
      code: Code.fromAsset(`${__dirname}/${LAMBDA_SRC_DIR}`),
      runtime: LAMBDA_RUNTIME,
      handler: LAMBDA_HANDLER,
      handlerRolePolicyStatements: [
        // Allow Lambda to manage Bedrock logging configuration
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'bedrock:DeleteModelInvocationLoggingConfiguration',
            'bedrock:GetModelInvocationLoggingConfiguration',
            'bedrock:PutModelInvocationLoggingConfiguration',
          ],
          resources: ['*'],
        }),
        // Allow Lambda to pass the service role to Bedrock
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [serviceRole.roleArn],
        }),
      ],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Bedrock logging configuration APIs (DeleteModelInvocationLoggingConfiguration, ' +
            'GetModelInvocationLoggingConfiguration, PutModelInvocationLoggingConfiguration) ' +
            'do not support resource-level permissions and require wildcard resources.',
        },
      ],
      // Configuration properties passed to the Lambda function
      handlerProps: {
        enableAuditLoggingToS3: this.props.enableAuditLoggingToS3,
        s3Config: {
          s3Bucket: loggingBucket.bucketName,
          s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation',
        },
        enableAuditLoggingToCloudwatch: this.props.enableAuditLoggingToCloudwatch,
        cloudwatchConfig: {
          cloudwatchLogGroupName: logGroup?.logGroupName,
          cloudwatchLoggingRoleArn: serviceRole.roleArn,
          // S3 fallback for large CloudWatch log entries that exceed size limits
          largeDataDeliveryS3Config: {
            s3Bucket: loggingBucket.bucketName,
            s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/',
          },
        },
      },
      naming: this.props.naming,
      environment: { LOG_LEVEL: 'INFO' },
    };

    return new MdaaCustomResource(this, 'bedrock-settings-cr', crProps);
  }
}
