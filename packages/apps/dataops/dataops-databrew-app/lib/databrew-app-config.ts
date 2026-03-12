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
  /**
   * DataOps project name for DataBrew resource autowiring.
   *
   * Use cases: Project integration; Shared infrastructure reuse
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;

  /**
   * Map of recipe names to DataBrew recipe definitions for reusable data transformations.
   *
   * Use cases: Reusable transformation workflows; Data cleansing operations
   *
   * AWS: AWS Glue DataBrew recipes
   *
   * Validation: Optional; map of string to RecipeProps
   */
  readonly recipes?: {
    [key: string]: RecipeProps;
  };

  /**
   * Map of dataset names to DataBrew dataset definitions for data source configuration.
   *
   * Use cases: Data source connections; Format-specific dataset configuration
   *
   * AWS: AWS Glue DataBrew datasets
   *
   * Validation: Optional; map of string to DatasetProps
   */
  readonly datasets?: {
    [key: string]: DatasetProps;
  };

  /**
   * Map of job names to DataBrew job definitions for automated data preparation and profiling.
   *
   * Use cases: Automated data preparation; Scheduled profiling; Transformation jobs
   *
   * AWS: AWS Glue DataBrew jobs
   *
   * Validation: Optional; map of string to DataBrewJobProps
   */
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
