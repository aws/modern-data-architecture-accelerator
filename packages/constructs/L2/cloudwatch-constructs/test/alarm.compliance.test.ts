/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaAlarm, MdaaAlarmProps } from '../lib';

describe('MDAA Alarm Compliance Tests - Single Metric Alarms', () => {
  const testApp = new MdaaTestApp();

  const testConstructProps: MdaaAlarmProps = {
    naming: testApp.naming,
    createOutputs: false,
    createParams: true,
    alarmName: 'high-error-rate',
    metricName: 'error-count',
    namespace: 'ETL/CSV-Parquet',
    statistic: 'Sum',
    period: 300,
    evaluationPeriods: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    treatMissingData: 'notBreaching',
  };

  new MdaaAlarm(testApp.testStack, 'test-alarm', testConstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('SingleMetricAlarmCreatedWithBasicProperties', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'high-error-rate',
      MetricName: 'error-count',
      Namespace: 'ETL/CSV-Parquet',
      Statistic: 'Sum',
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 5,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
    });
  });

  test('SingleMetricAlarmWithDimensions', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'lambda-errors',
      metricName: 'Errors',
      namespace: 'AWS/Lambda',
      statistic: 'Sum',
      period: 60,
      evaluationPeriods: 1,
      threshold: 1,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      dimensions: {
        FunctionName: 'my-function',
      },
    };

    new MdaaAlarm(testApp.testStack, 'test-alarm-dimensions', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'lambda-errors',
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: 'my-function',
        },
      ],
    });
  });

  test('SingleMetricAlarmWithSNSActions', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'high-error-rate-with-actions',
      metricName: 'error-count',
      namespace: 'ETL/CSV-Parquet',
      statistic: 'Sum',
      period: 300,
      evaluationPeriods: 1,
      threshold: 5,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      alarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      okActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      insufficientDataActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
    };

    new MdaaAlarm(testApp.testStack, 'test-alarm-actions', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'high-error-rate-with-actions',
      AlarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      OKActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      InsufficientDataActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
    });
  });

  test('SingleMetricAlarmWithAllComparisonOperators', () => {
    const operators = [
      'GreaterThanOrEqualToThreshold',
      'GreaterThanThreshold',
      'LessThanThreshold',
      'LessThanOrEqualToThreshold',
    ];

    for (const operator of operators) {
      const testApp = new MdaaTestApp();

      const testConstructProps: MdaaAlarmProps = {
        naming: testApp.naming,
        createOutputs: false,
        createParams: true,
        alarmName: `test-alarm-${operator}`,
        metricName: 'test-metric',
        namespace: 'Test/Namespace',
        statistic: 'Average',
        period: 60,
        evaluationPeriods: 1,
        threshold: 10,
        comparisonOperator: operator,
      };

      new MdaaAlarm(testApp.testStack, `test-alarm-${operator}`, testConstructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: operator,
      });
    }
  });

  test('SingleMetricAlarmWithTreatMissingDataOptions', () => {
    const treatments = ['notBreaching', 'breaching', 'ignore', 'missing'];

    for (const treatment of treatments) {
      const testApp = new MdaaTestApp();

      const testConstructProps: MdaaAlarmProps = {
        naming: testApp.naming,
        createOutputs: false,
        createParams: true,
        alarmName: `test-alarm-${treatment}`,
        metricName: 'test-metric',
        namespace: 'Test/Namespace',
        statistic: 'Average',
        period: 60,
        evaluationPeriods: 1,
        threshold: 10,
        comparisonOperator: 'GreaterThanThreshold',
        treatMissingData: treatment,
      };

      new MdaaAlarm(testApp.testStack, `test-alarm-${treatment}`, testConstructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: treatment,
      });
    }
  });
});

describe('MDAA Alarm Compliance Tests - Metric Math Alarms', () => {
  const testApp = new MdaaTestApp();

  const testConstructProps: MdaaAlarmProps = {
    naming: testApp.naming,
    createOutputs: false,
    createParams: true,
    alarmName: 'total-errors-across-metrics',
    evaluationPeriods: 1,
    threshold: 10,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    treatMissingData: 'notBreaching',
    metrics: [
      {
        id: 'total',
        expression: 'm1+m2',
        label: 'Total Errors',
        returnData: true,
      },
      {
        id: 'm1',
        metricName: 'error-count',
        namespace: 'ETL/CSV-Parquet',
        statistic: 'Sum',
        period: 300,
      },
      {
        id: 'm2',
        metricName: 'validation-errors',
        namespace: 'ETL/CSV-Parquet',
        statistic: 'Sum',
        period: 300,
      },
    ],
  };

  new MdaaAlarm(testApp.testStack, 'test-metric-math-alarm', testConstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('MetricMathAlarmCreatedWithExpression', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'total-errors-across-metrics',
      EvaluationPeriods: 1,
      Threshold: 10,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
      Metrics: [
        {
          Id: 'total',
          Expression: 'm1+m2',
          Label: 'Total Errors',
          ReturnData: true,
        },
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              MetricName: 'error-count',
              Namespace: 'ETL/CSV-Parquet',
            },
            Stat: 'Sum',
            Period: 300,
          },
        },
        {
          Id: 'm2',
          MetricStat: {
            Metric: {
              MetricName: 'validation-errors',
              Namespace: 'ETL/CSV-Parquet',
            },
            Stat: 'Sum',
            Period: 300,
          },
        },
      ],
    });
  });

  test('MetricMathAlarmWithDimensions', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'error-rate-by-function',
      evaluationPeriods: 1,
      threshold: 0.1,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [
        {
          id: 'errorRate',
          expression: 'errors / invocations',
          label: 'Error Rate',
          returnData: true,
        },
        {
          id: 'errors',
          metricName: 'Errors',
          namespace: 'AWS/Lambda',
          statistic: 'Sum',
          period: 300,
          dimensions: {
            FunctionName: 'my-function',
          },
        },
        {
          id: 'invocations',
          metricName: 'Invocations',
          namespace: 'AWS/Lambda',
          statistic: 'Sum',
          period: 300,
          dimensions: {
            FunctionName: 'my-function',
          },
        },
      ],
    };

    new MdaaAlarm(testApp.testStack, 'test-metric-math-alarm-dimensions', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'error-rate-by-function',
      Metrics: [
        {
          Id: 'errorRate',
          Expression: 'errors / invocations',
        },
        {
          Id: 'errors',
          MetricStat: {
            Metric: {
              MetricName: 'Errors',
              Namespace: 'AWS/Lambda',
              Dimensions: [
                {
                  Name: 'FunctionName',
                  Value: 'my-function',
                },
              ],
            },
          },
        },
        {
          Id: 'invocations',
          MetricStat: {
            Metric: {
              MetricName: 'Invocations',
              Namespace: 'AWS/Lambda',
              Dimensions: [
                {
                  Name: 'FunctionName',
                  Value: 'my-function',
                },
              ],
            },
          },
        },
      ],
    });
  });
});

describe('MDAA Alarm Compliance Tests - Metrics Insights Alarms', () => {
  const testApp = new MdaaTestApp();
  const query = 'SELECT SUM(Errors) FROM SCHEMA("Test/Namespace", ResourceArn) WHERE ResourceArn = \'arn\'';

  new MdaaAlarm(testApp.testStack, 'test-metrics-insights-alarm', {
    naming: testApp.naming,
    alarmName: 'metrics-insights-errors',
    evaluationPeriods: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanThreshold',
    metrics: [{ id: 'errors', expression: query, period: 300, returnData: true }],
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // A Metrics Insights query in an alarm requires a period on its MetricDataQuery.
  test('MetricsInsightsQueryRendersPeriod', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'metrics-insights-errors',
      Metrics: [{ Id: 'errors', Expression: query, Period: 300, ReturnData: true }],
    });
  });

  test('LowercaseIndentedMetricsInsightsQueryRendersPeriod', () => {
    const lowercaseApp = new MdaaTestApp();
    const lowercaseQuery = `  ${query.replace('SELECT', 'select')}`;
    new MdaaAlarm(lowercaseApp.testStack, 'test-lowercase-query', {
      naming: lowercaseApp.naming,
      alarmName: 'lowercase-query',
      evaluationPeriods: 1,
      threshold: 5,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [{ id: 'errors', expression: lowercaseQuery, period: 300, returnData: true }],
    });
    const lowercaseTemplate = Template.fromStack(lowercaseApp.testStack);
    lowercaseTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Metrics: [{ Id: 'errors', Expression: lowercaseQuery, Period: 300, ReturnData: true }],
    });
  });

  // CloudWatch evaluates a Metrics Insights alarm over the most recent 3 hours only.
  test('MetricsInsightsQueryOverThreeHoursThrows', () => {
    const errorApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaAlarm(errorApp.testStack, 'test-long-window', {
          naming: errorApp.naming,
          alarmName: 'long-window',
          evaluationPeriods: 4,
          threshold: 5,
          comparisonOperator: 'GreaterThanThreshold',
          metrics: [{ id: 'errors', expression: query, period: 3600, returnData: true }],
        }),
    ).toThrow(/^metrics\[errors\]\.period x evaluationPeriods must not exceed 10800 seconds/);
  });

  test('MetricsInsightsQueryWithoutPeriodThrows', () => {
    const errorApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaAlarm(errorApp.testStack, 'test-missing-period', {
          naming: errorApp.naming,
          alarmName: 'missing-period',
          evaluationPeriods: 1,
          threshold: 5,
          comparisonOperator: 'GreaterThanThreshold',
          metrics: [{ id: 'errors', expression: query, returnData: true }],
        }),
    ).toThrow('Metric errors is a Metrics Insights query, which requires a period in an alarm.');
  });

  // A metric math expression takes its period from the metrics it references, so a
  // period set on it is not rendered.
  test('MetricMathExpressionDoesNotRenderPeriod', () => {
    const mathApp = new MdaaTestApp();
    new MdaaAlarm(mathApp.testStack, 'test-math-period', {
      naming: mathApp.naming,
      alarmName: 'math-period',
      evaluationPeriods: 1,
      threshold: 5,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [
        { id: 'm1', metricName: 'Errors', namespace: 'Test/Namespace', statistic: 'Sum', period: 300 },
        { id: 'doubled', expression: '2 * m1', period: 300, returnData: true },
      ],
    });
    const [alarm] = Object.values(Template.fromStack(mathApp.testStack).findResources('AWS::CloudWatch::Alarm'));
    expect(alarm.Properties.Metrics[1]).toEqual({ Id: 'doubled', Expression: '2 * m1', ReturnData: true });
  });

  test('ExpressionWithInvalidPeriodThrows', () => {
    const errorApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaAlarm(errorApp.testStack, 'test-invalid-period', {
          naming: errorApp.naming,
          alarmName: 'invalid-period',
          evaluationPeriods: 1,
          threshold: 5,
          comparisonOperator: 'GreaterThanThreshold',
          metrics: [{ id: 'errors', expression: query, period: 45, returnData: true }],
        }),
    ).toThrow(/^metrics\[errors\]\.period must be 1, 5, 10, 30, or a multiple of 60 seconds/);
  });
});

describe('MDAA Alarm Compliance Tests - SSM Export', () => {
  test('AlarmExportsARNToSSM', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-ssm',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 60,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
    };

    new MdaaAlarm(testApp.testStack, 'test-alarm-ssm-export', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify alarm ARN is exported to SSM
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/alarm/test-alarm-ssm/arn',
      Type: 'String',
    });
  });

  test('AlarmExportsNameToSSM', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-name-ssm',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 60,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
    };

    new MdaaAlarm(testApp.testStack, 'test-alarm-name-ssm-export', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify alarm name is exported to SSM (consistent with metrics pattern - no -name suffix)
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/alarm/test-alarm-name-ssm/name',
      Value: 'test-alarm-name-ssm',
    });
  });

  test('AlarmSSMParametersHaveCDKNagSuppressions', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-nag',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 60,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
    };

    new MdaaAlarm(testApp.testStack, 'test-alarm-nag-suppressions', testConstructProps);

    // Verify SSM parameters exist (CDK-NAG suppressions are tested in the first test)
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/alarm/test-alarm-nag/arn',
    });
  });
});

describe('MDAA Alarm Compliance Tests - Error Handling', () => {
  test('AlarmThrowsErrorForInvalidComparisonOperator', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-invalid-operator',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 60,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'InvalidOperator',
    };

    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-invalid', testConstructProps);
    }).toThrow(/Invalid comparison operator/);
  });

  test('AlarmThrowsErrorForInvalidTreatMissingData', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-invalid-treatment',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 60,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      treatMissingData: 'invalidTreatment',
    };

    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-invalid-treatment', testConstructProps);
    }).toThrow(/Invalid treat missing data value/);
  });

  test('AlarmThrowsErrorForSingleMetricWithoutRequiredProperties', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-missing-props',
      // Missing metricName, namespace, statistic, period
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
    };

    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-missing', testConstructProps);
    }).toThrow(/Single metric alarms require/);
  });

  test('AlarmThrowsErrorForMetricMathWithEmptyMetricsArray', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-empty-metrics',
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [],
    };

    // Empty metrics array falls through to single metric alarm, which requires metric properties
    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-empty-metrics', testConstructProps);
    }).toThrow(/Single metric alarms require/);
  });

  // CloudWatch accepts only 1, 5, 10, 30, or a multiple of 60 as a period. Asserted
  // through the construct, not just against validateAlarmPeriodSeconds in isolation:
  // on the metric-math path CDK passes the period through to CfnAlarm unvalidated, so
  // a regression that dropped this call would let an invalid period escape synth and
  // fail at deploy time instead.
  test('AlarmThrowsErrorForInvalidSingleMetricPeriod', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-invalid-period',
      metricName: 'test-metric',
      namespace: 'Test/Namespace',
      statistic: 'Average',
      period: 45,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
    };

    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-invalid-period', testConstructProps);
    }).toThrow(/period must be 1, 5, 10, 30, or a multiple of 60 seconds \(got 45\)/);
  });

  // The metric-math path names the offending metric id in the message, so a caller
  // with several queries can tell which one is wrong.
  test('AlarmThrowsErrorForInvalidMetricMathPeriod', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaAlarmProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-invalid-math-period',
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [
        {
          id: 'errors',
          metricName: 'Errors',
          namespace: 'Test/Namespace',
          statistic: 'Sum',
          period: 45,
          returnData: true,
        },
      ],
    };

    expect(() => {
      new MdaaAlarm(testApp.testStack, 'test-alarm-invalid-math-period', testConstructProps);
    }).toThrow(/metrics\[errors\]\.period must be 1, 5, 10, 30, or a multiple of 60 seconds/);
  });

  // A metric-math metric stat that omits period falls back to 300, which is a valid
  // CloudWatch period - so the alarm builds rather than tripping the validation above.
  test('AlarmDefaultsMetricMathPeriodWhenOmitted', () => {
    const testApp = new MdaaTestApp();

    new MdaaAlarm(testApp.testStack, 'test-alarm-default-math-period', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      alarmName: 'test-alarm-default-math-period',
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      metrics: [
        {
          id: 'errors',
          metricName: 'Errors',
          namespace: 'Test/Namespace',
          statistic: 'Sum',
          returnData: true,
        },
      ],
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Metrics: Match.arrayWith([
        Match.objectLike({
          Id: 'errors',
          MetricStat: Match.objectLike({ Period: 300 }),
        }),
      ]),
    });
  });
});
