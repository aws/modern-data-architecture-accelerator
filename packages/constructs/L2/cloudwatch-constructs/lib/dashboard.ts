/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { buildMetrics } from './metric-utils';
import { createSsmParamWithSuppression } from './ssm-utils';
import { buildWidgetLayout, createWidget } from './widget-utils';

/**
 * Q-ENHANCED-PROPERTY
 * Properties for a metric in a dashboard widget.
 *
 * Use Cases:
 * - Display CloudWatch metrics on dashboards
 * - Use metric math expressions for calculations (e.g., "m1+m2")
 * - Use direct values or SSM references (resolved by MDAA config parser)
 *
 * AWS Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDataQuery.html
 *
 * Validation:
 * - For regular metrics: namespace and metricName are required
 * - For metric math: expression is required, namespace/metricName optional (used as placeholders)
 * - Use {{org}}, {{domain}}, {{env}} placeholders - they will be resolved by config parser
 */
export interface DashboardMetricProps {
  /**
   * Metric namespace. Required for regular metrics, optional for metric math expressions.
   * Can be a direct value or SSM reference with ssm: prefix.
   * Examples:
   * - Direct: "AWS/Lambda"
   * - SSM: "ssm:/{{org}}/{{domain}}/module/metric/namespace"
   * @default - Required unless using expression
   */
  readonly namespace?: string;

  /**
   * Metric name. Required for regular metrics, optional for metric math expressions.
   * Can be a direct value or SSM reference with ssm: prefix.
   * Examples:
   * - Direct: "Errors"
   * - SSM: "ssm:/{{org}}/{{domain}}/module/metric/name"
   * @default - Required unless using expression
   */
  readonly metricName?: string;

  /**
   * Metric math expression for calculations across metrics.
   * Example: "m1+m2+m3" to sum multiple metrics.
   * When using expressions, other metrics must have 'id' property set.
   * @default - Not used for regular metrics
   */
  readonly expression?: string;

  /**
   * Label for the metric
   * @default - Metric name or expression
   */
  readonly label?: string;

  /**
   * ID for the metric (used in expressions)
   * @default - Auto-generated
   */
  readonly id?: string;

  /**
   * Statistic to apply to the metric
   * @default 'Average'
   */
  readonly stat?: string;

  /**
   * Dimensions for the metric.
   * @default - No dimensions
   */
  readonly dimensions?: { [key: string]: string };

  /**
   * Period for the metric in seconds
   * @default 300
   */
  readonly period?: number;

  /**
   * Unit of the metric
   * @default - No unit
   */
  readonly unit?: string;
}

/**
 * Q-ENHANCED-PROPERTY
 * Properties for a dashboard widget.
 *
 * Use Cases:
 * - Text widgets for dashboard headers and descriptions
 * - Metric widgets for displaying time-series data
 * - Log insights widgets for displaying query results
 *
 * AWS Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
 *
 * Validation:
 * - type must be 'text', 'metric', or 'log_insights'
 * - Text widgets require markdown property
 * - Metric widgets require metrics array
 * - Log insights widgets require logGroupNames and queryString
 */
export interface DashboardWidgetProps {
  /**
   * The type of widget
   */
  readonly type: 'text' | 'metric' | 'log_insights';

  /**
   * The title of the widget
   * @default - No title
   */
  readonly title?: string;

  /**
   * Markdown content for text widgets
   * @default - No markdown (required for text widgets)
   */
  readonly markdown?: string;

  /**
   * Width of the widget (1-24)
   * @default 6
   */
  readonly width?: number;

  /**
   * Height of the widget
   * @default 6
   */
  readonly height?: number;

  /**
   * Metrics to display (for metric widgets)
   * @default - No metrics (required for metric widgets)
   */
  readonly metrics?: DashboardMetricProps[];

  /**
   * Period for metric widgets in seconds
   * @default 300
   */
  readonly period?: number;

  /**
   * Log group names for log insights widgets.
   * Use SSM references with {{org}}, {{domain}} placeholders which are resolved by config parser.
   * @default - No log groups (required for log insights widgets)
   */
  readonly logGroupNames?: string[];

  /**
   * Query string for log insights widgets
   * @default - No query string (required for log insights widgets)
   */
  readonly queryString?: string;
}

/**
 * Q-ENHANCED-PROPERTY
 * Properties for MdaaDashboard construct.
 *
 * Use Cases:
 * - Create unified observability dashboards across multiple Lambda functions
 * - Display metrics using direct namespace/metricName or SSM references
 * - Display log insights queries alongside metrics
 *
 * AWS Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutDashboard.html
 *
 * Validation:
 * - dashboardName must be unique within the account/region
 * - widgets array must not be empty
 */
export interface MdaaDashboardProps extends MdaaConstructProps {
  /**
   * The name of the dashboard
   */
  readonly dashboardName: string;

  /**
   * The widgets to display on the dashboard
   */
  readonly widgets: DashboardWidgetProps[];
}

/**
 * Construct for creating CloudWatch dashboards with MDAA observability features.
 * Supports SSM metric references for cross-module dashboards.
 */
export class MdaaDashboard extends Construct {
  public readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: MdaaDashboardProps) {
    super(scope, id);

    if (!props.widgets.length) {
      throw new Error('Dashboard must have at least one widget');
    }

    // Create dashboard
    this.dashboard = new Dashboard(this, 'Dashboard', {
      dashboardName: props.dashboardName,
    });

    // Build widget layout with auto-wrapping
    const rows = buildWidgetLayout(props.widgets, widgetProps => createWidget(widgetProps, buildMetrics));

    // Add rows to dashboard
    for (const row of rows) {
      this.dashboard.addWidgets(...row);
    }

    // Export dashboard name to SSM
    createSsmParamWithSuppression(
      this,
      scope,
      {
        resourceType: 'dashboard',
        resourceId: props.dashboardName,
        name: 'name',
        value: props.dashboardName,
        naming: props.naming,
        createOutputs: false,
        createParams: true,
      },
      'Parameter stores observability metadata (dashboard name); not sensitive data.',
    );
  }
}
