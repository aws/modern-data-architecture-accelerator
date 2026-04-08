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
 * Source configuration for data quality targets.
 * Describes where the data lives so downstream DQ evaluation jobs know how to read it.
 */
export interface DataQualitySourceConfig {
  /** Source type: 'glue' (Glue Catalog table), 's3' (S3 paths), or 'redshift' (via Glue connection). Default: 'glue'. */
  readonly sourceType?: 'glue' | 's3' | 'redshift';
  /** S3 paths for S3 source type. */
  readonly s3Paths?: string[];
  /** S3 data format for S3 source type (e.g., 'parquet', 'csv', 'json'). */
  readonly s3Format?: string;
  /** Glue connection name for Redshift source type (can be an SSM reference). */
  readonly connectionName?: string;
  /** Redshift table name for Redshift source type. */
  readonly redshiftTable?: string;
}

/**
 * SMUS (SageMaker Unified Studio) publishing configuration for data quality metrics.
 */
export interface SmusPublishingConfig {
  /** DataZone domain ID. */
  readonly domainId: string;
  /** AWS account ID where the DataZone domain resides. */
  readonly accountId: string;
  /** AWS region where the DataZone domain resides. */
  readonly region: string;
  /** IAM role ARN to assume for publishing (optional). */
  readonly roleArn?: string;
  /** KMS key ARN for the DataZone domain if using customer-managed encryption (optional). */
  readonly domainKmsKeyArn?: string;
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
   * Not required when using recommendation-based rulesets.
   *
   * Use cases: Rule definition, validation logic, quality criteria specification
   *
   * AWS: AWS Glue Data Quality rules in DQDL format
   *
   * Validation: Must be a valid DQDL string or array of DataQualityRule objects; required unless recommendationRunId is set
   */
  readonly ruleset?: string | DataQualityRule[];

  /**
   * Source configuration describing where the data lives.
   * Used by downstream DQ evaluation jobs to read data from the correct source.
   * Default source type is 'glue' (Glue Catalog table).
   */
  readonly source?: DataQualitySourceConfig;

  /**
   * Glue Data Quality recommendation run ID.
   * When set, creates a recommendation-based ruleset instead of an explicit DQDL ruleset.
   */
  readonly recommendationRunId?: string;

  /**
   * DataZone asset ID for SMUS publishing.
   * Maps this ruleset's DQ results to a specific DataZone asset.
   */
  readonly smusAssetId?: string;
}

/**
 * Dynamic target for runtime table discovery.
 * The DQ evaluation job will enumerate data at the given S3 directory and run
 * Glue DQ recommendations on each discovered dataset.
 */
export interface DynamicTargetConfig {
  /** Logical name for this dynamic target (used in SSM parameter paths). */
  readonly name: string;
  /** S3 directory URI to discover datasets from at runtime. */
  readonly s3DirUri: string;
  /** Source configuration describing the data format and connection details. */
  readonly source: DataQualitySourceConfig;
}

export interface DataOpsDataQualityL3ConstructProps extends MdaaL3ConstructProps {
  // Map of ruleset names to ruleset definitions for data quality monitoring
  readonly rulesetConfigs?: { [key: string]: DataQualityRulesetDefinition };

  // Dynamic targets for runtime table discovery (no pre-defined rulesets)
  readonly dynamicTargets?: DynamicTargetConfig[];

  // DataOps project name for resource coordination and SSM parameter naming
  readonly projectName?: string;

  // SMUS publishing configuration for data quality metrics
  readonly smusPublishing?: SmusPublishingConfig;
}

export class DataOpsDataQualityL3Construct extends MdaaL3Construct {
  public readonly rulesets: { [key: string]: glue.CfnDataQualityRuleset } = {};
  public readonly props: DataOpsDataQualityL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataOpsDataQualityL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const rulesetEntries = Object.entries(props.rulesetConfigs ?? {});
    const hasDynamicTargets = (props.dynamicTargets ?? []).length > 0;

    if (rulesetEntries.length === 0 && !hasDynamicTargets) {
      throw new Error('At least one ruleset or dynamic target must be provided');
    }

    for (const [rulesetName, rulesetConfig] of rulesetEntries) {
      validateRulesetName(rulesetName);
      this.createRuleset(rulesetName, rulesetConfig, props.projectName);
    }

    // Publish dynamic target configs to SSM for runtime discovery
    if (hasDynamicTargets && props.projectName) {
      for (const target of props.dynamicTargets!) {
        const param = DataOpsProjectUtils.createProjectSSMParam(
          this,
          this.props.naming,
          props.projectName,
          `data-quality/dynamic-target/${target.name}`,
          JSON.stringify({ s3DirUri: target.s3DirUri, source: target.source }),
          `${target.name}-dynamic-target-param`,
          `Dynamic discovery target configuration for ${target.name}`,
        );
        NagSuppressions.addResourceSuppressions(param, [
          { id: 'AwsSolutions-SSM4', reason: 'Parameter stores non-sensitive configuration metadata.' },
        ]);
      }
    }

    if (props.smusPublishing && props.projectName) {
      DataOpsProjectUtils.createProjectSSMParam(
        this,
        this.props.naming,
        props.projectName,
        'data-quality/smus-config',
        JSON.stringify(props.smusPublishing),
        'smus-config-param',
        'SMUS publishing configuration for data quality',
      );
    }
  }

  private createRuleset(
    rulesetName: string,
    config: DataQualityRulesetDefinition,
    projectName?: string,
  ): glue.CfnDataQualityRuleset {
    // Validate: must have either ruleset or recommendationRunId
    if (!config.ruleset && !config.recommendationRunId) {
      throw new Error(`Ruleset '${rulesetName}' must have either 'ruleset' or 'recommendationRunId'`);
    }

    // Recommendation-based rulesets are managed by Glue at runtime — only publish metadata to SSM
    if (config.recommendationRunId) {
      if (projectName) {
        const recParam = DataOpsProjectUtils.createProjectSSMParam(
          this,
          this.props.naming,
          projectName,
          `data-quality-ruleset/${rulesetName}-recommendation`,
          JSON.stringify({ recommendationRunId: config.recommendationRunId, targetTable: config.targetTable }),
          `${rulesetName}-recommendation-param`,
          `Recommendation configuration for ruleset ${rulesetName}`,
        );
        NagSuppressions.addResourceSuppressions(recParam, [
          { id: 'AwsSolutions-SSM4', reason: 'Parameter stores non-sensitive configuration metadata.' },
        ]);
      }
      return undefined as unknown as glue.CfnDataQualityRuleset;
    }

    // Build ruleset string (DQDL)
    const rulesetString = buildRulesetString(config.ruleset!);

    // Target table configuration
    const targetTableConfig: glue.CfnDataQualityRuleset.DataQualityTargetTableProperty = {
      tableName: config.targetTable.tableName,
      databaseName: config.targetTable.databaseName,
    };

    // Create ruleset resource
    const rulesetProps: glue.CfnDataQualityRulesetProps = {
      name: rulesetName,
      ruleset: rulesetString,
      targetTable: targetTableConfig,
      description: config.description || '',
    };

    const ruleset = new glue.CfnDataQualityRuleset(this, `${rulesetName}-ruleset`, rulesetProps);

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

      // Publish source metadata if provided
      if (config.source) {
        const sourceParam = DataOpsProjectUtils.createProjectSSMParam(
          this,
          this.props.naming,
          projectName,
          `data-quality-ruleset/${rulesetName}-source`,
          JSON.stringify(config.source),
          `${rulesetName}-source-param`,
          `Source configuration for ruleset ${rulesetName}`,
        );
        NagSuppressions.addResourceSuppressions(sourceParam, [
          { id: 'AwsSolutions-SSM4', reason: 'Parameter stores non-sensitive configuration metadata.' },
        ]);
      }

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
