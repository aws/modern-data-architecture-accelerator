/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER,
  AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER,
  createAgentCoreEventBridgeRules,
} from '../lib';

describe('createAgentCoreEventBridgeRules Compliance', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new MdaaKmsKey(testApp.testStack, 'TestKey', {
    alias: 'test-alert-key',
    naming: testApp.naming,
  });

  const createdTopic = new MdaaSnsTopic(testApp.testStack, 'CreatedTopic', {
    topicName: 'created-alerts',
    masterKey: kmsKey,
    naming: testApp.naming,
  });

  // Module-created CMK-encrypted topic target, including a customer-supplied
  // remediation Lambda (exercises the Lambda permission path).
  createAgentCoreEventBridgeRules(testApp.testStack, 'CreatedTopicAlerts', {
    resourceName: 'created-topic-runtime',
    naming: testApp.naming,
    notificationTopic: createdTopic,
    resourceRequestParameters: {
      [AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER]: 'created-topic-runtime-abc123',
      [AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER]:
        'arn:aws:bedrock-agentcore:test-region:test-account:runtime/created-topic-runtime-abc123',
    },
    resourceArns: ['arn:aws:bedrock-agentcore:test-region:test-account:runtime/created-topic-runtime-abc123'],
    rules: {
      'auth-failure': {
        description: 'Denied AgentCore invocations',
        errorCodes: ['AccessDeniedException', 'UnauthorizedException'],
      },
      'config-change': {
        description: 'Out-of-band runtime configuration change',
        eventNames: ['UpdateAgentRuntime', 'DeleteAgentRuntime'],
        targetLambdaArn: 'arn:aws:lambda:test-region:test-account:function:agentcore-remediation',
      },
    },
  });

  // Existing-topic reference path.
  createAgentCoreEventBridgeRules(testApp.testStack, 'ReferencedTopicAlerts', {
    resourceName: 'referenced-topic-runtime',
    naming: testApp.naming,
    notificationTopic: Topic.fromTopicArn(
      testApp.testStack,
      'ReferencedTopic',
      'arn:aws:sns:test-region:test-account:existing-alerts',
    ),
    resourceRequestParameters: {
      [AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER]: 'referenced-topic-runtime-def456',
      [AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER]:
        'arn:aws:bedrock-agentcore:test-region:test-account:runtime/referenced-topic-runtime-def456',
    },
    resourceArns: ['arn:aws:bedrock-agentcore:test-region:test-account:runtime/referenced-topic-runtime-def456'],
    rules: {
      'auth-failure': { errorCodes: ['AccessDeniedException'] },
    },
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
