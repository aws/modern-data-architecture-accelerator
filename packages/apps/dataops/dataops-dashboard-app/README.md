# DataOps Dashboard

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/dataops/dataops-dashboard-app/index.html).

Creates CloudWatch dashboards for MDAA observability, aggregating metrics and logs from Lambda functions and other modules. Supports text, metric, and log insights widgets with SSM-based cross-module metric references and automatic widget layout. Use this module when you need a centralized view of your data pipeline health, including Lambda execution metrics, ETL job performance, and log-based error tracking.

---

## Deployed Resources

This module deploys and integrates the following resources:

<!-- TODO: Add architecture diagram -->

- **CloudWatch Dashboard(s)** — One or more dashboards with configurable widget layouts. Widgets auto-wrap at 24-unit width.
- **SSM Parameter References** — Resolves metric and log group references from other modules via SSM Parameter Store (e.g., Lambda function names, log groups, custom metric namespaces).

---

## Related Modules

- [DataOps Project](../dataops-project-app/README.md) — Deploy the shared project infrastructure that dashboard metrics reference
- [Lambda Functions](../dataops-lambda-app/README.md) — Deploy Lambda functions whose metrics and logs can be visualized in dashboards
- [ETL Jobs](../dataops-job-app/README.md) — Deploy Glue ETL jobs whose metrics can be tracked in dashboards
- [Step Functions](../dataops-stepfunction-app/README.md) — Deploy Step Functions whose execution metrics can be monitored in dashboards

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Least Privilege**:
  - Dashboard access governed by IAM policies
  - SSM parameter references use least-privilege read access to resolve cross-module metrics

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
dataops-dashboard: # Module Name can be customized
  module_path: '@aws-mdaa/dataops-dashboard' # Must match module NPM package name
  module_configs:
    - ./dataops-dashboard.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./dataops-dashboard.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single CloudWatch dashboard with a text widget. Start here for a basic observability dashboard that you can incrementally add widgets to.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Demonstrates CloudWatch dashboards with text, metric, log insights, and advanced multi-metric widgets, all wired to a DataOps project. Start here when evaluating all available options for widget types, metric references, and cross-module SSM parameter resolution.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

#### Standalone Configuration (No Project)

Demonstrates standalone CloudWatch dashboards with explicit KMS, bucket, deployment role, and security configuration instead of referencing a DataOps project. Use this when deploying outside of a DataOps project, providing infrastructure references directly.

[sample-config-noproject.yaml](sample_configs/sample-config-noproject.yaml)

```yaml
--8<-- "sample_configs/sample-config-noproject.yaml"
```

---

## Widget Types

### Text Widget

Displays markdown content for dashboard headers, descriptions, and section dividers.

```yaml
- type: text
  markdown: '# Dashboard Title'
  width: 24
  height: 2
```

### Metric Widget

Visualizes time-series metrics. Supports multiple metrics per widget, custom periods, stat types, and labels.

```yaml
- type: metric
  title: 'Lambda Duration'
  width: 12
  height: 6
  period: 300
  metrics:
    - namespace: AWS/Lambda
      metricName: Duration
      stat: Average
      label: 'Avg Duration'
```

### Log Insights Widget

Displays CloudWatch Logs Insights query results.

```yaml
- type: log_insights
  title: 'Recent Errors'
  width: 24
  height: 6
  logGroupNames:
    - '/aws/lambda/my-function'
  queryString: |
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 20
```

## Placeholders

- `{{function:functionName}}` — Resolves Lambda function name from SSM
- `{{function:functionName:logGroup}}` — Resolves Lambda function log group from SSM

## Widget Layout

Widgets auto-wrap at 24-unit width. When adding a widget would exceed 24 units, a new row starts automatically.

---

[Config Schema Docs](SCHEMA.md)
