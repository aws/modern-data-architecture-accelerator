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
 * Properties for a metric in a dashboard widget.
 *
 * Use cases: CloudWatch metric display; Metric math expressions; SSM-referenced metrics
 *
 * AWS: CloudWatch metric data queries for dashboard visualization
 *
 * Validation: For regular metrics namespace and metricName are required; for metric math expression is required
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
 * Properties for a dashboard widget.
 *
 * Use cases: Text dashboard headers; Metric time-series display; Log insights query results
 *
 * AWS: CloudWatch dashboard widget configuration
 *
 * Validation: type is required; text widgets require markdown; metric widgets require metrics; log insights require logGroupNames and queryString
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

/** Properties for MdaaDashboard construct */
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
