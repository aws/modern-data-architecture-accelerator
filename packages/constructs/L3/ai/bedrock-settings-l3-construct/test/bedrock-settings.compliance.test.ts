/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockSettingsL3Construct, BedrockSettingsL3ConstructProps } from '../lib';

describe('Bedrock Settings L3 Construct Compliance Tests', () => {
  test('Basic Bedrock Settings Creation with S3 Logging', () => {
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

  test('Bedrock Settings with CloudWatch Logging', () => {
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

  test('Bedrock Settings with Both S3 and CloudWatch Logging', () => {
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

  test('KMS Key Policy Compliance', () => {
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

  test('S3 Bucket Policy Compliance', () => {
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

  test('Lambda Function Security Configuration', () => {
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
      Runtime: 'python3.14',
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

  test('Error Handling - No Logging Destinations Enabled', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

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

  test('CloudWatch Log Group Configuration', () => {
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

    // Verify CloudWatch Log Group has infinite retention for audit purposes
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: Match.absent(),
    });

    // Verify S3 bucket is still created (used for CloudWatch large data delivery)
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('S3-Only Configuration', () => {
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

    // Verify no CloudWatch Log Group is created when CloudWatch logging is disabled
    template.resourceCountIs('AWS::Logs::LogGroup', 0);

    // Verify S3 bucket is created
    template.resourceCountIs('AWS::S3::Bucket', 1);

    // Verify service role policy only includes KMS permissions (no CloudWatch)
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
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

  test('Custom Resource Configuration Properties', () => {
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

    // Verify custom resource has correct configuration
    template.hasResourceProperties('Custom::logs-model-invocation', {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      s3Config: {
        s3Bucket: Match.anyValue(),
        s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation',
      },
      cloudwatchConfig: {
        cloudwatchLogGroupName: Match.anyValue(),
        largeDataDeliveryS3Config: {
          s3Bucket: Match.anyValue(),
          s3Prefix: 'bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/',
        },
      },
    });
  });

  test('CDK Nag Suppressions Applied', () => {
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

    // Verify S3 bucket exists (suppressions are applied to this resource)
    template.resourceCountIs('AWS::S3::Bucket', 1);

    // Verify Lambda function has IAM policy suppression for wildcard resources
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
        ]),
      },
    });
  });

  test('Resource Naming Convention', () => {
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

    // Verify S3 bucket follows naming convention
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('.*logs-model.*'),
    });

    // Verify KMS key alias follows naming convention
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: Match.stringLikeRegexp('alias/.*bedrock-kms-key.*'),
    });

    // Verify IAM role follows naming convention
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: Match.stringLikeRegexp('.*bedrock-loggi.*'),
    });
  });

  test('Security Configuration - Encryption at Rest', () => {
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

    // Verify KMS key has rotation enabled
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });

    // Verify CloudWatch Log Group uses KMS encryption
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: Match.anyValue(),
    });

    // Verify S3 bucket uses KMS encryption
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
              KMSMasterKeyID: Match.anyValue(),
            },
          },
        ],
      },
    });
  });

  test('Service Principal Conditions', () => {
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

    // Verify S3 bucket policy has proper source account and ARN conditions
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

  test('Resource Tagging and Naming Compliance', () => {
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

  test('Audit Trail Configuration', () => {
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
  describe('Invocation Log Masking and Retention', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: BedrockSettingsL3ConstructProps = {
      enableAuditLoggingToS3: true,
      enableAuditLoggingToCloudwatch: true,
      logRetentionDays: 365,
      s3RetentionDays: 365,
      naming: testApp.naming,
      roleHelper,
    };

    new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', props);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Invocation log group masks PII on ingestion', () => {
      const maskedIdentifiers = Match.arrayWith([
        'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
        'arn:aws:dataprotection::aws:data-identifier/CreditCardNumber',
        'arn:aws:dataprotection::aws:data-identifier/Ssn-US',
      ]);
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365,
        DataProtectionPolicy: {
          Statement: [
            { Sid: 'audit-policy', DataIdentifier: maskedIdentifiers },
            {
              Sid: 'redact-policy',
              DataIdentifier: maskedIdentifiers,
              Operation: { Deidentify: { MaskConfig: {} } },
            },
          ],
        },
      });
    });

    test('Bucket expires current and noncurrent object versions', () => {
      // Expiring a version-enabled bucket's objects also requires expiring the noncurrent versions
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [{ Status: 'Enabled', ExpirationInDays: 365, NoncurrentVersionExpiration: { NoncurrentDays: 1 } }],
        },
      });
    });
  });
});

describe('Bedrock Settings L3 Construct Token Usage Alarm Compliance', () => {
  const testApp = new MdaaTestApp();
  new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
    enableAuditLoggingToS3: true,
    enableAuditLoggingToCloudwatch: true,
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    tokenUsageAlarms: {
      createNotificationTopic: true,
      notificationEmails: ['finops@example.com'],
      models: {
        'nova-micro': {
          modelIds: ['amazon.nova-micro-v1:0', 'us.amazon.nova-micro-v1:0'],
          inputTokenThreshold: 500000,
          outputTokenThreshold: 200000,
        },
      },
      accountTotal: { inputTokenThreshold: 10000000 },
    },
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Token usage alarm topic is encrypted with the module key', () => {
    const [moduleKeyId] = Object.keys(template.findResources('AWS::KMS::Key'));
    const [topicId] = Object.keys(template.findResources('AWS::SNS::Topic'));
    template.resourceCountIs('AWS::KMS::Key', 1);
    template.hasResourceProperties('AWS::SNS::Topic', { KmsMasterKeyId: { 'Fn::GetAtt': [moduleKeyId, 'Arn'] } });
    template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [{ Ref: topicId }] });
  });
});

describe('Bedrock Settings L3 Construct Token Usage Alarm Compliance with an Existing Topic', () => {
  const existingTopicArn = 'arn:test-partition:sns:test-region:test-account:ai-platform-alerts';
  const testApp = new MdaaTestApp();
  new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
    enableAuditLoggingToS3: true,
    enableAuditLoggingToCloudwatch: true,
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    tokenUsageAlarms: {
      notificationTopicArn: existingTopicArn,
      models: {
        'nova-micro': {
          modelIds: ['amazon.nova-micro-v1:0', 'us.amazon.nova-micro-v1:0'],
          inputTokenThreshold: 500000,
        },
      },
      accountTotal: { inputTokenThreshold: 10000000 },
    },
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Token usage alarms notify the existing topic without creating one', () => {
    template.resourceCountIs('AWS::SNS::Topic', 0);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [existingTopicArn] });
  });
});

const objectsArn = { 'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.anyValue(), 'Arn'] }, '/*']] };
const bucketArn = { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] };
const viaS3 = { 'kms:ViaService': 's3.test-region.amazonaws.com' };

// Exact statement: inside Match.arrayWith a literal object must match with no extra keys
const unconditionalReadDeny = {
  Sid: 'DenyObjectReadsExceptReadRoles',
  Effect: 'Deny',
  Principal: { AWS: '*' },
  Action: 's3:GetObject*',
  Resource: objectsArn,
};

type PolicyStatementJson = Record<string, unknown>;

function createReadRestrictionTestApp(props: Partial<BedrockSettingsL3ConstructProps>): MdaaTestApp {
  const testApp = new MdaaTestApp();
  new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
    enableAuditLoggingToS3: true,
    enableAuditLoggingToCloudwatch: true,
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    ...props,
  });
  return testApp;
}

function policyStatements(template: Template, type: string, documentKey: string): PolicyStatementJson[] {
  const [resource] = Object.values(template.findResources(type));
  return resource.Properties[documentKey].Statement;
}

function bucketPolicyStatements(template: Template): PolicyStatementJson[] {
  return policyStatements(template, 'AWS::S3::BucketPolicy', 'PolicyDocument');
}

/** Whether an IAM action pattern, which may contain * and ? wildcards, matches an action. */
function actionPatternMatches(pattern: string, action: string): boolean {
  const regex = [...pattern]
    .map(char => {
      if (char === '*') return '.*';
      if (char === '?') return '.';
      return char.replace(/[.+^${}()|[\]\\]/g, String.raw`\$&`);
    })
    .join('');
  return new RegExp(`^${regex}$`, 'i').test(action);
}

/** Whether a policy statement's Action or NotAction applies to an action. */
function statementCoversAction(statement: PolicyStatementJson, action: string): boolean {
  if (statement.NotAction !== undefined) {
    return ![statement.NotAction].flat().some(pattern => actionPatternMatches(pattern as string, action));
  }
  return [statement.Action].flat().some(pattern => actionPatternMatches(pattern as string, action));
}

describe('Bedrock Settings L3 Construct Invocation Log Read Restriction without Read Roles', () => {
  const testApp = createReadRestrictionTestApp({});
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('object reads are denied to every principal', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: { Statement: Match.arrayWith([unconditionalReadDeny]) },
    });
    const sids = bucketPolicyStatements(template).map(statement => statement.Sid);
    expect(sids).not.toContain('AllowObjectReadsToReadRoles');
    expect(sids).not.toContain('AllowReadsToCrossAccountReadRoles');
  });

  test('no unconditional Deny covers the s3:PutObject Bedrock writes the logs with', () => {
    const putDenies = bucketPolicyStatements(template).filter(
      statement => statement.Effect === 'Deny' && statementCoversAction(statement, 's3:PutObject'),
    );
    expect(putDenies.every(statement => statement.Condition !== undefined)).toBe(true);
  });

  test('the action pattern check recognises wildcards', () => {
    expect(statementCoversAction({ Action: 's3:*' }, 's3:PutObject')).toBe(true);
    expect(statementCoversAction({ Action: ['s3:Get*', 's3:Put*'] }, 's3:PutObject')).toBe(true);
    expect(statementCoversAction({ Action: 's3:GetObject*' }, 's3:PutObject')).toBe(false);
    expect(statementCoversAction({ NotAction: 's3:GetObject' }, 's3:PutObject')).toBe(true);
  });
});

describe('Bedrock Settings L3 Construct Invocation Log Read Restriction with CloudWatch Logging Only', () => {
  const testApp = createReadRestrictionTestApp({ enableAuditLoggingToS3: false });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('the read Deny covers the bucket receiving the large-data overflow', () => {
    template.hasResourceProperties('Custom::logs-model-invocation', {
      cloudwatchConfig: { largeDataDeliveryS3Config: { s3Bucket: { Ref: Match.anyValue() } } },
    });
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: { Statement: Match.arrayWith([unconditionalReadDeny]) },
    });
  });
});

describe('Bedrock Settings L3 Construct Invocation Log Read Restriction with Read Roles', () => {
  const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountReader';
  const testApp = createReadRestrictionTestApp({
    readRoleRefs: [{ id: 'test-read-role-id' }, { arn: crossAccountArn }],
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  const grantsToReadRoles = (statement: PolicyStatementJson): boolean =>
    JSON.stringify(statement).includes('test-read-role-id') || JSON.stringify(statement).includes(crossAccountArn);

  test('the Deny excludes the same-account role by aws:userId and the cross-account role by aws:PrincipalArn', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            ...unconditionalReadDeny,
            Condition: {
              StringNotLike: {
                'aws:userId': ['test-read-role-id:*'],
                'aws:PrincipalArn': [crossAccountArn],
              },
            },
          },
        ]),
      },
    });
  });

  test('both roles may read the objects, and only the cross-account role gets bucket-level access', () => {
    const allows = bucketPolicyStatements(template).filter(
      statement => statement.Effect === 'Allow' && grantsToReadRoles(statement),
    );
    expect(allows).toEqual([
      {
        Sid: 'AllowObjectReadsToReadRoles',
        Effect: 'Allow',
        Principal: { AWS: '*' },
        Action: 's3:GetObject*',
        Resource: expect.anything(),
        Condition: { StringLike: { 'aws:userId': ['test-read-role-id:*'] } },
      },
      {
        Sid: 'AllowReadsToCrossAccountReadRoles',
        Effect: 'Allow',
        Principal: { AWS: crossAccountArn },
        Action: ['s3:GetObject*', 's3:ListBucket', 's3:GetBucketLocation'],
        Resource: [expect.anything(), expect.anything()],
      },
    ]);
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AllowObjectReadsToReadRoles', Resource: objectsArn }),
          Match.objectLike({ Sid: 'AllowReadsToCrossAccountReadRoles', Resource: [bucketArn, objectsArn] }),
        ]),
      },
    });
  });

  test('every Allow that names any principal is limited to the read roles by aws:userId', () => {
    const anyPrincipalAllows = [
      ...bucketPolicyStatements(template),
      ...policyStatements(template, 'AWS::KMS::Key', 'KeyPolicy'),
    ].filter(statement => statement.Effect === 'Allow' && JSON.stringify(statement.Principal) === '{"AWS":"*"}');
    expect(anyPrincipalAllows).toHaveLength(2);
    for (const statement of anyPrincipalAllows) {
      expect(statement.Condition).toMatchObject({ StringLike: { 'aws:userId': ['test-read-role-id:*'] } });
    }
  });

  test('both roles may decrypt with the module key only through S3, and get no other key usage', () => {
    const keyGrants = policyStatements(template, 'AWS::KMS::Key', 'KeyPolicy').filter(grantsToReadRoles);
    expect(keyGrants).toHaveLength(2);
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: 'kms:Decrypt',
            Resource: '*',
            Condition: { StringLike: { 'aws:userId': ['test-read-role-id:*'] }, StringEquals: viaS3 },
          },
          {
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: ['kms:Decrypt', 'kms:DescribeKey'],
            Resource: '*',
            Condition: { StringEquals: viaS3 },
          },
        ]),
      },
    });
  });
});
