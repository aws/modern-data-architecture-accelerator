/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { FunctionProps, LayerProps, NamedSqsQueueProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface LambdaFunctionConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for Lambda function resource autowiring.
   *
   * Use cases: Project integration; Shared permissions and infrastructure
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */

  readonly projectName?: string;

  /**
   * Lambda layer definitions for shared code and dependencies across functions.
   *
   * Use cases: Shared libraries; Dependency management; Runtime consistency
   *
   * AWS: Lambda layers
   *
   * Validation: Optional; array of LayerProps
   */
  readonly layers?: LayerProps[];
  /**
   * SQS queues created by this module, keyed by queue name. Each queue is encrypted with the
   * project KMS key and gets a redrive dead letter queue. Functions bind to these queues as
   * event sources, or receive their URLs as environment variables in order to produce to them.
   *
   * Use cases: Ingestion buffering; Producer/consumer decoupling; Backpressure; Message-level retry
   *
   * AWS: SQS queues with CMK encryption and redrive dead letter queues
   *
   * Validation: Optional; keys are unique queue names, values must be valid SqsQueueProps
   */
  readonly queues?: NamedSqsQueueProps;
  /**
   * Lambda function definitions for serverless data processing within the project.
   *
   * Use cases: Event-driven processing; Serverless ETL; Data transformation
   *
   * AWS: Lambda functions with DataOps integration
   *
   * Validation: Optional; array of FunctionProps
   */
  readonly functions?: FunctionProps[];
}

export class LambdaFunctionConfigParser extends MdaaDataOpsConfigParser<LambdaFunctionConfigContents> {
  public readonly layers?: LayerProps[];
  public readonly queues?: NamedSqsQueueProps;
  public readonly functions?: FunctionProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.layers = this.configContents.layers;
    this.queues = this.configContents.queues;
    this.functions = this.configContents.functions;
  }
}
