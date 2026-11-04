import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import {
  convertComparisonOperator,
  convertTreatMissingData,
  validateAlarmEvaluationRange,
  validateAlarmPeriodSeconds,
  validateDatapointsToAlarm,
  validateEvaluationPeriods,
  validateMetricsInsightsAlarmWindow,
} from '../lib/alarm-utils';

describe('convertComparisonOperator', () => {
  test('converts GreaterThanOrEqualToThreshold correctly', () => {
    expect(convertComparisonOperator('GreaterThanOrEqualToThreshold')).toBe(
      ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    );
  });

  test('converts GreaterThanThreshold correctly', () => {
    expect(convertComparisonOperator('GreaterThanThreshold')).toBe(ComparisonOperator.GREATER_THAN_THRESHOLD);
  });

  test('converts LessThanThreshold correctly', () => {
    expect(convertComparisonOperator('LessThanThreshold')).toBe(ComparisonOperator.LESS_THAN_THRESHOLD);
  });

  test('converts LessThanOrEqualToThreshold correctly', () => {
    expect(convertComparisonOperator('LessThanOrEqualToThreshold')).toBe(
      ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    );
  });

  test('converts LessThanLowerOrGreaterThanUpperThreshold correctly', () => {
    expect(convertComparisonOperator('LessThanLowerOrGreaterThanUpperThreshold')).toBe(
      ComparisonOperator.LESS_THAN_LOWER_OR_GREATER_THAN_UPPER_THRESHOLD,
    );
  });

  test('converts LessThanLowerThreshold correctly', () => {
    expect(convertComparisonOperator('LessThanLowerThreshold')).toBe(ComparisonOperator.LESS_THAN_LOWER_THRESHOLD);
  });

  test('converts GreaterThanUpperThreshold correctly', () => {
    expect(convertComparisonOperator('GreaterThanUpperThreshold')).toBe(
      ComparisonOperator.GREATER_THAN_UPPER_THRESHOLD,
    );
  });

  test('throws error for invalid operator', () => {
    expect(() => convertComparisonOperator('InvalidOperator')).toThrow('Invalid comparison operator: InvalidOperator');
  });

  test('throws error with list of valid operators', () => {
    expect(() => convertComparisonOperator('BadOperator')).toThrow(/Must be one of:/);
  });

  test('error message includes all valid operators', () => {
    expect(() => convertComparisonOperator('BadOperator')).toThrow(/GreaterThanOrEqualToThreshold/);
    expect(() => convertComparisonOperator('BadOperator')).toThrow(/GreaterThanThreshold/);
    expect(() => convertComparisonOperator('BadOperator')).toThrow(/LessThanThreshold/);
  });
});

describe('convertTreatMissingData', () => {
  test('returns NOT_BREACHING for undefined input', () => {
    expect(convertTreatMissingData(undefined)).toBe(TreatMissingData.NOT_BREACHING);
  });

  test('returns NOT_BREACHING for empty string', () => {
    expect(convertTreatMissingData()).toBe(TreatMissingData.NOT_BREACHING);
  });

  test('converts notBreaching correctly', () => {
    expect(convertTreatMissingData('notBreaching')).toBe(TreatMissingData.NOT_BREACHING);
  });

  test('converts breaching correctly', () => {
    expect(convertTreatMissingData('breaching')).toBe(TreatMissingData.BREACHING);
  });

  test('converts ignore correctly', () => {
    expect(convertTreatMissingData('ignore')).toBe(TreatMissingData.IGNORE);
  });

  test('converts missing correctly', () => {
    expect(convertTreatMissingData('missing')).toBe(TreatMissingData.MISSING);
  });

  test('throws error for invalid treatment', () => {
    expect(() => convertTreatMissingData('InvalidTreatment')).toThrow(
      'Invalid treat missing data value: InvalidTreatment',
    );
  });

  test('throws error with list of valid treatments', () => {
    expect(() => convertTreatMissingData('BadTreatment')).toThrow(/Must be one of:/);
  });

  test('error message includes all valid treatments', () => {
    expect(() => convertTreatMissingData('BadTreatment')).toThrow(/notBreaching/);
    expect(() => convertTreatMissingData('BadTreatment')).toThrow(/breaching/);
    expect(() => convertTreatMissingData('BadTreatment')).toThrow(/ignore/);
    expect(() => convertTreatMissingData('BadTreatment')).toThrow(/missing/);
  });
});

describe('validateAlarmPeriodSeconds', () => {
  // The high-resolution values plus the smallest and a large standard period.
  test.each([1, 5, 10, 30, 60, 300, 3600, 86400])('accepts period %s', periodSeconds => {
    expect(() => validateAlarmPeriodSeconds(periodSeconds)).not.toThrow();
  });

  // 45 and 7 are neither high-resolution values nor multiples of 60; 90.5 is
  // fractional; 0 and negatives are not periods at all.
  test.each([7, 45, 90.5, 0, -60, 61])('throws on period %s, which CloudWatch rejects', periodSeconds => {
    expect(() => validateAlarmPeriodSeconds(periodSeconds)).toThrow(/must be 1, 5, 10, 30, or a multiple of 60/);
  });

  test('reports the offending value', () => {
    expect(() => validateAlarmPeriodSeconds(45)).toThrow(/got 45/);
  });

  test('defaults to naming the property "period"', () => {
    expect(() => validateAlarmPeriodSeconds(45)).toThrow(/^period must be/);
  });

  // Config-driven callers surface a different property name to the user than the
  // construct prop, so the message must be able to point at the config key.
  test('names the caller-supplied property in the message', () => {
    expect(() => validateAlarmPeriodSeconds(45, 'alarms.periodSeconds')).toThrow(/^alarms\.periodSeconds must be/);
  });
});

describe('validateMetricsInsightsAlarmWindow', () => {
  const propNames = { period: 'alarms.periodSeconds', evaluationPeriods: 'alarms.evaluationPeriods' };

  test.each([
    [60, 1],
    [300, 36],
    [10800, 1],
  ])('accepts period %ss x %s evaluation periods', (periodSeconds, evaluationPeriods) => {
    expect(() => validateMetricsInsightsAlarmWindow({ periodSeconds, evaluationPeriods }, propNames)).not.toThrow();
  });

  // Metrics Insights aggregates sub-minute data to one minute rather than failing, so a
  // high-resolution period would deploy and evaluate something other than configured.
  test.each([10, 30, 90])('rejects period %ss, which is not a multiple of 60', periodSeconds => {
    expect(() => validateMetricsInsightsAlarmWindow({ periodSeconds, evaluationPeriods: 1 }, propNames)).toThrow(
      /^alarms\.periodSeconds must be a multiple of 60 seconds for a Metrics Insights alarm/,
    );
  });

  // PutMetricAlarm rejects a window over 3 hours, which would otherwise only fail at deploy.
  test('rejects a window over 3 hours, naming both properties', () => {
    expect(() => validateMetricsInsightsAlarmWindow({ periodSeconds: 3600, evaluationPeriods: 4 }, propNames)).toThrow(
      'alarms.periodSeconds x alarms.evaluationPeriods must not exceed 10800 seconds (3 hours) for a Metrics ' +
        'Insights alarm (got 3600 x 4 = 14400).',
    );
  });
});

describe('validateDatapointsToAlarm', () => {
  const propNames = { evaluationPeriods: 'alarms.evaluationPeriods', datapointsToAlarm: 'alarms.datapointsToAlarm' };

  test('accepts an unset datapointsToAlarm', () => {
    expect(() => validateDatapointsToAlarm({ evaluationPeriods: 3 }, propNames)).not.toThrow();
  });

  test.each([1, 3])('accepts datapointsToAlarm %s of 3 evaluation periods', datapointsToAlarm => {
    expect(() => validateDatapointsToAlarm({ evaluationPeriods: 3, datapointsToAlarm }, propNames)).not.toThrow();
  });

  test.each([0, 4])('rejects datapointsToAlarm %s of 3 evaluation periods', datapointsToAlarm => {
    expect(() => validateDatapointsToAlarm({ evaluationPeriods: 3, datapointsToAlarm }, propNames)).toThrow(
      `alarms.datapointsToAlarm must be between 1 and 3 (got ${datapointsToAlarm}; alarms.evaluationPeriods is 3).`,
    );
  });
});

describe('validateEvaluationPeriods', () => {
  test('accepts a whole number of at least 1', () => {
    expect(() => validateEvaluationPeriods(1, 'alarms.evaluationPeriods')).not.toThrow();
  });

  test.each([0, -1, 1.5])('rejects %s', evaluationPeriods => {
    expect(() => validateEvaluationPeriods(evaluationPeriods, 'alarms.evaluationPeriods')).toThrow(
      `alarms.evaluationPeriods must be a whole number of at least 1 (got ${evaluationPeriods}).`,
    );
  });

  test('is applied by the window and datapoints validators', () => {
    const propNames = { period: 'p', evaluationPeriods: 'e', datapointsToAlarm: 'd' };
    expect(() => validateMetricsInsightsAlarmWindow({ periodSeconds: 60, evaluationPeriods: 0 }, propNames)).toThrow(
      /^e must be a whole number/,
    );
    expect(() => validateDatapointsToAlarm({ evaluationPeriods: 0 }, propNames)).toThrow(/^e must be a whole number/);
    expect(() => validateAlarmEvaluationRange({ periodSeconds: 60, evaluationPeriods: -1 }, propNames)).toThrow(
      /^e must be a whole number/,
    );
  });

  test('rejects a fractional datapointsToAlarm', () => {
    const propNames = { evaluationPeriods: 'e', datapointsToAlarm: 'd' };
    expect(() => validateDatapointsToAlarm({ evaluationPeriods: 3, datapointsToAlarm: 1.5 }, propNames)).toThrow(
      /^d must be between 1 and 3/,
    );
  });
});

describe('validateAlarmEvaluationRange', () => {
  const propNames = { period: 'alarms.periodSeconds', evaluationPeriods: 'alarms.evaluationPeriods' };

  test.each([
    [300, 288],
    [3600, 168],
  ])('accepts period %ss x %s evaluation periods', (periodSeconds, evaluationPeriods) => {
    expect(() => validateAlarmEvaluationRange({ periodSeconds, evaluationPeriods }, propNames)).not.toThrow();
  });

  // PutMetricAlarm allows 1 day for periods under an hour and 7 days otherwise.
  test.each([
    [300, 289, 86400],
    [3600, 169, 604800],
  ])('rejects period %ss x %s evaluation periods over %s seconds', (periodSeconds, evaluationPeriods, max) => {
    expect(() => validateAlarmEvaluationRange({ periodSeconds, evaluationPeriods }, propNames)).toThrow(
      `alarms.periodSeconds x alarms.evaluationPeriods must not exceed ${max} seconds ` +
        `(got ${periodSeconds} x ${evaluationPeriods} = ${periodSeconds * evaluationPeriods}).`,
    );
  });
});
