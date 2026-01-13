/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Q-ENHANCED-INTERFACE
 * Data Quality Rule interface for structured rule objects defining validation logic. Represents a single data quality check that can be applied to Glue Catalog tables.
 *
 * Use cases: Rule definition; Data validation; Quality checks; Structured rule configuration
 *
 * AWS: AWS Glue Data Quality rule definition in structured format
 *
 * Validation: ruleType is required; other fields depend on specific rule type
 */
export interface DataQualityRule {
  /**
   * Q-ENHANCED-PROPERTY
   * Required rule type identifier specifying which validation to perform. Determines which other fields are required and how the rule is evaluated.
   *
   * Use cases: Rule identification; Validation type selection; Rule builder routing
   *
   * AWS: AWS Glue Data Quality rule type
   *
   * Validation: Must be one of: IsComplete, ColumnValues, IsUnique, IsPrimaryKey, ColumnExists, RowCount, ColumnCount, Completeness, Uniqueness, Mean, StandardDeviation, CustomSql, DataFreshness, ColumnDataType, ColumnLength
   */
  readonly ruleType: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Column name to validate for column-specific rules. Specifies which column in the table to apply the validation rule to.
   *
   * Use cases: Column targeting; Field validation; Column-level checks
   *
   * AWS: AWS Glue Catalog table column name
   *
   * Validation: Required for most rule types except RowCount and ColumnCount; must be valid column name in target table
   */
  readonly column?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Comparison operator for threshold and value-based rules. Defines how to compare the measured value against the threshold or expected value.
   *
   * Use cases: Threshold comparison; Value validation; Range checks
   *
   * AWS: Comparison operator for Glue Data Quality rules
   *
   * Validation: Must be one of: =, >, <, >=, <=, !=, <>, between, in; default varies by rule type
   */
  readonly comparisonOperator?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Threshold value for percentage-based rules like Completeness and Uniqueness. Represents the minimum acceptable percentage as a decimal between 0.0 and 1.0.
   *
   * Use cases: Completeness validation; Uniqueness checks; Percentage thresholds
   *
   * AWS: Threshold for Glue Data Quality percentage-based rules
   *
   * Validation: Must be between 0.0 and 1.0; default is 0.95; used for Completeness and Uniqueness rules
   */
  readonly threshold?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Numeric value for comparison in count and statistical rules. Used as the expected or threshold value for rules like RowCount, Mean, and StandardDeviation.
   *
   * Use cases: Row count validation; Statistical thresholds; Numeric comparisons
   *
   * AWS: Numeric value for Glue Data Quality rule comparisons
   *
   * Validation: Must be numeric; required for RowCount, ColumnCount, Mean, StandardDeviation, ColumnLength rules
   */
  readonly value?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Array of allowed values for ColumnValues rule with 'in' operator. Defines the set of acceptable values for a column.
   *
   * Use cases: Enum validation; Allowed value lists; Categorical data validation
   *
   * AWS: Allowed values list for Glue Data Quality ColumnValues rule
   *
   * Validation: Required for ColumnValues rule; can contain strings or numbers
   */
  readonly values?: (string | number)[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional WHERE clause to filter rows before applying the rule. Allows conditional validation on a subset of data.
   *
   * Use cases: Conditional validation; Row filtering; Subset checks
   *
   * AWS: WHERE clause for Glue Data Quality rule filtering
   *
   * Validation: Must be valid SQL WHERE condition; use single quotes for string literals; example: "status = 'active'"
   */
  readonly where?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * SQL query for CustomSql rule type returning a single numeric value. Enables custom validation logic using SQL expressions.
   *
   * Use cases: Custom validation logic; Complex checks; SQL-based rules
   *
   * AWS: Custom SQL query for Glue Data Quality CustomSql rule
   *
   * Validation: Required for CustomSql rule; must be SELECT statement returning single numeric value
   */
  readonly sql?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Expected data type for ColumnDataType rule validation. Specifies the required data type for a column.
   *
   * Use cases: Schema validation; Type checking; Data type enforcement
   *
   * AWS: Expected column data type for Glue Data Quality validation
   *
   * Validation: Required for ColumnDataType rule; must be valid Glue data type (e.g., STRING, INT, DATE, DECIMAL, BIGINT, DOUBLE)
   */
  readonly dataType?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Time duration for DataFreshness rule specifying maximum data age. Defines how recent the data must be.
   *
   * Use cases: Data freshness validation; Timeliness checks; Recency requirements
   *
   * AWS: Duration threshold for Glue Data Quality DataFreshness rule
   *
   * Validation: Required for DataFreshness rule; format: '<number> <unit>' (e.g., '24 hours', '7 days'); default is '24 hours'
   */
  readonly duration?: string;
}

const DEFAULT_THRESHOLD = 0.95;

/**
 * Builds a complete DQDL ruleset string from either a raw DQDL string or an array of rule objects
 */
export function buildRulesetString(rulesetConfig: string | DataQualityRule[]): string {
  // Case 1: Raw DQDL string provided
  if (typeof rulesetConfig === 'string') {
    return rulesetConfig;
  }

  // Case 2: Array of rule objects
  if (Array.isArray(rulesetConfig)) {
    const ruleStrings = rulesetConfig.map(rule => buildRuleString(rule));
    return `Rules = [\n    ${ruleStrings.join(',\n    ')}\n]`;
  }

  throw new Error('ruleset must be a string or an array of rule objects');
}

/**
 * Builds a DQDL rule string from a structured rule object
 */
export function buildRuleString(rule: DataQualityRule): string {
  const rt = rule.ruleType;

  switch (rt) {
    case 'IsComplete':
      return buildIsCompleteRule(rule);
    case 'ColumnValues':
      return buildColumnValuesRule(rule);
    case 'IsUnique':
      return buildIsUniqueRule(rule);
    case 'IsPrimaryKey':
      return buildIsPrimaryKeyRule(rule);
    case 'ColumnExists':
      return buildColumnExistsRule(rule);
    case 'RowCount':
      return buildRowCountRule(rule);
    case 'ColumnCount':
      return buildColumnCountRule(rule);
    case 'Completeness':
      return buildCompletenessRule(rule);
    case 'Uniqueness':
      return buildUniquenessRule(rule);
    case 'Mean':
      return buildMeanRule(rule);
    case 'StandardDeviation':
      return buildStandardDeviationRule(rule);
    case 'CustomSql':
      return buildCustomSqlRule(rule);
    case 'DataFreshness':
      return buildDataFreshnessRule(rule);
    case 'ColumnDataType':
      return buildColumnDataTypeRule(rule);
    case 'ColumnLength':
      return buildColumnLengthRule(rule);
    default:
      throw new Error(`Unsupported ruleType: ${rt}`);
  }
}

export function buildIsCompleteRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for IsComplete rule');
  const whereStr = rule.where ? ` where "${rule.where.replace(/"/g, '\\"')}"` : '';
  return `IsComplete "${rule.column}"${whereStr}`;
}

export function buildColumnValuesRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for ColumnValues rule');
  if (!rule.values) throw new Error('values is required for ColumnValues rule');
  const op = rule.comparisonOperator || 'in';
  const valStr = Array.isArray(rule.values) ? JSON.stringify(rule.values) : `[${rule.values}]`;
  let ruleStr = `ColumnValues "${rule.column}" ${op} ${valStr}`;
  if (rule.where) ruleStr += ` where "${rule.where}"`;
  return ruleStr;
}

export function buildIsUniqueRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for IsUnique rule');
  return `IsUnique "${rule.column}"`;
}

export function buildIsPrimaryKeyRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for IsPrimaryKey rule');
  return `IsPrimaryKey "${rule.column}"`;
}

export function buildColumnExistsRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for ColumnExists rule');
  return `ColumnExists "${rule.column}"`;
}

export function buildRowCountRule(rule: DataQualityRule): string {
  const op = rule.comparisonOperator || '>';
  const val = rule.value ?? 0;
  return `RowCount ${op} ${val}`;
}

export function buildColumnCountRule(rule: DataQualityRule): string {
  const op = rule.comparisonOperator || '>';
  const val = rule.value ?? 0;
  return `ColumnCount ${op} ${val}`;
}

export function buildCompletenessRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for Completeness rule');
  const op = rule.comparisonOperator || '>';
  const thr = rule.threshold ?? DEFAULT_THRESHOLD;
  return `Completeness "${rule.column}" ${op} ${thr}`;
}

export function buildUniquenessRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for Uniqueness rule');
  const op = rule.comparisonOperator || '>';
  const thr = rule.threshold ?? DEFAULT_THRESHOLD;
  return `Uniqueness "${rule.column}" ${op} ${thr}`;
}

export function buildMeanRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for Mean rule');
  if (rule.value === undefined) throw new Error('value is required for Mean rule');
  const op = rule.comparisonOperator || '>';
  return `Mean "${rule.column}" ${op} ${rule.value}`;
}

export function buildStandardDeviationRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for StandardDeviation rule');
  if (rule.value === undefined) throw new Error('value is required for StandardDeviation rule');
  const op = rule.comparisonOperator || '<';
  return `StandardDeviation "${rule.column}" ${op} ${rule.value}`;
}

export function buildCustomSqlRule(rule: DataQualityRule): string {
  if (!rule.sql) throw new Error('sql is required for CustomSql rule');
  const op = rule.comparisonOperator || '=';
  const val = rule.value ?? 0;
  const escapedSql = rule.sql.replace(/"/g, '\\"');
  return `CustomSql "${escapedSql}" ${op} ${val}`;
}

export function buildDataFreshnessRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for DataFreshness rule');
  const op = rule.comparisonOperator || '<=';
  const dur = rule.duration || '24 hours';
  return `DataFreshness "${rule.column}" ${op} ${dur}`;
}

export function buildColumnDataTypeRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for ColumnDataType rule');
  if (!rule.dataType) throw new Error('dataType is required for ColumnDataType rule');
  return `ColumnDataType "${rule.column}" = "${rule.dataType}"`;
}

export function buildColumnLengthRule(rule: DataQualityRule): string {
  if (!rule.column) throw new Error('column is required for ColumnLength rule');
  if (rule.value === undefined) throw new Error('value is required for ColumnLength rule');
  const op = rule.comparisonOperator || '<=';
  return `ColumnLength "${rule.column}" ${op} ${rule.value}`;
}
