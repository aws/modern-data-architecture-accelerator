/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import {
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  GuardrailAlarmsProps,
  NamedGuardrailProps,
} from '../lib';

// Exercises the module-level guardrailAlarms block: its pairing with per-guardrail
// interventionAlarm, the notification topic it resolves, and its synth-time guards.

const dataAdminRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/test-role',
  name: 'test-role',
};

const EXISTING_TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:security-alarms';
const IMPORTED_KEY_ARN = 'arn:test-partition:kms:test-region:test-account:key/1234abcd-12ab-34cd-56ef-1234567890ab';
const CONTENT_FILTERS = { hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' } } as const;

const ALARMED_GUARDRAILS: NamedGuardrailProps = {
  'guardrail-a': { contentFilters: CONTENT_FILTERS, interventionAlarm: { countThreshold: 25 } },
  'guardrail-b': { contentFilters: CONTENT_FILTERS, interventionAlarm: { ratePercentThreshold: 15 } },
  'guardrail-c': { contentFilters: CONTENT_FILTERS },
};

function synth(props: {
  guardrails?: NamedGuardrailProps;
  guardrailAlarms?: GuardrailAlarmsProps;
  kmsKeyArn?: string;
}): MdaaTestApp {
  const testApp = new MdaaTestApp();
  const constructProps: BedrockBuilderL3ConstructProps = {
    dataAdminRoles: [dataAdminRoleRef],
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    ...props,
  };
  new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
  return testApp;
}

describe('BedrockBuilderL3Construct guardrail alarms', () => {
  test('creates no alarms or topic when no guardrail alarms are configured', () => {
    const template = Template.fromStack(
      synth({ guardrails: { 'guardrail-c': { contentFilters: CONTENT_FILTERS } } }).testStack,
    );
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
    template.resourceCountIs('AWS::SNS::Topic', 0);
  });

  test('alarms only the guardrails that set interventionAlarm, all notifying one existing topic', () => {
    const template = Template.fromStack(
      synth({ guardrails: ALARMED_GUARDRAILS, guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN } })
        .testStack,
    );
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.resourceCountIs('AWS::SNS::Topic', 0);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [EXISTING_TOPIC_ARN] });
    // An existing topic is not MDAA's, so the module key gains no CloudWatch grant.
    expect(JSON.stringify(template.toJSON())).not.toContain('AllowCloudWatchAlarmsToUseKey');
    const names = Object.values(template.findResources('AWS::CloudWatch::Alarm')).map(
      alarm => alarm.Properties.AlarmName,
    );
    expect(names.sort()).toEqual([
      'test-org-test-env-test-domain-test-module-guardrail-intervention-count-guardrail-a',
      'test-org-test-env-test-domain-test-module-guardrail-intervention-rate-guardrail-b',
    ]);
  });

  test('defaults to one 300-second period when the block sets no timing', () => {
    const template = Template.fromStack(
      synth({ guardrails: ALARMED_GUARDRAILS, guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN } })
        .testStack,
    );
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', {
      EvaluationPeriods: 1,
      Metrics: Match.arrayWith([Match.objectLike({ Period: 300 })]),
    });
  });

  test('applies the module-level timing to every alarm', () => {
    const template = Template.fromStack(
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: {
          notificationTopicArn: EXISTING_TOPIC_ARN,
          periodSeconds: 600,
          evaluationPeriods: 3,
          datapointsToAlarm: 2,
        },
      }).testStack,
    );
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', {
      EvaluationPeriods: 3,
      DatapointsToAlarm: 2,
      Metrics: Match.arrayWith([Match.objectLike({ Period: 600 })]),
    });
  });

  test('creates one module-key-encrypted topic subscribed to the configured emails', () => {
    const template = Template.fromStack(
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: { createNotificationTopic: true, notificationEmails: ['security@example.com'] },
      }).testStack,
    );
    template.resourceCountIs('AWS::SNS::Topic', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);
    const [moduleKeyId] = Object.keys(template.findResources('AWS::KMS::Key'));
    const [topicId] = Object.keys(template.findResources('AWS::SNS::Topic'));
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'test-org-test-env-test-domain-test-module-guardrail-alarms',
      KmsMasterKeyId: { 'Fn::GetAtt': [moduleKeyId, 'Arn'] },
    });
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [{ Ref: topicId }] });
    template.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'security@example.com' });
    // CloudWatch needs the module key to publish to the encrypted topic.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowCloudWatchAlarmsToUseKey',
            Principal: { Service: 'cloudwatch.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  test('grants scope to the guardrail alarm name prefix', () => {
    const template = Template.fromStack(
      synth({ guardrails: ALARMED_GUARDRAILS, guardrailAlarms: { createNotificationTopic: true } }).testStack,
    );
    expect(JSON.stringify(template.toJSON())).toContain(':alarm:test-org-test-env-test-domain-test-module-guardrail-*');
  });

  test('warns when a created topic has no subscribers', () => {
    const testApp = synth({ guardrails: ALARMED_GUARDRAILS, guardrailAlarms: { createNotificationTopic: true } });
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('guardrailAlarms.notificationEmails is not set'),
    );
    expect(warnings).toHaveLength(1);
  });

  test('warns that an existing topic cannot be verified', () => {
    const testApp = synth({
      guardrails: ALARMED_GUARDRAILS,
      guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN },
    });
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('guardrailAlarms.notificationTopicArn references the existing SNS topic'),
    );
    expect(warnings).toHaveLength(1);
  });

  // An imported key's policy cannot be changed, so a created topic on it would deploy
  // cleanly and never receive a notification.
  test('rejects a created topic when kmsKeyArn imports the module key', () => {
    expect(() =>
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: { createNotificationTopic: true },
        kmsKeyArn: IMPORTED_KEY_ARN,
      }),
    ).toThrow(
      /guardrailAlarms\.createNotificationTopic cannot be used with kmsKeyArn.*guardrailAlarms\.notificationTopicArn/,
    );
  });

  test('allows an existing topic with kmsKeyArn', () => {
    expect(() =>
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN },
        kmsKeyArn: IMPORTED_KEY_ARN,
      }),
    ).not.toThrow();
  });

  test('rejects an evaluation window over 3 hours, naming both properties', () => {
    expect(() =>
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN, periodSeconds: 3600, evaluationPeriods: 4 },
      }),
    ).toThrow(/guardrailAlarms\.periodSeconds x guardrailAlarms\.evaluationPeriods must not exceed 10800 seconds/);
  });

  test('rejects datapointsToAlarm above evaluationPeriods', () => {
    expect(() =>
      synth({
        guardrails: ALARMED_GUARDRAILS,
        guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN, evaluationPeriods: 2, datapointsToAlarm: 3 },
      }),
    ).toThrow(
      'guardrailAlarms.datapointsToAlarm must be between 1 and 2 (got 3; guardrailAlarms.evaluationPeriods is 2).',
    );
  });

  // The type and schema already reject a missing target; the synth check remains for
  // callers that bypass both, such as untyped L3 use.
  test('rejects an invalid notification target', () => {
    expect(() =>
      synth({ guardrails: ALARMED_GUARDRAILS, guardrailAlarms: {} as unknown as GuardrailAlarmsProps }),
    ).toThrow(/set either guardrailAlarms\.notificationTopicArn/);
  });

  test('rejects interventionAlarm without the guardrailAlarms block, naming the guardrails', () => {
    expect(() => synth({ guardrails: ALARMED_GUARDRAILS })).toThrow(
      "Guardrails 'guardrail-a', 'guardrail-b' set interventionAlarm, which requires the module-level " +
        'guardrailAlarms block to set the notification target.',
    );
  });

  test('rejects a guardrailAlarms block no guardrail uses', () => {
    expect(() =>
      synth({
        guardrails: { 'guardrail-c': { contentFilters: CONTENT_FILTERS } },
        guardrailAlarms: { notificationTopicArn: EXISTING_TOPIC_ARN },
      }),
    ).toThrow(/guardrailAlarms is set, but no guardrail sets interventionAlarm/);
  });
});

describe('BedrockBuilderL3Construct guardrail alarms compliance', () => {
  const testApp = synth({
    guardrails: ALARMED_GUARDRAILS,
    guardrailAlarms: { createNotificationTopic: true, notificationEmails: ['security@example.com'] },
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
});
