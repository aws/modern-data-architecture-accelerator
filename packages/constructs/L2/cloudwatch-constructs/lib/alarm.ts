/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { Alarm, CfnAlarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { convertComparisonOperator, convertTreatMissingData } from './alarm-utils';
import { convertUnit } from './metric-utils';
import { createSsmParamWithSuppression } from './ssm-utils';

/**
 * Properties for a metric data query (used in metric math alarms)
 */
export interface MetricDataQueryProps {
  /**
   * The ID of the metric (used in expressions)
   */
  readonly id: string;

  /**
   * The metric math expression
   * @default - No expression (use metric stats instead)
   */
  readonly expression?: string;

  /**
   * The label for the metric
   * @default - No label
   */
  readonly label?: string;

  /**
   * Whether to return data for this metric
   * @default true for expressions, false for metrics
   */
  readonly returnData?: boolean;

  /**
   * The metric name (for metric stats)
   * @default - No metric name (use expression instead)
   */
  readonly metricName?: string;

  /**
   * The metric namespace (for metric stats)
   * @default - No namespace (use expression instead)
   */
  readonly namespace?: string;

  /**
   * The statistic to apply to the metric
   * @default - No statistic (use expression instead)
   */
  readonly statistic?: string;

  /**
   * The period for the metric in seconds
   * @default - No period (use expression instead)
   */
  readonly period?: number;

  /**
   * The unit of the metric
   * @default - No unit
   */
  readonly unit?: string;

  /**
   * The dimensions for the metric
   * @default - No dimensions
   */
  readonly dimensions?: { [key: string]: string };
}

/**
 * Properties for MdaaAlarm construct
 */
export interface MdaaAlarmProps extends MdaaConstructProps {
  /**
   * The name of the alarm
   */
  readonly alarmName: string;

  /**
   * The Lambda function name (for SSM parameter organization)
   * When provided, alarm metadata will be exported to SSM under the function's namespace
   * @default - Alarm metadata exported without function name in path
   */
  readonly functionName?: string;

  // Single metric alarm properties
  /**
   * The metric name (for single metric alarms)
   * @default - No metric name (use metrics array for metric math)
   */
  readonly metricName?: string;

  /**
   * The metric namespace (for single metric alarms)
   * @default - No namespace (use metrics array for metric math)
   */
  readonly namespace?: string;

  /**
   * The statistic to apply to the metric
   * @default - No statistic (use metrics array for metric math)
   */
  readonly statistic?: string;

  /**
   * The period for the metric in seconds
   * @default - No period (use metrics array for metric math)
   */
  readonly period?: number;

  /**
   * The unit of the metric
   * @default - No unit
   */
  readonly unit?: string;

  /**
   * The dimensions for the metric
   * @default - No dimensions
   */
  readonly dimensions?: { [key: string]: string };

  // Metric math alarm properties
  /**
   * The metrics for metric math alarms
   * @default - No metrics (use single metric properties instead)
   */
  readonly metrics?: MetricDataQueryProps[];

  // Common alarm properties
  /**
   * The number of periods over which data is compared to the threshold
   */
  readonly evaluationPeriods: number;

  /**
   * The threshold value to compare against
   */
  readonly threshold: number;

  /**
   * The comparison operator to use
   */
  readonly comparisonOperator: string;

  /**
   * How to treat missing data
   * @default 'notBreaching'
   */
  readonly treatMissingData?: string;

  /**
   * The description of the alarm
   * @default - No description
   */
  readonly alarmDescription?: string;

  /**
   * Whether actions should be executed during alarm state changes
   * @default true
   */
  readonly actionsEnabled?: boolean;

  /**
   * The number of datapoints that must be breaching to trigger the alarm
   * @default - Same as evaluationPeriods
   */
  readonly datapointsToAlarm?: number;

  // Actions
  /**
   * SNS topic ARNs to notify when the alarm goes to ALARM state
   * @default - No alarm actions
   */
  readonly alarmActions?: string[];

  /**
   * SNS topic ARNs to notify when the alarm goes to OK state
   * @default - No OK actions
   */
  readonly okActions?: string[];

  /**
   * SNS topic ARNs to notify when the alarm goes to INSUFFICIENT_DATA state
   * @default - No insufficient data actions
   */
  readonly insufficientDataActions?: string[];
}

/**
 * Construct for creating CloudWatch alarms
 */
export class MdaaAlarm extends Construct {
  public readonly alarm: Alarm | CfnAlarm;

  constructor(scope: Construct, id: string, props: MdaaAlarmProps) {
    super(scope, id);

    // Determine alarm type and create appropriate alarm
    if (props.metrics && props.metrics.length > 0) {
      // Metric math alarm
      this.alarm = this.createMetricMathAlarm(props);
    } else {
      // Single metric alarm
      this.alarm = this.createSingleMetricAlarm(props);
    }

    // Export alarm metadata to SSM
    this.exportAlarmMetadata(scope, props);

    // Add CDK-NAG suppressions for alarms without actions
    if (!props.alarmActions && !props.okActions && !props.insufficientDataActions) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        this.alarm,
        [
          {
            id: 'NIST.800.53.R5-CloudWatchAlarmAction',
            reason: 'Alarm actions are optional; alarms can be used for monitoring without notifications.',
          },
          {
            id: 'HIPAA.Security-CloudWatchAlarmAction',
            reason: 'Alarm actions are optional; alarms can be used for monitoring without notifications.',
          },
          {
            id: 'PCI.DSS.321-CloudWatchAlarmAction',
            reason: 'Alarm actions are optional; alarms can be used for monitoring without notifications.',
          },
        ],
        true,
      );
    }
  }

  /**
   * Create a single metric alarm using L2 Alarm construct
   */
  private createSingleMetricAlarm(props: MdaaAlarmProps): Alarm {
    if (!props.metricName || !props.namespace || !props.statistic || !props.period) {
      throw new Error('Single metric alarms require metricName, namespace, statistic, and period properties');
    }

    // Build metric
    const metric = new Metric({
      metricName: props.metricName,
      namespace: props.namespace,
      statistic: props.statistic,
      period: Duration.seconds(props.period),
      dimensionsMap: props.dimensions,
      unit: convertUnit(props.unit),
    });

    // Create alarm
    const alarm = new Alarm(this, 'Alarm', {
      alarmName: props.alarmName,
      metric,
      evaluationPeriods: props.evaluationPeriods,
      threshold: props.threshold,
      comparisonOperator: convertComparisonOperator(props.comparisonOperator),
      treatMissingData: convertTreatMissingData(props.treatMissingData),
      alarmDescription: props.alarmDescription,
      actionsEnabled: props.actionsEnabled ?? true,
      datapointsToAlarm: props.datapointsToAlarm,
    });

    // Add SNS actions
    if (props.alarmActions) {
      this.addSnsActions(props.alarmActions, action => alarm.addAlarmAction(action), 'alarm');
    }
    if (props.okActions) {
      this.addSnsActions(props.okActions, action => alarm.addOkAction(action), 'ok');
    }
    if (props.insufficientDataActions) {
      this.addSnsActions(
        props.insufficientDataActions,
        action => alarm.addInsufficientDataAction(action),
        'insufficient',
      );
    }

    return alarm;
  }

  /**
   * Create a metric math alarm using L1 CfnAlarm construct
   */
  private createMetricMathAlarm(props: MdaaAlarmProps): CfnAlarm {
    if (!props.metrics || props.metrics.length === 0) {
      throw new Error('Metric math alarms require at least one metric in the metrics array');
    }

    // Validate that exactly one metric has returnData: true
    const metricsReturningData = props.metrics.filter(m => m.returnData === true);
    if (metricsReturningData.length === 0) {
      throw new Error(
        'Metric math alarms require exactly one metric with returnData: true. ' +
          'Set returnData: true on the metric that should be evaluated against the threshold.',
      );
    }
    if (metricsReturningData.length > 1) {
      throw new Error(
        `Metric math alarms require exactly one metric with returnData: true, but found ${metricsReturningData.length}. ` +
          `Metrics with returnData: true: ${metricsReturningData.map(m => m.id).join(', ')}`,
      );
    }

    // Build metric data queries
    const metricDataQueries: CfnAlarm.MetricDataQueryProperty[] = props.metrics.map(metric => {
      // Default returnData to false for metrics, true for expressions with returnData explicitly set
      const returnData = metric.returnData ?? false;

      if (metric.expression) {
        // Metric math expression
        return {
          id: metric.id,
          label: metric.label,
          returnData,
          expression: metric.expression,
        };
      } else {
        // Metric stat
        if (!metric.metricName || !metric.namespace || !metric.statistic) {
          throw new Error(
            `Metric ${metric.id} requires metricName, namespace, and statistic when not using an expression`,
          );
        }

        const dimensions = metric.dimensions
          ? Object.entries(metric.dimensions).map(([name, value]) => ({ name, value }))
          : undefined;

        return {
          id: metric.id,
          label: metric.label,
          returnData,
          metricStat: {
            metric: {
              metricName: metric.metricName,
              namespace: metric.namespace,
              dimensions,
            },
            stat: metric.statistic,
            period: metric.period ?? 300,
            unit: metric.unit,
          },
        };
      }
    });

    // Create alarm
    return new CfnAlarm(this, 'Alarm', {
      alarmName: props.alarmName,
      metrics: metricDataQueries,
      evaluationPeriods: props.evaluationPeriods,
      threshold: props.threshold,
      comparisonOperator: props.comparisonOperator,
      treatMissingData: props.treatMissingData ?? 'notBreaching',
      alarmDescription: props.alarmDescription,
      actionsEnabled: props.actionsEnabled ?? true,
      datapointsToAlarm: props.datapointsToAlarm,
      alarmActions: props.alarmActions,
      okActions: props.okActions,
      insufficientDataActions: props.insufficientDataActions,
    });
  }

  /**
   * Add SNS actions to an alarm
   */
  private addSnsActions(topicArns: string[], addActionMethod: (action: SnsAction) => void, actionType: string): void {
    for (const [index, topicArn] of topicArns.entries()) {
      const topic = Topic.fromTopicArn(this, `Topic-${actionType}-${index}`, topicArn);
      addActionMethod(new SnsAction(topic));
    }
  }

  /**
   * Export alarm metadata to SSM
   */
  private exportAlarmMetadata(scope: Construct, props: MdaaAlarmProps): void {
    // Get alarm ARN - handle both Alarm and CfnAlarm types
    const alarmArn = this.alarm instanceof Alarm ? this.alarm.alarmArn : this.alarm.attrArn;

    // Build resource ID with function name for consistency with metrics and queries
    // Pattern: {functionName}/{alarmName} or just {alarmName} if no function name
    const resourceId = props.functionName ? `${props.functionName}/${props.alarmName}` : props.alarmName;

    // Export alarm ARN
    createSsmParamWithSuppression(
      this,
      scope,
      {
        resourceType: 'alarm',
        resourceId,
        name: 'arn',
        value: alarmArn,
        naming: props.naming,
        createOutputs: false,
        createParams: true,
      },
      'Parameter stores observability metadata (alarm ARN); not sensitive data.',
    );

    // Export alarm name (consistent with metrics pattern - no -name suffix in resourceId)
    createSsmParamWithSuppression(
      this,
      scope,
      {
        resourceType: 'alarm',
        resourceId,
        name: 'name',
        value: props.alarmName,
        naming: props.naming,
        createOutputs: false,
        createParams: true,
      },
      'Parameter stores observability metadata (alarm name); not sensitive data.',
    );
  }
}
