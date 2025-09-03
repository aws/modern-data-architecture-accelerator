/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockSettingsL3Construct, BedrockSettingsL3ConstructProps } from '../lib';

describe('BedrockSettingsL3Construct Unit Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  describe('Basic Construct Creation', () => {
    test('should create construct with S3 logging enabled', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      const construct = new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      expect(construct).toBeDefined();

      // Verify S3 bucket creation (name may be truncated)
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('test-org-test-env-test-domain-test-module-logs-model.*'),
      });

      // Verify KMS key creation
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for bedrock invocation logs',
      });

      // Verify custom resource creation
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'bedrock_settings.lambda_handler',
        Runtime: 'python3.13',
      });
    });

    test('should create construct with CloudWatch logging enabled', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify CloudWatch Log Group creation
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName:
          '/aws/bedrock/model-invocation-logs/test-org-test-env-test-domain-test-module-bedrock-model-invocation',
      });
    });

    test('should create construct with both S3 and CloudWatch logging enabled', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify both S3 bucket and CloudWatch Log Group creation
      template.hasResourceProperties('AWS::S3::Bucket', {});
      template.hasResourceProperties('AWS::Logs::LogGroup', {});
    });
  });

  describe('Validation', () => {
    test('should throw error when both logging options are disabled', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      }).toThrow('At least one of enableAuditLoggingToCloudwatch or enableAuditLoggingToS3 must be true.');
    });
  });

  describe('KMS Key Configuration', () => {
    test('should create KMS key with proper policy for all services', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            // Root account access
            {
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::test-account:root' },
              Action: 'kms:*',
              Resource: '*',
            },
            // Bedrock service access
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
            // CloudWatch Logs service access
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
            // S3 logging service access
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
  });

  describe('S3 Bucket Configuration', () => {
    test('should create S3 bucket with proper policy for Bedrock service', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify bucket policy includes Bedrock service access (among other security policies)
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
  });

  describe('IAM Role Configuration', () => {
    test('should create service role with proper permissions for S3 only', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify service role creation (name may be truncated)
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: Match.stringLikeRegexp('test-org-test-env-test-domain-test-module-bedrock-loggi.*'),
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

      // Verify managed policy with KMS permissions only (no CloudWatch permissions)
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        Description: 'Bedrock logging service role policy',
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
            },
          ],
        },
      });
    });

    test('should create service role with CloudWatch permissions when enabled', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify managed policy includes CloudWatch permissions
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
  });

  describe('Custom Resource Configuration', () => {
    test('should create custom resource with proper Lambda permissions', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify Lambda function for custom resource
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'bedrock_settings.lambda_handler',
        Runtime: 'python3.13',
        Environment: {
          Variables: {
            LOG_LEVEL: 'INFO',
          },
        },
      });

      // Verify Lambda execution role has Bedrock permissions
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

    test('should pass correct configuration to custom resource for S3 only', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify custom resource properties (using CloudFormation references)
      template.hasResourceProperties('Custom::logs-model-invocation', {
        enableAuditLoggingToS3: true,
        s3Config: {
          s3Bucket: Match.anyValue(), // CloudFormation reference
          s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation',
        },
        enableAuditLoggingToCloudwatch: false,
      });
    });

    test('should pass correct configuration to custom resource for both S3 and CloudWatch', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify custom resource properties include both configurations
      template.hasResourceProperties('Custom::logs-model-invocation', {
        enableAuditLoggingToS3: true,
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

  describe('Resource Naming', () => {
    test('should apply naming convention to all resources', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Verify naming convention is applied (names may be truncated due to length limits)
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
  });

  describe('Edge Cases', () => {
    test('should handle CloudWatch only configuration', () => {
      const props: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
      const template = Template.fromStack(testApp.testStack);

      // Should still create S3 bucket for large data delivery fallback
      template.hasResourceProperties('AWS::S3::Bucket', {});
      template.hasResourceProperties('AWS::Logs::LogGroup', {});

      // Custom resource should have CloudWatch config but S3 logging disabled
      template.hasResourceProperties('Custom::logs-model-invocation', {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
      });
    });

    test('should create unique resource names for multiple instances', () => {
      const props1: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
      };

      const props2: BedrockSettingsL3ConstructProps = {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings-1', props1);
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings-2', props2);

      const template = Template.fromStack(testApp.testStack);

      // Should create multiple resources without conflicts
      template.resourceCountIs('AWS::S3::Bucket', 2); // Both instances create S3 bucket
      template.resourceCountIs('AWS::Logs::LogGroup', 1); // Only second instance creates log group
      template.resourceCountIs('AWS::KMS::Key', 2); // Each instance creates its own key
    });
  });
});
