/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { CfnKey, Key } from 'aws-cdk-lib/aws-kms';
import {
  addAlarmNotificationWarnings,
  resolveAlarmNotificationTopic,
  validateAlarmNotificationTarget,
} from '../lib/alarm-notification';

const EXISTING_TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:existing-topic';

describe('validateAlarmNotificationTarget', () => {
  test('accepts an existing topic', () => {
    expect(() => validateAlarmNotificationTarget({ notificationTopicArn: EXISTING_TOPIC_ARN })).not.toThrow();
  });

  test('accepts a created topic with emails', () => {
    expect(() =>
      validateAlarmNotificationTarget({ createNotificationTopic: true, notificationEmails: ['ops@example.com'] }),
    ).not.toThrow();
  });

  test('throws when no target is set, naming the config path', () => {
    expect(() => validateAlarmNotificationTarget({}, 'guardrailAlarms')).toThrow(
      'Alarms require a notification target: set either guardrailAlarms.notificationTopicArn (existing topic) ' +
        'or guardrailAlarms.createNotificationTopic: true.',
    );
  });

  test('throws when both targets are set', () => {
    expect(() =>
      validateAlarmNotificationTarget({ notificationTopicArn: EXISTING_TOPIC_ARN, createNotificationTopic: true }),
    ).toThrow(/^alarms\.notificationTopicArn and alarms\.createNotificationTopic are mutually exclusive/);
  });

  // The deploying role holds no sns:Subscribe on a topic MDAA did not create, so this
  // would otherwise fail at deploy.
  test('throws when emails are combined with an existing topic', () => {
    expect(() =>
      validateAlarmNotificationTarget(
        { notificationTopicArn: EXISTING_TOPIC_ARN, notificationEmails: ['ops@example.com'] },
        'tokenUsageAlarms',
      ),
    ).toThrow(/^tokenUsageAlarms\.notificationEmails cannot be combined with tokenUsageAlarms\.notificationTopicArn/);
  });

  test('allows an empty email list alongside an existing topic', () => {
    expect(() =>
      validateAlarmNotificationTarget({ notificationTopicArn: EXISTING_TOPIC_ARN, notificationEmails: [] }),
    ).not.toThrow();
  });
});

describe('resolveAlarmNotificationTopic', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('returns an existing topic ARN without creating a topic', () => {
    const target = resolveAlarmNotificationTopic(testApp.testStack, {
      naming: testApp.naming,
      notificationTopicArn: EXISTING_TOPIC_ARN,
      topicName: 'alarms',
      alarmNamePattern: 'test-*',
    });

    expect(target).toEqual({ topicArn: EXISTING_TOPIC_ARN });
    Template.fromStack(testApp.testStack).resourceCountIs('AWS::SNS::Topic', 0);
  });

  test('creates a CMK-encrypted topic with trimmed email subscriptions', () => {
    const masterKey = new Key(testApp.testStack, 'Key');
    const target = resolveAlarmNotificationTopic(testApp.testStack, {
      naming: testApp.naming,
      createNotificationTopic: true,
      notificationEmails: [' ops@example.com '],
      topicName: 'alarms',
      masterKey,
      alarmNamePattern: 'test-*',
    });

    expect(target.topic).toBeDefined();
    expect(target.topicArn).toBe(target.topic?.topicArn);
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'test-org-test-env-test-domain-test-module-alarms',
      KmsMasterKeyId: { 'Fn::GetAtt': [testApp.testStack.getLogicalId(masterKey.node.defaultChild as CfnKey), 'Arn'] },
    });
    template.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'ops@example.com' });
  });

  // Without both grants CloudWatch cannot publish to the CMK-encrypted topic, and the
  // alarm fires without anyone being notified.
  test('grants CloudWatch publish on the topic and use of the key, scoped to the alarm name pattern', () => {
    const masterKey = new Key(testApp.testStack, 'Key');
    resolveAlarmNotificationTopic(testApp.testStack, {
      naming: testApp.naming,
      createNotificationTopic: true,
      topicName: 'alarms',
      masterKey,
      alarmNamePattern: 'test-prefix-*',
    });

    const template = Template.fromStack(testApp.testStack);
    const scopedToPattern = Match.objectLike({ ArnLike: { 'aws:SourceArn': Match.anyValue() } });
    template.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AllowCloudWatchAlarmsToPublish', Condition: scopedToPattern }),
        ]),
      }),
    });
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AllowCloudWatchAlarmsToUseKey', Condition: scopedToPattern }),
        ]),
      }),
    });
    expect(JSON.stringify(template.toJSON())).toContain(':alarm:test-prefix-*');
  });

  // An imported key's policy cannot be changed, so a topic on it would deploy cleanly and
  // never receive a notification.
  test('throws when creating a topic on an imported key, pointing to notificationTopicArn', () => {
    expect(() =>
      resolveAlarmNotificationTopic(testApp.testStack, {
        naming: testApp.naming,
        createNotificationTopic: true,
        topicName: 'alarms',
        masterKey: Key.fromKeyArn(
          testApp.testStack,
          'Imported',
          'arn:test-partition:kms:test-region:test-account:key/k',
        ),
        alarmNamePattern: 'test-*',
        configPath: 'tokenUsageAlarms',
      }),
    ).toThrow(
      /^tokenUsageAlarms\.createNotificationTopic cannot use an imported KMS key.*tokenUsageAlarms\.notificationTopicArn/,
    );
  });

  test('names the default alarms config path in the imported-key error', () => {
    expect(() =>
      resolveAlarmNotificationTopic(testApp.testStack, {
        naming: testApp.naming,
        createNotificationTopic: true,
        topicName: 'alarms',
        masterKey: Key.fromKeyArn(
          testApp.testStack,
          'Imported',
          'arn:test-partition:kms:test-region:test-account:key/k',
        ),
        alarmNamePattern: 'test-*',
      }),
    ).toThrow(/^alarms\.createNotificationTopic cannot use an imported KMS key.*alarms\.notificationTopicArn/);
  });

  test('throws when creating a topic without a KMS key', () => {
    expect(() =>
      resolveAlarmNotificationTopic(testApp.testStack, {
        naming: testApp.naming,
        createNotificationTopic: true,
        topicName: 'alarms',
        alarmNamePattern: 'test-*',
      }),
    ).toThrow('A KMS key is required to create a CMK-encrypted alarm notification topic.');
  });
});

describe('addAlarmNotificationWarnings', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  function warnings(pattern: string) {
    return Annotations.fromStack(testApp.testStack).findWarning('*', Match.stringLikeRegexp(pattern));
  }

  test('warns when a created topic has no subscribers', () => {
    addAlarmNotificationWarnings(testApp.testStack, {
      createNotificationTopic: true,
      configPath: 'guardrailAlarms',
      warningIdPrefix: '@aws-mdaa/test',
    });

    expect(warnings('guardrailAlarms.notificationEmails is not set')).toHaveLength(1);
  });

  test('warns that an existing topic cannot be verified', () => {
    addAlarmNotificationWarnings(testApp.testStack, {
      notificationTopicArn: EXISTING_TOPIC_ARN,
      configPath: 'guardrailAlarms',
      warningIdPrefix: '@aws-mdaa/test',
    });

    expect(warnings('MDAA cannot verify or modify at synth')).toHaveLength(1);
  });

  test('does not warn for a created topic with subscribers', () => {
    addAlarmNotificationWarnings(testApp.testStack, {
      createNotificationTopic: true,
      notificationEmails: ['ops@example.com'],
      configPath: 'guardrailAlarms',
      warningIdPrefix: '@aws-mdaa/test',
    });

    expect(warnings('.*')).toHaveLength(0);
  });
});
