/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { buildRulesetString, DataQualityRule } from './dqdl-builder';
import { validateRulesetName } from './validators';

// Re-export for public API
export { DataQualityRule } from './dqdl-builder';

/**
 * Q-ENHANCED-INTERFACE
 * Target table configuration for Glue Data Quality ruleset specifying the database and table to validate. Defines the Glue Catalog table that will be monitored and validated by the data quality rules.
 *
 * Use cases: Table identification; Data quality target specification; Catalog reference
 *
 * AWS: AWS Glue Data Quality ruleset target table configuration
 *
 * Validation: databaseName and tableName are required; catalogId is optional
 */
export interface DataQualityTargetTable {
  /**
   * Q-ENHANCED-PROPERTY
   * Required Glue database name containing the target table for data quality validation. Specifies the database in the Glue Catalog where the table to be validated resides.
   *
   * Use cases: Database identification; Catalog navigation; Table location
   *
   * AWS: AWS Glue Catalog database name for data quality target table
   *
   * Validation: Must be valid Glue database name; required; database must exist
   */
  readonly databaseName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required Glue table name to be validated by data quality rules. Specifies the specific table within the database that will be monitored for data quality issues.
   *
   * Use cases: Table identification; Data quality target; Validation scope
   *
   * AWS: AWS Glue Catalog table name for data quality validation
   *
   * Validation: Must be valid Glue table name; required; table must exist before ruleset evaluation
   */
  readonly tableName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS account ID for cross-account Glue Catalog access. Specifies the account containing the Glue Catalog when accessing tables in a different AWS account.
   *
   * Use cases: Cross-account access; Multi-account architectures; Catalog federation
   *
   * AWS: AWS Glue Catalog ID for cross-account table access
   *
   * Validation: Must be valid AWS account ID if provided; optional for same-account access
   */
  readonly catalogId?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Data Quality ruleset definition with target table and validation rules. Defines a complete set of data quality checks for a specific Glue Catalog table.
 *
 * Use cases: Data quality monitoring; Validation automation; Quality assurance; Data governance
 *
 * AWS: AWS Glue Data Quality ruleset configuration
 *
 * Validation: targetTable and ruleset are required; description is optional
 */
export interface DataQualityRulesetDefinition {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description explaining the purpose and scope of the ruleset. Documents what data quality aspects are being validated.
   *
   * Use cases: Documentation; Ruleset purpose; Quality criteria explanation
   *
   * AWS: AWS Glue Data Quality ruleset description
   *
   * Validation: Optional string; recommended for documentation
   */
  readonly description?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required target table configuration specifying which table to validate. Defines the Glue Catalog table that will be monitored.
   *
   * Use cases: Table targeting; Validation scope; Catalog reference
   *
   * AWS: AWS Glue Data Quality target table configuration
   *
   * Validation: Must be valid DataQualityTargetTable; required; table must exist
   */
  readonly targetTable: DataQualityTargetTable;

  /**
   * Q-ENHANCED-PROPERTY
   * Required ruleset definition as either DQDL string or array of rule objects. Defines the data quality validation rules to apply.
   *
   * Use cases: Rule definition; Validation logic; Quality criteria
   *
   * AWS: AWS Glue Data Quality rules in DQDL format
   *
   * Validation: Must be valid DQDL string or array of DataQualityRule objects; required
   */
  readonly ruleset: string | DataQualityRule[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Properties for DataOps Data Quality L3 Construct enabling automated data quality monitoring. Configures Glue Data Quality rulesets for validating data in Glue Catalog tables.
 *
 * Use cases: Data quality automation; Validation monitoring; Quality assurance; Data governance
 *
 * AWS: AWS Glue Data Quality configuration for DataOps workflows
 *
 * Validation: rulesetConfigs and projectName are required
 */
export interface DataOpsDataQualityL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of ruleset names to ruleset definitions for data quality monitoring. The keys serve as the unique ruleset names and must be valid AWS Glue ruleset names (alphanumeric, hyphens, periods, underscores).
   *
   * Use cases: Multi-table validation; Quality monitoring; Ruleset management
   *
   * AWS: AWS Glue Data Quality ruleset definitions
   *
   * Validation: Must be an object with string keys (used as ruleset names) and valid DataQualityRulesetDefinition values; required
   */
  readonly rulesetConfigs: { [key: string]: DataQualityRulesetDefinition };

  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for resource coordination and naming. Links the rulesets to the DataOps project infrastructure.
   *
   * Use cases: Project integration; Resource coordination; Naming conventions
   *
   * AWS: DataOps project name for resource organization
   *
   * Validation: Must be valid project name; required
   */
  readonly projectName: string;
}

/**
 * Q-ENHANCED-CLASS
 * L3 Construct for deploying AWS Glue Data Quality rulesets in DataOps workflows. Creates and manages data quality rulesets for automated validation of Glue Catalog tables.
 *
 * Use cases: Data quality automation; Table validation; Quality monitoring; Data governance
 *
 * AWS: AWS Glue Data Quality rulesets for automated data validation
 */
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
    projectName: string,
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

    // Create SSM parameters for ruleset metadata
    const rulesetNameParam = new ssm.StringParameter(this, `${rulesetName}-name-param`, {
      parameterName: this.props.naming.ssmPath(`${projectName}/data-quality-ruleset/${rulesetName}`, false, false),
      stringValue: rulesetName,
      description: `Glue Data Quality Ruleset name for ${rulesetName}`,
    });

    const targetTableParam = new ssm.StringParameter(this, `${rulesetName}-target-param`, {
      parameterName: this.props.naming.ssmPath(
        `${projectName}/data-quality-ruleset/${rulesetName}-target`,
        false,
        false,
      ),
      stringValue: `${config.targetTable.databaseName}.${config.targetTable.tableName}`,
      description: `Target table for ruleset ${rulesetName}`,
    });

    // Suppress CDK Nag warnings for SSM parameters
    for (const param of [rulesetNameParam, targetTableParam]) {
      NagSuppressions.addResourceSuppressions(param, [
        {
          id: 'AwsSolutions-SSM4',
          reason: 'Parameter stores non-sensitive configuration metadata.',
        },
      ]);
    }

    this.rulesets[rulesetName] = ruleset;
    return ruleset;
  }
}
