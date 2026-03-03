# DataOps Dashboard App

CloudWatch dashboard module for MDAA observability features.

## Overview

The DataOps Dashboard App creates CloudWatch dashboards that aggregate metrics and logs from multiple Lambda functions across different modules. It supports SSM-based metric references for cross-module integration and automatic widget layout.

## Features

- **Text Widgets**: Display markdown content for dashboard headers and descriptions
- **Metric Widgets**: Visualize time-series metrics with support for metric math
- **Log Insights Widgets**: Display CloudWatch Logs Insights query results
- **SSM References**: Reference metrics from other modules using SSM Parameter Store
- **Placeholder Resolution**: Automatically resolve function names and log groups
- **Auto-wrapping**: Widgets automatically wrap at 24-unit width

## Configuration

### Basic Dashboard

```yaml
# (Optional) Name of the DataOps Project
# Other resources within the project can be referenced in the config using
# the "project:" prefix on the config value.
projectName: my-project

dashboards:
  - dashboardName: etl-observability
    widgets:
      - type: text
        markdown: |
          # ETL Observability Dashboard
          Monitoring for data pipeline
        width: 24
        height: 2
```

### Metric Widget with SSM Reference

```yaml
- type: metric
  title: 'Error Count'
  width: 12
  height: 6
  metrics:
    - metricRef: 'ssm:/mdaa/org/dev/metrics/lambda_csv_parquet/error-count'
      stat: Sum
```

### Metric Widget with Direct Reference

```yaml
- type: metric
  title: 'Lambda Duration'
  width: 12
  height: 6
  metrics:
    - namespace: AWS/Lambda
      metricName: Duration
      dimensions:
        FunctionName: '{{function:lambda_csv_parquet}}'
      stat: Average
```

### Log Insights Widget

```yaml
- type: log_insights
  title: 'Recent Errors'
  width: 24
  height: 6
  logGroupNames:
    - '{{function:lambda_csv_parquet:logGroup}}'
  queryString: |
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 20
```

## Placeholders

### Function Name Placeholder

Use `{{function:functionName}}` to reference a Lambda function name from SSM:

```yaml
dimensions:
  FunctionName: '{{function:lambda_csv_parquet}}'
```

Resolves to: `/mdaa/lambda/lambda_csv_parquet/name`

### Log Group Placeholder

Use `{{function:functionName:logGroup}}` to reference a Lambda function's log group:

```yaml
logGroupNames:
  - '{{function:lambda_csv_parquet:logGroup}}'
```

Resolves to: `/mdaa/lambda/lambda_csv_parquet/log-group`

## SSM Metric References

Reference metrics created by other modules using SSM syntax:

```yaml
metricRef: 'ssm:/mdaa/{org}/{env}/metrics/{functionName}/{metricName}'
```

The construct will automatically resolve:

- Namespace from: `/mdaa/{org}/{env}/metrics/{functionName}/{metricName}/namespace`
- Name from: `/mdaa/{org}/{env}/metrics/{functionName}/{metricName}/name`

## Deployment

1. Deploy Lambda functions with metric filters first
2. Wait for SSM parameters to be created
3. Deploy dashboards

```bash
# Deploy Lambda functions
cd packages/apps/dataops/dataops-lambda-app
cdk deploy

# Deploy dashboards
cd packages/apps/dataops/dataops-dashboard-app
cdk deploy
```

## Widget Types

### Text Widget

```yaml
- type: text
  markdown: '# Dashboard Title'
  width: 24
  height: 2
```

### Metric Widget

```yaml
- type: metric
  title: 'Metric Title'
  width: 12
  height: 6
  period: 300
  metrics:
    - namespace: AWS/Lambda
      metricName: Duration
      stat: Average
```

### Log Insights Widget

```yaml
- type: log_insights
  title: 'Query Title'
  width: 24
  height: 6
  logGroupNames:
    - '/aws/lambda/my-function'
  queryString: |
    fields @timestamp, @message
    | sort @timestamp desc
```

## Widget Layout

Widgets are automatically laid out in rows with a maximum width of 24 units. When adding a widget would exceed 24 units, a new row is started automatically.

Example:

- Widget 1: width 12 (row 1)
- Widget 2: width 12 (row 1)
- Widget 3: width 12 (row 2, new row started)
- Widget 4: width 12 (row 2)
