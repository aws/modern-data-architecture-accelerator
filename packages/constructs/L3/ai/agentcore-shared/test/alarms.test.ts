/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  AGENTCORE_GATEWAY_ERROR_METRICS,
  AGENTCORE_METRIC_DIMENSION_NAME,
  AGENTCORE_RUNTIME_ERROR_METRICS,
  createAgentCoreAlarms,
  DEFAULT_AGENTCORE_METRIC_NAMESPACE,
} from '../lib';

const EXISTING_TOPIC_ARN = 'arn:aws:sns:test-region:test-account:existing-alarm-topic';
const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:test-region:test-account:runtime/my-runtime-abc123';
const GATEWAY_ARN = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gateway-def456';
// `Name` dimension form the service publishes: <resource-name>::<qualifier>.
const NAME_DIMENSION = 'my-runtime::DEFAULT';

describe('createAgentCoreAlarms', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  function makeKey(): MdaaKmsKey {
    return new MdaaKmsKey(testApp.testStack, 'TestKey', {
      alias: 'test-alarm-key',
      naming: testApp.naming,
    });
  }

  describe('alarm creation', () => {
    test('creates an error-rate metric-math alarm against the verified namespace', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        errorRateThreshold: 10,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanThreshold',
        Threshold: 10,
        // Idle runtimes emit no datapoints; missing data must not trigger the alarm.
        TreatMissingData: 'notBreaching',
        AlarmActions: [EXISTING_TOPIC_ARN],
        Metrics: Match.arrayWith([
          Match.objectLike({
            Id: 'e0',
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({
                MetricName: 'SystemErrors',
                Namespace: DEFAULT_AGENTCORE_METRIC_NAMESPACE,
              }),
              Stat: 'Sum',
            }),
          }),
          Match.objectLike({
            Id: 'invocations',
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({
                MetricName: 'Invocations',
                Namespace: DEFAULT_AGENTCORE_METRIC_NAMESPACE,
              }),
            }),
          }),
          Match.objectLike({
            Id: 'errorRate',
            Expression: Match.stringLikeRegexp('invocations'),
            ReturnData: true,
          }),
        ]),
      });
    });

    test('creates a throttle-count single-metric alarm', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Throttles',
        Namespace: DEFAULT_AGENTCORE_METRIC_NAMESPACE,
        Statistic: 'Sum',
        Threshold: 100,
        ComparisonOperator: 'GreaterThanThreshold',
        // Idle runtimes emit no datapoints; missing data must not trigger the alarm.
        TreatMissingData: 'notBreaching',
        AlarmActions: [EXISTING_TOPIC_ARN],
      });
    });

    // REGRESSION: the dimensions must reproduce the service's FULL published set
    // {Resource, Operation, Name}. CloudWatch matches dimensions exactly, not as a
    // subset, so an earlier {Resource}-only version received zero datapoints and the
    // alarms sat in OK forever - confirmed against a live deployment, where querying
    // Invocations with only Resource returned 0 datapoints and the triple returned 1.
    test('defaults the metric dimensions to the full published triple', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        metricNameDimensionValue: NAME_DIMENSION,
        naming: testApp.naming,
        errorRateThreshold: 10,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      expect(AGENTCORE_METRIC_DIMENSION_NAME).toEqual('Resource');
      // The service publishes the FULL triple; CloudWatch matches dimensions exactly.
      // Note CDK renders the two alarm shapes differently: the single-metric alarm
      // sorts dimensions alphabetically, while metric-math queries preserve insertion
      // order. Both sets are asserted below with the order each actually emits.
      const sortedDimensions = [
        { Name: 'Name', Value: NAME_DIMENSION },
        { Name: 'Operation', Value: 'InvokeAgentRuntime' },
        { Name: 'Resource', Value: RUNTIME_ARN },
      ];
      const insertionOrderDimensions = [
        { Name: 'Resource', Value: RUNTIME_ARN },
        { Name: 'Operation', Value: 'InvokeAgentRuntime' },
        { Name: 'Name', Value: NAME_DIMENSION },
      ];

      const template = Template.fromStack(testApp.testStack);
      // Single-metric throttle alarm.
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Throttles',
        Dimensions: sortedDimensions,
      });
      // Both metric-math inputs on the error-rate alarm.
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Metrics: Match.arrayWith([
          Match.objectLike({
            Id: 'e0',
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({ Dimensions: insertionOrderDimensions }),
            }),
          }),
          Match.objectLike({
            Id: 'invocations',
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({ Dimensions: insertionOrderDimensions }),
            }),
          }),
        ]),
      });
    });

    test('an explicit dimensions override replaces the ARN-based default', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
        dimensions: { Resource: 'All' },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Throttles',
        Dimensions: [{ Name: 'Resource', Value: 'All' }],
      });
    });

    test('guards the error-rate expression against zero invocations', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        errorRateThreshold: 10,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Metrics: Match.arrayWith([
          Match.objectLike({
            Id: 'errorRate',
            Expression: 'IF(invocations > 0, 100 * (e0 + e1) / invocations, 0)',
          }),
        ]),
      });
    });

    // Invocations, Throttles, the namespace, and the Resource dimension are common
    // to every AgentCore service, but the error metrics are not: Runtime publishes
    // the same two metrics. Alarming on
    // a metric the target service does not publish is silent, so the numerator has
    // to be selectable per service.
    test('sums multiple error metrics (Gateway)', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-gateway',
        resourceArn: GATEWAY_ARN,
        naming: testApp.naming,
        errorRateThreshold: 10,
        notificationTopicArn: EXISTING_TOPIC_ARN,
        errorMetricNames: AGENTCORE_GATEWAY_ERROR_METRICS,
      });

      expect(AGENTCORE_GATEWAY_ERROR_METRICS).toEqual(['SystemErrors', 'UserErrors']);

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Metrics: Match.arrayWith([
          Match.objectLike({
            Id: 'e0',
            MetricStat: Match.objectLike({ Metric: Match.objectLike({ MetricName: 'SystemErrors' }) }),
          }),
          Match.objectLike({
            Id: 'e1',
            MetricStat: Match.objectLike({ Metric: Match.objectLike({ MetricName: 'UserErrors' }) }),
          }),
          Match.objectLike({
            Id: 'errorRate',
            Expression: 'IF(invocations > 0, 100 * (e0 + e1) / invocations, 0)',
          }),
        ]),
      });
    });

    // REGRESSION: this constant was 'TotalErrors', taken from aws-cdk-lib's metric
    // helpers rather than from the service. A live deployment showed AWS/Bedrock-AgentCore
    // publishes NO TotalErrors metric, so the error-rate alarm could never fire.
    test('defaults the error numerator to metrics the service actually publishes', () => {
      expect(AGENTCORE_RUNTIME_ERROR_METRICS).toEqual(['SystemErrors', 'UserErrors']);
      expect(AGENTCORE_RUNTIME_ERROR_METRICS).not.toContain('TotalErrors');

      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        errorRateThreshold: 10,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Metrics: Match.arrayWith([
          Match.objectLike({
            Id: 'e0',
            MetricStat: Match.objectLike({ Metric: Match.objectLike({ MetricName: 'SystemErrors' }) }),
          }),
        ]),
      });
    });

    test('passes datapointsToAlarm through for M-of-N alarms', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        resourceArn: RUNTIME_ARN,
        naming: testApp.naming,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        EvaluationPeriods: 3,
        DatapointsToAlarm: 2,
      });
    });

    test('creates both alarms when both thresholds are set', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        errorRateThreshold: 10,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    });

    test('honors overridden namespace, period, and evaluation periods', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 5,
        notificationTopicArn: EXISTING_TOPIC_ARN,
        metricNamespace: 'Custom/Namespace',
        periodSeconds: 60,
        evaluationPeriods: 3,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Namespace: 'Custom/Namespace',
        Period: 60,
        EvaluationPeriods: 3,
      });
    });
  });

  describe('notification topic', () => {
    test('references an existing topic without creating one', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        notificationTopicArn: EXISTING_TOPIC_ARN,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::SNS::Topic', 0);
    });

    test('creates a CMK-encrypted topic when requested', () => {
      const result = createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
      });

      expect(result.topic).toBeDefined();
      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::SNS::Topic', 1);
      // Topic is encrypted with a KMS key.
      template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });

    test('grants the CloudWatch service principal publish access on the created topic', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::SNS::TopicPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudWatchAlarmsToPublish',
              Effect: 'Allow',
              Principal: { Service: 'cloudwatch.amazonaws.com' },
              Action: 'sns:Publish',
              // Confused-deputy guard: CloudWatch may only publish on behalf of
              // this helper's own alarms for this resource, not any alarm in the
              // account.
              Condition: {
                StringEquals: { 'aws:SourceAccount': 'test-account' },
                ArnLike: {
                  'aws:SourceArn':
                    'arn:test-partition:cloudwatch:test-region:test-account:alarm:agentcore-*-my-runtime',
                },
              },
            }),
          ]),
        }),
      });
    });

    // An unsubscribed topic accepts every alarm and EventBridge notification and
    // discards it: the alerting deploys cleanly and is inert. This is the same
    // silent-failure class as an alarm on an unpublished metric.
    test('subscribes the configured emails to a created topic', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
        notificationEmails: ['ops@example.com', 'oncall@example.com'],
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::SNS::Subscription', 2);
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'ops@example.com',
      });
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'oncall@example.com',
      });
    });

    // Matches the convention in dataops-project / datawarehouse / opensearch, so a
    // stray space in a config list does not produce an unusable subscription.
    test('trims whitespace around email addresses', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
        notificationEmails: ['  padded@example.com  '],
      });

      const subscriptions = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::SNS::Subscription'),
      );
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].Properties.Endpoint).toEqual('padded@example.com');
      expect(subscriptions[0].Properties.Protocol).toEqual('email');
    });

    test('creates no subscriptions when no emails are supplied', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
      });

      const subscriptions = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::SNS::Subscription'),
      );
      expect(subscriptions).toHaveLength(0);
    });

    test('scopes the KMS grant to the deployment account (confused-deputy guard)', () => {
      createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudWatchAlarmsToUseKey',
              Effect: 'Allow',
              Principal: { Service: 'cloudwatch.amazonaws.com' },
              Condition: {
                StringEquals: { 'aws:SourceAccount': 'test-account' },
                ArnLike: {
                  'aws:SourceArn':
                    'arn:test-partition:cloudwatch:test-region:test-account:alarm:agentcore-*-my-runtime',
                },
              },
            }),
          ]),
        }),
      });
    });

    // The SourceArn pattern must stay narrower than "every alarm in the account", and
    // must keep matching the names the alarms are actually given. Widening it back to
    // `alarm:*` would let any account-level alarm use these grants; narrowing it out of
    // step with the alarm names would break notification delivery at runtime with no
    // synth-time signal. Asserted explicitly because both failures are silent.
    test('scopes the CloudWatch grants to this helper own alarm names, not the whole account', () => {
      const result = createAgentCoreAlarms(testApp.testStack, 'Alarms', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        errorRateThreshold: 5,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
        masterKey: makeKey(),
      });

      const template = Template.fromStack(testApp.testStack);
      const keyStatements = Object.values(template.findResources('AWS::KMS::Key')).flatMap(
        k => k.Properties?.KeyPolicy?.Statement ?? [],
      );
      const grant = keyStatements.find(
        (s: { Sid?: string }) => s.Sid === 'AllowCloudWatchAlarmsToUseKey',
      ) as unknown as { Condition: { ArnLike: { 'aws:SourceArn': string } } };
      const pattern = grant.Condition.ArnLike['aws:SourceArn'];

      expect(pattern).not.toMatch(/:alarm:\*$/);
      expect(pattern).toContain('agentcore-');
      expect(pattern).toContain('my-runtime');

      // Every alarm actually created must match the pattern, or CloudWatch cannot use
      // the key on its behalf and notifications are dropped. The pattern is a single
      // `prefix*suffix` ArnLike wildcard, so matching reduces to a starts/ends check.
      const alarmNames = Object.values(template.findResources('AWS::CloudWatch::Alarm')).map(
        a => a.Properties?.AlarmName as string,
      );
      expect(alarmNames).toHaveLength(2);
      const [namePrefix, nameSuffix] = pattern.split(':alarm:')[1].split('*');
      for (const name of alarmNames) {
        expect(name.startsWith(namePrefix)).toBe(true);
        expect(name.endsWith(nameSuffix)).toBe(true);
      }
      // Sanity-check the assertion itself rejects an unrelated alarm name.
      expect('some-other-alarm'.startsWith(namePrefix)).toBe(false);
      expect(Object.keys(result.alarms)).toHaveLength(2);
    });
  });

  describe('validation', () => {
    test('throws when no notification target is supplied', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          throttleCountThreshold: 100,
        }),
      ).toThrow(/notification target/);
    });

    test('throws when both a topic ARN and createNotificationTopic are supplied', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          throttleCountThreshold: 100,
          notificationTopicArn: EXISTING_TOPIC_ARN,
          createNotificationTopic: true,
          masterKey: makeKey(),
        }),
      ).toThrow(/mutually exclusive/);
    });

    test('throws when no threshold is supplied', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          notificationTopicArn: EXISTING_TOPIC_ARN,
        }),
      ).toThrow(/at least one threshold/);
    });

    // CDK cannot attach subscriptions to a topic imported by ARN. Silently dropping
    // them would leave the operator believing they had configured alerting.
    test('throws when notificationEmails is combined with notificationTopicArn', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          throttleCountThreshold: 100,
          notificationTopicArn: EXISTING_TOPIC_ARN,
          notificationEmails: ['ops@example.com'],
        }),
      ).toThrow(/cannot be combined with alarms.notificationTopicArn/);
    });

    test('allows an empty notificationEmails array alongside notificationTopicArn', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          throttleCountThreshold: 100,
          notificationTopicArn: EXISTING_TOPIC_ARN,
          notificationEmails: [],
        }),
      ).not.toThrow();
    });

    test('throws when creating a topic without a KMS key', () => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          throttleCountThreshold: 100,
          createNotificationTopic: true,
        }),
      ).toThrow(/KMS key is required/);
    });

    // An invalid period on the metric-math alarm escapes synth and only fails at
    // deploy time, so it has to be rejected here.
    test.each([45, 7, 90.5, 0])('throws on period %s, which CloudWatch rejects', periodSeconds => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, 'Alarms', {
          resourceName: 'my-runtime',
          resourceArn: RUNTIME_ARN,
          naming: testApp.naming,
          errorRateThreshold: 10,
          notificationTopicArn: EXISTING_TOPIC_ARN,
          periodSeconds,
        }),
      ).toThrow(/must be 1, 5, 10, 30, or a multiple of 60/);
    });

    test.each([1, 5, 10, 30, 60, 300, 3600])('accepts valid period %s', periodSeconds => {
      expect(() =>
        createAgentCoreAlarms(testApp.testStack, `Alarms${periodSeconds}`, {
          resourceName: 'my-runtime',
          resourceArn: RUNTIME_ARN,
          naming: testApp.naming,
          errorRateThreshold: 10,
          notificationTopicArn: EXISTING_TOPIC_ARN,
          periodSeconds,
        }),
      ).not.toThrow();
    });
  });
});
