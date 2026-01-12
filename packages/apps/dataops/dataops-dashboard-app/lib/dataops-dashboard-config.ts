/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { DashboardWidgetProps } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Q-ENHANCED-PROPERTY
 * Properties for a dashboard configuration.
 *
 * Use Cases:
 * - Create unified observability dashboards across multiple Lambda functions
 * - Aggregate metrics from different modules using SSM references
 * - Display log insights queries alongside metrics
 *
 * AWS Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutDashboard.html
 *
 * Validation:
 * - dashboardName must be unique within the account/region
 * - widgets array must not be empty
 */
export interface DashboardProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name of the CloudWatch dashboard. Must be unique within the account and region. Used to identify and access the dashboard in the CloudWatch console.
   *
   * Use cases: Dashboard identification; Console navigation; Resource management
   *
   * AWS: CloudWatch dashboard name for unique identification within account/region
   *
   * Validation: Must be valid dashboard name; required; unique within account/region
   */
  readonly dashboardName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of widget definitions for the dashboard. Each widget displays metrics, logs, or text content. Widgets are automatically laid out with wrapping at 24-unit width.
   *
   * Use cases: Metric visualization; Log query results; Dashboard organization with text headers
   *
   * AWS: CloudWatch dashboard widgets for displaying metrics, logs, and text content
   *
   * Validation: Must be non-empty array of valid DashboardWidgetProps objects; required
   */
  readonly widgets: DashboardWidgetProps[];
}

export interface DashboardConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name of the DataOps project that will contain and manage the dashboards. Provides organizational context and enables resource sharing, permissions management, and operational coordination within the DataOps framework.
   *
   * Use cases: DataOps project organization; Resource sharing and permissions; Operational coordination and monitoring
   *
   * AWS: DataOps project reference for dashboard organization and resource management
   *
   * Validation: Must be valid DataOps project name; required; project must exist or be created in the same deployment
   */
  readonly projectName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CloudWatch dashboard definitions for observability and monitoring. Each dashboard can display metrics, logs, and text widgets from multiple Lambda functions and modules using SSM references for cross-module integration.
   *
   * Use cases: Unified observability dashboards; Cross-module metric aggregation; Log insights visualization
   *
   * AWS: CloudWatch dashboard creation with SSM-based metric references and widget layout
   *
   * Validation: Must be array of valid DashboardProps objects if provided; dashboards inherit project context
   */
  readonly dashboards?: DashboardProps[];
}

export class DashboardConfigParser extends MdaaDataOpsConfigParser<DashboardConfigContents> {
  public readonly dashboards?: DashboardProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.dashboards = this.configContents.dashboards;
  }
}
