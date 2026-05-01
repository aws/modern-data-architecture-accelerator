# SageMaker Batch Inference

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-batch-inference-app/index.html).

Deploys a CI/CD pipeline that executes SageMaker Batch Transform jobs against registered model packages. The pipeline sources seed code from a CodeCommit repository, builds the transform job configuration via CodeBuild, and orchestrates execution through CodePipeline. Use this module when you need scheduled or on-demand batch inference against large datasets using approved models from a SageMaker Model Package Group.

---

## Deployed Resources

This module deploys and integrates the following resources:

**AWS CodeCommit Repository** - Source repository containing seed code for batch transform job definitions and preprocessing scripts.

**AWS CodePipeline** - Orchestrates the end-to-end batch inference workflow from source checkout through transform job execution.

**AWS CodeBuild Project** - Builds and packages the batch transform job configuration from seed code.

**Amazon S3 Bucket** - Stores pipeline artifacts, transform input data, and inference output results.

**AWS KMS Key** - Customer-managed encryption key used to encrypt the S3 bucket, CodePipeline artifacts, and batch transform data.

**AWS IAM Roles** - Execution roles for CodePipeline, CodeBuild, and SageMaker Batch Transform with scoped permissions.

**AWS SSM Parameters** - Publishes resource ARNs and names for cross-module integration.

<!-- Architecture diagram not yet available -->

---

## Related Modules

- [SageMaker MLOps](../sagemaker-mlops-app/README.md) — Provides the Model Package Group and registered model versions that batch inference jobs consume
- [SageMaker Studio Domain](../sm-studio-domain-app/README.md) — Provides SageMaker domain tagging context for resource governance
- [SageMaker Pipeline](../sagemaker-pipeline-app/README.md) — Alternative approach for defining training and inference workflows entirely in CDK without seed code

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - S3 pipeline bucket encrypted with customer-managed KMS key
  - CodePipeline artifacts encrypted with the same KMS key
  - Batch transform output data encrypted with KMS
- **Encryption in Transit**:
  - All S3 access enforced over HTTPS via bucket policy
  - CodePipeline and CodeBuild communicate over TLS
- **Least Privilege**:
  - CodeBuild role scoped to specific S3 bucket and KMS key
  - SageMaker execution role limited to required model registry and S3 paths
  - CodePipeline role restricted to source, build, and deploy actions
- **Network Isolation**:
  - CodeBuild project supports VPC configuration for private network access
  - Batch transform jobs can be configured for VPC isolation

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-batch-inference: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-batch-inference' # Must match module NPM package name
  module_configs:
    - ./sagemaker-batch-inference.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-batch-inference.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Start here for a basic batch inference pipeline with a single model package group reference and default settings.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-batch-inference-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Use this as a reference when you need full control over pipeline stages, VPC configuration, transform job parameters, and notification settings.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/ai/sagemaker-batch-inference-app/sample_configs/sample-config-comprehensive.yaml"
```
