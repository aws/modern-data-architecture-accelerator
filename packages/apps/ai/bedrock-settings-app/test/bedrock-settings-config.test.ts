/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { BedrockSettingsConfigParser } from '../lib/bedrock-settings-config';

const TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:ai-platform-alerts';
const ACCOUNT_TOTAL = { accountTotal: { inputTokenThreshold: 1000000 } };

function parse(tokenUsageAlarms: object): BedrockSettingsConfigParser {
  const app = new MdaaTestApp();
  return new BedrockSettingsConfigParser(app.testStack, {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    naming: app.naming,
    rawConfig: { enableAuditLoggingToCloudwatch: true, enableAuditLoggingToS3: true, tokenUsageAlarms },
  });
}

// The notification target is a union of two shapes in the schema, so an invalid target
// fails schema validation (and the editor's schema check) rather than only at synth.
describe('tokenUsageAlarms notification target schema', () => {
  test.each([
    ['an existing topic', { ...ACCOUNT_TOTAL, notificationTopicArn: TOPIC_ARN }],
    [
      'a created topic with emails',
      { ...ACCOUNT_TOTAL, createNotificationTopic: true, notificationEmails: ['ops@example.com'] },
    ],
  ])('accepts %s', (_, tokenUsageAlarms) => {
    expect(parse(tokenUsageAlarms).tokenUsageAlarms).toEqual(tokenUsageAlarms);
  });

  test.each([
    ['both targets', { ...ACCOUNT_TOTAL, notificationTopicArn: TOPIC_ARN, createNotificationTopic: true }],
    ['no target', ACCOUNT_TOTAL],
    [
      'emails with an existing topic',
      { ...ACCOUNT_TOTAL, notificationTopicArn: TOPIC_ARN, notificationEmails: ['ops@example.com'] },
    ],
  ])('rejects %s', (_, tokenUsageAlarms) => {
    expect(() => parse(tokenUsageAlarms)).toThrow(/shape errors/);
  });
});
