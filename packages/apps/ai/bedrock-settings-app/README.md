# Bedrock Settings

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/bedrock-settings-app/index.html).

Configures Amazon Bedrock model invocation audit logging to S3 and/or CloudWatch, providing monitoring and compliance capabilities for Bedrock model usage, and optional alarms on model token use. Use this module when you need to track and audit all Bedrock model invocations for compliance, cost monitoring, or operational visibility.

---

## Deployed Resources

This module deploys and integrates the following resources:

- **KMS Encryption Key**: Custom KMS key for encrypting Bedrock audit logs
- **S3 Bucket**: S3 bucket for storing Bedrock model invocation audit logs, and for the CloudWatch destination's large-data overflow, with optional expiration (`s3RetentionDays`)
- **CloudWatch Log Group** (Optional): CloudWatch Log Group for real-time monitoring of Bedrock model invocations, with optional retention (`logRetentionDays`)
- **CloudWatch Data Protection Policy** (with the log group): PII masking policy always applied to the invocation log group on ingestion. Extendable via `logDataProtection.additionalIdentifiers`.
- **IAM Service Role**: Dedicated service role for Bedrock logging operations
- **IAM Managed Policy**: Custom policy granting permissions for Bedrock to write audit logs to the configured destinations
- **Custom Resource Lambda**: Lambda function that configures Bedrock's account-wide model invocation logging settings through AWS APIs (see [Account-Wide Logging Configuration](#account-wide-logging-configuration))
- **Custom Resource Handler Role**: Execution role for the custom resource Lambda, allowed to put, get and delete the invocation logging configuration
- **Bucket Policy**: Resource-based policy allowing Bedrock service to write audit logs to the S3 bucket, and denying reads of them to every principal except `readRoles`. See [Who Can Read Invocation Logs in S3](#who-can-read-invocation-logs-in-s3)
- **KMS Key Policy**: Key policy allowing Bedrock, CloudWatch Logs, and S3 services to use the encryption key, and `readRoles` to decrypt with it
- **Token Usage Alarms** (Optional): CloudWatch alarms on model input and output token counts, per model and/or account-wide, with SSM parameters for each alarm's name and ARN. See [Token usage alarms](#token-usage-alarms)
- **SNS Topic** (Optional): Topic the token usage alarms notify, when the module is asked to create one, with optional email subscriptions, its topic policy, and SSM parameters for its name and ARN

![bedrock-settings](../../../constructs/L3/ai/bedrock-settings-l3-construct/docs/bedrock-settings.png)

---

## Related Modules

- [Bedrock Builder](../bedrock-builder-app/README.md) — Deploy AgentCore Harnesses, Knowledge Bases, and Guardrails whose invocations will be captured by the audit logging configured here
- [Bedrock AgentCore Runtime](../bedrock-agentcore-runtime-app/README.md) — Deploy custom agent runtimes whose Bedrock model invocations will be captured by audit logging
- [GAIA v2](../gaia-v2-app/README.md) — Deploy a GenAI application backend whose Bedrock model invocations will be captured by audit logging

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - All audit logs encrypted using a customer-managed KMS key
  - KMS key policy restricts access to the account root, Bedrock service, and logging services, plus, with a module-created alarm topic, the CloudWatch alarm service for this module's token alarms, and `readRoles`, which may decrypt only through S3
- **Encryption in Transit**:
  - All log delivery uses TLS-encrypted connections
- **Least Privilege**:
  - Dedicated IAM service role scoped to logging destinations only
  - S3 bucket policy uses condition-based access controls with source account and ARN restrictions
  - S3 bucket policy denies reads of the invocation logs to every principal, account administrators included, except the roles in `readRoles`
  - Cross-service access uses proper service principals and condition keys
- **Logging & Audit**:
  - Supports real-time monitoring via CloudWatch for Bedrock model invocation audit logs
  - Supports long-term storage via S3 for Bedrock model invocation audit logs
  - CloudWatch Data Protection always masks a built-in set of PII identifiers in the invocation log group on ingestion (extendable via `logDataProtection.additionalIdentifiers`)
  - Optional CloudWatch (`logRetentionDays`) and S3 (`s3RetentionDays`) retention; logs never expire by default
- **Monitoring**:
  - Optional token usage alarms notify an existing SNS topic, or a module-created topic encrypted with the module KMS key
  - CloudWatch's publish grant on a module-created topic, and its use of the KMS key, are limited to this module's token alarms

### Account-Wide Logging Configuration

Bedrock has a single model invocation logging configuration per account and Region, covering every Bedrock caller in it, not only the workloads MDAA deploys:

- **Deploying** this module overwrites any invocation logging configuration already in place, such as one set by a central team.
- **Deleting** the stack deletes the configuration, which switches invocation logging off for the whole account and Region. GuardDuty reports this as `DefenseEvasion:IAMUser/BedrockLoggingDisabled`.

Deploy the module once per account and Region. To stop anyone else changing or deleting the configuration, protect the two APIs with an SCP that exempts this module's custom-resource handler role, which calls them on deploy and on stack deletion:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectBedrockInvocationLogging",
      "Effect": "Deny",
      "Action": [
        "bedrock:PutModelInvocationLoggingConfiguration",
        "bedrock:DeleteModelInvocationLoggingConfiguration"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:role/<handler role name>"
        }
      }
    }
  ]
}
```

The handler role is named `<org>-<env>-<domain>-<module>-logs-model-invocation-handler`, shortened with a hash suffix when it would be 64 characters or more. Take the exact name from the synthesized template (the `AWS::IAM::Role` whose logical ID starts with `customlogsmodelinvocationhandlerrole`).

### Masking and Retention

- **Masking is always applied** to the CloudWatch invocation log group, which holds the full text of every prompt and completion. Masked values appear in CloudWatch Logs Insights, metric filters and subscription filters; principals with `logs:Unmask` (including the `CloudWatchLogsFullAccess` managed policy) can still view them in clear text, which is the break-glass route for incident response.
- **Masking is not retroactive.** Events ingested before the policy was applied stay unmasked until they expire.
- **The S3 copies are not masked.** CloudWatch data protection does not reach S3, so the S3 destination and the large-data overflow (bodies over 100 KB and binary data) keep prompts in clear text. Only `readRoles` can read them; see [Who Can Read Invocation Logs in S3](#who-can-read-invocation-logs-in-s3).
- **Retention defaults to never-expire** for both destinations, so upgrading never deletes existing invocation logs, and how long to keep prompts, which often contain personal data, stays your decision. Set `logRetentionDays` and `s3RetentionDays` to bound it. `s3RetentionDays` applies to the whole bucket, including the overflow, so a value shorter than `logRetentionDays` removes overflow bodies before the CloudWatch events that point to them.
- **`s3RetentionDays` also limits version recovery.** The bucket is versioned, and setting `s3RetentionDays` expires every noncurrent object version 1 day after it becomes noncurrent, including versions already in the bucket. An overwritten or deleted object can then be recovered for 1 day only.
- **On accounts governed by Landing Zone Accelerator**, LZA sets its account-wide `cloudwatchLogRetentionInDays` on new log groups about 10 minutes after they are created, replacing `logRetentionDays`. The effective CloudWatch retention there is LZA's.

### Who Can Read Invocation Logs in S3

Listing a role in `readRoles` is the S3 counterpart of granting it `logs:Unmask`. CloudWatch shows everyone masked values and only `logs:Unmask` holders the clear text; S3 has no masked view, so the module limits who can read the objects at all.

The bucket holds prompts and completions in two places:

- **The S3 destination** (`bedrock-model-invocation-logs/bedrock-model-invocation`), written when `enableAuditLoggingToS3` is `true`.
- **The CloudWatch destination's large-data overflow** (`bedrock-model-invocation-logs/bedrock-model-invocation/cloudwatch-logs-large-data-delivery/`), where Bedrock writes binary data and request or response bodies over 100 KB. The bucket receives it whenever `enableAuditLoggingToCloudwatch` is `true`, including when `enableAuditLoggingToS3` is `false`. Agents resend the whole conversation on every model call, so for a long agent session most of the conversation ends up here.

The bucket policy denies `s3:GetObject*` on the bucket's objects to every principal except the roles in `readRoles`, account administrators included. The listed roles are granted `s3:GetObject*` on the objects and `kms:Decrypt` on the module KMS key through S3 only. A cross-account role also gets `s3:ListBucket` and `s3:GetBucketLocation` on the bucket, and `kms:DescribeKey` on the key, again through S3 only.

```yaml
readRoles:
  - name: incident-responder
  - arn: 'arn:{{partition}}:iam::{{context:account-2}}:role/log-analytics'
```

- **Default** - with no `readRoles`, no principal can read the objects. Bedrock still writes them.
- **Who to list** - only the roles that need full prompts, such as incident responders.
- **The readers' own permissions** - a same-account role needs nothing of its own to read an object whose key it knows, but needs `s3:ListBucket` in its own IAM policy to list the bucket. A cross-account role needs an identity policy in its own account allowing `s3:GetObject`, `s3:ListBucket` and `s3:GetBucketLocation` on this bucket and `kms:Decrypt` on this key, because access across accounts must be granted on both sides.
- **AWS services that read objects** - a service that reads through an IAM role, such as Amazon Macie sensitive data discovery, AWS Backup for S3 or GuardDuty Malware Protection for S3, is denied too. List the role it uses to let it in.
- **The bucket policy itself** - a principal allowed `s3:PutBucketPolicy` or `s3:DeleteBucketPolicy` on the bucket can remove the restriction. Where this matters, deny both actions with an SCP that exempts the CloudFormation execution role deploying this module, which needs `s3:PutBucketPolicy` to apply changes such as a new read role.
- **Upgrading** - principals that read the bucket before this restriction lose access until they are listed in `readRoles`.

---

## Token usage alarms

`tokenUsageAlarms` alarms when Bedrock model token use in a period exceeds a threshold:

```yaml
tokenUsageAlarms:
  notificationTopicArn: 'arn:{{partition}}:sns:{{region}}:{{account}}:ai-platform-alerts'
  models:
    nova-micro:
      modelIds: ['amazon.nova-micro-v1:0', 'us.amazon.nova-micro-v1:0']
      inputTokenThreshold: 5000000
      outputTokenThreshold: 1000000
  accountTotal:
    inputTokenThreshold: 50000000
  periodSeconds: 3600 # optional
```

- **Account-wide** - Bedrock publishes `InputTokenCount` and `OutputTokenCount` in the `AWS/Bedrock` namespace for the whole account, not per agent or application. Every alarm counts every caller of the model IDs it covers in this account and Region, whether or not MDAA deployed them.
- **Model IDs are matched exactly** - the `ModelId` dimension is the model or inference-profile ID exactly as the caller passed it, so `amazon.nova-micro-v1:0`, `us.amazon.nova-micro-v1:0`, and a `global.` profile for the same model are separate series. A `models` entry sums the IDs it lists, up to 10. Calls made through an ID it doesn't list, such as another inference profile for the same model, are not counted.
- **Account total** - `accountTotal` alarms on the series Bedrock publishes without a dimension, the total across all model IDs.
- **Not counted** - inference through the OpenAI-compatible `bedrock-mantle` endpoint publishes to a separate `AWS/BedrockMantle` namespace, so these alarms don't count it. Prompt-cache reads and writes are published as separate metrics, `CacheReadInputTokenCount` and `CacheWriteInputTokenCount`, which these alarms don't watch.
- **Timing** - `periodSeconds` is a whole number of minutes, because Bedrock publishes token metrics at one-minute resolution. `periodSeconds` x `evaluationPeriods` can be at most 1 day for a period under an hour, and at most 7 days otherwise.
- **Notification** - an existing topic (`notificationTopicArn`), or a topic the module creates, encrypted with the module KMS key (`createNotificationTopic`, with `notificationEmails` to subscribe addresses).

See the [AWS runtime metrics documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html) for the metrics and their dimensions.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
bedrock-settings: # Module Name can be customized
  module_path: '@aws-mdaa/bedrock-settings' # Must match module NPM package name
  module_configs:
    - ./bedrock-settings.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./bedrock-settings.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Enables audit logging to both CloudWatch and S3 with default settings. Start here when you need basic Bedrock invocation auditing with sensible defaults and plan to tune retention or destinations later.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-settings-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Configures audit logging for Bedrock model invocations to both S3 (long-term retention) and CloudWatch (real-time monitoring), with additional PII identifiers masked, retention set for both destinations, reads of the S3 copies limited to named roles, and alarms on token use per model and account-wide. Use this as a reference when you need control over masking, log retention, read access, encryption, dual-destination audit configuration, and token usage alerting.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-settings-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Token Usage Alarms with an Existing Notification Topic

Configures CloudWatch audit logging and an account-wide token usage alarm that notifies an existing SNS topic through `tokenUsageAlarms.notificationTopicArn`, instead of a topic the module creates. Use this when you already manage a central operations or cost topic. It has its own sample because `notificationTopicArn` and `createNotificationTopic` (used in the comprehensive configuration) are mutually exclusive. See [Token usage alarms](#token-usage-alarms).

[sample-config-token-alarms-existing-topic.yaml](sample_configs/sample-config-token-alarms-existing-topic.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-settings-app/sample_configs/sample-config-token-alarms-existing-topic.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
