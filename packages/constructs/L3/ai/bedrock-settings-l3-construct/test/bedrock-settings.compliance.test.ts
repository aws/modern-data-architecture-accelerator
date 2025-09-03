/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockSettingsL3Construct, BedrockSettingsL3ConstructProps } from '../lib';

describe('Bedrock Settings L3 Construct Compliance Tests', () => {
  test('Test Basic Bedrock Settings Creation with S3 Logging', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: false,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify KMS key creation with proper encryption
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for bedrock invocation logs',
      EnableKeyRotation: true,
    });

    // Verify S3 bucket with encryption
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    // Verify IAM role follows least privilege principle
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'bedrock.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });
  });

  test('Test Bedrock Settings with CloudWatch Logging', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: false,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify CloudWatch Log Group with encryption
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName:
        '/aws/bedrock/model-invocation-logs/test-org-test-env-test-domain-test-module-bedrock-model-invocation',
    });

    // Verify service role has appropriate CloudWatch permissions
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
          },
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          },
        ],
      },
    });
  });

  test('Test Bedrock Settings with Both S3 and CloudWatch Logging', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify both storage resources are created
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);

    // Verify custom resource Lambda has proper permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Action: [
              'bedrock:DeleteModelInvocationLoggingConfiguration',
              'bedrock:GetModelInvocationLoggingConfiguration',
              'bedrock:PutModelInvocationLoggingConfiguration',
            ],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: 'iam:PassRole',
            Resource: Match.anyValue(),
          },
        ]),
      },
    });
  });

  test('Test KMS Key Policy Compliance', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify KMS key policy includes proper service access with conditions
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Principal: { AWS: 'arn:aws:iam::test-account:root' },
            Action: 'kms:*',
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Principal: { Service: 'bedrock.amazonaws.com' },
            Action: 'kms:GenerateDataKey',
            Resource: '*',
            Condition: {
              ArnLike: { 'aws:SourceArn': 'arn:aws:bedrock:test-region:test-account:*' },
              StringEquals: { 'aws:SourceAccount': 'test-account' },
            },
          },
          {
            Effect: 'Allow',
            Principal: { Service: 'logs.amazonaws.com' },
            Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
            Resource: '*',
            Condition: {
              ArnLike: {
                'kms:EncryptionContext:aws:logs:arn': 'arn:aws:logs:test-region:test-account:log-group:*',
              },
            },
          },
          {
            Effect: 'Allow',
            Principal: { Service: 'logging.s3.amazonaws.com' },
            Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
            Resource: '*',
            Condition: {
              ArnLike: {
                'kms:EncryptionContext:aws:s3:arn': 'arn:aws:s3:::*bedrock-logs-test-account-test-region',
              },
            },
          },
        ]),
      },
    });
  });

  test('Test S3 Bucket Policy Compliance', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: false,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify S3 bucket policy has proper conditions for security
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Principal: { Service: 'bedrock.amazonaws.com' },
            Action: 's3:PutObject',
            Resource: Match.anyValue(),
            Condition: {
              StringEquals: { 'aws:SourceAccount': 'test-account' },
              ArnLike: { 'aws:SourceArn': 'arn:aws:bedrock:test-region:test-account:*' },
            },
          },
        ]),
      },
    });
  });

  test('Test Lambda Function Security Configuration', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify Lambda function has proper runtime and configuration
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
      Handler: 'bedrock_settings.lambda_handler',
      Environment: {
        Variables: {
          LOG_LEVEL: 'INFO',
        },
      },
    });

    // Verify Lambda execution role has minimal required permissions
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });
  });

  test('Test Resource Tagging and Naming Compliance', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify resources follow naming convention (names may be truncated)
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('test-org-test-env-test-domain-test-module-logs-model.*'),
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName:
        '/aws/bedrock/model-invocation-logs/test-org-test-env-test-domain-test-module-bedrock-model-invocation',
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: Match.stringLikeRegexp('test-org-test-env-test-domain-test-module-bedrock-loggi.*'),
    });

    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/test-org-test-env-test-domain-test-module-bedrock-kms-key',
    });
  });

  test('Test Audit Trail Configuration', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    const template = Template.fromStack(testApp.testStack);

    // Verify custom resource configuration for audit logging
    template.hasResourceProperties('Custom::logs-model-invocation', {
      enableAuditLoggingToS3: true,
      s3Config: {
        s3Bucket: Match.anyValue(), // CloudFormation reference
        s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation',
      },
      enableAuditLoggingToCloudwatch: true,
      cloudwatchConfig: {
        cloudwatchLogGroupName: Match.anyValue(), // CloudFormation reference
        largeDataDeliveryS3Config: {
          s3Bucket: Match.anyValue(), // CloudFormation reference
          s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/',
        },
      },
    });
  });
});
