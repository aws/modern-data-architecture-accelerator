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
   * Name of the DataOps Project
   */
  projectName: string;
  /**
   * Workflows to create
   */
  workflowDefinitions: WorkflowProps[];
}

export class GlueWorkflowConfigParser extends MdaaDataOpsConfigParser<GlueWorkflowConfigContents> {
  public readonly workflowDefinitions: WorkflowProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.workflowDefinitions = this.configContents.workflowDefinitions;
  }
}
