/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Structured rule object defining a single data quality validation check for Glue Catalog tables.
 *
 * Use cases: Rule definition, data validation, quality checks, structured rule configuration
 *
 * AWS: AWS Glue Data Quality rule definition in structured format, converted to DQDL
 *
 * Validation: ruleType is required; other fields depend on the specific rule type
 */
export interface DataQualityRule {
  /**
   * Rule type identifier (e.g. IsComplete, ColumnValues, Uniqueness, RowCount, CustomSql).
   *
   * Use cases: Rule identification, validation type selection
   *
   * AWS: AWS Glue Data Quality rule type
   *
   * Validation: Must be one of: IsComplete, ColumnValues, IsUnique, IsPrimaryKey, ColumnExists, RowCount, ColumnCount, Completeness, Uniqueness, Mean, StandardDeviation, CustomSql, DataFreshness, ColumnDataType, ColumnLength
   */
  readonly ruleType: string;

  /**
   * Column name for column-specific rules.
   *
   * Use cases: Column targeting, field validation
   *
   * AWS: AWS Glue Catalog table column name
   *
   * Validation: Required for most rule types except RowCount and ColumnCount; must be a valid column name
   */
  readonly column?: string;

  /**
   * Comparison operator for threshold and value-based rules (e.g. =, >, <, >=, <=, in).
   *
   * Use cases: Threshold comparison, value validation, range checks
   *
   * AWS: Comparison operator for Glue Data Quality rules
   *
   * Validation: Must be one of: =, >, <, >=, <=, !=, <>, between, in; default varies by rule type
   */
  readonly comparisonOperator?: string;

  /**
   * Threshold value (0.0–1.0) for percentage-based rules like Completeness and Uniqueness.
   *
   * Use cases: Completeness validation, uniqueness checks
   *
   * AWS: Threshold for Glue Data Quality percentage-based rules
   *
   * Validation: Must be between 0.0 and 1.0; defaults to 0.95
   */
  readonly threshold?: number;

  /**
   * Numeric value for count and statistical rules (e.g. RowCount, Mean, StandardDeviation).
   *
   * Use cases: Row count validation, statistical thresholds, numeric comparisons
   *
   * AWS: Numeric value for Glue Data Quality rule comparisons
   *
   * Validation: Must be numeric; required for RowCount, ColumnCount, Mean, StandardDeviation, ColumnLength rules
   */
  readonly value?: number;

  /**
   * Allowed values list for ColumnValues rule with 'in' operator.
   *
   * Use cases: Enum validation, allowed value lists, categorical data validation
   *
   * AWS: Allowed values for Glue Data Quality ColumnValues rule
   *
   * Validation: Required for ColumnValues rule; can contain strings or numbers
   */
  readonly values?: (string | number)[];

  /**
   * SQL WHERE clause to filter rows before applying the rule.
   *
   * Use cases: Conditional validation, row filtering, subset checks
   *
   * AWS: WHERE clause for Glue Data Quality rule filtering
   *
   * Validation: Must be a valid SQL WHERE condition; use single quotes for string literals
   */
  readonly where?: string;

  /**
   * SQL query for CustomSql rule type, must return a single numeric value.
   *
   * Use cases: Custom validation logic, complex checks, SQL-based rules
   *
   * AWS: Custom SQL query for Glue Data Quality CustomSql rule
   *
   * Validation: Required for CustomSql rule; must be a SELECT returning a single numeric value
   */
  readonly sql?: string;

  /**
   * Expected data type for ColumnDataType rule (e.g. STRING, INT, DATE, DECIMAL).
   *
   * Use cases: Schema validation, type checking, data type enforcement
   *
   * AWS: Expected column data type for Glue Data Quality validation
   *
   * Validation: Required for ColumnDataType rule; must be a valid Glue data type
   */
  readonly dataType?: string;

  /**
   * Duration for DataFreshness rule specifying maximum data age (e.g. '24 hours', '7 days').
   *
   * Use cases: Data freshness validation, timeliness checks, recency requirements
   *
   * AWS: Duration threshold for Glue Data Quality DataFreshness rule
   *
   * Validation: Required for DataFreshness rule; format: '<number> <unit>'; defaults to '24 hours'
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
