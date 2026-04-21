# @aws-mdaa/sagemaker-ground-truth-l3-construct

MDAA L3 construct for SageMaker Ground Truth labeling workflows.

## Architecture

Creates a fully automated, continuous labeling pipeline:

- **Upload S3 bucket** — data landing zone with EventBridge notifications
- **SQS queue + DLQ** — tracks uploaded data objects pending labeling
- **Output S3 bucket** — stores Ground Truth labeling job results
- **Feature Store bucket + Feature Group** — persists labeled data for ML consumption
- **Step Functions state machine** — orchestrates the labeling pipeline:
  1. Poll SQS for new data objects
  2. Create Ground Truth labeling job
  3. Wait for labeling completion
  4. (Optional) Create verification job
  5. Update Feature Store with results
  6. Return rejected/unlabeled messages to queue
- **Lambda functions** — 5-6 functions powering the state machine steps
- **EventBridge Scheduler** — triggers the workflow on a configurable schedule
- **KMS encryption** — all resources encrypted with customer-managed keys

### Why EventBridge + SQS + Step Functions?

A SageMaker Ground Truth labeling job takes a static manifest file as input — it is a one-shot batch operation, not a continuously running service. There is no way to connect a labeling job directly to an S3 bucket and have it automatically pick up new files.

This architecture solves that limitation:

- **Continuous ingestion** — S3 EventBridge notifications detect new uploads automatically. SQS buffers them, decoupling upload rate from labeling capacity.
- **Batching** — The state machine runs on a configurable schedule, polls SQS, and batches all pending items into a single labeling job. This is more cost-efficient than creating one job per file.
- **Quality loop** — When verification is enabled, failed items are returned to the SQS queue for relabeling. This retry/re-queue pattern is not possible with a single direct labeling job.
- **Feature Store integration** — Labeled results are automatically written to a SageMaker Feature Group, making them immediately available for downstream model training pipelines.
- **Observability** — A dead-letter queue with CloudWatch alarms catches items that repeatedly fail labeling or verification, enabling operational monitoring.

### How it works

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

### State machine outcomes

| Outcome | Meaning |
|---------|---------|
| **SUCCEEDED** (no labeling job) | Queue was empty — nothing to process. |
| **SUCCEEDED** (with labeling job) | Labeling job completed, items were labeled, results written to Feature Store. |
| **FAILED** (TotalLabeled = 0) | Labeling job completed but no worker labeled any items within the task availability window (default: 6 hours). Messages are returned to SQS for retry on the next scheduled run. |
| **FAILED** (labeling job error) | SageMaker labeling job failed (e.g. permission issue, invalid config). Messages are returned to SQS for retry. |

> **Note:** A `FAILED` execution does not mean data is lost. The error handling path returns all unprocessed messages to the SQS queue so they are picked up on the next scheduled run. Items that repeatedly fail will eventually move to the dead-letter queue.

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

## Prerequisites

The following resources must be created **before** deploying this construct.

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

> **Note:** Only private workteams are supported. Public workteam pricing (`LABELING_TASK_PRICE` / `VERIFICATION_TASK_PRICE`) is not currently exposed.

## Usage

```typescript
import { SageMakerGroundTruthL3Construct } from '@aws-mdaa/sagemaker-ground-truth-l3-construct';

new SageMakerGroundTruthL3Construct(stack, 'GroundTruth', {
  naming: props.naming,
  roleHelper: props.roleHelper,
  jobName: 'image-labeling',
  taskType: 'image_bounding_box',
  labelingTaskConfig: {
    taskTitle: 'Label bounding boxes',
    taskDescription: 'Draw bounding boxes around objects',
    taskKeywords: ['image', 'bounding box'],
    workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/my-team',
    categoriesS3Uri: 's3://my-bucket/categories.json',
  },
  // Optional: add verification step
  verification: {
    workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/verify-team',
    taskTitle: 'Verify labels',
    taskDescription: 'Verify the bounding box labels are correct',
  },
  // Optional: custom schedule (default: daily at noon UTC)
  workflowSchedule: 'cron(0 12 * * ? *)',
});
```

## SSM Outputs

The construct publishes the following SSM parameters:

- `upload-bucket-name` — S3 bucket for uploading data objects
- `output-bucket-name` — S3 bucket for labeling job results
- `feature-group-name` — SageMaker Feature Group name
- `state-machine-arn` — Step Functions state machine ARN
- `upload-queue-url` — SQS queue URL for data notifications
