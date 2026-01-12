/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaLogGroup, MdaaMetricFilter, MdaaMetricFilterProps } from '../lib';

describe('MDAA Metric Filter Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
  const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
    naming: testApp.naming,
    createOutputs: false,
    createParams: false,
    logGroupName: 'test-function',
    logGroupNamePathPrefix: '/aws/lambda',
    encryptionKey: kmsKey,
    retention: RetentionDays.ONE_WEEK,
  });

  const testConstructProps: MdaaMetricFilterProps = {
    naming: testApp.naming,
    createOutputs: false,
    createParams: true,
    filterName: 'error-count',
    logGroup: logGroup,
    filterPattern: '{ $.level = "error" }',
    metricTransformations: [
      {
        metricName: 'error-count',
        metricNamespace: 'ETL/CSV-Parquet',
        metricValue: '1',
        unit: 'Count',
      },
    ],
  };

  new MdaaMetricFilter(testApp.testStack, 'test-metric-filter', testConstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('MetricFilterCreatedWithSingleTransformation', () => {
    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'error-count',
      FilterPattern: '{ $.level = "error" }',
      MetricTransformations: [
        {
          MetricName: 'error-count',
          MetricNamespace: 'ETL/CSV-Parquet',
          MetricValue: '1',
          Unit: 'Count',
        },
      ],
    });
  });

  test('MetricFilterExportsFilterNameToSSM', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metric-filter/error-count/name',
      Value: 'error-count',
    });
  });

  test('MetricFilterExportsLogGroupToSSM', () => {
    // Log group name is a CloudFormation reference, so we just verify the parameter exists with correct name
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metric-filter/error-count/log-group',
      Type: 'String',
    });
  });
});

describe('MDAA Metric Filter - Pattern Support', () => {
  test('MetricFilterSupportsSpaceDelimitedPattern', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'processing-duration',
      logGroup: logGroup,
      filterPattern: '[timestamp, request_id, level, msg, duration_ms]',
      metricTransformations: [
        {
          metricName: 'processing-duration-ms',
          metricNamespace: 'ETL/CSV-Parquet',
          metricValue: '$duration_ms',
          unit: 'Milliseconds',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-space-delimited', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'processing-duration',
      FilterPattern: '[timestamp, request_id, level, msg, duration_ms]',
      MetricTransformations: [
        {
          MetricName: 'processing-duration-ms',
          MetricNamespace: 'ETL/CSV-Parquet',
          MetricValue: '$duration_ms',
          Unit: 'Milliseconds',
        },
      ],
    });
  });

  test('MetricFilterSupportsMultipleTransformations', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'processing-metrics',
      logGroup: logGroup,
      filterPattern: '[timestamp, request_id, level, msg, duration_ms, memory_mb]',
      metricTransformations: [
        {
          metricName: 'processing-duration-ms',
          metricNamespace: 'TestObservability/Performance',
          metricValue: '$duration_ms',
          unit: 'Milliseconds',
        },
        {
          metricName: 'memory-usage-mb',
          metricNamespace: 'TestObservability/Performance',
          metricValue: '$memory_mb',
          unit: 'Megabytes',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-multiple', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // AWS CloudFormation only allows 1 transformation per filter
    // Verify two separate filters are created
    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'processing-metrics-0',
      FilterPattern: '[timestamp, request_id, level, msg, duration_ms, memory_mb]',
      MetricTransformations: [
        {
          MetricName: 'processing-duration-ms',
          MetricNamespace: 'TestObservability/Performance',
          MetricValue: '$duration_ms',
          Unit: 'Milliseconds',
        },
      ],
    });

    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'processing-metrics-1',
      FilterPattern: '[timestamp, request_id, level, msg, duration_ms, memory_mb]',
      MetricTransformations: [
        {
          MetricName: 'memory-usage-mb',
          MetricNamespace: 'TestObservability/Performance',
          MetricValue: '$memory_mb',
          Unit: 'Megabytes',
        },
      ],
    });
  });

  test('MetricFilterSupportsTextPattern', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'error-text-pattern',
      logGroup: logGroup,
      filterPattern: 'ERROR',
      metricTransformations: [
        {
          metricName: 'error-count',
          metricNamespace: 'ETL/CSV-Parquet',
          metricValue: '1',
          unit: 'Count',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-text', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'error-text-pattern',
      FilterPattern: 'ERROR',
    });
  });

  test('MetricFilterSupportsDimensions', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'error-count-with-dimensions',
      logGroup: logGroup,
      filterPattern: '{ $.level = "error" }',
      metricTransformations: [
        {
          metricName: 'error-count-by-type',
          metricNamespace: 'TestObservability/Errors',
          metricValue: '1',
          unit: 'Count',
          dimensions: {
            Environment: 'test',
            Service: 'observability',
          },
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-dimensions', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterName: 'error-count-with-dimensions',
      FilterPattern: '{ $.level = "error" }',
      MetricTransformations: [
        {
          MetricName: 'error-count-by-type',
          MetricNamespace: 'TestObservability/Errors',
          MetricValue: '1',
          Unit: 'Count',
          Dimensions: [
            { Key: 'Environment', Value: 'test' },
            { Key: 'Service', Value: 'observability' },
          ],
        },
      ],
    });
  });
});

describe('MDAA Metric Filter - Metric Metadata SSM Export', () => {
  test('MetricFilterExportsMetricMetadataWhenFunctionNameProvided', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'error-count',
      logGroup: logGroup,
      filterPattern: '{ $.level = "error" }',
      functionName: 'my-function',
      metricTransformations: [
        {
          metricName: 'error-count',
          metricNamespace: 'MyApp/Errors',
          metricValue: '1',
          unit: 'Count',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-with-function', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify metric namespace is exported
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/error-count/namespace',
      Value: 'MyApp/Errors',
    });

    // Verify metric name is exported
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/error-count/name',
      Value: 'error-count',
    });

    // Verify metric unit is exported
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/error-count/unit',
      Value: 'Count',
    });
  });

  test('MetricFilterExportsMultipleMetricMetadata', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'processing-metrics',
      logGroup: logGroup,
      filterPattern: '[timestamp, request_id, level, msg, duration_ms, memory_mb]',
      functionName: 'my-function',
      metricTransformations: [
        {
          metricName: 'processing-duration-ms',
          metricNamespace: 'MyApp/Performance',
          metricValue: '$duration_ms',
          unit: 'Milliseconds',
        },
        {
          metricName: 'memory-usage-mb',
          metricNamespace: 'MyApp/Performance',
          metricValue: '$memory_mb',
          unit: 'Megabytes',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-multiple-metadata', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify first metric metadata
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/processing-duration-ms/namespace',
      Value: 'MyApp/Performance',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/processing-duration-ms/unit',
      Value: 'Milliseconds',
    });

    // Verify second metric metadata
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/memory-usage-mb/namespace',
      Value: 'MyApp/Performance',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/metrics/my-function/memory-usage-mb/unit',
      Value: 'Megabytes',
    });
  });

  test('MetricFilterDoesNotExportMetricMetadataWithoutFunctionName', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true });
    const logGroup = new MdaaLogGroup(testApp.testStack, 'TestLogGroup', {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      logGroupName: 'test-function',
      logGroupNamePathPrefix: '/aws/lambda',
      encryptionKey: kmsKey,
      retention: RetentionDays.ONE_WEEK,
    });

    const testConstructProps: MdaaMetricFilterProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: true,
      filterName: 'error-count',
      logGroup: logGroup,
      filterPattern: '{ $.level = "error" }',
      // No functionName provided
      metricTransformations: [
        {
          metricName: 'error-count',
          metricNamespace: 'MyApp/Errors',
          metricValue: '1',
        },
      ],
    };

    new MdaaMetricFilter(testApp.testStack, 'test-metric-filter-no-function', testConstructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify only filter-level SSM parameters exist (not metric metadata)
    const resources = template.toJSON().Resources;
    const ssmParams = Object.values(resources).filter(
      (r): r is { Type: string } => (r as { Type?: string }).Type === 'AWS::SSM::Parameter',
    );

    // Should have 2 SSM params: filter name and log group (not metric metadata)
    expect(ssmParams.length).toBe(2);
  });
});
