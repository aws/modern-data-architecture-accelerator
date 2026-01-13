# DataOps Data Quality L3 Construct

AWS CDK L3 Construct for deploying AWS Glue Data Quality rulesets in DataOps workflows.

## Overview

This construct creates AWS Glue Data Quality rulesets for automated validation and monitoring of data in Glue Catalog tables. It supports both DQDL (Data Quality Definition Language) strings and structured rule objects for defining validation rules.

## Features

- **Flexible Rule Definition**: Support for both raw DQDL strings and structured rule objects
- **Comprehensive Rule Types**: 15+ built-in rule types for common validation scenarios
- **SSM Integration**: Automatic publishing of ruleset metadata to SSM Parameter Store
- **Project Integration**: Seamless integration with DataOps project infrastructure
- **Type Safety**: Full TypeScript type definitions for all rule types

## Installation

```bash
npm install @aws-mdaa/dataops-data-quality-l3-construct
```

## Usage

### Basic Example

```typescript
import { DataOpsDataQualityL3Construct } from '@aws-mdaa/dataops-data-quality-l3-construct';
import { Stack } from 'aws-cdk-lib';

const stack = new Stack(app, 'DataQualityStack');

new DataOpsDataQualityL3Construct(stack, 'DataQuality', {
  naming: myNaming,
  domainUnit: myDomainUnit,
  projectName: 'my-dataops-project',
  rulesetConfigs: {
    'customer-quality': {
      name: 'customer-data-validation',
      description: 'Validate customer data quality',
      targetTable: {
        databaseName: 'customer_db',
        tableName: 'customers',
      },
      ruleset: [
        {
          RuleType: 'IsComplete',
          Column: 'customer_id',
        },
        {
          RuleType: 'Uniqueness',
          Column: 'email',
          Operator: '>',
          Threshold: 0.95,
        },
      ],
    },
  },
});
```

### Using DQDL Strings

```typescript
new DataOpsDataQualityL3Construct(stack, 'DataQuality', {
  naming: myNaming,
  domainUnit: myDomainUnit,
  projectName: 'my-dataops-project',
  rulesetConfigs: {
    'order-quality': {
      name: 'order-validation',
      targetTable: {
        databaseName: 'orders_db',
        tableName: 'orders',
      },
      ruleset: `Rules = [
        IsComplete "order_id",
        ColumnValues "status" in ["pending", "completed", "cancelled"],
        RowCount > 0
      ]`,
    },
  },
});
```

## Supported Rule Types

### Completeness Rules
- `IsComplete`: Column has no null values
- `Completeness`: Column meets completeness threshold

### Uniqueness Rules
- `IsUnique`: Column has all unique values
- `Uniqueness`: Column meets uniqueness threshold
- `IsPrimaryKey`: Column is a valid primary key

### Schema Rules
- `ColumnExists`: Column exists in table
- `ColumnDataType`: Column has expected data type
- `ColumnLength`: Column length meets criteria

### Value Rules
- `ColumnValues`: Column values are in allowed set

### Count Rules
- `RowCount`: Table row count meets criteria
- `ColumnCount`: Table column count meets criteria

### Statistical Rules
- `Mean`: Column mean meets criteria
- `StandardDeviation`: Column standard deviation meets criteria

### Freshness Rules
- `DataFreshness`: Data is recent based on timestamp column

### Custom Rules
- `CustomSql`: Custom SQL queries for complex validation

## API Reference

### DataOpsDataQualityL3ConstructProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| rulesetConfigs | `{ [key: string]: DataQualityRulesetDefinition }` | Yes | Map of ruleset configurations |
| projectName | `string` | Yes | DataOps project name for resource coordination |
| naming | `IMdaaResourceNaming` | Yes | Naming configuration |
| domainUnit | `DomainUnit` | Yes | Domain unit configuration |

### DataQualityRulesetDefinition

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | `string` | Yes | Unique ruleset name |
| targetTable | `DataQualityTargetTable` | Yes | Target table configuration |
| ruleset | `string \| DataQualityRule[]` | Yes | DQDL string or rule objects |
| description | `string` | No | Ruleset description |

### DataQualityTargetTable

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| databaseName | `string` | Yes | Glue database name |
| tableName | `string` | Yes | Glue table name |
| catalogId | `string` | No | AWS account ID for cross-account access |

### DataQualityRule

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| RuleType | `string` | Yes | Type of validation rule |
| Column | `string` | No | Column name for column-specific rules |
| Operator | `string` | No | Comparison operator |
| Threshold | `number` | No | Threshold value (0-1) |
| Value | `number` | No | Numeric comparison value |
| Values | `(string \| number)[]` | No | Allowed values list |
| Where | `string` | No | SQL WHERE clause |
| Sql | `string` | No | Custom SQL query |
| DataType | `string` | No | Expected data type |
| Duration | `string` | No | Duration for freshness checks |

## License

This project is licensed under the Apache-2.0 License.
