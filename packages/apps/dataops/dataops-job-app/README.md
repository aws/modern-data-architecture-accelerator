# ETL Jobs

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/dataops/dataops-job-app/index.html).

Deploys Glue ETL jobs with automatic script deployment, job templates for config reuse, continuous logging, VPC binding, and project security configuration wiring. Supports Python and Scala runtimes. Use this module when you need to transform, enrich, or move data between sources using Glue Spark or Python shell jobs as part of your data pipeline.

---

## Pre-built Data Quality Script

The module includes a pre-built Glue ETL script for data quality evaluation in the `assets/` directory. Reference it using the `asset:` prefix in `scriptLocation` and `additionalScripts`:

### dq-main.py — DQ evaluation

Evaluates data quality rulesets against a single table. Supports inline DQDL, S3-stored DQDL, and Glue recommendation rulesets. Optionally publishes results to SageMaker Unified Studio (DataZone). For multi-table fan-out, use `dataops-stepfunction-app` with a Distributed Map that starts one `dq-main.py` job run per table.

```yaml
DqEvaluation:
  command:
    name: glueetl
    scriptLocation: "asset:dq-main.py"
  additionalScripts:
    - "asset:dq_config.py"
    - "asset:smus.py"
```

### Shared utilities

- `asset:dq_config.py` — Configuration utilities. Loads rulesets and source data frames from Glue catalog or connection options.
- `asset:smus.py` — SMUS publishing. Posts DQ evaluation results to DataZone via `post_time_series_data_points`.

---

## DataZone Data Lineage

Glue Spark jobs can emit OpenLineage events to an Amazon DataZone / SageMaker Unified Studio domain, mirroring the "Generate lineage events" toggle in the AWS Glue Studio console. Enable it with the optional `lineage` section on a job (or a template):

```yaml
jobs:
  MyEtlJob:
    executionRoleArn: some-arn
    description: ETL job with DataZone lineage
    glueVersion: '5.0'
    command:
      name: glueetl
      scriptLocation: ./src/glue/python/job.py
    lineage:
      enabled: true
      domainId: dzd_xxxxxxxxx
      # accountId optional; defaults to the deploying account
```

When `lineage.enabled` is true, the module injects the OpenLineage Spark listener configuration into the job's `--conf` argument (preserving any `--conf` you set yourself). Declaring `lineage` in a template lets multiple jobs inherit it; an individual job can override `domainId` or set `enabled: false` to opt out.

**Requirements and prerequisites:**

- **Glue 5.0+** — DataZone Spark lineage requires Glue version 5.0 or higher. Enabling lineage on a job with a lower or unset `glueVersion` fails at synth time with a hard error.
- **Execution role permission** — the job execution role needs `datazone:PostLineageEvent` on the target domain. When lineage is enabled, the module **attaches a managed policy granting this permission (scoped to the domain ARN) to the execution role automatically**. If the role is externally managed and you will grant the permission yourself, set `lineage.manageExecutionRolePolicy: false` to skip the attachment. The domain is assumed to be in the deploying account; `lineage.accountId` (optional, a 12-digit AWS account ID) sets only the Glue Data Catalog account (`spark.glue.accountId`) and defaults to the deploying account.
- **Domain-side configuration** — the DataZone domain must have lineage import enabled (via the Default Data Lake blueprint) for events to be surfaced. See the AWS documentation on [data lineage in Amazon DataZone](https://docs.aws.amazon.com/datazone/latest/userguide/datazone-data-lineage.html).

> **Note:** This is unrelated to the `asset:smus.py` script above, which publishes Glue **Data Quality** results to DataZone. The `lineage` section captures **ETL run lineage** for the Spark job itself.

---

## Deployed Resources

This module deploys and integrates the following resources:

**Glue Jobs** - Glue Jobs will be created for each job specification in the configs

- Automatically configured to use project security config
- Can optionally be VPC bound (via Glue connection)
- Automatically configured to use project bucket as temp location
- Can use job templates to promote reuse/minimize config duplication

![dataops-job](../../../constructs/L3/dataops/dataops-job-l3-construct/docs/dataops-job.png)

---

## Related Modules

- [DataOps Project](../dataops-project-app/README.md) — Deploy the shared project infrastructure (KMS keys, security configs, connections, buckets) that ETL jobs reference
- [Crawlers](../dataops-crawler-app/README.md) — Deploy crawlers to catalog ETL job output data in the Glue Catalog
- [Workflows](../dataops-workflow-app/README.md) — Orchestrate ETL jobs and crawlers together in Glue Workflows
- [Step Functions](../dataops-stepfunction-app/README.md) — Orchestrate ETL jobs with Step Functions state machines
- [Data Quality](../dataops-data-quality-app/README.md) — Deploy data quality rulesets to validate ETL job output
- [Data Lake](../../datalake/datalake-app/README.md) — ETL jobs can read from and write to data lake S3 buckets

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, to assist in meeting organization-specific compliance requirements.

- **Encryption at Rest**:
  - Jobs use project Glue security configuration for encrypting output data, logs, and bookmarks with the project KMS key
  - S3 output optionally encrypted with a separate data lake KMS key
- **Least Privilege**:
  - Execution roles scoped per job
  - Project resources referenced via `project:` prefix for consistent access control
  - When DataZone lineage is enabled, the module attaches a managed policy granting only `datazone:PostLineageEvent`, scoped to the specific domain ARN, to that job's execution role; the grant is skipped when `lineage.manageExecutionRolePolicy` is set to `false`
- **Network Isolation**:
  - Optional VPC binding via Glue connections for accessing data sources in private networks

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
dataops-job: # Module Name can be customized
  module_path: '@aws-mdaa/dataops-job' # Must match module NPM package name
  module_configs:
    - ./dataops-job.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./dataops-job.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single Glue ETL job with project autowiring. Start here for a basic ETL job within an existing DataOps project.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-job-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Demonstrates Glue ETL and Python shell jobs with templates, job bookmarks, connections, and extra libraries, all wired to a DataOps project. Start here when evaluating all available options for job types, templates, connections, and library configurations.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-job-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Standalone Configuration (No Project)

Demonstrates standalone Glue jobs with explicit KMS, bucket, deployment role, and security configuration. Use this when deploying outside of a DataOps project, providing infrastructure references directly.

[sample-config-noproject.yaml](sample_configs/sample-config-noproject.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-job-app/sample_configs/sample-config-noproject.yaml"
```

#### Worker Type Configuration

Uses workerType + numberOfWorkers instead of maxCapacity for explicit control over Glue worker sizing. Supported worker types are the general-purpose G family (Standard, G.1X, G.2X, G.4X, G.8X, G.12X, G.16X) and the memory-optimized R family (R.1X, R.2X, R.4X, R.8X). Choose this variant when you need predictable worker allocation instead of maxCapacity-based auto-scaling. Note: larger G types (G.12X, G.16X) and all R types require a compatible Glue version and regional availability.

[sample-config-workertype.yaml](sample_configs/sample-config-workertype.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-job-app/sample_configs/sample-config-workertype.yaml"
```

#### DataZone Lineage Configuration

Deploys a Glue 5.0 job that emits OpenLineage events to an Amazon DataZone / SageMaker Unified Studio domain. Use this variant when you want ETL run lineage captured in DataZone; see [DataZone Data Lineage](#datazone-data-lineage) for prerequisites.

[sample-config-lineage.yaml](sample_configs/sample-config-lineage.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-job-app/sample_configs/sample-config-lineage.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
