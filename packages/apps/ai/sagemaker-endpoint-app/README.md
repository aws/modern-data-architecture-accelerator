# SageMaker Endpoint

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-endpoint-app/index.html).

Deploys a real-time SageMaker inference endpoint from an approved model package using pure CDK constructs with no seed code required. The module creates the model definition, endpoint configuration, and endpoint resources directly from CloudFormation, enabling fully declarative endpoint management. Use this module when you need a production-ready real-time inference endpoint backed by a registered model package with data capture enabled for downstream monitoring.

---

## Deployed Resources

This module deploys and integrates the following resources:

**SageMaker Model** - Model definition referencing an approved model package version from a Model Package Group.

**SageMaker Endpoint Configuration** - Defines the hosting infrastructure including instance type, instance count, KMS encryption, and data capture settings.

**SageMaker Endpoint** - Real-time inference endpoint serving predictions from the configured model.

**AWS KMS Key** - Customer-managed encryption key for endpoint storage volumes and data capture output.

**AWS IAM Execution Role** - SageMaker execution role with permissions to pull model artifacts from S3 and write data capture output.

**AWS SSM Parameters** - Publishes endpoint name, endpoint ARN, and model name for cross-module integration.

<!-- Architecture diagram not yet available -->

---

## Related Modules

- [SageMaker MLOps](../sagemaker-mlops-app/README.md) — Provides the Model Package Group, model bucket, and registered model versions that the endpoint serves
- [SageMaker Model Monitoring](../sagemaker-model-monitoring-app/README.md) — Monitors the deployed endpoint for data quality, model quality, bias, and explainability drift
- [SageMaker Studio Domain](../sm-studio-domain-app/README.md) — Provides SageMaker domain tagging context for resource governance

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - Endpoint storage volumes encrypted with customer-managed KMS key
  - Data capture output encrypted with KMS
  - Model artifacts referenced from KMS-encrypted S3 buckets
- **Encryption in Transit**:
  - All S3 access enforced over HTTPS
  - Endpoint traffic served over TLS
- **Least Privilege**:
  - SageMaker execution role scoped to specific model package group and S3 paths
  - KMS key policy restricts usage to the execution role and admin principals
- **Network Isolation**:
  - Endpoint supports VPC configuration with security groups and subnets
  - Network isolation mode prevents containers from making outbound network calls
- **Data Protection**:
  - Data capture configuration enables logging of inference requests and responses for audit and monitoring

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-endpoint: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-endpoint' # Must match module NPM package name
  module_configs:
    - ./sagemaker-endpoint.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-endpoint.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Start here for a single-variant endpoint with default instance type and no data capture, referencing an existing model package.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-endpoint-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Use this as a reference when you need full control over endpoint variants, data capture settings, VPC network isolation, and auto-scaling configuration.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-endpoint-app/sample_configs/sample-config-comprehensive.yaml"
```
