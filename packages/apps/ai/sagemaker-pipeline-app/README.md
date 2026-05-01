# SageMaker Pipeline

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-pipeline-app/index.html).

Deploys a SageMaker Pipeline defined entirely in CDK and CloudFormation with no seed code required. The pipeline definition is specified as JSON configuration supporting Processing, Training, RegisterModel, CreateModel, Transform, and Condition steps. This provides a fully declarative, infrastructure-as-code approach to ML workflows. Use this module when you need a SageMaker Pipeline managed through YAML configuration without maintaining separate seed code repositories, or as an alternative to the SageMaker MLOps module's CodeCommit-based approach.

---

## Deployed Resources

This module deploys and integrates the following resources:

**SageMaker Pipeline** - ML workflow pipeline with step definitions for processing, training, model registration, and batch transform.

**AWS IAM Pipeline Execution Role** - Execution role for the SageMaker Pipeline with permissions to run training jobs, processing jobs, and register models.

**AWS KMS Key** - Customer-managed encryption key for S3 model bucket, training job volumes, and processing job storage.

**Amazon S3 Model Bucket** - Stores model artifacts, processing outputs, and pipeline step data.

**SageMaker Model Package Group** (Optional) - Registry for versioned model packages produced by RegisterModel pipeline steps.

**AWS SSM Parameters** - Publishes pipeline ARN, model bucket name, and model package group ARN for cross-module integration.

<!-- Architecture diagram not yet available -->

---

## Related Modules

- [SageMaker MLOps](../sagemaker-mlops-app/README.md) — Alternative approach that uses CodeCommit seed code and CodePipeline for training orchestration instead of declarative pipeline definitions
- [SageMaker Endpoint](../sagemaker-endpoint-app/README.md) — Deploys real-time inference endpoints from model packages registered by this module's pipeline
- [SageMaker Model Monitoring](../sagemaker-model-monitoring-app/README.md) — Monitors endpoints serving models produced by this module's pipeline for drift and quality degradation
- [SageMaker Studio Domain](../sm-studio-domain-app/README.md) — Provides SageMaker domain tagging context for resource governance

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - S3 model bucket encrypted with customer-managed KMS key
  - Training job storage volumes encrypted with KMS
  - Processing job storage volumes encrypted with KMS
  - Model artifacts encrypted at rest in the model registry
- **Encryption in Transit**:
  - All S3 access enforced over HTTPS via bucket policy
  - Inter-container traffic encryption enabled for distributed training steps
- **Least Privilege**:
  - Pipeline execution role scoped to specific S3 paths, KMS key, and SageMaker actions
  - Model package group access restricted to the pipeline execution role
  - Cross-account model registry access uses scoped IAM policies
- **Network Isolation**:
  - Pipeline steps support VPC configuration with security groups and subnets
  - Training and processing containers can be configured for network isolation

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-pipeline: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-pipeline' # Must match module NPM package name
  module_configs:
    - ./sagemaker-pipeline.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-pipeline.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Start here for a simple pipeline with a single training step and model registration using default instance types.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-pipeline-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Use this as a reference when you need multi-step pipelines with processing, training, conditional branching, model registration, VPC isolation, and cross-account model registry access.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-pipeline-app/sample_configs/sample-config-comprehensive.yaml"
```
