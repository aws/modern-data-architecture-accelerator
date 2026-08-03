/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { createCloudTrailAlertRules } from '../lib';

describe('createCloudTrailAlertRules Compliance', () => {
  const testApp = new MdaaTestApp();

  // Stack-owned CMK-encrypted topic target, including a customer-supplied remediation
  // Lambda (exercises the Lambda permission path).
  createCloudTrailAlertRules(testApp.testStack, 'CreatedTopicAlerts', {
    resourceName: 'created-topic-resource',
    naming: testApp.naming,
    sources: ['aws.test-service'],
    eventSources: ['test-service.amazonaws.com'],
    alertSubject: 'Test service security event',
    // enableKeyRotation satisfies the KMS rotation rules in the AwsSolutions, NIST, and
    // PCI packs. A plain CDK Key is used rather than MdaaKmsKey to keep this package
    // free of a test-only dependency on a sibling L2 construct package.
    notificationTopic: new Topic(testApp.testStack, 'CreatedTopic', {
      masterKey: new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true }),
    }),
    resourceRequestParameters: {
      resourceId: 'created-topic-resource-abc123',
      resourceArn: 'arn:test-partition:test-service:test-region:test-account:resource/created-topic-resource-abc123',
    },
    resourceArns: ['arn:test-partition:test-service:test-region:test-account:resource/created-topic-resource-abc123'],
    rules: {
      'auth-failure': {
        description: 'Denied invocations',
        errorCodes: ['AccessDenied', 'UnauthorizedException'],
      },
      'config-change': {
        description: 'Out-of-band configuration change',
        eventNames: ['UpdateResource', 'DeleteResource'],
        targetLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:remediation',
      },
    },
  });

  // Existing-topic reference path.
  createCloudTrailAlertRules(testApp.testStack, 'ReferencedTopicAlerts', {
    resourceName: 'referenced-topic-resource',
    naming: testApp.naming,
    sources: ['aws.test-service'],
    eventSources: ['test-service.amazonaws.com'],
    alertSubject: 'Test service security event',
    notificationTopic: Topic.fromTopicArn(
      testApp.testStack,
      'ReferencedTopic',
      'arn:test-partition:sns:test-region:test-account:existing-alerts',
    ),
    resourceArns: [
      'arn:test-partition:test-service:test-region:test-account:resource/referenced-topic-resource-def456',
    ],
    rules: {
      'auth-failure': { errorCodes: ['AccessDenied'] },
    },
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
