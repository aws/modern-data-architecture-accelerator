/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnMetricFilter, ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { convertUnit } from './metric-utils';
import { createSsmParamWithSuppression } from './ssm-utils';

/**
 * Properties for a metric transformation
 */
export interface MetricTransformationProps {
  /**
   * The name of the metric
   */
  readonly metricName: string;

  /**
   * The namespace of the metric
   */
  readonly metricNamespace: string;

  /**
   * The value to publish to the metric
   */
  readonly metricValue: string;

  /**
   * The default value for the metric when the filter pattern does not match
   * @default - No default value
   */
  readonly defaultValue?: number;

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
 * Properties for MdaaMetricFilter construct
 */
export interface MdaaMetricFilterProps extends MdaaConstructProps {
  /**
   * The name of the metric filter
   */
  readonly filterName: string;

  /**
   * The log group to create the metric filter on
   */
  readonly logGroup: ILogGroup;

  /**
   * The filter pattern to use for extracting metric data from logs.
   * Supports JSON pattern syntax, space-delimited pattern syntax, and simple text pattern syntax.
   */
  readonly filterPattern: string;

  /**
   * The metric transformations to apply to the filter
   */
  readonly metricTransformations: MetricTransformationProps[];

  /**
   * Optional function name for SSM parameter paths.
   * If provided, metric metadata will be exported to SSM at:
   * /mdaa/{org}/{env}/metrics/{functionName}/{metricName}/namespace
   * /mdaa/{org}/{env}/metrics/{functionName}/{metricName}/name
   * /mdaa/{org}/{env}/metrics/{functionName}/{metricName}/unit
   * @default - No metric metadata exported to SSM
   */
  readonly functionName?: string;
}

/**
 * Construct for creating CloudWatch Logs metric filters
 * Note: AWS CloudFormation only allows 1 metric transformation per filter.
 * If multiple transformations are provided, separate filters will be created.
 */
export class MdaaMetricFilter extends Construct {
  public readonly metricFilters: CfnMetricFilter[];

  constructor(scope: Construct, id: string, props: MdaaMetricFilterProps) {
    super(scope, id);

    this.metricFilters = this.createMetricFilters(props);
    this.exportFilterMetadata(scope, props);

    if (props.functionName) {
      this.exportMetricMetadata(scope, props);
    }
  }

  /**
   * Create metric filters for each transformation
   */
  private createMetricFilters(props: MdaaMetricFilterProps): CfnMetricFilter[] {
    return props.metricTransformations.map((transformation, index) => {
      const dimensions = transformation.dimensions
        ? Object.entries(transformation.dimensions).map(([key, value]) => ({ key, value }))
        : undefined;

      const metricTransformation: CfnMetricFilter.MetricTransformationProperty = {
        metricName: transformation.metricName,
        metricNamespace: transformation.metricNamespace,
        metricValue: transformation.metricValue,
        ...(transformation.defaultValue !== undefined && { defaultValue: transformation.defaultValue }),
        ...(transformation.unit !== undefined && { unit: convertUnit(transformation.unit) }),
        ...(dimensions !== undefined && { dimensions }),
      };

      const filterName = props.metricTransformations.length === 1 ? props.filterName : `${props.filterName}-${index}`;

      return new CfnMetricFilter(this, `MetricFilter${index}`, {
        logGroupName: props.logGroup.logGroupName,
        filterName,
        filterPattern: props.filterPattern,
        metricTransformations: [metricTransformation],
      });
    });
  }

  /**
   * Export filter names and log groups to SSM for cross-module discoverability
   */
  private exportFilterMetadata(scope: Construct, props: MdaaMetricFilterProps): void {
    for (const [index] of this.metricFilters.entries()) {
      const filterName = props.metricTransformations.length === 1 ? props.filterName : `${props.filterName}-${index}`;

      createSsmParamWithSuppression(
        this,
        scope,
        {
          resourceType: 'metric-filter',
          resourceId: filterName,
          name: 'name',
          value: filterName,
          naming: props.naming,
          createOutputs: false,
          createParams: true,
        },
        'Parameter stores observability metadata (metric filter name); not sensitive data.',
      );

      createSsmParamWithSuppression(
        this,
        scope,
        {
          resourceType: 'metric-filter',
          resourceId: filterName,
          name: 'log-group',
          value: props.logGroup.logGroupName,
          naming: props.naming,
          createOutputs: false,
          createParams: true,
        },
        'Parameter stores observability metadata (log group name); not sensitive data.',
      );
    }
  }

  /**
   * Export metric metadata to SSM for function observability
   */
  private exportMetricMetadata(scope: Construct, props: MdaaMetricFilterProps): void {
    const functionName = props.functionName!;

    for (const transformation of props.metricTransformations) {
      const resourceId = `${functionName}/${transformation.metricName}`;

      createSsmParamWithSuppression(
        this,
        scope,
        {
          resourceType: 'metrics',
          resourceId,
          name: 'filterName',
          value: this.metricFilters[0].filterName ?? '',
          naming: props.naming,
          createOutputs: false,
          createParams: true,
        },
        'Parameter stores observability metadata (metric filter name); not sensitive data.',
      );

      createSsmParamWithSuppression(
        this,
        scope,
        {
          resourceType: 'metrics',
          resourceId,
          name: 'namespace',
          value: transformation.metricNamespace,
          naming: props.naming,
          createOutputs: false,
          createParams: true,
        },
        'Parameter stores observability metadata (metric namespace); not sensitive data.',
      );

      createSsmParamWithSuppression(
        this,
        scope,
        {
          resourceType: 'metrics',
          resourceId,
          name: 'name',
          value: transformation.metricName,
          naming: props.naming,
          createOutputs: false,
          createParams: true,
        },
        'Parameter stores observability metadata (metric name); not sensitive data.',
      );

      if (transformation.unit) {
        createSsmParamWithSuppression(
          this,
          scope,
          {
            resourceType: 'metrics',
            resourceId,
            name: 'unit',
            value: transformation.unit,
            naming: props.naming,
            createOutputs: false,
            createParams: true,
          },
          'Parameter stores observability metadata (metric unit); not sensitive data.',
        );
      }
    }
  }
}
