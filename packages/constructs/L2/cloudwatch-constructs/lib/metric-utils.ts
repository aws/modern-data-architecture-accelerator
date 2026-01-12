/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Duration } from 'aws-cdk-lib';
import { IMetric, MathExpression, Metric, Unit } from 'aws-cdk-lib/aws-cloudwatch';

/**
 * Properties for a dashboard metric.
 * Used for both regular metrics and metric math expressions.
 */
export interface DashboardMetricPropsType {
  readonly expression?: string;
  readonly namespace?: string;
  readonly metricName?: string;
  readonly id?: string;
  readonly stat?: string;
  readonly period?: number;
  readonly dimensions?: { [key: string]: string };
  readonly unit?: string;
  readonly label?: string;
}

/**
 * Convert string unit to CloudWatch Unit enum.
 * Maps common unit strings to their corresponding CloudWatch Unit enum values.
 *
 * @param unit - The unit string to convert
 * @returns The corresponding Unit enum value, or undefined if unit is not provided
 * @throws Error if the unit string is not recognized
 */
export function convertUnit(unit: string | undefined): Unit | undefined {
  if (!unit) {
    return undefined;
  }

  // Map common unit strings to Unit enum values
  const unitMap: { [key: string]: Unit } = {
    Seconds: Unit.SECONDS,
    Microseconds: Unit.MICROSECONDS,
    Milliseconds: Unit.MILLISECONDS,
    Bytes: Unit.BYTES,
    Kilobytes: Unit.KILOBYTES,
    Megabytes: Unit.MEGABYTES,
    Gigabytes: Unit.GIGABYTES,
    Terabytes: Unit.TERABYTES,
    Bits: Unit.BITS,
    Kilobits: Unit.KILOBITS,
    Megabits: Unit.MEGABITS,
    Gigabits: Unit.GIGABITS,
    Terabits: Unit.TERABITS,
    Percent: Unit.PERCENT,
    Count: Unit.COUNT,
    'Bytes/Second': Unit.BYTES_PER_SECOND,
    'Kilobytes/Second': Unit.KILOBYTES_PER_SECOND,
    'Megabytes/Second': Unit.MEGABYTES_PER_SECOND,
    'Gigabytes/Second': Unit.GIGABYTES_PER_SECOND,
    'Terabytes/Second': Unit.TERABYTES_PER_SECOND,
    'Bits/Second': Unit.BITS_PER_SECOND,
    'Kilobits/Second': Unit.KILOBITS_PER_SECOND,
    'Megabits/Second': Unit.MEGABITS_PER_SECOND,
    'Gigabits/Second': Unit.GIGABITS_PER_SECOND,
    'Terabits/Second': Unit.TERABITS_PER_SECOND,
    'Count/Second': Unit.COUNT_PER_SECOND,
    None: Unit.NONE,
  };

  const mappedUnit = unitMap[unit];
  if (!mappedUnit) {
    throw new Error(`Invalid unit: ${unit}. Must be one of: ${Object.keys(unitMap).join(', ')}`);
  }

  return mappedUnit;
}

/**
 * Check if a metric props represents a metric math expression.
 * Expression metrics have an expression property defined.
 *
 * @param props - The metric props to check
 * @returns True if the metric is an expression metric, false otherwise
 */
export function isExpressionMetric(props: { expression?: string }): boolean {
  return !!props.expression;
}

/**
 * Create a regular CloudWatch metric from metric props.
 * Regular metrics require both namespace and metricName properties.
 *
 * @param props - The metric props containing namespace, metricName, and other metric properties
 * @returns A CloudWatch Metric instance
 * @throws Error if namespace or metricName is missing
 */
export function createRegularMetric(props: DashboardMetricPropsType): Metric {
  if (!props.namespace || !props.metricName) {
    throw new Error('Metric must have both namespace and metricName properties (or use expression)');
  }

  return new Metric({
    metricName: props.metricName,
    namespace: props.namespace,
    statistic: props.stat ?? 'Average',
    period: props.period ? Duration.seconds(props.period) : Duration.seconds(300),
    dimensionsMap: props.dimensions,
    unit: convertUnit(props.unit),
    label: props.label,
  });
}

/**
 * Create a metric math expression from metric props.
 * Math expressions use other metrics referenced by ID to perform calculations.
 *
 * @param props - The metric props containing expression and other properties
 * @param metricsById - Map of metric IDs to metric instances for expression references
 * @returns A CloudWatch MathExpression instance
 */
export function createMathExpressionMetric(
  props: DashboardMetricPropsType,
  metricsById: { [id: string]: IMetric },
): MathExpression {
  return new MathExpression({
    expression: props.expression!,
    usingMetrics: metricsById,
    label: props.label,
    period: props.period ? Duration.seconds(props.period) : Duration.seconds(300),
  });
}

/**
 * Build metrics array from metric props.
 * Processes both regular metrics and metric math expressions.
 *
 * @param metricProps - Array of metric properties
 * @returns Array of IMetric instances (Metric or MathExpression)
 */
export function buildMetrics(metricProps: DashboardMetricPropsType[]): IMetric[] {
  const metricsById: { [id: string]: IMetric } = {};
  const regularMetrics: IMetric[] = [];
  const expressionMetrics: IMetric[] = [];

  // Process regular metrics
  for (const props of metricProps) {
    if (!isExpressionMetric(props)) {
      const metric = createRegularMetric(props);
      if (props.id) {
        metricsById[props.id] = metric;
      }
      regularMetrics.push(metric);
    }
  }

  // Process expression metrics
  for (const props of metricProps) {
    if (isExpressionMetric(props)) {
      expressionMetrics.push(createMathExpressionMetric(props, metricsById));
    }
  }

  return [...regularMetrics, ...expressionMetrics];
}
