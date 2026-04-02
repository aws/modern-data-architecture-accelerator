# Data Quality

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/dataops/dataops-data-quality-app/index.html).

Deploys AWS Glue Data Quality rulesets for automated validation and monitoring of data in Glue Catalog tables. Supports both structured rule objects and raw DQDL (Data Quality Definition Language) strings. Use this module when you need to enforce data quality checks such as completeness, uniqueness, or custom validation rules on tables in your Glue Catalog.

---

## Deployed Resources

This module deploys and integrates the following resources:

<!-- TODO: Add architecture diagram -->

- **Glue Data Quality Ruleset(s)** — Rulesets created for each specification in the config. Supports structured rule objects and raw DQDL strings for flexible validation patterns.
- **SSM Parameters** — Ruleset names and target table information stored in Parameter Store for cross-module reference.

---

## Related Modules

- [DataOps Project](../dataops-project-app/README.md) — Deploy the shared project infrastructure (databases, KMS keys) that data quality rulesets target
- [Crawlers](../dataops-crawler-app/README.md) — Deploy crawlers that create the Glue tables targeted by data quality rulesets
- [ETL Jobs](../dataops-job-app/README.md) — Trigger data quality evaluations from within Glue ETL jobs

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Least Privilege**:
  - Ruleset management governed by IAM policies
  - SSM parameters for ruleset metadata use least-privilege access patterns

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
dataops-data-quality: # Module Name can be customized
  module_path: '@aws-mdaa/dataops-data-quality' # Must match module NPM package name
  module_configs:
    - ./dataops-data-quality.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./dataops-data-quality.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Only required properties are included. Start here for a single data quality ruleset targeting one Glue table within an existing DataOps project.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-data-quality-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Exercises all non-excluded schema properties at full depth. Defines Glue Data Quality rulesets for customer and order data validation, wired to a DataOps project for resource resolution. Start here when evaluating all available options for structured rules, raw DQDL strings, and multi-table validation patterns.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-data-quality-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Standalone Configuration (No Project)

Demonstrates standalone data quality rulesets with explicit KMS, bucket, deployment role, and security configuration (no projectName). Use this when deploying outside of a DataOps project, providing infrastructure references directly.

[sample-config-noproject.yaml](sample_configs/sample-config-noproject.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-data-quality-app/sample_configs/sample-config-noproject.yaml"
```

---

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

---

[Config Schema Docs](SCHEMA.md)
