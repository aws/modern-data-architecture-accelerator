/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { DataQualityRulesetDefinition } from '@aws-mdaa/dataops-data-quality-l3-construct';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataQualityConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for data quality ruleset integration and resource coordination. Links data quality rulesets to the DataOps project infrastructure for naming and resource management.
   *
   * Use cases: Project integration; Resource coordination; Naming conventions
   *
   * AWS: DataOps project name for data quality ruleset organization
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required map of data quality ruleset definitions for automated table validation. Defines all data quality rulesets to be created for monitoring Glue Catalog tables.
   *
   * Use cases: Data quality monitoring; Table validation; Quality assurance; Data governance
   *
   * AWS: AWS Glue Data Quality ruleset definitions for automated validation
   *
   * Validation: Must be object with string keys and valid DataQualityRulesetDefinition values; required
   **/
  readonly rulesets: { [key: string]: DataQualityRulesetDefinition };
}

export class DataQualityConfigParser extends MdaaDataOpsConfigParser<DataQualityConfigContents> {
  public readonly rulesetConfigs: { [key: string]: DataQualityRulesetDefinition };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.rulesetConfigs = this.configContents.rulesets;
  }
}
