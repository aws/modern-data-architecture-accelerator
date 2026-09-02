/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as kms from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { createAgentCoreLogProtection } from '../lib';

const TEST_RUNTIME_ID = 'my_org_dev__749d67db-QQHgbo7Noj';

describe('createAgentCoreLogProtection', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('should create custom resource for log protection', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::AgentCoreLogProtection', 1);
  });

  test('should pass runtimeId to custom resource', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
    });
  });

  test('should pass kmsKeyArn when KMS key is provided', () => {
    const kmsKey = kms.Key.fromKeyArn(
      testApp.testStack,
      'TestKey',
      'arn:aws:kms:test-region:test-account:key/test-key-id',
    );

    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      kmsKey: kmsKey,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      kmsKeyArn: 'arn:aws:kms:test-region:test-account:key/test-key-id',
    });
  });

  test('should pass retentionDays as string when provided', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      retentionDays: 90,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      retentionDays: '90',
    });
  });

  test('omits retentionDays for the INFINITE sentinel (9999 = never-expire)', () => {
    // 9999 (RetentionDays.INFINITE) means never-expire: no retention policy is applied, so the
    // sentinel is not forwarded to the handler's raw PutRetentionPolicy call (which rejects 9999).
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      retentionDays: RetentionDays.INFINITE,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      retentionDays: Match.absent(),
    });
  });

  test('should pass dataProtectionPolicy as JSON string when provided', () => {
    const policy = {
      Name: 'test-policy',
      Version: '2021-06-01',
      Statement: [
        {
          Sid: 'audit-policy',
          DataIdentifier: ['arn:aws:dataprotection::aws:data-identifier/EmailAddress'],
          Operation: { Audit: { FindingsDestination: {} } },
        },
        {
          Sid: 'redact-policy',
          DataIdentifier: ['arn:aws:dataprotection::aws:data-identifier/EmailAddress'],
          Operation: { Deidentify: { MaskConfig: {} } },
        },
      ],
    };

    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      dataProtectionPolicy: policy,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      dataProtectionPolicy: Match.stringLikeRegexp('.*EmailAddress.*'),
    });
  });

  test('should not include optional properties when not provided', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::AgentCoreLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      kmsKeyArn: Match.absent(),
      retentionDays: Match.absent(),
      dataProtectionPolicy: Match.absent(),
    });
  });

  test('should grant kms:DescribeKey on the key when a KMS key is provided', () => {
    const kmsKey = kms.Key.fromKeyArn(
      testApp.testStack,
      'TestKey',
      'arn:aws:kms:test-region:test-account:key/test-key-id',
    );

    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      kmsKey: kmsKey,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:DescribeKey',
            Resource: 'arn:aws:kms:test-region:test-account:key/test-key-id',
          }),
        ]),
      },
    });
  });

  test('should not grant kms:DescribeKey when no KMS key is provided', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.not(
          Match.arrayWith([
            Match.objectLike({
              Action: 'kms:DescribeKey',
            }),
          ]),
        ),
      },
    });
  });

  test('should create Lambda handler with scoped CloudWatch Logs IAM permissions', () => {
    createAgentCoreLogProtection(testApp.testStack, 'TestLogProtection', {
      runtimeId: TEST_RUNTIME_ID,
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'logs:DescribeLogGroups',
            Resource: '*',
          }),
          Match.objectLike({
            Action: [
              'logs:AssociateKmsKey',
              'logs:DisassociateKmsKey',
              'logs:PutRetentionPolicy',
              'logs:PutDataProtectionPolicy',
            ],
            Resource: `arn:test-partition:logs:test-region:test-account:log-group:/aws/bedrock-agentcore/runtimes/${TEST_RUNTIME_ID}-*`,
          }),
        ]),
      },
    });
  });
});
