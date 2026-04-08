/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import {
  DataQualityRulesetDefinition,
  DynamicTargetConfig,
  SmusPublishingConfig,
} from '@aws-mdaa/dataops-data-quality-l3-construct';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataQualityConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for data quality ruleset integration and naming.
   *
   * Use cases: Project integration; Resource coordination
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;

  /**
   * Map of ruleset names to Glue Data Quality ruleset definitions for automated table validation.
   *
   * Use cases: Data quality monitoring; Table validation; Quality governance
   *
   * AWS: AWS Glue Data Quality rulesets
   *
   * Validation: Required; map of string to DataQualityRulesetDefinition
   */
  readonly rulesets?: { [key: string]: DataQualityRulesetDefinition };

  /**
   * SMUS publishing configuration for data quality metrics.
   *
   * Use cases: DataZone integration; Quality metrics publishing
   *
   * AWS: SageMaker Unified Studio (DataZone) publishing
   *
   * Validation: Optional; requires domainId, accountId, and region
   */
  readonly smusPublishing?: SmusPublishingConfig;

  /**
   * Dynamic targets for runtime table discovery.
   *
   * Use cases: Auto-discover datasets in S3 directories; Run DQ recommendations on unknown tables
   *
   * Validation: Optional; each entry requires name, s3DirUri, and source
   */
  readonly dynamicTargets?: DynamicTargetConfig[];
}

export class DataQualityConfigParser extends MdaaDataOpsConfigParser<DataQualityConfigContents> {
  public readonly rulesetConfigs?: { [key: string]: DataQualityRulesetDefinition };
  public readonly dynamicTargets?: DynamicTargetConfig[];
  public readonly smusPublishing?: SmusPublishingConfig;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.rulesetConfigs = this.configContents.rulesets;
    this.dynamicTargets = this.configContents.dynamicTargets;
    this.smusPublishing = this.configContents.smusPublishing;
  }
}
