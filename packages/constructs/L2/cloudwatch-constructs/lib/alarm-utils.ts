/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';

/**
 * Convert string comparison operator to ComparisonOperator enum.
 * Maps common comparison operator strings to their corresponding CloudWatch ComparisonOperator enum values.
 *
 * @param operator - The comparison operator string to convert
 * @returns The corresponding ComparisonOperator enum value
 * @throws Error if the operator string is not recognized
 */
export function convertComparisonOperator(operator: string): ComparisonOperator {
  const operatorMap: { [key: string]: ComparisonOperator } = {
    GreaterThanOrEqualToThreshold: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    GreaterThanThreshold: ComparisonOperator.GREATER_THAN_THRESHOLD,
    LessThanThreshold: ComparisonOperator.LESS_THAN_THRESHOLD,
    LessThanOrEqualToThreshold: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    LessThanLowerOrGreaterThanUpperThreshold: ComparisonOperator.LESS_THAN_LOWER_OR_GREATER_THAN_UPPER_THRESHOLD,
    LessThanLowerThreshold: ComparisonOperator.LESS_THAN_LOWER_THRESHOLD,
    GreaterThanUpperThreshold: ComparisonOperator.GREATER_THAN_UPPER_THRESHOLD,
  };

  const mappedOperator = operatorMap[operator];
  if (!mappedOperator) {
    throw new Error(`Invalid comparison operator: ${operator}. Must be one of: ${Object.keys(operatorMap).join(', ')}`);
  }

  return mappedOperator;
}

/**
 * Periods CloudWatch accepts for an alarm metric, in seconds: 1, 5, 10, 30, or any
 * multiple of 60.
 *
 * Validated up front because CloudFormation does not reject an invalid period at
 * synth. On a metric-math alarm in particular the period is nested inside a
 * `MetricDataQuery` that CDK passes through unvalidated, so an invalid value escapes
 * synth and only fails when `PutMetricAlarm` is called during deployment.
 *
 * @param periodSeconds - The alarm period, in seconds, to validate
 * @param propName - Name used to refer to the offending property in the error
 *                   message, so a config-driven caller can point at the config key
 *                   the user actually set
 * @throws Error if the period is not a value CloudWatch accepts
 */
export function validateAlarmPeriodSeconds(periodSeconds: number, propName = 'period'): void {
  const isValid =
    [1, 5, 10, 30].includes(periodSeconds) || (periodSeconds >= 60 && Number.isInteger(periodSeconds / 60));
  if (!isValid) {
    throw new Error(
      `${propName} must be 1, 5, 10, 30, or a multiple of 60 seconds (got ${periodSeconds}). ` +
        'CloudWatch rejects other values.',
    );
  }
}

/**
 * Longest window, in seconds, a Metrics Insights alarm can evaluate: CloudWatch queries
 * only the most recent 3 hours of data for its alarm conditions.
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-limits.html
 */
export const METRICS_INSIGHTS_ALARM_MAX_WINDOW_SECONDS = 10800;

/**
 * Names of the properties {@link validateMetricsInsightsAlarmWindow} reports on, so a
 * config-driven caller can point at the config keys the user actually set.
 */
export interface MetricsInsightsAlarmWindowPropNames {
  /** Name of the period property. */
  readonly period: string;
  /** Name of the evaluation-periods property. */
  readonly evaluationPeriods: string;
}

/**
 * Validates the period and evaluation window of an alarm on a Metrics Insights query.
 *
 * Two constraints beyond {@link validateAlarmPeriodSeconds}:
 * - The period must be a multiple of 60 seconds. Metrics Insights does not support
 *   high-resolution data and aggregates it to one minute without failing, so a shorter
 *   period would deploy and silently evaluate something other than what was configured.
 * - Period x evaluation periods must not exceed 3 hours. `PutMetricAlarm` rejects a
 *   longer window ("MetricsInsights monitors cannot be checked across more than 3
 *   hours"), which would otherwise only surface during deployment.
 *
 * @param window - The period, in seconds, and the number of evaluation periods
 * @param propNames - Property names used in the error messages
 * @throws Error if either constraint is violated
 */
export function validateMetricsInsightsAlarmWindow(
  window: { readonly periodSeconds: number; readonly evaluationPeriods: number },
  propNames: MetricsInsightsAlarmWindowPropNames,
): void {
  const { periodSeconds, evaluationPeriods } = window;
  validateEvaluationPeriods(evaluationPeriods, propNames.evaluationPeriods);
  if (periodSeconds < 60 || !Number.isInteger(periodSeconds / 60)) {
    throw new Error(
      `${propNames.period} must be a multiple of 60 seconds for a Metrics Insights alarm (got ${periodSeconds}). ` +
        'Metrics Insights aggregates sub-minute data to one minute.',
    );
  }
  const windowSeconds = periodSeconds * evaluationPeriods;
  if (windowSeconds > METRICS_INSIGHTS_ALARM_MAX_WINDOW_SECONDS) {
    throw new Error(
      `${propNames.period} x ${propNames.evaluationPeriods} must not exceed ` +
        `${METRICS_INSIGHTS_ALARM_MAX_WINDOW_SECONDS} seconds (3 hours) for a Metrics Insights alarm ` +
        `(got ${periodSeconds} x ${evaluationPeriods} = ${windowSeconds}). ` +
        'CloudWatch evaluates Metrics Insights alarms over the most recent 3 hours only.',
    );
  }
}

/**
 * Validates that an alarm's evaluation periods is a whole number of at least 1, which
 * `PutMetricAlarm` would otherwise reject during deployment.
 *
 * @param evaluationPeriods - The number of evaluation periods
 * @param propName - Name of the property, used in the error message
 * @throws Error if evaluationPeriods is not an integer of at least 1
 */
export function validateEvaluationPeriods(evaluationPeriods: number, propName: string): void {
  if (!Number.isInteger(evaluationPeriods) || evaluationPeriods < 1) {
    throw new Error(`${propName} must be a whole number of at least 1 (got ${evaluationPeriods}).`);
  }
}

/** Longest evaluation range, in seconds, of an alarm with a period of at least one hour: 7 days. */
export const ALARM_MAX_EVALUATION_RANGE_SECONDS = 604800;

/** Longest evaluation range, in seconds, of an alarm with a period under one hour: 1 day. */
export const ALARM_MAX_SUB_HOUR_EVALUATION_RANGE_SECONDS = 86400;

/**
 * Validates an alarm's evaluation range, period x evaluation periods, against the limits
 * `PutMetricAlarm` enforces at deploy: 1 day for a period under one hour, 7 days
 * otherwise.
 *
 * @param window - The period, in seconds, and the number of evaluation periods
 * @param propNames - Property names used in the error messages
 * @throws Error if evaluationPeriods is invalid or the range exceeds the limit
 */
export function validateAlarmEvaluationRange(
  window: { readonly periodSeconds: number; readonly evaluationPeriods: number },
  propNames: MetricsInsightsAlarmWindowPropNames,
): void {
  const { periodSeconds, evaluationPeriods } = window;
  validateEvaluationPeriods(evaluationPeriods, propNames.evaluationPeriods);
  const maxRangeSeconds =
    periodSeconds < 3600 ? ALARM_MAX_SUB_HOUR_EVALUATION_RANGE_SECONDS : ALARM_MAX_EVALUATION_RANGE_SECONDS;
  const rangeSeconds = periodSeconds * evaluationPeriods;
  if (rangeSeconds > maxRangeSeconds) {
    throw new Error(
      `${propNames.period} x ${propNames.evaluationPeriods} must not exceed ${maxRangeSeconds} seconds ` +
        `(got ${periodSeconds} x ${evaluationPeriods} = ${rangeSeconds}). CloudWatch limits an alarm's ` +
        'evaluation range to 1 day for periods under an hour, and to 7 days otherwise.',
    );
  }
}

/**
 * Validates that an M-of-N alarm's datapoints-to-alarm does not exceed its evaluation
 * periods, which `PutMetricAlarm` would otherwise reject during deployment.
 *
 * @param alarmEvaluation - The evaluation periods and the optional datapoints to alarm
 * @param propNames - Property names used in the error message
 * @throws Error if evaluationPeriods is invalid, or datapointsToAlarm is not a whole number
 *         between 1 and evaluationPeriods
 */
export function validateDatapointsToAlarm(
  alarmEvaluation: { readonly evaluationPeriods: number; readonly datapointsToAlarm?: number },
  propNames: { readonly evaluationPeriods: string; readonly datapointsToAlarm: string },
): void {
  const { evaluationPeriods, datapointsToAlarm } = alarmEvaluation;
  validateEvaluationPeriods(evaluationPeriods, propNames.evaluationPeriods);
  if (
    datapointsToAlarm !== undefined &&
    (!Number.isInteger(datapointsToAlarm) || datapointsToAlarm < 1 || datapointsToAlarm > evaluationPeriods)
  ) {
    throw new Error(
      `${propNames.datapointsToAlarm} must be between 1 and ${evaluationPeriods} ` +
        `(got ${datapointsToAlarm}; ${propNames.evaluationPeriods} is ${evaluationPeriods}).`,
    );
  }
}

/**
 * Convert string treat missing data value to TreatMissingData enum.
 * Maps common treat missing data strings to their corresponding CloudWatch TreatMissingData enum values.
 *
 * @param treatment - The treat missing data string to convert (optional)
 * @returns The corresponding TreatMissingData enum value, defaults to NOT_BREACHING if not provided
 * @throws Error if the treatment string is not recognized
 */
export function convertTreatMissingData(treatment?: string): TreatMissingData {
  if (!treatment) {
    return TreatMissingData.NOT_BREACHING;
  }

  const treatmentMap: { [key: string]: TreatMissingData } = {
    notBreaching: TreatMissingData.NOT_BREACHING,
    breaching: TreatMissingData.BREACHING,
    ignore: TreatMissingData.IGNORE,
    missing: TreatMissingData.MISSING,
  };

  const mappedTreatment = treatmentMap[treatment];
  if (!mappedTreatment) {
    throw new Error(
      `Invalid treat missing data value: ${treatment}. Must be one of: ${Object.keys(treatmentMap).join(', ')}`,
    );
  }

  return mappedTreatment;
}
