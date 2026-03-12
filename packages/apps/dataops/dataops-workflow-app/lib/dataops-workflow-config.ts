/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { WorkflowProps } from '@aws-mdaa/dataops-workflow-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface GlueWorkflowConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for workflow resource autowiring.
   *
   * Use cases: Project integration; Resource coordination
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;
  /**
   * Glue workflow definitions for ETL pipeline orchestration and job coordination.
   *
   * Use cases: ETL pipeline sequencing; Trigger management; Conditional execution
   *
   * AWS: AWS Glue workflows
   *
   * Validation: Required; array of WorkflowProps
   */
  readonly workflowDefinitions: WorkflowProps[];
}

export class GlueWorkflowConfigParser extends MdaaDataOpsConfigParser<GlueWorkflowConfigContents> {
  public readonly workflowDefinitions: WorkflowProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.workflowDefinitions = this.configContents.workflowDefinitions;
  }
}
