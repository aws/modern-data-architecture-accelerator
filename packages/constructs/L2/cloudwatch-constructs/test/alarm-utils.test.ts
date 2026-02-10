import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { convertComparisonOperator, convertTreatMissingData } from '../lib/alarm-utils';

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
