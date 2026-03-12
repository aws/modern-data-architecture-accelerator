/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { StepFunctionProps } from '@aws-mdaa/dataops-stepfunction-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface StepFunctionConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for Step Functions resource autowiring.
   *
   * Use cases: Project integration; Service coordination
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;
  /**
   * Step Functions state machine definitions for serverless workflow orchestration.
   *
   * Use cases: ETL orchestration; Conditional execution; Error handling workflows
   *
   * AWS: AWS Step Functions state machines
   *
   * Validation: Required; array of StepFunctionProps
   */
  readonly stepfunctionDefinitions: StepFunctionProps[];
}

export class StepFunctionConfigParser extends MdaaDataOpsConfigParser<StepFunctionConfigContents> {
  public readonly stepfunctionDefinitions: StepFunctionProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.stepfunctionDefinitions = this.configContents.stepfunctionDefinitions;
  }
}
