# Construct Overview

Provides two constructs for deploying SageMaker models to real-time inference endpoints. The SageMakerModelDeployL3Construct creates a CodeBuild-based CDK deploy pipeline that automatically triggers on ModelPackage approval events, with optional manual approval and cross-account deployment support. The SageMakerEndpointL3Construct deploys a SageMaker endpoint directly via CDK with KMS encryption and optional data capture configuration.

***

## Deployed Resources

<!-- Architecture diagram not yet available -->

### SageMakerModelDeployL3Construct

* **CodeCommit Repository** - Source repository seeded with CDK deployment code for provisioning SageMaker endpoints across target accounts.

* **CodeBuild Project** - Executes `cdk deploy` from the seed code to provision or update SageMaker endpoint infrastructure in target accounts.

* **S3 Artifacts Bucket** - KMS-encrypted bucket for storing deployment artifacts and CodeBuild outputs.

* **EventBridge Rule** - Triggers the deployment pipeline when a SageMaker ModelPackage status changes to Approved.

* **SNS Topic** (Optional) - Enables manual approval gates in the deployment pipeline before promoting to production environments.

* **Cross-Account Deployment Stacks** (Optional) - Pre-production and production CloudFormation stacks deployed to separate AWS accounts for staged rollout.

* **Lambda Deploy Trigger** - Custom Resource Lambda function that initiates the initial deployment pipeline execution.

* **KMS Key and Alias** - Customer-managed encryption key for the artifacts bucket and deployment resources.

* **IAM Roles** - CodeBuild service role and pipeline execution role with permissions for CDK deployments, SageMaker, S3, and cross-account assume-role operations.

* **SSM Parameters** - Published references for the repository name, build project name, bucket name, and KMS key ID.

### SageMakerEndpointL3Construct

* **CfnModel** - SageMaker Model resource referencing the model artifact and container image for inference.

* **CfnEndpointConfig** - Endpoint configuration defining instance type, count, and KMS encryption settings for the inference endpoint.

* **CfnEndpoint** - Real-time SageMaker inference endpoint serving predictions from the deployed model.

* **KMS Key** - Customer-managed encryption key for endpoint data encryption at rest.

* **IAM Execution Role** - SageMaker execution role with permissions to access model artifacts in S3, pull container images from ECR, and write to CloudWatch.

* **Data Capture Configuration** (Optional) - Configures the endpoint to capture inference request and response payloads to S3 for monitoring and auditing.

* **SSM Parameters** - Published references for the endpoint name, endpoint ARN, model name, and KMS key ID.
