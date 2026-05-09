# MLOps Platform Starter Kit

End-to-end ML lifecycle platform covering model training, deployment, and monitoring — deployed and governed through MDAA with CDK Nag compliance (AWS Solutions, NIST 800-53, HIPAA, PCI-DSS).

## Architecture

![MLOps Platform Architecture](docs/mlops.png)

## What's Included

| Component | Description |
|-----------|-------------|
| **CI/CD Module** (deployed by platform team) | |
| `@aws-mdaa/sagemaker-mlops` | Unified training + deploy pipelines |
| **ML Infrastructure Apps** (deployed by seed code via `mdaa deploy`) | |
| `@aws-mdaa/sagemaker-pipeline` | Pure CDK SageMaker Pipeline (CfnPipeline with step constructs) |
| `@aws-mdaa/sagemaker-endpoint` | Pure CDK SageMaker Endpoint (CfnModel + CfnEndpointConfig + CfnEndpoint) |
| `@aws-mdaa/sagemaker-model-monitoring` | Model quality monitoring schedule |
| **Seed Code** | |
| `seed_code/training/` | ML scripts (preprocessing, evaluation) + static MDAA pipeline config |
| `seed_code/deploy/` | Static MDAA configs for endpoint + monitoring |
| `seed_code/batch_inference/` | Static MDAA config for batch transform inference pipeline |

## Key Design Principles

**Static config over runtime generation.** Pipeline and endpoint configurations are defined as static YAML files that use MDAA's built-in `{{env_var:...}}` syntax. Environment variables are set by the L3 constructs and resolved at CDK synth time inside CodeBuild. No Python config generation scripts needed.

**Minimal SageMaker SDK usage.** All AWS infrastructure is created by MDAA apps via CloudFormation. Seed code only contains:
- ML logic (Python scripts for preprocessing, training, evaluation)
- Static MDAA YAML configs using `{{env_var:VAR_NAME}}` for environment variable resolution
- `mdaa deploy` (deploys MDAA apps via CloudFormation)

The SageMaker SDK is used only at build time for resolving regional ECR image URIs (e.g., `sagemaker.image_uris.retrieve()`). The `ml_pipelines/` directories contain SageMaker SDK pipeline definitions used by the notebook runbook for local development and debugging — they are not used by the production `buildspec.yml` flow.

**Monitoring deployed with the endpoint.** Model monitoring is configured in the deploy seed code (`seed_code/deploy/mdaa-config/monitoring.yaml`) and deployed alongside the endpoint via `mdaa deploy`. This ensures monitoring is always co-located with the endpoint it watches.

## Directory Structure

```
starter_kits/mlops_platform/
├── mdaa.yaml                    # Top-level MDAA descriptor
├── mlops/
│   └── mlops.yaml               # Unified MLOps module config (training + deploy)
├── data/                        # Training dataset (uploaded to S3 during mdaa deploy)
│   └── README.md
├── seed_code/
│   ├── training/
│   │   ├── mdaa-config/
│   │   │   ├── pipeline.yaml    # SageMaker pipeline config (static)
│   │   │   └── mdaa.yaml        # MDAA deployment descriptor
│   │   ├── buildspec.yml        # CodeBuild: upload scripts → mdaa deploy → start pipeline
│   │   ├── source_scripts/      # ML scripts (preprocessing.py, evaluate.py)
│   │   ├── ml_pipelines/        # SageMaker SDK pipeline definitions (notebook/local dev only)
│   │   │   └── training/        # Abalone training pipeline (get_pipeline, run_pipeline)
│   │   ├── notebooks/           # Operational runbook (sm_pipelines_runbook.ipynb)
│   │   ├── tests/               # Unit tests (test_pipeline.py, test_utils.py)
│   │   ├── pyproject.toml       # Python project config
│   │   └── .pre-commit-config.yaml
│   ├── deploy/
│   │   ├── mdaa-config/
│   │   │   ├── endpoint.yaml       # SageMaker endpoint config (static)
│   │   │   ├── monitoring.yaml     # Model monitoring config (static)
│   │   │   ├── mdaa-endpoint.yaml  # MDAA routing for endpoint deployment
│   │   │   └── mdaa-monitoring.yaml # MDAA routing for monitoring deployment
│   │   └── buildspec.yml        # CodeBuild: mdaa deploy (endpoint + monitoring)
│   └── batch_inference/
│       ├── mdaa-config/
│       │   ├── pipeline.yaml    # Batch inference pipeline config (static)
│       │   └── mdaa.yaml        # MDAA deployment descriptor
│       ├── buildspec.yml        # CodeBuild: upload scripts → mdaa deploy → start pipeline
│       ├── source_scripts/      # Batch preprocessing script (preprocessing.py)
│       ├── ml_pipelines/        # Pipeline definition helpers (create_pipeline.py, model_package.py)
│       ├── tests/               # Unit tests (test_pipeline.py, test_model_package.py)
│       └── pyproject.toml       # Python project config
├── docs/
│   └── mlops.png                # Architecture diagram
├── tags.yaml
└── README.md
```

## Prerequisites

1. **AWS Account** with permissions to create SageMaker, CodePipeline, CodeBuild, S3, IAM resources
2. **CDK Bootstrap** in target account:
   ```bash
   cdk bootstrap aws://<account>/<region>
   ```

## Quick Start

1. Set `organization` in `mdaa.yaml` to a unique name
2. Configure `context` values (project name, VPC, subnets, security groups)
3. Download the sample Abalone training dataset into the `data/` directory:
   ```bash
   curl -o data/abalone-dataset.csv \
     https://archive.ics.uci.edu/ml/machine-learning-databases/abalone/abalone.data
   ```
4. Deploy (uploads the dataset to S3 automatically):
   ```bash
   mdaa -c ./mdaa.yaml -a deploy -d mlops
   ```
5. The training CodePipeline triggers CodeBuild, which runs `mdaa deploy` to create the SageMaker Pipeline and then starts a pipeline execution automatically
6. Model is auto-approved and EventBridge triggers the deploy pipeline automatically
7. After first endpoint is deployed, the monitoring schedule starts automatically (configured in `seed_code/deploy/mdaa-config/monitoring.yaml`)

## Batch Inference

Batch inference lives in `seed_code/batch_inference/` and is deployed independently from the unified training + deploy module. It uses `@aws-mdaa/sagemaker-pipeline` to create a SageMaker Pipeline with preprocessing + batch transform steps. To use batch inference, you need a separate CI/CD mechanism (e.g., a standalone CodePipeline or manual trigger) that runs the batch inference `buildspec.yml`.

## Updating Seed Code After Initial Deployment

Seed code (`seed_code/training/`, `seed_code/deploy/`, `seed_code/batch_inference/`) is pushed to CodeCommit only during the initial `mdaa deploy` when the repositories are first created. Subsequent deploys do not update the CodeCommit repos — CloudFormation skips initial code on existing repositories.

If you modify any seed code file (e.g., `buildspec.yml`, MDAA configs, ML scripts), you must push the changes to CodeCommit manually:

```bash
# Example: update the training buildspec
aws codecommit put-file \
  --repository-name "<training-repo-name>" \
  --branch-name main \
  --file-path "buildspec.yml" \
  --file-content fileb://seed_code/training/buildspec.yml \
  --parent-commit-id "$(aws codecommit get-branch --repository-name <training-repo-name> --branch-name main --query 'branch.commitId' --output text)" \
  --commit-message "update buildspec"
```

## Environment Variables

The L3 constructs pass these environment variables to CodeBuild, which are resolved by MDAA's `{{env_var:...}}` syntax in the static YAML configs. The lists below show the key variables; CodeArtifact variables (`MDAA_CODEARTIFACT_DOMAIN`, `MDAA_CODEARTIFACT_REPO`, `MDAA_CODEARTIFACT_REGION`) and `MDAA_VERSION` are also set when the corresponding optional features are configured.

### Training
`SAGEMAKER_PROJECT_NAME`, `MODEL_PACKAGE_GROUP_NAME`, `SAGEMAKER_PIPELINE_NAME`, `SAGEMAKER_PIPELINE_ROLE_ARN`, `ARTIFACT_BUCKET`, `ARTIFACT_BUCKET_KMS_ID`, `AWS_REGION`, `ENABLE_NETWORK_ISOLATION`, `ENCRYPT_INTER_CONTAINER_TRAFFIC`, `SUBNET_IDS`, `SECURITY_GROUP_IDS`, `MDAA_ORG`, `PIPELINE_BUCKET_NAME`

### Deploy
`MODEL_PACKAGE_GROUP_NAME`, `MODEL_BUCKET_NAME`, `MODEL_BUCKET_ARN`, `PROJECT_NAME`, `DEPLOY_STAGE`, `DEV_ACCOUNT_ID`, `DEV_REGION`, `ENABLE_NETWORK_ISOLATION`, `ENABLE_DATA_CAPTURE`, `SAGEMAKER_EXECUTION_ROLE_ARN`, `DEV_VPC_ID`, `DEV_SUBNET_IDS`, `DEV_SECURITY_GROUP_IDS`, `MDAA_ORG`

Cross-account stages add: `PRE_PROD_ACCOUNT_ID`, `PRE_PROD_REGION`, `PRE_PROD_VPC_ID`, `PRE_PROD_SUBNET_IDS`, `PRE_PROD_SECURITY_GROUP_IDS`, `PROD_ACCOUNT_ID`, `PROD_REGION`, `PROD_VPC_ID`, `PROD_SUBNET_IDS`, `PROD_SECURITY_GROUP_IDS`

### Batch Inference
`SAGEMAKER_PROJECT_NAME`, `MODEL_PACKAGE_GROUP_NAME`, `ARTIFACT_BUCKET`, `ARTIFACT_BUCKET_KMS_ID`, `MODEL_BUCKET_NAME`, `BASE_JOB_PREFIX`, `INSTANCE_TYPE`, `INSTANCE_COUNT`, `INPUT_DATA_S3_URI`, `OUTPUT_DATA_S3_PREFIX`, `ENABLE_NETWORK_ISOLATION`, `SUBNET_IDS`, `SECURITY_GROUP_IDS`, `MDAA_ORG`, `TRAINING_PIPELINE_BUCKET`
