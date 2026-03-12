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
 * CloudWatch dashboard configuration with name and widget definitions.
 *
 * Use cases: Unified observability; Cross-module metric aggregation; Log insights visualization
 *
 * AWS: CloudWatch dashboard
 *
 * Validation: dashboardName and widgets required
 */
export interface DashboardProps {
  /**
   * Unique name for the CloudWatch dashboard within the account/region.
   *
   * Use cases: Dashboard identification; Console navigation
   *
   * AWS: CloudWatch dashboard name
   *
   * Validation: Required; unique within account/region
   */
  readonly dashboardName: string;

  /**
   * Widget definitions for metrics, logs, or text content.
   * Widgets auto-layout with wrapping at 24-unit width.
   *
   * Use cases: Metric visualization; Log query results; Dashboard organization
   *
   * AWS: CloudWatch dashboard widgets
   *
   * Validation: Required; non-empty array of DashboardWidgetProps
   */
  readonly widgets: DashboardWidgetProps[];
}

export interface DashboardConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for dashboard resource organization.
   *
   * Use cases: Project integration; Resource coordination
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;

  /**
   * CloudWatch dashboard definitions for observability and monitoring.
   * Dashboards can reference metrics from other modules via SSM parameters.
   *
   * Use cases: Unified observability; Cross-module metric aggregation
   *
   * AWS: CloudWatch dashboards
   *
   * Validation: Optional; array of DashboardProps
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
