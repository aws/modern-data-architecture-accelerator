/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
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
        Runtime: 'python3.14',
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
        Runtime: 'python3.14',
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
  describe('Invocation Log Data Protection', () => {
    const arnFor = (name: string) => `arn:aws:dataprotection::aws:data-identifier/${name}`;
    const builtInArns = [
      'EmailAddress',
      'CreditCardNumber',
      'Ssn-US',
      'Name',
      'Address',
      'PhoneNumber-US',
      'IpAddress',
    ].map(arnFor);

    const dataProtectionPolicy = (template: Template): Record<string, unknown> => {
      const logGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
      expect(logGroups).toHaveLength(1);
      return logGroups[0].Properties.DataProtectionPolicy;
    };

    test('should always mask the built-in identifiers', () => {
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
      });
      const policy = dataProtectionPolicy(Template.fromStack(testApp.testStack));

      expect(policy).toEqual({
        Name: 'bedrock-invocation-data-protection',
        Version: '2021-06-01',
        Statement: [
          {
            Sid: 'audit-policy',
            DataIdentifier: builtInArns,
            Operation: { Audit: { FindingsDestination: {} } },
          },
          {
            Sid: 'redact-policy',
            DataIdentifier: builtInArns,
            Operation: { Deidentify: { MaskConfig: {} } },
          },
        ],
      });
    });

    test('should add configured identifiers without removing built-in ones', () => {
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        logDataProtection: { additionalIdentifiers: ['DriversLicense-US'] },
        naming: testApp.naming,
        roleHelper,
      });
      const policy = dataProtectionPolicy(Template.fromStack(testApp.testStack));

      const statements = policy.Statement as Array<{ DataIdentifier: string[] }>;
      expect(statements).toHaveLength(2);
      statements.forEach(statement => {
        expect(statement.DataIdentifier).toEqual([...builtInArns, arnFor('DriversLicense-US')]);
      });
    });

    test('should reject logDataProtection when CloudWatch logging is disabled', () => {
      expect(() => {
        new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
          enableAuditLoggingToS3: true,
          enableAuditLoggingToCloudwatch: false,
          logDataProtection: { additionalIdentifiers: ['DriversLicense-US'] },
          naming: testApp.naming,
          roleHelper,
        });
      }).toThrow(
        'logDataProtection configures the CloudWatch invocation log group and requires enableAuditLoggingToCloudwatch: true.',
      );
    });
  });

  describe('CloudWatch Log Retention', () => {
    const createWithRetention = (logRetentionDays?: number) =>
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        logRetentionDays,
        naming: testApp.naming,
        roleHelper,
      });

    test('should apply a configured retention period', () => {
      createWithRetention(90);
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 90,
      });
    });

    test.each([undefined, 9999])('should never expire logs when retention is %s', logRetentionDays => {
      createWithRetention(logRetentionDays);
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: Match.absent(),
      });
    });

    test('should reject a value CloudWatch Logs does not accept', () => {
      expect(() => createWithRetention(45)).toThrow("Invalid logRetentionDays '45'.");
    });

    test('should reject logRetentionDays when CloudWatch logging is disabled', () => {
      expect(() => {
        new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
          enableAuditLoggingToS3: true,
          enableAuditLoggingToCloudwatch: false,
          logRetentionDays: 90,
          naming: testApp.naming,
          roleHelper,
        });
      }).toThrow(
        'logRetentionDays configures the CloudWatch invocation log group and requires enableAuditLoggingToCloudwatch: true.',
      );
    });
  });

  describe('S3 Log Retention', () => {
    const createWithS3Retention = (s3RetentionDays?: number, options: { enableAuditLoggingToS3?: boolean } = {}) =>
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: options.enableAuditLoggingToS3 ?? true,
        enableAuditLoggingToCloudwatch: true,
        s3RetentionDays,
        naming: testApp.naming,
        roleHelper,
      });

    const expectedRules = [
      {
        Id: 'expire-model-invocation-logs',
        Status: 'Enabled',
        ExpirationInDays: 365,
        NoncurrentVersionExpiration: { NoncurrentDays: 1 },
      },
    ];

    test('should expire current and noncurrent versions bucket-wide', () => {
      createWithS3Retention(365);
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: { Rules: expectedRules },
      });
    });

    test('should expire the large-data overflow when only CloudWatch logging is enabled', () => {
      createWithS3Retention(365, { enableAuditLoggingToS3: false });
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: { Rules: expectedRules },
      });
    });

    test('should keep objects indefinitely when no retention is configured', () => {
      createWithS3Retention(undefined);
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: Match.absent(),
      });
    });

    test.each([0, -1, 1.5])('should reject s3RetentionDays %s', s3RetentionDays => {
      expect(() => createWithS3Retention(s3RetentionDays)).toThrow(
        `Invalid s3RetentionDays '${s3RetentionDays}'. Must be a positive integer number of days.`,
      );
    });
  });

  describe('Read Roles', () => {
    const readDenyCondition = (template: Template): unknown => {
      const [policy] = Object.values(template.findResources('AWS::S3::BucketPolicy'));
      const statements: { Sid?: string; Condition?: unknown }[] = policy.Properties.PolicyDocument.Statement;
      return statements.find(statement => statement.Sid === 'DenyObjectReadsExceptReadRoles')?.Condition;
    };

    test('should keep the amazonaws.com ViaService suffix in the aws-cn partition', () => {
      // KMS ViaService names end in .amazonaws.com in every partition, unlike the stack's URL suffix
      const cnStack = new Stack(testApp, 'cn-stack', { env: { account: 'test-account', region: 'cn-north-1' } });
      new BedrockSettingsL3Construct(cnStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(cnStack, testApp.naming),
        readRoleRefs: [{ id: 'reader-one' }, { arn: 'arn:aws-cn:iam::999999999999:role/CrossAccountReader' }],
      });
      const keyPolicy = Object.values(Template.fromStack(cnStack).findResources('AWS::KMS::Key'))[0].Properties
        .KeyPolicy;
      const viaServices = keyPolicy.Statement.map(
        (statement: { Condition?: { StringEquals?: { 'kms:ViaService'?: unknown } } }) =>
          statement.Condition?.StringEquals?.['kms:ViaService'],
      ).filter((value: unknown) => value !== undefined);

      expect(viaServices).toEqual(['s3.cn-north-1.amazonaws.com', 's3.cn-north-1.amazonaws.com']);
    });
    test('should exclude only by aws:userId when every read role is in this account', () => {
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ id: 'reader-one' }, { id: 'reader-two' }],
      });

      expect(readDenyCondition(Template.fromStack(testApp.testStack))).toEqual({
        StringNotLike: { 'aws:userId': ['reader-one:*', 'reader-two:*'] },
      });
    });

    test('should grant the read roles access when only CloudWatch logging is enabled', () => {
      // The bucket still receives the CloudWatch destination's large-data overflow
      const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountReader';
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: false,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ id: 'reader-one' }, { arn: crossAccountArn }],
      });
      const template = Template.fromStack(testApp.testStack);
      const userIds = { StringLike: { 'aws:userId': ['reader-one:*'] } };

      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({ Sid: 'AllowObjectReadsToReadRoles', Condition: userIds }),
            Match.objectLike({ Sid: 'AllowReadsToCrossAccountReadRoles', Principal: { AWS: crossAccountArn } }),
          ]),
        },
      });
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({ Action: 'kms:Decrypt', Condition: userIds }),
            Match.objectLike({ Principal: { AWS: crossAccountArn }, Action: ['kms:Decrypt', 'kms:DescribeKey'] }),
          ]),
        },
      });
    });

    test('should exclude only by aws:PrincipalArn when every read role is in another account', () => {
      const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountReader';
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: false,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ arn: crossAccountArn }],
      });
      const template = Template.fromStack(testApp.testStack);

      expect(readDenyCondition(template)).toEqual({ StringNotLike: { 'aws:PrincipalArn': [crossAccountArn] } });
      // A cross-account role ID cannot be resolved from this account, so no role lookup is created
      expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toHaveLength(0);
    });

    test('should look up a same-account role referenced by ARN and match it by role ID', () => {
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ arn: 'arn:test-partition:iam::test-account:role/LocalReader' }],
      });
      const template = Template.fromStack(testApp.testStack);

      expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toHaveLength(1);
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'DenyObjectReadsExceptReadRoles',
              Condition: {
                StringNotLike: {
                  'aws:userId': [{ 'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.anyValue(), 'id'] }, ':*']] }],
                  'aws:PrincipalArn': Match.absent(),
                },
              },
            }),
          ]),
        },
      });
    });

    test('should list a role referenced twice only once', () => {
      const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountReader';
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ id: 'reader-one' }, { id: 'reader-one' }, { arn: crossAccountArn }, { arn: crossAccountArn }],
      });

      expect(readDenyCondition(Template.fromStack(testApp.testStack))).toEqual({
        StringNotLike: { 'aws:userId': ['reader-one:*'], 'aws:PrincipalArn': [crossAccountArn] },
      });
    });

    test('should resolve a same-account role referenced by name to its role ID', () => {
      new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
        enableAuditLoggingToS3: true,
        enableAuditLoggingToCloudwatch: true,
        naming: testApp.naming,
        roleHelper,
        readRoleRefs: [{ name: 'incident-responder' }],
      });
      const template = Template.fromStack(testApp.testStack);

      // The role ID is looked up at deploy time
      expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toHaveLength(1);
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'DenyObjectReadsExceptReadRoles',
              Condition: {
                StringNotLike: {
                  'aws:userId': [{ 'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.anyValue(), 'id'] }, ':*']] }],
                },
              },
            }),
          ]),
        },
      });
    });
  });
});
