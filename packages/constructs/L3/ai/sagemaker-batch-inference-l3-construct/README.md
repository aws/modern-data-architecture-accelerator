# Construct Overview

Deploys a CI/CD pipeline for running SageMaker Batch Transform inference jobs. Seed code is pushed to a CodeCommit repository and executed through a CodePipeline with a CodeBuild build stage, enabling repeatable, automated batch inference workflows. All artifacts are stored in a KMS-encrypted S3 bucket, and resource references are published to SSM Parameter Store for cross-module integration.

***

## Deployed Resources

<!-- Architecture diagram not yet available -->

* **CodeCommit Repository** - Source repository seeded with batch transform pipeline code via Code.fromZipFile. Serves as the pipeline trigger on code changes.

* **CodePipeline** - Orchestrates the batch inference workflow with a source stage pulling from CodeCommit and a build stage executing via CodeBuild.

* **CodeBuild Project** - Executes the batch transform pipeline from the seed code, running SageMaker Batch Transform jobs against input data.

* **S3 Pipeline Bucket** - KMS-encrypted bucket for storing pipeline artifacts, build outputs, and batch transform results.

* **KMS Key and Alias** - Customer-managed encryption key used to encrypt the S3 pipeline bucket and associated resources.

* **IAM Roles** - Pipeline execution role and CodeBuild service role with permissions scoped to SageMaker, S3, ECR, and CloudWatch operations required for batch inference.

* **SSM Parameters** - Published references for the repository name, pipeline name, bucket name, and KMS key ID, enabling other modules to integrate with this construct.
