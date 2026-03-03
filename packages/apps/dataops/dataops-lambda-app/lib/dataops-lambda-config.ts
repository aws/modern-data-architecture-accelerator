/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { FunctionProps, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface LambdaFunctionConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name of the DataOps project that will contain and manage the Lambda functions. Provides organizational context and enables resource sharing, permissions management, and operational coordination within the DataOps framework.
   *
   * Use cases: DataOps project organization; Resource sharing and permissions; Operational coordination and monitoring
   *
   * AWS: DataOps project reference for Lambda function organization and resource management
   *
   * Validation: Must be valid DataOps project name; required; project must exist or be created in the same deployment
   **/

  readonly projectName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda layer definitions for shared code, libraries, and dependencies across multiple functions. Enables code reuse, dependency management, and consistent runtime environments for efficient serverless data processing operations.
   *
   * Use cases: Shared code libraries; Dependency management; Runtime environment consistency across functions
   *
   * AWS: AWS Lambda layers for shared code and dependency management across multiple functions
   *
   * Validation: Must be array of valid LayerProps objects if provided; layers can be referenced by functions
   *   **/
  readonly layers?: LayerProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda function definitions for serverless data processing operations within the DataOps project. Each function can process data events, perform transformations, and integrate with other AWS services for data workflows.
   *
   * Use cases: Event-driven data processing; Serverless ETL operations; Data transformation and validation workflows
   *
   * AWS: AWS Lambda function creation with DataOps integration, event sources, and IAM permissions
   *
   * Validation: Must be array of valid FunctionProps objects if provided; functions inherit project context and permissions
   *   **/
  readonly functions?: FunctionProps[];
}

export class LambdaFunctionConfigParser extends MdaaDataOpsConfigParser<LambdaFunctionConfigContents> {
  public readonly layers?: LayerProps[];
  public readonly functions?: FunctionProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.layers = this.configContents.layers;
    this.functions = this.configContents.functions;
  }
}
