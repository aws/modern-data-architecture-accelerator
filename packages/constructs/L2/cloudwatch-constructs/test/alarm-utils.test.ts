import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { convertComparisonOperator, convertTreatMissingData, validateAlarmPeriodSeconds } from '../lib/alarm-utils';

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
