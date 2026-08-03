/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { createAgentCoreAlarms } from '../lib';

describe('createAgentCoreAlarms Compliance', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new MdaaKmsKey(testApp.testStack, 'TestKey', {
    alias: 'test-alarm-key',
    naming: testApp.naming,
  });

  // Module-created CMK-encrypted topic path (exercises SNS topic + topic policy + KMS grant).
  createAgentCoreAlarms(testApp.testStack, 'CreatedTopicAlarms', {
    resourceName: 'created-topic-runtime',
    resourceArn: 'arn:aws:bedrock-agentcore:test-region:test-account:runtime/created-topic-runtime-abc123',
    naming: testApp.naming,
    errorRateThreshold: 10,
    throttleCountThreshold: 100,
    createNotificationTopic: true,
    masterKey: kmsKey,
  });

  // Existing-topic reference path.
  createAgentCoreAlarms(testApp.testStack, 'ReferencedTopicAlarms', {
    resourceName: 'referenced-topic-runtime',
    resourceArn: 'arn:aws:bedrock-agentcore:test-region:test-account:runtime/referenced-topic-runtime-def456',
    naming: testApp.naming,
    throttleCountThreshold: 50,
    notificationTopicArn: 'arn:aws:sns:test-region:test-account:existing-alarm-topic',
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
