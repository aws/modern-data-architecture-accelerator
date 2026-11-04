/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { BedrockBuilderConfigParser } from '../lib/bedrock-builder-config';

const TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:security-alarms';

function parse(guardrailAlarms: object): BedrockBuilderConfigParser {
  const app = new MdaaTestApp();
  return new BedrockBuilderConfigParser(app.testStack, {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    naming: app.naming,
    rawConfig: { dataAdminRoles: [{ name: 'Admin' }], guardrailAlarms },
  });
}

// The notification target is a union of two shapes in the schema, so an invalid target
// fails schema validation (and the editor's schema check) rather than only at synth.
describe('guardrailAlarms notification target schema', () => {
  test.each([
    ['an existing topic', { notificationTopicArn: TOPIC_ARN }],
    ['a created topic with emails', { createNotificationTopic: true, notificationEmails: ['ops@example.com'] }],
  ])('accepts %s', (_, guardrailAlarms) => {
    expect(parse(guardrailAlarms).guardrailAlarms).toEqual(guardrailAlarms);
  });

  test.each([
    ['both targets', { notificationTopicArn: TOPIC_ARN, createNotificationTopic: true }],
    ['no target', { periodSeconds: 300 }],
    ['emails with an existing topic', { notificationTopicArn: TOPIC_ARN, notificationEmails: ['ops@example.com'] }],
  ])('rejects %s', (_, guardrailAlarms) => {
    expect(() => parse(guardrailAlarms)).toThrow(/shape errors/);
  });
});
