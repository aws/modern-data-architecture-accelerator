/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { DataBrewJobProps, DatasetProps, RecipeProps } from '@aws-mdaa/dataops-databrew-l3-construct';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';

export interface DataBrewConfigContents extends MdaaDataOpsConfigContents {
  // Name of the Data-Ops project.
  readonly projectName: string;

  // List of recipes to be created.
  readonly recipes?: {
    [key: string]: RecipeProps;
  };

  // List of recipes to be created.
  readonly datasets?: {
    [key: string]: DatasetProps;
  };

  // List of recipes to be created.
  readonly jobs?: {
    [key: string]: DataBrewJobProps;
  };
}

export class DataBrewConfigParser extends MdaaDataOpsConfigParser<DataBrewConfigContents> {
  public readonly jobs?: Record<string, DataBrewJobProps>;
  public readonly recipes?: Record<string, RecipeProps>;
  public readonly datasets?: Record<string, DatasetProps>;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.jobs = this.configContents.jobs;
    this.recipes = this.configContents.recipes;
    this.datasets = this.configContents.datasets;
  }
}
