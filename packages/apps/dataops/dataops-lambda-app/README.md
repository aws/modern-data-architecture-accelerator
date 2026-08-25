# Lambda Functions

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/dataops/dataops-lambda-app/index.html).

Deploys Lambda functions for data operations with VPC binding, EventBridge triggers (S3 notifications and scheduled rules), SQS queues and event source triggers, encrypted DLQ, Lambda layers, and Docker build support for complex dependencies. Common scenarios include running lightweight data transformations, responding to S3 upload events, executing scheduled data processing tasks, buffering variable ingestion load through a queue, or integrating with external APIs as part of a data pipeline.

---

## Deployed Resources

This module deploys and integrates the following resources:

**Lambda Layers** - Lambda layers which can be used in Lambda functions (inside or outside of this config)

**Lambda Functions** - Lambda functions for use in DataOps

- May be optionally VPC bound with configurable VPC, Subnet, and Security Group Parameters
  - Can use an existing security group (from Project, for instance), or create a new security group per function
- DLQ automatically added for each Lambda with configurable retry/retention parameters

**EventBridge Rules** - EventBridge rules for triggering Lambda functions with events such as S3 Object Created Events

- EventBridge Notifications must be enabled on any bucket for which a rule is specified

**SQS Queues** - Standard or FIFO queues for buffering messages and decoupling producers from consumers

- Encrypted with the project KMS key, with non-SSL access denied
- A redrive dead letter queue is created for every queue, so repeatedly-failing messages are set aside instead of blocking the queue
- Queue name, ARN, and URL are published as SSM parameters for cross-module reference
- Consume and send permissions are granted automatically on the queue policy, based on how each function references the queue

**SQS Event Source Mappings** - Bindings which poll a queue and invoke a function with batches of messages

- Configurable batch size, batching window, and maximum concurrency for backpressure
- Optional message-level partial failure reporting and event filtering

![dataops-lambda](../../../constructs/L3/dataops/dataops-lambda-l3-construct/docs/dataops-lambda.png)

---

## Related Modules

- [DataOps Project](../dataops-project-app/README.md) — Deploy the shared project infrastructure (KMS keys, security groups) that Lambda functions reference
- [Step Functions](../dataops-stepfunction-app/README.md) — Orchestrate Lambda functions with Step Functions state machines
- [Dashboard](../dataops-dashboard-app/README.md) — Visualize Lambda function metrics and logs in CloudWatch dashboards
- [EventBridge](../../utility/eventbridge-app/README.md) — Deploy custom event buses that Lambda functions can publish to or be triggered by
- [Data Lake](../../datalake/datalake-app/README.md) — Lambda functions can process data in data lake S3 buckets via EventBridge S3 notifications

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, to assist in meeting organization-specific compliance requirements.

- **Encryption at Rest**:
  - Function environment variables encrypted with project KMS key
  - DLQ messages encrypted with project KMS key
  - Queue messages encrypted with project KMS key
- **Encryption in Transit**:
  - Queue policies deny any request made without TLS
- **Least Privilege**:
  - Execution roles specified per function
  - Configurable reserved concurrency to prevent resource exhaustion
  - Queue consume and send permissions granted through the queue resource policy rather than identity policies attached to the execution role, and only to the functions that reference the queue
- **Network Isolation**:
  - Optional VPC binding with configurable egress rules (CIDR, security group, prefix list)
  - Per-function security groups deny all ingress by default
  - All egress allowed by default (configurable)

---

## AWS Service Endpoints

The following VPC endpoints may be required for VPC-bound Lambda functions if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service         | Endpoint Service Name           | Type      |
| ------------------- | ------------------------------- | --------- |
| Lambda              | `com.amazonaws.{region}.lambda` | Interface |
| KMS                 | `com.amazonaws.{region}.kms`    | Interface |
| S3                  | `com.amazonaws.{region}.s3`     | Gateway   |
| SQS                 | `com.amazonaws.{region}.sqs`    | Interface |
| CloudWatch Logs     | `com.amazonaws.{region}.logs`   | Interface |
| STS                 | `com.amazonaws.{region}.sts`    | Interface |
| SSM Parameter Store | `com.amazonaws.{region}.ssm`    | Interface |
| EventBridge         | `com.amazonaws.{region}.events` | Interface |

Additional VPC endpoints may be required depending on the AWS services accessed by your custom Lambda function code.

---

## SQS Queues and Event Sources

Queues are declared once under the module's `queues:` section and referenced by key from the functions that use them. A consumer binds to a queue through `sqsEventSources`, keyed by queue name; a producer receives the queue URL through `queueUrlEnvironment`. Both reference the same key, and referencing a key that is not declared fails synthesis. Because `sqsEventSources` is keyed by queue name, a function cannot bind to the same queue twice.

### Visibility timeout must cover the consumer's timeout

A queue's `visibilityTimeoutSeconds` must be at least the `timeoutSeconds` of every function that consumes it as an event source. Lambda rejects a shorter visibility timeout when it creates the event source mapping, and CDK does not check it — so this module validates it at synthesis time and fails with both values named.

Two details worth knowing:

- The check uses the effective values. A queue with no `visibilityTimeoutSeconds` gets the SQS default of 30 seconds, and a function with no `timeoutSeconds` gets the Lambda default of 3 seconds, so leaving either unset does not skip validation.
- Lambda itself only enforces the constraint when a mapping is created or updated. Raising a function's timeout above the visibility timeout of a queue it is already bound to leaves the deployed mapping enabled in an invalid state, where a message can become visible again mid-processing and be delivered twice. This module therefore validates on every synthesis, not only when a queue or mapping is newly introduced.

AWS recommends a visibility timeout of at least six times the function timeout. Only the hard constraint fails synthesis.

### Permissions live on the queue

Queue permissions are granted to a function's execution role through the **queue resource policy**, not through an identity policy on the role, and both directions are wired for you:

| Function declares                | Granted on the queue policy                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `sqsEventSources` (consumer)     | `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` |
| `queueUrlEnvironment` (producer) | `sqs:SendMessage`                                                   |

Injecting a queue URL is what marks a function as a producer for that queue, so no separate permission config is needed — a function given the URL can send to it.

This module removes the inline policy CDK attaches to each execution role so that the `IAMNoInlinePolicy` rules are not tripped, and Lambda validates a consumer's _effective_ permissions when creating the mapping, which a resource policy grant satisfies. The AWS documentation lists the three consume actions as execution-role permissions; do not add them to the role generated by the Roles module on that basis — it is not required, and it reintroduces the findings this design avoids.

All functions granted the same actions on the same queue share one policy statement, with each role added as a principal.

#### KMS access is a prerequisite, not something this module grants

Queues are CMK-encrypted, so a consumer needs `kms:Decrypt` and a producer needs `kms:GenerateDataKey` on the encryption key. **This module grants neither**, and cannot: the key is referenced by ARN, so its policy is not modifiable from this stack, and an identity-based grant would be removed along with the inline policy this module deletes.

With `projectName` set — the normal case — nothing is required of you. Alongside its role-scoped key-user statement, the DataOps Project key carries an `sqsEncryption` statement granting both actions to any principal in the account acting through SQS (conditioned on `kms:CallerAccount` and `kms:ViaService`). That covers every function regardless of whether its execution role is a registered key user, and it is the same statement the per-function async-invoke dead letter queues have always relied on.

With a standalone `kmsArn` pointing at a key **not** managed by a DataOps Project, that statement is not guaranteed. The key's policy must grant the execution roles `kms:Decrypt` and `kms:GenerateDataKey`, either directly or via an SQS-scoped statement of the same shape. If it does not, the queue and event source mapping deploy cleanly and the function fails at runtime with a KMS `AccessDenied` — an imported key's policy cannot be read at synthesis time, so this is not something the module can check for you.

### Choosing queue names

The keys under `queues:` become the generated queue names, as `<org>-<env>-<domain>-<module>-<key>`. SQS constrains what those names may contain, so the keys are validated at synthesis time:

| Rule                                                        | Why                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only alphanumeric characters, hyphens, and underscores      | `CreateQueue` rejects anything else with `InvalidParameterValue`. A `.` is the trap: MDAA's general resource-name validation allows it, so without this check a key like `my.queue` would synthesize cleanly and fail on deploy |
| No `.fifo` suffix on the key                                | Set `fifo: true` instead and the suffix is appended for you, after truncation, so it survives the 80-character cap                                                                                                              |
| Unique against other queue keys **and** every function name | A queue's redrive dead letter queue and a function's async-invoke dead letter queue are both named `<key>-dlq`, so an overlap renders two queues with one physical name — clean synthesis, failed deploy                        |
| Non-empty                                                   | An empty key would name the queue after the module alone                                                                                                                                                                        |

Two behaviours that are not errors but are worth knowing:

- **Uppercase is lowercased.** A key of `MyQueue` produces `…-myqueue`. Reference it from `sqsEventSources` and `queueUrlEnvironment` by the key as written, not the lowercased form.
- **Long keys are truncated to a hash.** The budget for your key is 80 characters minus the `<org>-<env>-<domain>-<module>-` prefix. Beyond that the tail is replaced with `-<hash>`, which stays unique and stable across deploys but is no longer readable — so keep keys short relative to that budget.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
dataops-lambda: # Module Name can be customized
  module_path: '@aws-mdaa/dataops-lambda' # Must match module NPM package name
  module_configs:
    - ./dataops-lambda.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./dataops-lambda.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single Lambda function with project autowiring. Start here for a basic data operations function within an existing DataOps project.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-lambda-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Demonstrates Lambda functions and layers with VPC connectivity, environment variables, event schedules, and SQS queues with event source triggers, all wired to a DataOps project. Start here when evaluating all available options for VPC binding, event triggers, queues, layers, and concurrency settings.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-lambda-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Standalone Configuration (No Project)

Demonstrates standalone Lambda functions and layers with explicit KMS, bucket, deployment role, and security configuration. Use this when deploying outside of a DataOps project, providing infrastructure references directly.

If you add a `queues:` section to a standalone config, read [KMS access is a prerequisite](#kms-access-is-a-prerequisite-not-something-this-module-grants) first — the key you supply must grant the execution roles KMS access, which a DataOps Project key does for you and an arbitrary key does not.

[sample-config-noproject.yaml](sample_configs/sample-config-noproject.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/dataops/dataops-lambda-app/sample_configs/sample-config-noproject.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
