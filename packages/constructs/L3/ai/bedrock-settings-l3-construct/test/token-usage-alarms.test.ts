/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockSettingsL3Construct, TokenUsageAlarmsProps } from '../lib';

const EXISTING_TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:token-alarms';
const ALARM_NAME_PREFIX = 'test-org-test-env-test-domain-test-module-token';

function synth(tokenUsageAlarms?: TokenUsageAlarmsProps): MdaaTestApp {
  const testApp = new MdaaTestApp();
  new BedrockSettingsL3Construct(testApp.testStack, 'bedrock-settings', {
    enableAuditLoggingToS3: true,
    enableAuditLoggingToCloudwatch: true,
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    tokenUsageAlarms,
  });
  return testApp;
}

function alarmsByName(template: Template): { [name: string]: { [key: string]: unknown } } {
  return Object.fromEntries(
    Object.values(template.findResources('AWS::CloudWatch::Alarm')).map(alarm => [
      alarm.Properties.AlarmName,
      alarm.Properties,
    ]),
  );
}

describe('BedrockSettingsL3Construct token usage alarms', () => {
  test('creates no alarms or topic when tokenUsageAlarms is not set', () => {
    const template = Template.fromStack(synth().testStack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
    template.resourceCountIs('AWS::SNS::Topic', 0);
  });

  test('a single model ID alarms on that ModelId series directly', () => {
    const template = Template.fromStack(
      synth({
        notificationTopicArn: EXISTING_TOPIC_ARN,
        models: { 'nova-micro': { modelIds: ['amazon.nova-micro-v1:0'], inputTokenThreshold: 500000 } },
      }).testStack,
    );
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    expect(alarmsByName(template)[`${ALARM_NAME_PREFIX}-input-model-nova-micro`]).toMatchObject({
      Namespace: 'AWS/Bedrock',
      MetricName: 'InputTokenCount',
      Statistic: 'Sum',
      Period: 300,
      Dimensions: [{ Name: 'ModelId', Value: 'amazon.nova-micro-v1:0' }],
      Threshold: 500000,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'notBreaching',
      AlarmActions: [EXISTING_TOPIC_ARN],
    });
  });

  // ModelId is matched exactly, so an alarm for a model has to sum every ID callers use for it.
  test('several model IDs are summed in one metric math alarm', () => {
    const modelIds = ['amazon.nova-micro-v1:0', 'us.amazon.nova-micro-v1:0', 'global.amazon.nova-micro-v1:0'];
    const template = Template.fromStack(
      synth({
        notificationTopicArn: EXISTING_TOPIC_ARN,
        models: { 'nova-micro': { modelIds, outputTokenThreshold: 200000 } },
      }).testStack,
    );
    const alarm = alarmsByName(template)[`${ALARM_NAME_PREFIX}-output-model-nova-micro`];
    expect(alarm.Threshold).toBe(200000);
    const metrics = alarm.Metrics;
    if (!Array.isArray(metrics)) {
      throw new Error(`Expected Metrics on the alarm, got ${JSON.stringify(alarm)}`);
    }
    expect(metrics).toHaveLength(4);
    modelIds.forEach((modelId, index) =>
      expect(metrics[index]).toEqual({
        Id: `m${index}`,
        ReturnData: false,
        MetricStat: {
          Metric: {
            MetricName: 'OutputTokenCount',
            Namespace: 'AWS/Bedrock',
            Dimensions: [{ Name: 'ModelId', Value: modelId }],
          },
          Stat: 'Sum',
          Period: 300,
        },
      }),
    );
    expect(metrics[3]).toMatchObject({ Id: 'tokens', Expression: 'm0 + m1 + m2', ReturnData: true });
    expect(alarm.AlarmActions).toEqual([EXISTING_TOPIC_ARN]);
  });

  test('an existing topic creates no topic and no CloudWatch grant on the module key', () => {
    const template = Template.fromStack(
      synth({ notificationTopicArn: EXISTING_TOPIC_ARN, accountTotal: { inputTokenThreshold: 1 } }).testStack,
    );
    template.resourceCountIs('AWS::SNS::Topic', 0);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [EXISTING_TOPIC_ARN] });
    expect(JSON.stringify(template.toJSON())).not.toContain('AllowCloudWatchAlarmsToUseKey');
  });

  test('account total alarms on the undimensioned series', () => {
    const template = Template.fromStack(
      synth({
        notificationTopicArn: EXISTING_TOPIC_ARN,
        accountTotal: { inputTokenThreshold: 10000000, outputTokenThreshold: 2000000 },
      }).testStack,
    );
    const alarms = alarmsByName(template);
    expect(Object.keys(alarms).sort()).toEqual([
      `${ALARM_NAME_PREFIX}-input-account-total`,
      `${ALARM_NAME_PREFIX}-output-account-total`,
    ]);
    expect(alarms[`${ALARM_NAME_PREFIX}-input-account-total`]).toMatchObject({
      MetricName: 'InputTokenCount',
      Threshold: 10000000,
    });
    expect(alarms[`${ALARM_NAME_PREFIX}-input-account-total`].Dimensions).toBeUndefined();
  });

  test('applies timing to every alarm', () => {
    const template = Template.fromStack(
      synth({
        notificationTopicArn: EXISTING_TOPIC_ARN,
        accountTotal: { inputTokenThreshold: 1 },
        periodSeconds: 3600,
        evaluationPeriods: 6,
        datapointsToAlarm: 3,
      }).testStack,
    );
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Period: 3600,
      EvaluationPeriods: 6,
      DatapointsToAlarm: 3,
    });
  });

  test('creates a topic encrypted with the module key, granting CloudWatch scoped to the token alarms', () => {
    const template = Template.fromStack(
      synth({
        createNotificationTopic: true,
        notificationEmails: ['finops@example.com'],
        accountTotal: { outputTokenThreshold: 1 },
      }).testStack,
    );
    template.resourceCountIs('AWS::KMS::Key', 1);
    const [moduleKeyId] = Object.keys(template.findResources('AWS::KMS::Key'));
    const [topicId] = Object.keys(template.findResources('AWS::SNS::Topic'));
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'test-org-test-env-test-domain-test-module-token-usage-alarms',
      KmsMasterKeyId: { 'Fn::GetAtt': [moduleKeyId, 'Arn'] },
    });
    template.allResourcesProperties('AWS::CloudWatch::Alarm', { AlarmActions: [{ Ref: topicId }] });
    template.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'finops@example.com' });
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for bedrock invocation logs',
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([Match.objectLike({ Sid: 'AllowCloudWatchAlarmsToUseKey' })]),
      }),
    });
    expect(JSON.stringify(template.toJSON())).toContain(`:alarm:${ALARM_NAME_PREFIX}-*`);
  });

  test('warns that an existing topic cannot be verified', () => {
    const testApp = synth({ notificationTopicArn: EXISTING_TOPIC_ARN, accountTotal: { inputTokenThreshold: 1 } });
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('tokenUsageAlarms.notificationTopicArn references the existing SNS topic'),
    );
    expect(warnings).toHaveLength(1);
  });

  describe('validation', () => {
    // The type and schema already reject a missing target; the synth check remains for
    // callers that bypass both, such as untyped L3 use.
    test('rejects an invalid notification target', () => {
      expect(() => synth({ accountTotal: { inputTokenThreshold: 1 } } as unknown as TokenUsageAlarmsProps)).toThrow(
        /set either tokenUsageAlarms\.notificationTopicArn/,
      );
    });

    test('rejects a block with no alarms', () => {
      expect(() => synth({ notificationTopicArn: EXISTING_TOPIC_ARN })).toThrow(
        'tokenUsageAlarms requires at least one alarm: set tokenUsageAlarms.models and/or accountTotal.',
      );
    });

    test('rejects a model entry with no threshold', () => {
      expect(() =>
        synth({ notificationTopicArn: EXISTING_TOPIC_ARN, models: { nova: { modelIds: ['amazon.nova-micro-v1:0'] } } }),
      ).toThrow('tokenUsageAlarms.models.nova requires at least one threshold');
    });

    test('rejects an account total with no threshold', () => {
      expect(() => synth({ notificationTopicArn: EXISTING_TOPIC_ARN, accountTotal: {} })).toThrow(
        'tokenUsageAlarms.accountTotal requires at least one threshold',
      );
    });

    test('rejects a negative threshold', () => {
      expect(() =>
        synth({ notificationTopicArn: EXISTING_TOPIC_ARN, accountTotal: { outputTokenThreshold: -1 } }),
      ).toThrow('tokenUsageAlarms.accountTotal.outputTokenThreshold must be >= 0');
    });

    test('accepts exactly 10 model IDs in one metric math alarm', () => {
      const modelIds = Array.from({ length: 10 }, (_, index) => `model-${index}`);
      const template = Template.fromStack(
        synth({ notificationTopicArn: EXISTING_TOPIC_ARN, models: { many: { modelIds, inputTokenThreshold: 1 } } })
          .testStack,
      );
      const [alarm] = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
      expect(alarm.Properties.Metrics).toHaveLength(11);
    });

    // CloudWatch limits a metric math alarm to 10 metrics.
    test.each([0, 11])('rejects %s model IDs', count => {
      const modelIds = Array.from({ length: count }, (_, index) => `model-${index}`);
      expect(() =>
        synth({ notificationTopicArn: EXISTING_TOPIC_ARN, models: { many: { modelIds, inputTokenThreshold: 1 } } }),
      ).toThrow(`tokenUsageAlarms.models.many.modelIds must list 1-10 model IDs (got ${count})`);
    });

    test('rejects a duplicated model ID', () => {
      expect(() =>
        synth({
          notificationTopicArn: EXISTING_TOPIC_ARN,
          models: { nova: { modelIds: ['a', 'b', 'a'], inputTokenThreshold: 1 } },
        }),
      ).toThrow('tokenUsageAlarms.models.nova.modelIds lists a more than once.');
    });

    test('rejects an invalid period', () => {
      expect(() =>
        synth({
          notificationTopicArn: EXISTING_TOPIC_ARN,
          accountTotal: { inputTokenThreshold: 1 },
          periodSeconds: 45,
        }),
      ).toThrow(/^tokenUsageAlarms\.periodSeconds must be a multiple of 60 seconds \(got 45\)/);
    });

    // Bedrock token metrics are one-minute resolution, so a sub-minute alarm gets no datapoints.
    test.each([10, 30])('rejects a sub-minute period of %ss', periodSeconds => {
      expect(() =>
        synth({ notificationTopicArn: EXISTING_TOPIC_ARN, accountTotal: { inputTokenThreshold: 1 }, periodSeconds }),
      ).toThrow(/^tokenUsageAlarms\.periodSeconds must be a multiple of 60 seconds/);
    });

    // PutMetricAlarm allows 1 day for periods under an hour and 7 days otherwise.
    test.each([
      [300, 289],
      [3600, 169],
    ])('rejects period %ss x %s evaluation periods', (periodSeconds, evaluationPeriods) => {
      expect(() =>
        synth({
          notificationTopicArn: EXISTING_TOPIC_ARN,
          accountTotal: { inputTokenThreshold: 1 },
          periodSeconds,
          evaluationPeriods,
        }),
      ).toThrow(/^tokenUsageAlarms\.periodSeconds x tokenUsageAlarms\.evaluationPeriods must not exceed/);
    });

    test('rejects datapointsToAlarm above evaluationPeriods', () => {
      expect(() =>
        synth({
          notificationTopicArn: EXISTING_TOPIC_ARN,
          accountTotal: { inputTokenThreshold: 1 },
          datapointsToAlarm: 2,
        }),
      ).toThrow(
        'tokenUsageAlarms.datapointsToAlarm must be between 1 and 1 (got 2; tokenUsageAlarms.evaluationPeriods is 1).',
      );
    });
  });
});
