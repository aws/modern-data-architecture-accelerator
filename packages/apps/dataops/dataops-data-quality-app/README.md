# Data Quality

The Data Ops Data Quality CDK application is used to deploy AWS Glue Data Quality rulesets for automated validation and monitoring of data in Glue Catalog tables.

---

## Deployed Resources and Compliance Details

**Glue Data Quality Rulesets** - Data quality rulesets will be created for each ruleset specification in the configs

* Automatically validates data in Glue Catalog tables
* Supports DQDL (Data Quality Definition Language) rules
* Supports structured rule objects for common validation patterns
* Publishes ruleset metadata to SSM Parameter Store

**SSM Parameters** - Parameters storing ruleset names and target table information for reference by other resources

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
dataops-data-quality: # Module Name can be customized
  module_path: "@aws-mdaa/dataops-data-quality" # Must match module NPM package name
  module_configs:
    - ./dataops-data-quality.yaml # Filename/path can be customized
```

### Module Config (./dataops-data-quality.yaml)

### Sample Data Quality Config

```yaml
# (required) Name of the Data Ops Project this Data Quality ruleset is associated with.
# The project name is used for resource naming and SSM parameter paths.
projectName: my-dataops-project

rulesets:
  # Example 1: Using structured rule objects
  customer-data-quality:
    # (required) Unique name for the ruleset
    name: customer-completeness-check
    # (optional) Description of what this ruleset validates
    description: Validate customer data completeness and uniqueness
    # (required) Target table configuration
    targetTable:
      # Database name - can use project: prefix to reference project databases
      databaseName: project:databaseName/customer-data
      # Table name - must exist before ruleset can be evaluated
      tableName: customers
      # (optional) Catalog ID for cross-account access
      # catalogId: "123456789012"
    # (required) Ruleset definition as array of rule objects
    ruleset:
      # Check that customer_id column has no null values
      - RuleType: IsComplete
        Column: customer_id
      # Check that email column is at least 95% unique
      - RuleType: Uniqueness
        Column: email
        Operator: ">"
        Threshold: 0.95
      # Check that table has more than 100 rows
      - RuleType: RowCount
        Operator: ">"
        Value: 100
      # Check that status column only contains allowed values
      - RuleType: ColumnValues
        Column: status
        Operator: in
        Values: ["active", "inactive", "pending"]

  # Example 2: Using raw DQDL string
  order-data-quality:
    name: order-validation
    description: Validate order data freshness and values
    targetTable:
      databaseName: project:databaseName/order-data
      tableName: orders
    # (required) Ruleset definition as DQDL string
    ruleset: |
      Rules = [
        IsComplete "order_id",
        ColumnValues "status" in ["pending", "completed", "cancelled"],
        DataFreshness "created_at" <= "24 hours",
        RowCount > 0
      ]

  # Example 3: Advanced rules with statistical checks
  product-data-quality:
    name: product-statistical-validation
    description: Statistical validation for product data
    targetTable:
      databaseName: ssm:/my-org/prod/glue-database/products
      tableName: product_catalog
    ruleset:
      # Primary key check
      - RuleType: IsPrimaryKey
        Column: product_id
      # Check mean price is above threshold
      - RuleType: Mean
        Column: price
        Operator: ">"
        Value: 10
      # Check standard deviation of price
      - RuleType: StandardDeviation
        Column: price
        Operator: "<"
        Value: 100
      # Check column data type
      - RuleType: ColumnDataType
        Column: price
        DataType: "decimal"
      # Custom SQL validation
      - RuleType: CustomSql
        Sql: "SELECT COUNT(*) FROM primary WHERE price > 0"
        Operator: "="
        Value: 1000
```

## Supported Rule Types

The following rule types are supported:

### Completeness Rules
- **IsComplete**: Check if a column has no null values
- **Completeness**: Check if a column meets a completeness threshold (percentage)

### Uniqueness Rules
- **IsUnique**: Check if a column has all unique values
- **Uniqueness**: Check if a column meets a uniqueness threshold (percentage)
- **IsPrimaryKey**: Check if a column is a valid primary key (unique and complete)

### Schema Rules
- **ColumnExists**: Check if a column exists in the table
- **ColumnDataType**: Check if a column has the expected data type
- **ColumnLength**: Check if a column's length meets criteria

### Value Rules
- **ColumnValues**: Check if column values are in an allowed set

### Count Rules
- **RowCount**: Check if table row count meets criteria
- **ColumnCount**: Check if table column count meets criteria

### Statistical Rules
- **Mean**: Check if column mean meets criteria
- **StandardDeviation**: Check if column standard deviation meets criteria

### Freshness Rules
- **DataFreshness**: Check if data is recent based on a timestamp column

### Custom Rules
- **CustomSql**: Run custom SQL queries for complex validation logic

## Important Notes

1. **Tables Must Exist**: The target table must exist in the Glue Catalog before the ruleset can be evaluated. Rulesets can be created before tables exist, but evaluation will fail until the table is created (typically by a crawler).

2. **Deployment Order**: This module should be deployed AFTER:
   - `dataops-project-app` (creates databases)
   - `dataops-crawler-app` (creates crawlers)
   - Running crawlers to create tables

3. **Project References**: Use the `project:` prefix to reference resources from the DataOps project:
   - `project:databaseName/my-database` resolves to the project's database SSM parameter

4. **Evaluation**: Creating a ruleset does not automatically evaluate it. You must:
   - Run a Glue Data Quality evaluation job
   - Configure evaluation in a Glue ETL job
   - Use EventBridge to trigger evaluations

5. **DQDL vs Structured Rules**: You can use either:
   - Raw DQDL strings (more flexible, requires DQDL knowledge)
   - Structured rule objects (type-safe, easier to maintain)

---

## References

- [AWS Glue Data Quality Documentation](https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html)
- [DQDL Reference](https://docs.aws.amazon.com/glue/latest/dg/dqdl.html)
