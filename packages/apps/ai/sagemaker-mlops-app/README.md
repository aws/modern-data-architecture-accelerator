# SageMaker MLOps

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-mlops-app/index.html).

Deploys a unified ML training and deployment pipeline with cross-account model promotion. The training construct provisions a CodePipeline that builds and registers model packages from seed code in CodeCommit, while the deploy construct uses EventBridge to trigger CDK-based deployments when new model versions are approved. Supports optional manual approval gates and cross-account deployment stacks for staging and production environments. Common scenarios include end-to-end MLOps workflows where models are trained in a development account, registered in a shared model registry, and promoted to staging and production accounts through automated pipelines.

---

## Deployed Resources

This module deploys and integrates the following resources:

**SageMaker Model Package Group** - Registry for versioned model packages produced by the training pipeline.

**Amazon S3 Model Bucket** - Stores model artifacts, training data references, and pipeline outputs.

**AWS CodeCommit Repository** - Source repository containing training and deployment seed code.

**AWS CodeBuild Project (Training)** - Builds and executes the SageMaker training pipeline from seed code.

**AWS CodePipeline (Training)** - Orchestrates the training workflow from source checkout through model registration.

**AWS CodeBuild Project (Deploy)** - Executes CDK deployment of inference infrastructure when a model version is approved.

**Amazon EventBridge Rule** - Triggers the deploy pipeline when a model package status changes to Approved.

**Manual Approval Action** (Optional) - CodePipeline approval gate before production deployment.

**Cross-Account Deployment Stacks** (Optional) - CloudFormation stacks deployed to staging and production accounts for model hosting.

**AWS KMS Key** - Customer-managed encryption key for S3 bucket, CodePipeline artifacts, and model artifacts.

**AWS IAM Roles** - Execution roles for CodePipeline, CodeBuild, SageMaker training, and cross-account deployment.

**AWS SSM Parameters** - Publishes model package group ARN, bucket name, and pipeline ARNs for cross-module integration.

<!-- Architecture diagram not yet available -->

---

## Related Modules

- [SageMaker Endpoint](../sagemaker-endpoint-app/README.md) — Deploys real-time inference endpoints from model packages registered by this module's training pipeline
- [SageMaker Model Monitoring](../sagemaker-model-monitoring-app/README.md) — Monitors endpoints deployed by this module for data quality, model quality, bias, and explainability drift
- [SageMaker Studio Domain](../sm-studio-domain-app/README.md) — Provides SageMaker domain tagging context for resource governance
- [Data Lake](../../datalake/datalake-app/README.md) — Deploy data lake buckets that training jobs can read training data from

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - S3 model bucket encrypted with customer-managed KMS key
  - CodePipeline artifacts encrypted with KMS
  - Model artifacts encrypted at rest in the model registry
- **Encryption in Transit**:
  - All S3 access enforced over HTTPS via bucket policy
  - Inter-container traffic encryption enabled for distributed training jobs
  - CodePipeline and CodeBuild communicate over TLS
- **Least Privilege**:
  - SageMaker training role scoped to specific S3 paths and KMS key
  - CodeBuild deploy role limited to CloudFormation and target account assume-role
  - Cross-account roles use external ID conditions where applicable
- **Separation of Duties**:
  - Training and deployment pipelines use separate IAM roles
  - Cross-account deployment requires explicit role assumption
  - Optional manual approval gate separates training from production deployment
- **Network Isolation**:
  - CodeBuild projects support VPC configuration for private network access
  - SageMaker training jobs can be configured for VPC isolation

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-mlops: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-mlops' # Must match module NPM package name
  module_configs:
    - ./sagemaker-mlops.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-mlops.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Start here for a single-account training pipeline with default settings and no cross-account deployment.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-mlops-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Use this as a reference when you need cross-account model promotion, manual approval gates, VPC isolation, and full control over training and deployment pipeline settings.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-mlops-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Build Policies (Private Registry)

Use this variant when the CodeBuild pipelines need access to a private npm registry (e.g. CodeArtifact) or other AWS services during `npm install`. Demonstrates both inline policy documents and managed policy ARN references.

[sample-config-build-policies.yaml](sample_configs/sample-config-build-policies.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-mlops-app/sample_configs/sample-config-build-policies.yaml"
```
