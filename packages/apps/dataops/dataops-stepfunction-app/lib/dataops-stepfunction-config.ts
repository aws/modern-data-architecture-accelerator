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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for Step Functions integration and resource autowiring with existing project infrastructure. Enables seamless integration with deployed project resources including Lambda functions, Glue jobs, and other AWS services for coordinated serverless orchestration.
   *
   * Use cases: Project resource integration; Coordinated serverless orchestration; Infrastructure autowiring and service coordination
   *
   * AWS: AWS Step Functions project integration for resource coordination and shared infrastructure
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Step Functions definitions enabling complex serverless workflow orchestration and state machine coordination. Provides state machine configuration for conditional execution, error handling, and service integration patterns within the data processing architecture.
   *
   * Use cases: Serverless workflow orchestration; State machine coordination; Complex conditional execution and error handling patterns
   *
   * AWS: AWS Step Functions state machine definitions for serverless workflow orchestration and coordination
   *
   * Validation: Must be array of valid StepFunctionProps objects; required; defines all state machine orchestration operations
   *   **/
  readonly stepfunctionDefinitions: StepFunctionProps[];
}

export class StepFunctionConfigParser extends MdaaDataOpsConfigParser<StepFunctionConfigContents> {
  public readonly stepfunctionDefinitions: StepFunctionProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.stepfunctionDefinitions = this.configContents.stepfunctionDefinitions;
  }
}
