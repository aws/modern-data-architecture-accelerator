# Construct Overview

The Bedrock Settings CDK L3 construct is used to configure and deploy Amazon Bedrock model invocation logging settings to S3 and/or CloudWatch.
***

## Deployed Resources

* **Bedrock Model Invocation Logging Configuration**: Configures Amazon Bedrock to log model invocations to specified destinations
* **S3 Bucket**: (Optional) Encrypted S3 bucket for storing Bedrock model invocation audit logs
* **CloudWatch Log Group**: (Optional) Encrypted CloudWatch Log Group for storing Bedrock model invocation audit logs  
* **KMS Key**: Encrypts Bedrock logging resources (S3 bucket and CloudWatch logs)
* **IAM Service Role**: Allows Bedrock service to write logs to CloudWatch and S3
* **Custom Resource**: Lambda-based custom resource that configures Bedrock logging settings via API calls
* **Token Usage Alarms**: (Optional) CloudWatch alarms on Bedrock `InputTokenCount` and `OutputTokenCount`, per model (summed across the model IDs listed) and/or account-wide
* **SNS Topic**: (Optional) Alarm notification topic encrypted with the module KMS key, with email subscriptions, a topic policy and key grant letting this module's token alarms publish, and SSM parameters for its name and ARN

## Configuration Options

* **enableAuditLoggingToS3**: Enable S3 bucket creation and logging for model invocation audit logs
* **enableAuditLoggingToCloudwatch**: Enable CloudWatch Log Group creation and logging for model invocation audit logs

At least one of these options must be enabled.

* **tokenUsageAlarms**: (Optional) Alarms on model token use in the account: `models` (per model, up to 10 model IDs each) and/or `accountTotal`, each with `inputTokenThreshold` and/or `outputTokenThreshold`; a notification target (`notificationTopicArn`, or `createNotificationTopic` with `notificationEmails`); and `periodSeconds` (a multiple of 60), `evaluationPeriods`, and `datapointsToAlarm`. Token metrics count every caller in the account and Region.

## Logging Capabilities

The construct enables comprehensive logging of Bedrock model invocations including:
- Text data delivery
- Image data delivery  
- Embedding data delivery
- Video data delivery

## S3 Configuration

When S3 logging is enabled:
- Creates encrypted S3 bucket with naming pattern: `bedrock-logs-{account}-{region}`
- Logs stored with prefix: `bedrock-model-invocation-logs/bedrock-model-invocation-{region}`
- Bucket policy allows Bedrock service to write objects

## CloudWatch Configuration  

When CloudWatch logging is enabled:
- Creates encrypted CloudWatch Log Group: `bedrock-model-invocation-{region}`
- Infinite retention period for audit compliance
- Large data delivery fallback to S3 for oversized log entries
- Service role with permissions to write to CloudWatch Logs

## Security Features

- All resources encrypted with customer-managed KMS key
- Least privilege IAM policies with resource-specific permissions
- Service principals restricted to specific account and region
- CloudWatch's publish grant on a module-created alarm topic, and its use of the KMS key, are limited to this module's token alarms
- Bucket policies with condition-based access controls