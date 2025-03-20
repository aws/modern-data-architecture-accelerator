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
   * Name of the DataOps Project
   */
  readonly projectName: string;
  /**
   * Layers to create
   */
  readonly layers?: LayerProps[];
  /**
   * Functions to create
   */
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
