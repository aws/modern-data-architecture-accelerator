/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnQueryDefinition } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { cleanQueryString, ensureLimitClause } from './log-utils';
import { createSsmParamWithSuppression } from './ssm-utils';

/**
 * Properties for MdaaLogInsightsQuery construct
 */
export interface MdaaLogInsightsQueryProps extends MdaaConstructProps {
  /**
   * The name of the query
   */
  readonly queryName: string;

  /**
   * The query string to execute
   */
  readonly queryString: string;

  /**
   * The log group names to query against
   */
  readonly logGroupNames: string[];

  /**
   * Optional function name for SSM parameter paths.
   * If provided, query metadata will be exported to SSM at:
   * /mdaa/{org}/{env}/insights-query/{functionName}/{queryName}/id
   * /mdaa/{org}/{env}/insights-query/{functionName}/{queryName}/name
   * @default - Query metadata exported without function name in path
   */
  readonly functionName?: string;
}

/**
 * Construct for creating CloudWatch Logs Insights saved query definitions
 */
export class MdaaLogInsightsQuery extends Construct {
  public readonly queryDefinition: CfnQueryDefinition;

  constructor(scope: Construct, id: string, props: MdaaLogInsightsQueryProps) {
    super(scope, id);

    // Clean query string by stripping leading whitespace from each line
    const cleanedQueryString = cleanQueryString(props.queryString);

    // Ensure query has a limit clause
    const finalQueryString = ensureLimitClause(cleanedQueryString);

    // Create the query definition
    this.queryDefinition = new CfnQueryDefinition(this, 'QueryDefinition', {
      name: props.queryName,
      queryString: finalQueryString,
      logGroupNames: props.logGroupNames,
    });

    // Build resource ID with function name for consistency with metrics and alarms
    // Pattern: {functionName}/{queryName} or just {queryName} if no function name
    const resourceId = props.functionName ? `${props.functionName}/${props.queryName}` : props.queryName;

    // Export query ID to SSM
    createSsmParamWithSuppression(
      this,
      scope,
      {
        resourceType: 'insights-query',
        resourceId,
        name: 'id',
        value: this.queryDefinition.attrQueryDefinitionId,
        naming: props.naming,
        createOutputs: false,
        createParams: true,
      },
      'Parameter stores observability metadata (query ID); not sensitive data.',
    );

    // Export query name to SSM
    createSsmParamWithSuppression(
      this,
      scope,
      {
        resourceType: 'insights-query',
        resourceId,
        name: 'name',
        value: props.queryName,
        naming: props.naming,
        createOutputs: false,
        createParams: true,
      },
      'Parameter stores observability metadata (query name); not sensitive data.',
    );
  }
}
