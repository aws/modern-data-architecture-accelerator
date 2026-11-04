/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  BedrockGuardrailL3Construct,
  GuardrailAlarmSettings,
  guardrailAlarmName,
  guardrailAlarmNamePattern,
  GuardrailInterventionAlarmProps,
  guardrailInterventionsQuery,
} from '../lib';

const TOPIC_ARN = 'arn:test-partition:sns:test-region:test-account:security-alarms';
const SETTINGS: GuardrailAlarmSettings = { alarmTopicArn: TOPIC_ARN, periodSeconds: 300, evaluationPeriods: 1 };

function createGuardrail(
  testApp: MdaaTestApp,
  interventionAlarm?: GuardrailInterventionAlarmProps,
  alarmSettings: GuardrailAlarmSettings = SETTINGS,
): BedrockGuardrailL3Construct {
  return new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-construct', {
    guardrailName: 'test-guardrail',
    guardrailConfig: {
      contentFilters: { hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' } },
      interventionAlarm,
    },
    kmsKey: new Key(testApp.testStack, 'TestKey'),
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    alarmSettings,
  });
}

function isFnJoin(value: unknown): value is { 'Fn::Join': [string, unknown[]] } {
  return typeof value === 'object' && value !== null && 'Fn::Join' in value;
}

/** The rendered Expression of an alarm's query, joined to a string with the guardrail ARN token as a marker. */
function renderedExpression(expression: unknown): string {
  if (!isFnJoin(expression)) {
    throw new Error(`Expected an Fn::Join expression, got ${JSON.stringify(expression)}`);
  }
  const [separator, parts] = expression['Fn::Join'];
  return parts.map(part => (typeof part === 'string' ? part : '<guardrail-arn>')).join(separator);
}

/** The alarm's metric data queries. */
function metricQueries(alarm: { [key: string]: unknown }): { [key: string]: unknown }[] {
  if (!Array.isArray(alarm.Metrics)) {
    throw new Error(`Expected Metrics on the alarm, got ${JSON.stringify(alarm)}`);
  }
  return alarm.Metrics;
}

function alarmProperties(testApp: MdaaTestApp): { [key: string]: unknown }[] {
  return Object.values(Template.fromStack(testApp.testStack).findResources('AWS::CloudWatch::Alarm')).map(
    alarm => alarm.Properties,
  );
}

describe('guardrailInterventionsQuery', () => {
  // Callers choose which guardrail version they invoke, so the query must aggregate over
  // every version rather than pin GuardrailVersion.
  test.each(['SUM', 'AVG'] as const)('%s aggregates across versions by pinning only the guardrail ARN', aggregation => {
    expect(guardrailInterventionsQuery(aggregation, 'arn:guardrail')).toBe(
      `SELECT ${aggregation}(InvocationsIntervened) FROM SCHEMA("AWS/Bedrock/Guardrails", GuardrailArn, GuardrailVersion) ` +
        "WHERE GuardrailArn = 'arn:guardrail'",
    );
  });
});

describe('guardrailAlarmNamePattern', () => {
  test('matches the module naming prefix of every guardrail alarm', () => {
    const testApp = new MdaaTestApp();
    expect(guardrailAlarmNamePattern(testApp.naming)).toBe('test-org-test-env-test-domain-test-module-guardrail-*');
  });
});

describe('BedrockGuardrailL3Construct intervention alarms', () => {
  test('creates no alarm when interventionAlarm is not set', () => {
    const testApp = new MdaaTestApp();
    createGuardrail(testApp, undefined);
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
  });

  test('count alarm sums interventions across all versions of the guardrail', () => {
    const testApp = new MdaaTestApp();
    createGuardrail(testApp, { countThreshold: 25 });

    const alarms = alarmProperties(testApp);
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toMatchObject({
      AlarmName: 'test-org-test-env-test-domain-test-module-guardrail-intervention-count-test-guardrail',
      AlarmDescription: 'Guardrail test-guardrail intervened more than 25 times in 300s, across all guardrail versions',
      Threshold: 25,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      TreatMissingData: 'notBreaching',
      AlarmActions: [TOPIC_ARN],
      Metrics: [{ Id: 'interventions', Period: 300, ReturnData: true }],
    });
    const [query] = metricQueries(alarms[0]);
    expect(renderedExpression(query.Expression)).toBe(
      'SELECT SUM(InvocationsIntervened) FROM SCHEMA("AWS/Bedrock/Guardrails", GuardrailArn, GuardrailVersion) ' +
        "WHERE GuardrailArn = '<guardrail-arn>'",
    );
    expect(query.Expression).toEqual({
      'Fn::Join': ['', expect.arrayContaining([{ 'Fn::GetAtt': [expect.any(String), 'GuardrailArn'] }])],
    });
  });

  // AVG of the 0/1 datapoints is the share that intervened, so the percentage threshold
  // is compared as a fraction on the query itself.
  test('rate alarm compares the average intervention share to the threshold as a fraction', () => {
    const testApp = new MdaaTestApp();
    createGuardrail(testApp, { ratePercentThreshold: 15 }, { ...SETTINGS, evaluationPeriods: 3, datapointsToAlarm: 2 });

    const [alarm] = alarmProperties(testApp);
    expect(alarm).toMatchObject({
      AlarmName: 'test-org-test-env-test-domain-test-module-guardrail-intervention-rate-test-guardrail',
      AlarmDescription:
        'Guardrail test-guardrail intervened on more than 15% of evaluations in 300s, across all guardrail versions',
      Threshold: 0.15,
      EvaluationPeriods: 3,
      DatapointsToAlarm: 2,
      Metrics: [{ Id: 'interventionShare', Period: 300, ReturnData: true }],
    });
    const [query] = metricQueries(alarm);
    expect(renderedExpression(query.Expression)).toMatch(/^SELECT AVG\(InvocationsIntervened\) FROM SCHEMA/);
  });

  test.each([
    [0, 0],
    [33.3, 0.333],
    [99.9, 0.999],
  ])('rate threshold %s%% renders as %s', (ratePercentThreshold, threshold) => {
    const testApp = new MdaaTestApp();
    createGuardrail(testApp, { ratePercentThreshold });
    expect(alarmProperties(testApp)[0].Threshold).toBe(threshold);
  });

  test('creates both alarms when both thresholds are set, each matching the grant pattern', () => {
    const testApp = new MdaaTestApp();
    createGuardrail(testApp, { countThreshold: 25, ratePercentThreshold: 15 });

    const names = alarmProperties(testApp).map(alarm => alarm.AlarmName);
    expect(names.sort()).toEqual([
      guardrailAlarmName(testApp.naming, 'count', 'test-guardrail'),
      guardrailAlarmName(testApp.naming, 'rate', 'test-guardrail'),
    ]);
    const prefix = guardrailAlarmNamePattern(testApp.naming).replace(/\*$/, '');
    names.forEach(name => expect(String(name).startsWith(prefix)).toBe(true));
  });

  test('accepts alarm names inside the notification topic grant pattern', () => {
    const testApp = new MdaaTestApp();
    expect(() =>
      createGuardrail(
        testApp,
        { countThreshold: 1 },
        { ...SETTINGS, alarmNamePattern: guardrailAlarmNamePattern(testApp.naming) },
      ),
    ).not.toThrow();
  });

  // An alarm outside the grant pattern fires, but CloudWatch is denied publish to the
  // created topic, so every notification is dropped.
  test('throws when an alarm name falls outside the notification topic grant pattern', () => {
    const testApp = new MdaaTestApp();
    expect(() =>
      createGuardrail(testApp, { countThreshold: 1 }, { ...SETTINGS, alarmNamePattern: 'other-prefix-*' }),
    ).toThrow(/does not match 'other-prefix-\*'/);
  });

  test('throws on alarm settings outside the Metrics Insights evaluation window', () => {
    const testApp = new MdaaTestApp();
    expect(() =>
      createGuardrail(testApp, { countThreshold: 1 }, { ...SETTINGS, periodSeconds: 3600, evaluationPeriods: 4 }),
    ).toThrow(/^alarmSettings\.periodSeconds x alarmSettings\.evaluationPeriods must not exceed 10800 seconds/);
  });

  test('throws on datapointsToAlarm above evaluationPeriods in the alarm settings', () => {
    const testApp = new MdaaTestApp();
    expect(() =>
      createGuardrail(testApp, { countThreshold: 1 }, { ...SETTINGS, evaluationPeriods: 1, datapointsToAlarm: 2 }),
    ).toThrow(/^alarmSettings\.datapointsToAlarm must be between 1 and 1/);
  });

  test('throws when interventionAlarm sets no threshold', () => {
    const testApp = new MdaaTestApp();
    expect(() => createGuardrail(testApp, {})).toThrow(
      "Guardrail 'test-guardrail' interventionAlarm requires at least one threshold",
    );
  });

  test('throws on a negative count threshold', () => {
    const testApp = new MdaaTestApp();
    expect(() => createGuardrail(testApp, { countThreshold: -1 })).toThrow(/countThreshold must be >= 0/);
  });

  // The alarm fires when the rate exceeds the threshold, which 100% or more never does.
  test.each([-1, 100])('throws on rate threshold %s', ratePercentThreshold => {
    const testApp = new MdaaTestApp();
    expect(() => createGuardrail(testApp, { ratePercentThreshold })).toThrow(
      /ratePercentThreshold must be at least 0 and below 100/,
    );
  });
});
