# SageMaker Model Monitoring

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-model-monitoring-app/index.html).

Deploys SageMaker Model Monitor schedules for all four monitoring types — data quality, model quality, model bias, and model explainability — against a deployed real-time endpoint. Each monitor runs as a scheduled processing job that compares live inference traffic against baseline statistics and constraints, publishing violations to S3 and CloudWatch. Use this module when you need continuous monitoring of a production inference endpoint to detect data drift, model degradation, bias drift, or changes in feature attribution.

---

## Deployed Resources

This module deploys and integrates the following resources:

**SageMaker Data Quality Monitoring Schedule** (Optional) - Scheduled processing job that compares incoming request data against baseline data statistics and constraints.

**SageMaker Model Quality Monitoring Schedule** (Optional) - Scheduled processing job that evaluates model prediction accuracy against ground truth labels.

**SageMaker Model Bias Monitoring Schedule** (Optional) - Scheduled processing job that detects bias drift in model predictions using SageMaker Clarify.

**SageMaker Model Explainability Monitoring Schedule** (Optional) - Scheduled processing job that tracks changes in feature attribution using SageMaker Clarify.

**Baseline Processing Job** (Optional) - One-time processing job that generates baseline statistics and constraints from a representative dataset.

**Amazon S3 Output Bucket** - Stores monitoring output reports, constraint violations, and baseline artifacts.

**AWS KMS Key** - Customer-managed encryption key for S3 output bucket and processing job storage volumes.

**AWS IAM Monitoring Role** - Execution role for monitoring processing jobs with permissions to read endpoint data capture and write results to S3.

<!-- Architecture diagram not yet available -->

---

## Related Modules

- [SageMaker Endpoint](../sagemaker-endpoint-app/README.md) — Deploys the real-time inference endpoint that this module monitors for drift and quality degradation
- [SageMaker MLOps](../sagemaker-mlops-app/README.md) — Provides the model artifacts and model package group used to establish monitoring baselines
- [SageMaker Studio Domain](../sm-studio-domain-app/README.md) — Provides SageMaker domain tagging context for resource governance

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - S3 output bucket encrypted with customer-managed KMS key
  - Processing job storage volumes encrypted with KMS
  - Baseline artifacts encrypted at rest
- **Encryption in Transit**:
  - All S3 access enforced over HTTPS via bucket policy
  - Processing job containers communicate over TLS
- **Least Privilege**:
  - Monitoring role scoped to specific endpoint, S3 paths, and KMS key
  - KMS key policy restricts usage to the monitoring role and admin principals
- **Network Isolation**:
  - Monitoring processing jobs support VPC configuration with security groups and subnets
  - Optional network isolation mode prevents containers from making outbound network calls

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-model-monitoring: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-model-monitoring' # Must match module NPM package name
  module_configs:
    - ./sagemaker-model-monitoring.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-model-monitoring.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Start here for a single data quality monitor on an existing endpoint with default schedule and instance settings.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-model-monitoring-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Use this as a reference when you need all four monitor types, custom baseline generation, VPC isolation, and per-monitor schedule and instance configuration.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-model-monitoring-app/sample_configs/sample-config-comprehensive.yaml"
```
