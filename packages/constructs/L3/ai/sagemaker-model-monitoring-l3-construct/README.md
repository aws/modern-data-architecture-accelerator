# Construct Overview

Deploys SageMaker Model Monitor resources for continuous monitoring of deployed ML models. Supports four monitor types — data quality, model quality, model bias, and model explainability — each independently configurable with its own monitoring schedule and processing job definition. Monitoring results are written to a KMS-encrypted S3 bucket, and an optional automated baseline processing job can establish statistical baselines for drift detection.

***

## Deployed Resources

<!-- Architecture diagram not yet available -->

* **Monitoring Schedules** - SageMaker MonitoringSchedule resources for each enabled monitor type (data quality, model quality, model bias, model explainability), running on a configurable cron schedule.

* **Processing Job Definitions** - MonitoringJobDefinition resources defining the container image, instance type, and configuration for each enabled monitor type.

* **S3 Output Bucket** - KMS-encrypted bucket for storing monitoring results, constraint violations, and baseline statistics.

* **KMS Key** - Customer-managed encryption key for the output bucket and monitoring job volumes. Accepts an existing key ARN or creates a new key.

* **IAM Monitoring Execution Role** - Execution role with permissions scoped to SageMaker processing, S3 read/write for monitoring outputs, CloudWatch metrics publishing, and ECR image pull.

* **VPC Security Group** (Optional) - Security group attached to monitoring processing jobs for network isolation within a VPC.

* **Baseline Processing Job** (Optional) - Automated processing job that generates statistical baselines from training data, used by monitors to detect data and model drift.

* **SSM Parameters** - Published references for monitoring schedule ARNs, output bucket name, and KMS key ID.
