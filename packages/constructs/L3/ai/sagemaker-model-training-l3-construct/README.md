# Construct Overview

Provides two constructs for training ML models and registering them in SageMaker Model Registry. The SageMakerModelTrainingL3Construct creates a CodeBuild-based CI/CD pipeline that executes training code from a CodeCommit repository and registers trained models in a Model Package Group for versioning. The SageMakerPipelineL3Construct deploys a native SageMaker Pipeline (CfnPipeline) from a pipeline definition JSON, with its own execution role and model storage. Both constructs support cross-account KMS policies for shared model registry access.

***

## Deployed Resources

<!-- Architecture diagram not yet available -->

### SageMakerModelTrainingL3Construct

* **Model Package Group** - SageMaker Model Registry group for versioning trained model artifacts, enabling approval-based promotion workflows.

* **S3 Model Bucket** - KMS-encrypted bucket for storing training data, model artifacts, and pipeline outputs.

* **CodeCommit Repository** - Source repository seeded with training pipeline code via Code.fromZipFile.

* **CodePipeline** - Orchestrates the training workflow with a source stage from CodeCommit and a build stage via CodeBuild.

* **CodeBuild Project** - Executes the training pipeline code, running SageMaker training jobs and registering model artifacts in the Model Package Group.

* **Cross-Account KMS Policies** - Key policies granting decrypt and describe permissions to external accounts for shared model registry access.

* **KMS Key and Alias** - Customer-managed encryption key for the model bucket and training resources.

* **IAM Roles** - Pipeline execution role and CodeBuild service role with permissions for SageMaker training, S3, ECR, and CloudWatch operations.

* **SSM Parameters** - Published references for the repository name, pipeline name, model package group name, bucket name, and KMS key ID.

### SageMakerPipelineL3Construct

* **CfnPipeline** - Native SageMaker Pipeline resource created from a pipeline definition JSON, defining training and processing steps.

* **Pipeline Execution Role** - IAM role assumed by the SageMaker Pipeline to execute training jobs, processing jobs, and register model artifacts.

* **S3 Model Bucket** - KMS-encrypted bucket for storing pipeline outputs and model artifacts.

* **KMS Key and Alias** - Customer-managed encryption key for the model bucket and pipeline resources.

* **Model Package Group** (Optional) - SageMaker Model Registry group for versioning models produced by the pipeline.

* **Cross-Account KMS Policies** - Key policies granting decrypt and describe permissions to external accounts for shared model registry access.

* **SSM Parameters** - Published references for the pipeline name, pipeline ARN, model bucket name, and KMS key ID.
