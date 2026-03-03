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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for workflow integration and resource autowiring with existing project infrastructure. Enables seamless integration with deployed project resources including jobs, crawlers, databases, and IAM roles for coordinated workflow orchestration.
   *
   * Use cases: Project resource integration; Coordinated workflow orchestration; Infrastructure autowiring and resource coordination
   *
   * AWS: AWS Glue workflow project integration for resource coordination and shared infrastructure
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of workflow definitions enabling complex ETL pipeline orchestration and job coordination. Provides workflow configuration for job sequencing, trigger management, and conditional execution patterns within the data processing architecture.
   *
   * Use cases: ETL pipeline orchestration; Job sequencing and coordination; Complex workflow execution patterns
   *
   * AWS: AWS Glue workflow definitions for ETL pipeline orchestration and job coordination
   *
   * Validation: Must be array of valid WorkflowProps objects; required; defines all workflow orchestration operations
   *   **/
  readonly workflowDefinitions: WorkflowProps[];
}

export class GlueWorkflowConfigParser extends MdaaDataOpsConfigParser<GlueWorkflowConfigContents> {
  public readonly workflowDefinitions: WorkflowProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.workflowDefinitions = this.configContents.workflowDefinitions;
  }
}
