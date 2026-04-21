# SageMaker Ground Truth

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/sagemaker-ground-truth-app/index.html).

Deploys a fully automated, continuous data labeling pipeline using SageMaker Ground Truth. Data uploaded to S3 is automatically detected, batched, and sent to human labelers via Ground Truth labeling jobs. Labeled results are persisted to a SageMaker Feature Group for downstream ML training pipelines. Use this module when you need continuous, hands-off data labeling with quality verification and Feature Store integration.

---

## Deployed Resources

This module deploys and integrates the following resources:

**Upload S3 Bucket** — Data landing zone with EventBridge notifications enabled. Upload data objects (images, text) here to trigger the labeling pipeline. Deployed using the [MdaaBucket](../../../constructs/L1/mdaa-l1-bucket/README.md) construct.

**Output S3 Bucket** — Stores Ground Truth labeling job output manifests and annotations. Deployed using the [MdaaBucket](../../../constructs/L1/mdaa-l1-bucket/README.md) construct.

**SQS Queue + Dead Letter Queue** — Tracks uploaded data objects pending labeling. S3 EventBridge notifications route to this queue. Items that repeatedly fail labeling are moved to the DLQ with CloudWatch alarms.

**Feature Store Bucket + SageMaker Feature Group** — Persists labeled data in SageMaker Feature Store for consumption by ML training pipelines. The Feature Group stores label metadata (source reference, label, confidence, job name, timestamp).

**Step Functions State Machine** — Orchestrates the end-to-end labeling pipeline:
1. Poll SQS for new data objects
2. Build manifest and create Ground Truth labeling job
3. Wait for labeling completion
4. (Optional) Create verification job for quality review
5. Write labeled results to Feature Store
6. Return rejected/unlabeled messages to queue for retry

**Lambda Functions** — 5-6 functions powering the state machine steps (poll SQS, run labeling job, run verification job, update Feature Store, return messages to queue).

**EventBridge Scheduler** — Triggers the state machine on a configurable schedule (default: daily at noon UTC).

**KMS Encryption** — All resources (S3 buckets, SQS queues, Feature Store, Lambda environment variables) encrypted with customer-managed KMS keys via [MdaaKmsKey](../../../constructs/L1/mdaa-l1-kms/README.md).

---

## Architecture

### Why EventBridge + SQS + Step Functions?

A SageMaker Ground Truth labeling job takes a **static manifest file** as input — it is a one-shot batch operation, not a continuously running service. There is no way to "connect" a labeling job directly to an S3 bucket and have it automatically pick up new files.

This architecture solves that limitation:

- **Continuous ingestion** — S3 EventBridge notifications detect new uploads automatically. SQS buffers them, decoupling upload rate from labeling capacity.
- **Batching** — The Step Function runs on a configurable schedule, polls SQS, and batches all pending items into a single labeling job. This is more cost-efficient than creating one job per file.
- **Quality loop** — When verification is enabled, failed items are returned to the SQS queue for relabeling. This retry/re-queue pattern is not possible with a single direct labeling job.
- **Feature Store integration** — Labeled results are automatically written to a SageMaker Feature Group, making them immediately available for downstream model training pipelines.
- **Observability** — A dead-letter queue with CloudWatch alarms catches items that repeatedly fail labeling or verification, enabling operational monitoring.

In short: a single labeling job is batch and stateless. This architecture makes it **continuous, self-healing, and integrated into the ML pipeline**.

### How It Works

```
S3 Upload → EventBridge → SQS Queue
                              ↓
              EventBridge Scheduler (e.g. every 5 min)
                              ↓
                     Step Functions State Machine
                       ├── Poll SQS
                       ├── Build manifest
                       ├── CreateLabelingJob → Human workers label data
                       ├── (Optional) CreateVerificationJob → Workers verify labels
                       ├── Write results to Feature Store
                       └── Delete processed SQS messages
```

Data can be uploaded at any time. The scheduler periodically checks for pending items and processes them in batches. If the queue is empty, the state machine exits cleanly with no cost.

### State Machine Outcomes

| Outcome | Meaning |
|---------|---------|
| **SUCCEEDED** (no labeling job) | Queue was empty — nothing to process. |
| **SUCCEEDED** (with labeling job) | Labeling job completed, results written to Feature Store. |
| **FAILED** (TotalLabeled = 0) | Workers did not label items within the task availability window. Messages returned to SQS for retry. |
| **FAILED** (labeling job error) | SageMaker labeling job failed (e.g. permission issue). Messages returned to SQS for retry. |

> **Note:** A `FAILED` execution does not mean data is lost. The error handling path returns all unprocessed messages to the SQS queue so they are picked up on the next scheduled run. Items that repeatedly fail will eventually move to the dead-letter queue.

---

## Related Modules

- [SageMaker Model Training](../sagemaker-model-training-app/README.md) — CI/CD pipeline for model training, consumes labeled data from Feature Store
- [SageMaker Model Deploy](../sagemaker-model-deploy-app/README.md) — Deploy trained models as real-time endpoints
- [Data Science Team](../data-science-team-app/README.md) — Provision Studio domains and team environments for data scientists managing labeling workflows

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK Nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - All S3 buckets (upload, output, Feature Store) encrypted with customer-managed KMS keys
  - SQS queues and dead-letter queues encrypted with KMS
  - Lambda environment variables encrypted with KMS
  - Feature Group encrypted with KMS (offline store)
- **Encryption in Transit**:
  - S3 bucket policies enforce `aws:SecureTransport`
  - SQS queue policies enforce TLS
- **Least Privilege**:
  - Separate IAM roles for state machine, Lambda functions, SageMaker labeling, and Feature Store access
  - Lambda functions have only the permissions needed for their specific step
  - SageMaker labeling role scoped to upload/output buckets and specific task types
  - Feature Store role has `PutRecord` only on the specific Feature Group
- **Network Isolation**:
  - Lambda functions can optionally run in VPC (configured via L3 construct)
  - S3 bucket policies restrict access to specific IAM roles
- **Observability**:
  - CloudWatch alarms on dead-letter queue depth
  - Step Functions execution history for audit trail
  - Lambda CloudWatch log groups with configurable retention

---

## Prerequisites

The following resources must be created **before** deploying this module:

### Labeling (required)

| Resource | Config Field | How to Create |
|----------|-------------|---------------|
| **SageMaker Workteam** | `labelingTaskConfig.workteamArn` | Create via [SageMaker Ground Truth console](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-workforce-management.html) or `aws sagemaker create-workteam`. Private workteams require a Cognito user pool. |
| **Label Categories File** | `labelingTaskConfig.categoriesS3Uri` | Upload a JSON file to S3 with label categories. See [categories file format](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-label-cat.html). |
| **Labeling UI Template** | `labelingTaskConfig.templateS3Uri` | Upload a Liquid HTML template to S3. **Required** for `image_bounding_box` and `image_semantic_segmentation` (SageMaker does not support built-in `HumanTaskUiArn` for these task types). Optional for classification and NER tasks which use AWS-managed templates. See [custom templates](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-custom-templates.html). |

### Verification (optional — only if `verification` block is configured)

| Resource | Config Field | How to Create |
|----------|-------------|---------------|
| **Verification Workteam** | `verification.workteamArn` | Same as labeling workteam. Can be the same or a different team. |
| **Verification UI Template** | `verification.templateS3Uri` | Optional. Custom template for verification UI. |
| **Verification Categories File** | `verification.categoriesS3Uri` | Optional. The first label should be the "pass" label; other labels indicate validation failures. |

---

## Supported Task Types

| Task Type | Media |
|-----------|-------|
| `image_bounding_box` | Image |
| `image_semantic_segmentation` | Image |
| `image_single_label_classification` | Image |
| `image_multi_label_classification` | Image |
| `text_single_label_classification` | Text |
| `text_multi_label_classification` | Text |
| `named_entity_recognition` | Text |

---

## Configuration

### Sample Configurations

- [Comprehensive Configuration](sample_configs/sample-config-comprehensive.yaml) — All options with inline documentation

### Key Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `jobName` | Yes | Unique name for the labeling workflow |
| `taskType` | Yes | One of the supported task types above |
| `labelingTaskConfig.workteamArn` | Yes | ARN of the SageMaker private workteam |
| `labelingTaskConfig.categoriesS3Uri` | Yes | S3 URI of the label categories JSON file |
| `labelingTaskConfig.taskTitle` | Yes | Title shown to labelers in the UI |
| `labelingTaskConfig.taskDescription` | Yes | Description shown to labelers |
| `verification` | No | Enable verification step with a second workteam |
| `workflowSchedule` | No | EventBridge cron expression (default: `cron(0 12 * * ? *)`) |
| `featureGroupName` | No | Custom Feature Group name (default: auto-generated) |

---

## SSM Outputs

| Parameter | Description |
|-----------|-------------|
| `upload-bucket-name` | S3 bucket for uploading data objects |
| `output-bucket-name` | S3 bucket for labeling job results |
| `feature-group-name` | SageMaker Feature Group name |
| `state-machine-arn` | Step Functions state machine ARN |
| `upload-queue-url` | SQS queue URL for data notifications |
