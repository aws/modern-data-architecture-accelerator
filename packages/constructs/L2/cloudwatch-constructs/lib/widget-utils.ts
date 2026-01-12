/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Duration } from 'aws-cdk-lib';
import { GraphWidget, IMetric, IWidget, LogQueryWidget, TextWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { DashboardMetricPropsType } from './metric-utils';

/**
 * Properties for a dashboard widget.
 * Supports text, metric, and log insights widget types.
 */
export interface DashboardWidgetPropsType {
  readonly type: 'text' | 'metric' | 'log_insights';
  readonly title?: string;
  readonly markdown?: string;
  readonly width?: number;
  readonly height?: number;
  readonly metrics?: DashboardMetricPropsType[];
  readonly period?: number;
  readonly logGroupNames?: string[];
  readonly queryString?: string;
}

/**
 * Build widget layout with auto-wrapping at 24-unit width.
 * Organizes widgets into rows, wrapping to a new row when width exceeds 24 units.
 *
 * @param widgetProps - Array of widget properties to layout
 * @param createWidgetFn - Function to create IWidget from props
 * @returns Array of widget rows, each row containing widgets that fit within 24 units
 */
export function buildWidgetLayout(
  widgetProps: DashboardWidgetPropsType[],
  createWidgetFn: (props: DashboardWidgetPropsType) => IWidget,
): IWidget[][] {
  const rows: IWidget[][] = [];
  let currentRow: IWidget[] = [];
  let currentWidth = 0;

  for (const props of widgetProps) {
    const widget = createWidgetFn(props);
    const widgetWidth = props.width ?? 6;

    // Check if adding this widget would exceed 24 units
    if (currentWidth + widgetWidth > 24 && currentRow.length > 0) {
      // Start new row
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    // Add widget to current row
    currentRow.push(widget);
    currentWidth += widgetWidth;
  }

  // Add final row if not empty
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Create a text widget for CloudWatch dashboards.
 * Text widgets display markdown content.
 *
 * @param props - Widget properties including markdown content
 * @returns A CloudWatch TextWidget instance
 * @throws Error if markdown property is missing
 */
export function createTextWidget(props: { markdown?: string; width?: number; height?: number }): TextWidget {
  if (!props.markdown) {
    throw new Error('Text widgets require markdown property');
  }

  return new TextWidget({
    markdown: props.markdown,
    width: props.width ?? 6,
    height: props.height ?? 6,
  });
}

/**
 * Create a metric widget for CloudWatch dashboards.
 * Metric widgets display time-series data for CloudWatch metrics.
 *
 * @param props - Widget properties including metrics array
 * @param buildMetricsFn - Function to build metrics from metric props
 * @returns A CloudWatch GraphWidget instance
 * @throws Error if metrics array is missing or empty
 */
export function createMetricWidget(
  props: {
    title?: string;
    metrics?: DashboardMetricPropsType[];
    width?: number;
    height?: number;
    period?: number;
  },
  buildMetricsFn: (metricProps: DashboardMetricPropsType[]) => IMetric[],
): GraphWidget {
  if (!props.metrics || props.metrics.length === 0) {
    throw new Error('Metric widgets require metrics array');
  }

  const metrics = buildMetricsFn(props.metrics);

  return new GraphWidget({
    title: props.title,
    left: metrics,
    width: props.width ?? 6,
    height: props.height ?? 6,
    period: props.period ? Duration.seconds(props.period) : Duration.seconds(300),
  });
}

/**
 * Create a log insights widget for CloudWatch dashboards.
 * Log insights widgets display results from CloudWatch Logs Insights queries.
 *
 * @param props - Widget properties including log group names and query string
 * @returns A CloudWatch LogQueryWidget instance
 * @throws Error if logGroupNames or queryString is missing
 */
export function createLogInsightsWidget(props: {
  title?: string;
  logGroupNames?: string[];
  queryString?: string;
  width?: number;
  height?: number;
}): LogQueryWidget {
  if (!props.logGroupNames || props.logGroupNames.length === 0) {
    throw new Error('Log insights widgets require logGroupNames array');
  }
  if (!props.queryString) {
    throw new Error('Log insights widgets require queryString property');
  }

  return new LogQueryWidget({
    title: props.title,
    logGroupNames: props.logGroupNames,
    queryString: props.queryString,
    width: props.width ?? 6,
    height: props.height ?? 6,
  });
}

/**
 * Create a widget based on its type.
 * Factory function that delegates to specific widget creation functions.
 *
 * @param props - Widget properties including type discriminator
 * @param buildMetricsFn - Function to build metrics (used for metric widgets)
 * @returns An IWidget instance of the appropriate type
 * @throws Error if widget type is unsupported
 */
export function createWidget(
  props: DashboardWidgetPropsType,
  buildMetricsFn: (metricProps: DashboardMetricPropsType[]) => IMetric[],
): IWidget {
  switch (props.type) {
    case 'text':
      return createTextWidget(props);
    case 'metric':
      return createMetricWidget(props, buildMetricsFn);
    case 'log_insights':
      return createLogInsightsWidget(props);
    default:
      throw new Error(`Unsupported widget type: ${props.type}`);
  }
}
