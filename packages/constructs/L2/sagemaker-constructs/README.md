# Construct Overview

Opinionated L2 Constructs for SageMaker.

## Security/Compliance

### SageMaker Studio Domain
* Enforce domain name
* Enforce KMS encryption at rest
* Enforce VPC-bound app connectivity

### SageMaker Notebooks
* Enforce notebook names
* Enforce KMS CMK encryption at reset
* Enforce disable direct internet access

### SageMaker Project Template
* Enforce resource naming via MDAA naming conventions
* Publishes project ID and ARN as SSM parameters and stack outputs

### SageMaker Ground Truth
* Enforce labeling job naming via MDAA naming conventions
* Stores all labeling job configuration as SSM parameters for Step Functions orchestration
* Supports optional KMS encryption for labeling output
* Supports optional verification step configuration with full worker/pricing config parity
* Publishes derived `labelingAttributeName` (e.g. `label-ref` for semantic segmentation) for downstream workflow use
* Supports AMT/vendor workforce pricing and task availability lifetime parameters

### SageMaker Model Monitor
* Enforce monitoring schedule and job definition naming via MDAA naming conventions
* Supports all four monitor types: DataQuality, ModelQuality, ModelBias, ModelExplainability
* Defaults `enableInterContainerTrafficEncryption` to `true` when network config is provided
* Publishes monitoring schedule ARN as SSM parameter and stack output