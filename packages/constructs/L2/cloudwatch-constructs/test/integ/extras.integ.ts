/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaAlarm, MdaaMetricFilter, MdaaLogInsightsQuery, and MdaaDashboard.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaLogGroup creates an encrypted log group
 *   - MdaaMetricFilter creates a metric filter on the log group
 *   - MdaaAlarm creates an alarm on the filtered metric (no SNS actions)
 *   - MdaaLogInsightsQuery creates a query definition against the log group
 *   - MdaaDashboard creates a dashboard with text and metric widgets
 *   - MDAA naming convention is applied to all resources
 */

import { MdaaLogGroup, MdaaMetricFilter, MdaaAlarm, MdaaLogInsightsQuery, MdaaDashboard } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegCloudwatchExtrasStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'cwx');

// Log group for metric filter source
const logGroup = new MdaaLogGroup(stack, 'LogGroup', {
  naming,
  encryptionKey: kmsKey,
  logGroupNamePathPrefix: '/mdaa/integ',
  logGroupName: 'cwx-logs',
  retention: RetentionDays.ONE_DAY,
});

// Metric filter on the log group
new MdaaMetricFilter(stack, 'MetricFilter', {
  naming,
  filterName: 'integ-errors',
  logGroup,
  filterPattern: 'ERROR',
  metricTransformations: [
    {
      metricName: 'ErrorCount',
      metricNamespace: 'MdaaInteg/CWX',
      metricValue: '1',
      defaultValue: 0,
    },
  ],
});

// Alarm on the filtered metric (no SNS actions)
new MdaaAlarm(stack, 'Alarm', {
  naming,
  alarmName: 'integ-error-alarm',
  metricName: 'ErrorCount',
  namespace: 'MdaaInteg/CWX',
  statistic: 'Sum',
  period: 300,
  evaluationPeriods: 1,
  threshold: 1,
  comparisonOperator: 'GreaterThanOrEqualToThreshold',
  treatMissingData: 'notBreaching',
});

// Log Insights query against the log group
new MdaaLogInsightsQuery(stack, 'InsightsQuery', {
  naming,
  queryName: 'integ-error-query',
  queryString: 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20',
  logGroupNames: [logGroup.logGroupName],
});

// Dashboard with text widget and metric widget
new MdaaDashboard(stack, 'Dashboard', {
  naming,
  dashboardName: 'integ-dashboard',
  widgets: [
    {
      type: 'text',
      title: 'Info',
      markdown: '# MDAA Integration Test Dashboard',
      width: 24,
      height: 2,
    },
    {
      type: 'metric',
      title: 'Error Count',
      metrics: [
        {
          namespace: 'MdaaInteg/CWX',
          metricName: 'ErrorCount',
          stat: 'Sum',
        },
      ],
      width: 12,
      height: 6,
    },
  ],
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
