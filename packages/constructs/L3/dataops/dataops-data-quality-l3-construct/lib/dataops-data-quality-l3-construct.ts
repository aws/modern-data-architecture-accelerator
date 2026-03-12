/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import { NagSuppressions } from 'cdk-nag';
import { buildRulesetString, DataQualityRule } from './dqdl-builder';
import { validateRulesetName } from './validators';
import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';

// Re-export for public API
export { DataQualityRule } from './dqdl-builder';

/**
 * Target table in the Glue Catalog for data quality ruleset validation.
 *
 * Use cases: Table identification for data quality checks, cross-account catalog access
 *
 * AWS: AWS Glue Data Quality ruleset target table configuration
 *
 * Validation: databaseName and tableName are required; catalogId is optional for cross-account access
 */
export interface DataQualityTargetTable {
  /**
   * Glue database name containing the target table.
   *
   * Use cases: Database identification, catalog navigation
   *
   * AWS: AWS Glue Catalog database name
   *
   * Validation: Must be a valid Glue database name; required
   */
  readonly databaseName: string;

  /**
   * Glue table name to validate with data quality rules.
   *
   * Use cases: Table identification, validation scope definition
   *
   * AWS: AWS Glue Catalog table name
   *
   * Validation: Must be a valid Glue table name; required; table must exist before ruleset evaluation
   */
  readonly tableName: string;

  /**
   * AWS account ID for cross-account Glue Catalog access.
   *
   * Use cases: Cross-account access, multi-account architectures, catalog federation
   *
   * AWS: AWS Glue Catalog ID (account ID)
   *
   * Validation: Must be a valid AWS account ID if provided
   */
  readonly catalogId?: string;
}

/**
 * Data Quality ruleset definition with target table and validation rules.
 *
 * Use cases: Data quality monitoring, validation automation, quality assurance, data governance
 *
 * AWS: AWS Glue Data Quality ruleset configuration
 *
 * Validation: targetTable and ruleset are required; description is optional
 */
export interface DataQualityRulesetDefinition {
  /**
   * Description explaining the purpose and scope of the ruleset.
   *
   * Use cases: Documentation, ruleset purpose explanation
   *
   * AWS: AWS Glue Data Quality ruleset description
   *
   * Validation: Optional string; recommended for documentation
   */
  readonly description?: string;

  /**
   * Target table specifying which Glue Catalog table to validate.
   *
   * Use cases: Table targeting, validation scope, catalog reference
   *
   * AWS: AWS Glue Data Quality target table
   *
   * Validation: Must be a valid DataQualityTargetTable; required
   */
  readonly targetTable: DataQualityTargetTable;

  /**
   * Ruleset as either a raw DQDL string or an array of structured rule objects.
   *
   * Use cases: Rule definition, validation logic, quality criteria specification
   *
   * AWS: AWS Glue Data Quality rules in DQDL format
   *
   * Validation: Must be a valid DQDL string or array of DataQualityRule objects; required
   */
  readonly ruleset: string | DataQualityRule[];
}

export interface DataOpsDataQualityL3ConstructProps extends MdaaL3ConstructProps {
  // Map of ruleset names to ruleset definitions for data quality monitoring
  readonly rulesetConfigs: { [key: string]: DataQualityRulesetDefinition };

  // DataOps project name for resource coordination and SSM parameter naming
  readonly projectName?: string;
}

export class DataOpsDataQualityL3Construct extends MdaaL3Construct {
  public readonly rulesets: { [key: string]: glue.CfnDataQualityRuleset } = {};
  public readonly props: DataOpsDataQualityL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataOpsDataQualityL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const rulesetEntries = Object.entries(props.rulesetConfigs);

    if (rulesetEntries.length === 0) {
      throw new Error('At least one ruleset must be provided in rulesetConfigs');
    }

    for (const [rulesetName, rulesetConfig] of rulesetEntries) {
      validateRulesetName(rulesetName);
      this.createRuleset(rulesetName, rulesetConfig, props.projectName);
    }
  }

  private createRuleset(
    rulesetName: string,
    config: DataQualityRulesetDefinition,
    projectName?: string,
  ): glue.CfnDataQualityRuleset {
    // Build ruleset string (DQDL)
    const rulesetString = buildRulesetString(config.ruleset);

    // Target table configuration
    const targetTableConfig: glue.CfnDataQualityRuleset.DataQualityTargetTableProperty = {
      tableName: config.targetTable.tableName,
      databaseName: config.targetTable.databaseName,
    };

    // Create ruleset resource
    const ruleset = new glue.CfnDataQualityRuleset(this, `${rulesetName}-ruleset`, {
      name: rulesetName,
      ruleset: rulesetString,
      targetTable: targetTableConfig,
      description: config.description || '',
    });

    // Add catalogId using property override if provided (mimicking Python implementation)
    if (config.targetTable.catalogId) {
      ruleset.addPropertyOverride('TargetTable.CatalogId', config.targetTable.catalogId);
    }

    if (projectName) {
      // Create SSM parameters for ruleset metadata
      const rulesetNameParam = DataOpsProjectUtils.createProjectSSMParam(
        this,
        this.props.naming,
        projectName,
        `data-quality-ruleset/${rulesetName}`,
        rulesetName,
        `${rulesetName}-name-param`,
        `Glue Data Quality Ruleset name for ${rulesetName}`,
      );
      const targetTableParam = DataOpsProjectUtils.createProjectSSMParam(
        this,
        this.props.naming,
        projectName,
        `data-quality-ruleset/${rulesetName}-target`,
        `${config.targetTable.databaseName}.${config.targetTable.tableName}`,
        `${rulesetName}-target-param`,
        `Target table for ruleset ${rulesetName}`,
      );

      // Suppress CDK Nag warnings for SSM parameters
      for (const param of [rulesetNameParam, targetTableParam]) {
        NagSuppressions.addResourceSuppressions(param, [
          {
            id: 'AwsSolutions-SSM4',
            reason: 'Parameter stores non-sensitive configuration metadata.',
          },
        ]);
      }
    }

    this.rulesets[rulesetName] = ruleset;
    return ruleset;
  }
}
