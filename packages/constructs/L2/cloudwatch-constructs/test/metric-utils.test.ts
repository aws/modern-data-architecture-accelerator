import { Unit } from 'aws-cdk-lib/aws-cloudwatch';
import {
  convertUnit,
  isExpressionMetric,
  createRegularMetric,
  createMathExpressionMetric,
  buildMetrics,
} from '../lib/metric-utils';

describe('convertUnit', () => {
  test('returns undefined for undefined input', () => {
    expect(convertUnit(undefined)).toBeUndefined();
  });

  test('converts time units correctly', () => {
    expect(convertUnit('Seconds')).toBe(Unit.SECONDS);
    expect(convertUnit('Milliseconds')).toBe(Unit.MILLISECONDS);
    expect(convertUnit('Microseconds')).toBe(Unit.MICROSECONDS);
  });

  test('converts byte units correctly', () => {
    expect(convertUnit('Bytes')).toBe(Unit.BYTES);
    expect(convertUnit('Kilobytes')).toBe(Unit.KILOBYTES);
    expect(convertUnit('Megabytes')).toBe(Unit.MEGABYTES);
    expect(convertUnit('Gigabytes')).toBe(Unit.GIGABYTES);
    expect(convertUnit('Terabytes')).toBe(Unit.TERABYTES);
  });

  test('converts bit units correctly', () => {
    expect(convertUnit('Bits')).toBe(Unit.BITS);
    expect(convertUnit('Kilobits')).toBe(Unit.KILOBITS);
    expect(convertUnit('Megabits')).toBe(Unit.MEGABITS);
    expect(convertUnit('Gigabits')).toBe(Unit.GIGABITS);
    expect(convertUnit('Terabits')).toBe(Unit.TERABITS);
  });

  test('converts rate units correctly', () => {
    expect(convertUnit('Bytes/Second')).toBe(Unit.BYTES_PER_SECOND);
    expect(convertUnit('Kilobytes/Second')).toBe(Unit.KILOBYTES_PER_SECOND);
    expect(convertUnit('Megabytes/Second')).toBe(Unit.MEGABYTES_PER_SECOND);
    expect(convertUnit('Bits/Second')).toBe(Unit.BITS_PER_SECOND);
    expect(convertUnit('Count/Second')).toBe(Unit.COUNT_PER_SECOND);
  });

  test('converts common units correctly', () => {
    expect(convertUnit('Count')).toBe(Unit.COUNT);
    expect(convertUnit('Percent')).toBe(Unit.PERCENT);
    expect(convertUnit('None')).toBe(Unit.NONE);
  });

  test('throws error for invalid unit', () => {
    expect(() => convertUnit('InvalidUnit')).toThrow('Invalid unit: InvalidUnit');
  });

  test('throws error with list of valid units', () => {
    expect(() => convertUnit('BadUnit')).toThrow(/Must be one of:/);
  });
});

describe('isExpressionMetric', () => {
  test('returns true when expression is defined', () => {
    expect(isExpressionMetric({ expression: 'm1+m2' })).toBe(true);
  });

  test('returns false when expression is undefined', () => {
    expect(isExpressionMetric({})).toBe(false);
  });

  test('returns false when expression is empty string', () => {
    expect(isExpressionMetric({ expression: '' })).toBe(false);
  });

  test('returns false for empty object', () => {
    expect(isExpressionMetric({})).toBe(false);
  });
});

describe('createRegularMetric', () => {
  test('creates metric with required properties', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
    });

    expect(metric).toBeDefined();
    expect(metric.namespace).toBe('AWS/Lambda');
    expect(metric.metricName).toBe('Errors');
  });

  test('throws error when namespace is missing', () => {
    expect(() =>
      createRegularMetric({
        metricName: 'Errors',
      }),
    ).toThrow('Metric must have both namespace and metricName properties (or use expression)');
  });

  test('throws error when metricName is missing', () => {
    expect(() =>
      createRegularMetric({
        namespace: 'AWS/Lambda',
      }),
    ).toThrow('Metric must have both namespace and metricName properties (or use expression)');
  });

  test('applies default statistic of Average', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
    });

    expect(metric.statistic).toBe('Average');
  });

  test('applies custom statistic', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      stat: 'Sum',
    });

    expect(metric.statistic).toBe('Sum');
  });

  test('applies default period of 300 seconds', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
    });

    expect(metric.period.toSeconds()).toBe(300);
  });

  test('applies custom period', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      period: 60,
    });

    expect(metric.period.toSeconds()).toBe(60);
  });

  test('applies dimensions', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensions: { FunctionName: 'my-function' },
    });

    expect(metric.dimensions).toEqual({ FunctionName: 'my-function' });
  });

  test('applies unit conversion', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      unit: 'Milliseconds',
    });

    expect(metric.unit).toBe(Unit.MILLISECONDS);
  });

  test('applies label', () => {
    const metric = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      label: 'Error Count',
    });

    expect(metric.label).toBe('Error Count');
  });
});

describe('createMathExpressionMetric', () => {
  test('creates math expression with required properties', () => {
    const m1 = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
    });

    const metricsById = { m1 };
    const mathExpression = createMathExpressionMetric(
      {
        expression: 'm1*100',
      },
      metricsById,
    );

    expect(mathExpression).toBeDefined();
    expect(mathExpression.expression).toBe('m1*100');
  });

  test('applies default period of 300 seconds', () => {
    const mathExpression = createMathExpressionMetric(
      {
        expression: 'm1+m2',
      },
      {},
    );

    expect(mathExpression.period.toSeconds()).toBe(300);
  });

  test('applies custom period', () => {
    const mathExpression = createMathExpressionMetric(
      {
        expression: 'm1+m2',
        period: 60,
      },
      {},
    );

    expect(mathExpression.period.toSeconds()).toBe(60);
  });

  test('applies label', () => {
    const mathExpression = createMathExpressionMetric(
      {
        expression: 'm1+m2',
        label: 'Total Errors',
      },
      {},
    );

    expect(mathExpression.label).toBe('Total Errors');
  });

  test('uses provided metrics by ID', () => {
    const m1 = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
    });
    const m2 = createRegularMetric({
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
    });

    const metricsById = { m1, m2 };
    const mathExpression = createMathExpressionMetric(
      {
        expression: 'm1/m2*100',
      },
      metricsById,
    );

    expect(mathExpression.usingMetrics).toEqual(metricsById);
  });
});

describe('buildMetrics', () => {
  test('builds regular metrics', () => {
    const metrics = buildMetrics([
      {
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
      },
    ]);

    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toBeDefined();
  });

  test('builds metrics with IDs for expression references', () => {
    const metrics = buildMetrics([
      {
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        id: 'm1',
      },
      {
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        id: 'm2',
      },
    ]);

    expect(metrics).toHaveLength(2);
  });

  test('builds math expression metrics', () => {
    const metrics = buildMetrics([
      {
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        id: 'm1',
      },
      {
        expression: 'm1*100',
        label: 'Error Percentage',
      },
    ]);

    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toBeDefined();
    expect(metrics[1]).toBeDefined();
  });

  test('returns regular metrics before expression metrics', () => {
    const metrics = buildMetrics([
      {
        expression: 'm1+m2',
      },
      {
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        id: 'm1',
      },
      {
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        id: 'm2',
      },
    ]);

    expect(metrics).toHaveLength(3);
    // All metrics should be defined
    expect(metrics[0]).toBeDefined();
    expect(metrics[1]).toBeDefined();
    expect(metrics[2]).toBeDefined();
  });
});
