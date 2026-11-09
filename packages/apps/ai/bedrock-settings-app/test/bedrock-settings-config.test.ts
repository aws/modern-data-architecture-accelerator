/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { BedrockSettingsConfigParser } from '../lib/bedrock-settings-config';

const TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:ai-platform-alerts';
const ACCOUNT_TOTAL = { accountTotal: { inputTokenThreshold: 1000000 } };

function parseConfig(config: object): BedrockSettingsConfigParser {
  const app = new MdaaTestApp();
  return new BedrockSettingsConfigParser(app.testStack, {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    naming: app.naming,
    rawConfig: { enableAuditLoggingToCloudwatch: true, enableAuditLoggingToS3: true, ...config },
  });
}

function parse(tokenUsageAlarms: object): BedrockSettingsConfigParser {
  return parseConfig({ tokenUsageAlarms });
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

// Invalid retention values and unknown logDataProtection keys fail schema validation rather than at
// synth. The CloudWatch-logging requirement for logRetentionDays and logDataProtection is enforced by
// the L3 construct and tested there.
describe('invocation log masking and retention schema', () => {
  test('accepts the masking and retention properties', () => {
    const parser = parseConfig({
      logDataProtection: { additionalIdentifiers: ['DriversLicense-US'] },
      logRetentionDays: 90,
      s3RetentionDays: 365,
    });
    expect(parser.logDataProtection).toEqual({ additionalIdentifiers: ['DriversLicense-US'] });
    expect(parser.logRetentionDays).toBe(90);
    expect(parser.s3RetentionDays).toBe(365);
  });

  test('accepts 9999 as an explicit never-expire logRetentionDays', () => {
    expect(parseConfig({ logRetentionDays: 9999 }).logRetentionDays).toBe(9999);
  });

  test.each([
    ['a logRetentionDays CloudWatch Logs does not accept', { logRetentionDays: 45 }],
    ['a zero s3RetentionDays', { s3RetentionDays: 0 }],
    ['a negative s3RetentionDays', { s3RetentionDays: -1 }],
    ['a fractional s3RetentionDays', { s3RetentionDays: 1.5 }],
    ['an unknown logDataProtection property', { logDataProtection: { removeIdentifiers: ['EmailAddress'] } }],
  ])('rejects %s', (_, config) => {
    expect(() => parseConfig(config)).toThrow(/shape errors/);
  });
});
