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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for DataBrew integration and resource autowiring with existing project infrastructure. Enables seamless integration with deployed project resources including S3 buckets, IAM roles, and security configurations for coordinated data preparation operations.
   *
   * Use cases: Project resource integration; Coordinated data preparation; Infrastructure autowiring and resource sharing
   *
   * AWS: AWS Glue DataBrew project integration for resource coordination and shared infrastructure
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of recipe names to recipe definitions enabling reusable data transformation and cleansing workflows. Provides recipe configuration for data preparation steps, transformation logic, and cleansing operations within the data preparation architecture.
   *
   * Use cases: Reusable transformation workflows; Data cleansing operations; Visual data preparation recipe management
   *
   * AWS: AWS Glue DataBrew recipe definitions for data transformation and preparation workflows
   *
   * Validation: Must be object with string keys and valid RecipeProps values if provided; defines transformation operations
   *   **/
  readonly recipes?: {
    [key: string]: RecipeProps;
  };

  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of dataset names to dataset definitions enabling data source configuration and connection management. Provides dataset configuration for various data sources, formats, and connection patterns within the data preparation workflows.
   *
   * Use cases: Data source configuration; Connection management; Dataset-specific preparation workflows
   *
   * AWS: AWS Glue DataBrew dataset definitions for data source configuration and management
   *
   * Validation: Must be object with string keys and valid DatasetProps values if provided; defines data source connections
   *   **/
  readonly datasets?: {
    [key: string]: DatasetProps;
  };

  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of job names to DataBrew job definitions enabling automated data preparation and profiling operations. Provides job configuration for scheduled data preparation, profiling, and transformation workflows within the data lake architecture.
   *
   * Use cases: Automated data preparation; Scheduled profiling operations; Data transformation job management
   *
   * AWS: AWS Glue DataBrew job definitions for automated data preparation and profiling workflows
   *
   * Validation: Must be object with string keys and valid DataBrewJobProps values if provided; defines preparation jobs
   *   **/
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
