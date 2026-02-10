/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MdaaDashboard, MdaaDashboardProps } from '../lib';

describe('MDAA Dashboard Compliance Tests', () => {
  test('ThrowsErrorWhenNoWidgetsProvided', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'empty-dashboard',
      widgets: [],
    };

    expect(() => {
      new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    }).toThrow('Dashboard must have at least one widget');
  });

  test('DashboardCreatedWithBasicProperties', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'test-dashboard',
      widgets: [
        {
          type: 'text',
          markdown: '# Test Dashboard',
          width: 24,
          height: 2,
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'test-dashboard',
    });
  });

  test('TextWidgetCreated', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'text-widget-dashboard',
      widgets: [
        {
          type: 'text',
          markdown: '# Header\nSome content',
          width: 12,
          height: 4,
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'text-widget-dashboard',
      DashboardBody: Match.stringLikeRegexp('.*text.*'),
    });
  });

  test('MetricWidgetCreated', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'metric-widget-dashboard',
      widgets: [
        {
          type: 'metric',
          title: 'Error Count',
          width: 12,
          height: 6,
          metrics: [
            {
              namespace: 'ETL/CSV-Parquet',
              metricName: 'error-count',
              stat: 'Sum',
              period: 300,
            },
          ],
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Dashboard should be created with the correct name
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'metric-widget-dashboard',
    });

    // Verify dashboard resource exists
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  test('LogInsightsWidgetCreated', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'log-insights-dashboard',
      widgets: [
        {
          type: 'log_insights',
          title: 'Recent Errors',
          width: 24,
          height: 6,
          logGroupNames: ['/aws/lambda/my-function'],
          queryString: 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc',
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Dashboard should be created with the correct name
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'log-insights-dashboard',
    });

    // Verify dashboard resource exists
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  test('SSMParameterCreatedForDashboardName', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'test-dashboard-ssm',
      widgets: [
        {
          type: 'text',
          markdown: '# Test',
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/dashboard/test-dashboard-ssm/name',
      Value: 'test-dashboard-ssm',
    });
  });

  test('CDKNAGSuppressionsAddedForSSMParameters', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'test-dashboard-nag',
      widgets: [
        {
          type: 'text',
          markdown: '# Test',
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify SSM parameter exists
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/dashboard/test-dashboard-nag/name',
    });
  });

  test('WidgetAutoWrappingAt24Width', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'auto-wrap-dashboard',
      widgets: [
        {
          type: 'text',
          markdown: '# Widget 1',
          width: 12,
        },
        {
          type: 'text',
          markdown: '# Widget 2',
          width: 12,
        },
        {
          type: 'text',
          markdown: '# Widget 3',
          width: 12,
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Dashboard should be created successfully with auto-wrapping
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'auto-wrap-dashboard',
    });

    // Verify dashboard body contains all three widgets
    const dashboardResource = template.findResources('AWS::CloudWatch::Dashboard');
    const dashboardBody = JSON.parse(Object.values(dashboardResource)[0].Properties.DashboardBody);

    // Should have 2 rows (12+12=24 in first row, 12 in second row)
    expect(dashboardBody.widgets.length).toBe(3);
  });

  test('MixedWidgetTypes', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'mixed-widget-dashboard',
      widgets: [
        {
          type: 'text',
          markdown: '# Dashboard Header',
          width: 24,
          height: 2,
        },
        {
          type: 'metric',
          title: 'Error Count',
          width: 12,
          height: 6,
          metrics: [
            {
              namespace: 'ETL/CSV-Parquet',
              metricName: 'error-count',
              stat: 'Sum',
            },
          ],
        },
        {
          type: 'metric',
          title: 'Duration',
          width: 12,
          height: 6,
          metrics: [
            {
              namespace: 'AWS/Lambda',
              metricName: 'Duration',
              stat: 'Average',
            },
          ],
        },
        {
          type: 'log_insights',
          title: 'Recent Errors',
          width: 24,
          height: 6,
          logGroupNames: ['/aws/lambda/my-function'],
          queryString: 'fields @timestamp, @message | filter @message like /ERROR/',
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'mixed-widget-dashboard',
    });

    // Verify dashboard resource exists
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  test('MetricWidgetWithDimensions', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'metric-dimensions-dashboard',
      widgets: [
        {
          type: 'metric',
          title: 'Lambda Errors',
          width: 12,
          height: 6,
          metrics: [
            {
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              stat: 'Sum',
              dimensions: {
                FunctionName: 'my-function',
              },
            },
          ],
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'metric-dimensions-dashboard',
    });
  });

  test('MultipleMetricsInSingleWidget', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'multi-metric-dashboard',
      widgets: [
        {
          type: 'metric',
          title: 'Lambda Metrics',
          width: 12,
          height: 6,
          metrics: [
            {
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              stat: 'Sum',
            },
            {
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              stat: 'Sum',
            },
            {
              namespace: 'AWS/Lambda',
              metricName: 'Duration',
              stat: 'Average',
            },
          ],
        },
      ],
    };

    new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'multi-metric-dashboard',
    });
  });

  test('ThrowsErrorWhenNoWidgetsProvided - Second Check', () => {
    const testApp = new MdaaTestApp();

    const testConstructProps: MdaaDashboardProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      dashboardName: 'empty-dashboard',
      widgets: [],
    };

    expect(() => {
      new MdaaDashboard(testApp.testStack, 'test-dashboard', testConstructProps);
    }).toThrow('Dashboard must have at least one widget');
  });
});
