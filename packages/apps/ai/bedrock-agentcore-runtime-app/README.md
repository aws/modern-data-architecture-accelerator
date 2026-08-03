# Bedrock AgentCore Runtime

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/bedrock-agentcore-runtime-app/index.html).

Deploys Amazon Bedrock AgentCore Runtimes with custom Docker containers, VPC networking, JWT authentication, and lifecycle management. Supports both pre-built ECR images and building from local source code. Use this module when you need to run custom AI agent logic in your own containers with full control over the runtime environment and authentication.

---

## Deployed Resources

This module deploys and integrates the following resources:

<!-- TODO: Add architecture diagram -->

- **Bedrock AgentCore Runtime** — Custom agent runtime deployed in VPC mode. Supports Docker containers from ECR or built from source at deploy time.
- **Bedrock AgentCore Resource-Based Policy** (Optional) — Resource-based policy restricting runtime invocations to traffic originating from the configured VPC. Created when `enforceVpcOnly` is true.
- **AgentCore Interface VPC Endpoint** (Optional) — Interface endpoint for `com.amazonaws.{region}.bedrock-agentcore` with Private DNS, a least-privilege endpoint policy, and a security group restricting ingress to the runtime's application security groups. Created when `networkConfiguration.vpcEndpoint` is configured; can also create supporting endpoints (ECR, STS, CloudWatch Logs). See [AWS Service Endpoints](#aws-service-endpoints).
- **Bedrock AgentCore Runtime Endpoint** (Optional) — API endpoint for invoking the agent runtime via Bedrock AgentCore APIs.
- **ECR Docker Image Asset** — Container image built and pushed to ECR at deploy time (when using `codePath`).
- **IAM Execution Role + Managed Policy** — Runtime execution role with permissions for ECR image access, CloudWatch Logs, X-Ray tracing, CloudWatch Metrics, Bedrock AgentCore workload identity tokens, and Bedrock model invocation. Can use an existing role via `roleArn` or auto-create one.
- **CloudWatch Log Group** — Log group for runtime execution logs.
- **KMS Key** — Customer-managed encryption key for the CloudWatch log groups. Also reused to encrypt a module-created alarm SNS topic when `alarms.createNotificationTopic` is true.
- **CloudWatch Data Protection Policy** — PII masking policy applied to the log groups on ingestion. Extendable via `dataProtection.additionalIdentifiers`.
- **CloudWatch Alarms** (Optional) — Error-rate and/or throttle-count alarms on the AgentCore service metrics (namespace `AWS/Bedrock-AgentCore`), created when an `alarms` block is configured. Notify an SNS topic on breach.
- **SNS Topic** (Optional) — CMK-encrypted topic for alarm notifications, created when `alarms.createNotificationTopic` is true. Alternatively, alarms notify an existing topic via `alarms.notificationTopicArn`.
- **SSM Parameters** — Runtime ARN, Runtime ID, Runtime Name, and optionally Endpoint ARN/ID, stored in Parameter Store for cross-module reference. A created alarm SNS topic and the alarms publish their own SSM parameters (topic and alarm ARN/name) via the underlying MDAA constructs.

---

## Related Modules

- [Bedrock Builder](../bedrock-builder-app/README.md) — Deploy managed Bedrock Agents as an alternative to custom AgentCore runtimes
- [Bedrock Settings](../bedrock-settings-app/README.md) — Configure Bedrock model invocation audit logging for runtime model calls
- [Roles](../../governance/roles-app/README.md) — Create IAM execution roles for AgentCore runtimes

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - CloudWatch log groups are always encrypted with a module-created customer-managed KMS key (built-in, cannot be disabled)
  - CloudWatch Data Protection always masks a built-in comprehensive set of PII identifiers on log ingestion (built-in, cannot be disabled; extendable via `dataProtection.additionalIdentifiers`)
  - Container images stored in ECR with default encryption
- **Encryption in Transit**:
  - All runtime API communications use TLS
  - X-Ray tracing data transmitted securely
- **Least Privilege**:
  - Execution role scoped to specific permissions for ECR access, CloudWatch Logs, X-Ray, and Bedrock model invocation
  - Supports using an existing role or auto-creating one with minimal required permissions
- **Network Isolation**:
  - Runtimes deployed in VPC mode with no public internet access unless explicitly configured via VPC routing
  - JWT authentication (custom or standard) controls runtime endpoint access
- **Observability & Monitoring**:
  - Optional CloudWatch alarms on error rate and throttle count for production incident detection (see [Alarms](#cloudwatch-alarms))
  - Optional EventBridge rules alerting on individual security events — auth failures and out-of-band configuration changes — with optional customer-supplied remediation (see [EventBridge Alerting](#eventbridge-alerting))
  - A module-created alarm SNS topic is CMK-encrypted and enforces TLS for delivery

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service         | Endpoint Service Name                     | Type      |
| ------------------- | ----------------------------------------- | --------- |
| Bedrock AgentCore   | `com.amazonaws.{region}.bedrock-agentcore` | Interface |
| Bedrock Runtime     | `com.amazonaws.{region}.bedrock-runtime`  | Interface |
| ECR API             | `com.amazonaws.{region}.ecr.api`          | Interface |
| ECR Docker          | `com.amazonaws.{region}.ecr.dkr`          | Interface |
| CloudWatch Logs     | `com.amazonaws.{region}.logs`             | Interface |
| SSM Parameter Store | `com.amazonaws.{region}.ssm`              | Interface |
| STS                 | `com.amazonaws.{region}.sts`              | Interface |
| S3                  | `com.amazonaws.{region}.s3`               | Gateway   |
| X-Ray               | `com.amazonaws.{region}.xray`             | Interface |

> **Note:** The AgentCore endpoint service name is `bedrock-agentcore` — not `bedrock-agent-runtime` (the older Bedrock Agents endpoint) or `bedrock-runtime` (foundation model invocation). Using the wrong service name is the most common AgentCore VPC configuration mistake and results in DNS resolution failures or timeouts when invoking the runtime. The single `bedrock-agentcore` endpoint serves AgentCore Runtime, Tools, Memory, and Identity.

### MDAA-Managed VPC Endpoint Creation

Rather than creating the AgentCore VPC endpoint manually, this module can create and manage it by configuring `networkConfiguration.vpcEndpoint` (presence of the block opts in; an empty block `{}` accepts all defaults). MDAA provisions the endpoint with secure defaults:

- Correct service name (`com.amazonaws.{region}.bedrock-agentcore`) with **Private DNS enabled**, so the default regional endpoint resolves privately with no code changes
- A dedicated endpoint security group allowing inbound HTTPS (443) **only from the runtime's application security groups** — not the entire VPC CIDR
- An endpoint policy restricted to AgentCore invoke actions; principals default to `*` (required for OAuth/JWT callers, which have no IAM identity visible to endpoint policies) or can be restricted to specific IAM principal ARNs via `endpointPolicy.allowPrincipals`
- Optionally, supporting interface endpoints for fully private environments (`createSupportingEndpoints: true` adds ECR API, ECR Docker, STS, and CloudWatch Logs)

The endpoint ID is published to SSM Parameter Store for cross-module reference.

**Relationship to `enforceVpcOnly`:** the resource-based policy created by `enforceVpcOnly` conditions on `aws:SourceVpc`, which is only present on requests arriving through a VPC endpoint. Without a `bedrock-agentcore` endpoint in the VPC, an `enforceVpcOnly` runtime cannot be invoked at all. If you enable `enforceVpcOnly` without configuring `vpcEndpoint`, MDAA emits a synth-time warning reminding you that an endpoint must exist.

**If your VPC already has a `bedrock-agentcore` endpoint** (e.g., created by AWS Landing Zone Accelerator or a central networking team), omit the `vpcEndpoint` block entirely — the existing endpoint serves the traffic, and MDAA does not need to know about it. Only one endpoint with Private DNS is allowed per service per VPC; a second one will fail to deploy. For the same reason, if multiple runtime module deployments share a VPC, only one of them should configure `vpcEndpoint`. Note that an MDAA-created endpoint is owned by that module's CloudFormation stack and is removed when the stack is destroyed, so create it from whichever deployment you consider the network owner in that VPC.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
bedrock-agentcore-runtime: # Module Name can be customized
  module_path: '@aws-mdaa/bedrock-agentcore-runtime' # Must match module NPM package name
  module_configs:
    - ./bedrock-agentcore-runtime.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./bedrock-agentcore-runtime.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Contains only required properties for deploying an agent runtime with a pre-built container image and VPC networking. Start here for a quick proof-of-concept runtime using an existing ECR image.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration (Pre-built Container Image)

Deploys an agent runtime using a pre-built ECR container image with VPC networking, JWT authentication, IAM policies, header forwarding, lifecycle management, and CloudWatch alarms. Start here when evaluating all available options for securing and managing a production AgentCore runtime.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Model-Scoped Permissions Variant

Restricts the execution role's Bedrock model invocation permissions to specific model ARNs. Choose this variant when you need least-privilege access — for example, limiting agents to specific models for cost control, compliance, or blast radius reduction.

[sample-config-model-scoped.yaml](sample_configs/sample-config-model-scoped.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-model-scoped.yaml"
```

#### Local Code Path Variant

Builds the container image from a local Dockerfile instead of referencing a pre-built ECR image. Choose this variant when developing custom agent runtimes from source code and you want CDK to build and push the image at deploy time. Also demonstrates the alternative `jwtAuthorizer` (vs `customJwtAuthorizer` in the comprehensive config).

[sample-config-codepath.yaml](sample_configs/sample-config-codepath.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-codepath.yaml"
```

#### VPC-Only Enforcement Variant

Restricts runtime invocations to traffic originating from the configured VPC using a resource-based policy, and creates the AgentCore interface VPC endpoint that provides the private invocation path. Choose this variant when JWT/OAuth callers must be restricted to VPC-only access — SCPs and VPC endpoint policies cannot restrict non-IAM principals, so a resource-based policy with an `aws:SourceVpc` condition is required. The VPC endpoint is what produces that `aws:SourceVpc` request context, so the two features pair naturally (see [AWS Service Endpoints](#aws-service-endpoints)).

[sample-config-resource-policy.yaml](sample_configs/sample-config-resource-policy.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-resource-policy.yaml"
```

### CloudWatch Alarms

Add an optional `alarms` block to create CloudWatch alarms on the AgentCore service operational metrics (CloudWatch namespace `AWS/Bedrock-AgentCore`) and notify an SNS topic on breach. The presence of the `alarms` block enables alarms — there is no separate `enabled` flag, and omitting the block deploys no alarms. The comprehensive config above includes a populated `alarms` block.

Two alarms are supported, each opt-in via its threshold:

- **Error rate** (`errorRateThreshold`) — a metric-math alarm on `SystemErrors + UserErrors` as a percentage of `Invocations` over the evaluation period. Useful for detecting error spikes and bursts of failed (e.g. auth-denied) invocations.
- **Throttle count** (`throttleCountThreshold`) — an alarm on the sum of the `Throttles` metric, indicating quota exhaustion or abuse.

At least one threshold must be set. Provide a notification target via exactly one of:

- `notificationTopicArn` — an existing SNS topic ARN, or
- `createNotificationTopic: true` — have MDAA create a CMK-encrypted SNS topic (reusing the runtime's log-group KMS key) and export its ARN to SSM.

#### Subscribing to the notification topic

Creating a topic is not the same as being notified by it. **A topic with no subscribers accepts every alarm notification and discards it.** This same topic is also the sole delivery path for the [EventBridge rules](#eventbridge-alerting), so an unsubscribed topic silences both features.

Set `notificationEmails` to subscribe one or more addresses. Each recipient receives an SNS confirmation request and must confirm before delivery begins:

```yaml
alarms:
  throttleCountThreshold: 100
  createNotificationTopic: true
  notificationEmails:
    - 'agentcore-ops@example.com'
    - 'oncall@example.com'
```

Two guardrails:

- If `createNotificationTopic: true` and no `notificationEmails` are supplied, MDAA emits a **synth-time warning** — the topic will receive notifications that go nowhere. It is a warning rather than an error because subscriptions can legitimately be managed out-of-band (a chatbot integration, or an existing distribution list attached outside MDAA) using the topic ARN exported to SSM.
- `notificationEmails` combined with `notificationTopicArn` **fails at synth**. MDAA does not modify a topic it did not create, and the deploying role would not hold `sns:Subscribe` on an externally-owned one. Subscribe on the existing topic directly, or switch to `createNotificationTopic: true`.

Alarms are scoped to the deployed runtime automatically, using the **full dimension set the AgentCore service publishes** — `Resource` (the runtime ARN), `Operation` (`InvokeAgentRuntime`), and `Name` (`<runtime-name>::<qualifier>`). All three are required: CloudWatch matches dimensions *exactly* rather than as a subset, so an alarm naming only some of them receives zero datapoints and stays in `OK`. There is normally no reason to set `dimensions` yourself — doing so replaces the whole derived set.

Note that because the `Name` dimension embeds the endpoint qualifier, the service emits a **separate metric stream per endpoint**. The alarms observe the endpoint this module creates (or `DEFAULT` when no `runtimeEndpoint` is configured); invocations through a different endpoint are not counted. CloudWatch's `SEARCH()` would span all qualifiers but is not supported on alarms.

`metricNamespace`, `periodSeconds`, `evaluationPeriods`, and `datapointsToAlarm` are also overridable. `periodSeconds` must be 1, 5, 10, 30, or a multiple of 60.

On low-traffic runtimes the default of a single 5-minute evaluation period makes the error-rate alarm noisy: one error out of one invocation is a 100% error rate. Pair `evaluationPeriods` with `datapointsToAlarm` to require several breaching periods, as the comprehensive config does.

Both alarms use `treatMissingData: notBreaching`, so an idle runtime that emits no datapoints reports `OK` rather than `INSUFFICIENT_DATA`. Note the consequence: a runtime serving zero invocations is indistinguishable from a healthy idle one.

```yaml
alarms:
  # Alarm when the error rate exceeds 10% of invocations over the period
  errorRateThreshold: 10
  # Alarm when the throttle count exceeds 100 over the period
  throttleCountThreshold: 100
  # Create a CMK-encrypted SNS topic for notifications (mutually exclusive
  # with notificationTopicArn)
  createNotificationTopic: true
  # Require 2 of 3 breaching 5-minute periods before paging
  evaluationPeriods: 3
  datapointsToAlarm: 2
```

To notify an existing SNS topic instead of creating one, use the `notificationTopicArn` path shown in the [Existing Notification Topic Variant](#existing-notification-topic-variant) below.

#### Existing Notification Topic Variant

Notifies an existing SNS topic via `alarms.notificationTopicArn` instead of creating one. Choose this variant when you already manage a central notification or incident topic and want the runtime's alarms to publish to it. This has its own sample because `notificationTopicArn` and `createNotificationTopic` (used in the comprehensive config) are mutually exclusive.

Note that MDAA cannot inspect or modify a topic it does not own, so it emits a synth-time warning: ensure the topic is CMK-encrypted, allows `cloudwatch.amazonaws.com` (and `events.amazonaws.com`, if you also enable `eventBridgeAlerts`) to `sns:Publish` and to use its key, and has at least one subscriber.

[sample-config-alarms-existing-topic.yaml](sample_configs/sample-config-alarms-existing-topic.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-alarms-existing-topic.yaml"
```

### EventBridge Alerting

Where alarms detect *statistical* conditions (a rate or a count over a period), EventBridge rules detect *individual* events as they happen. Add an optional `eventBridgeAlerts` block to create rules matching this runtime's AgentCore CloudTrail events. As with `alarms`, the presence of the block enables it — there is no separate `enabled` flag. The comprehensive config above includes a populated block.

**`eventBridgeAlerts` requires an `alarms` block** that either creates a notification topic (`createNotificationTopic: true`) or references one (`notificationTopicArn`). That topic is the default target for every rule; configuring `eventBridgeAlerts` without one fails at synth rather than deploying rules that notify nothing.

**Prerequisite: a CloudTrail trail** in the account/region logging the AgentCore events you want to match. CloudTrail delivers API-call events to the default event bus, which is what these rules match. Management events (the lifecycle APIs such as `UpdateAgentRuntime`) are logged by default on any trail; **data events (invocation) are off by default** and must be enabled explicitly. A rule whose events are not covered by a trail will never match.

Rules are a **keyed map**. Each key becomes part of the rule's resource name, so keep keys stable across deployments. Each rule matches on `errorCodes`, `eventNames`, or both:

- `errorCodes` — CloudTrail `errorCode` values (e.g. `AccessDenied`), for detecting repeated auth failures.

  > **These are CloudTrail `errorCode` values, not SDK exception names — and for authorization failures the two differ.** An IAM denial is returned to the caller as `AccessDeniedException`, but CloudTrail records it as plain **`AccessDenied`**. **Do not configure `AccessDeniedException`** — a rule using it will never match.
  >
  > Service-specific API errors *do* keep the suffix (`ResourceNotFoundException`, `ValidationException`), so the distinction is between IAM's normalized denial and a service's own error — not a per-error quirk. Confirm the exact value in a real record before adding a code:
  >
  > ```bash
  > aws cloudtrail lookup-events \
  >   --lookup-attributes AttributeKey=EventSource,AttributeValue=bedrock-agentcore.amazonaws.com \
  >   --query 'Events[].CloudTrailEvent' --output text | python3 -c "
  > import json,sys
  > for line in sys.stdin: print(json.loads(line).get('errorCode','(none)'))"
  > ```
  >
  > Note `InvokeAgentRuntime` is a CloudTrail **data** event, so it never appears in `lookup-events` — read those records from the trail's S3 bucket instead.
- `eventNames` — AgentCore API names (e.g. `UpdateAgentRuntime`, `DeleteAgentRuntime`), for detecting configuration changes made outside IaC.

At least one of the two is required. Note that setting **both ANDs them**: the rule then matches only calls to one of those APIs that failed with one of those error codes.

Configuration supplies only those two fields. MDAA owns the rest of the event pattern — the `source`, the `detail-type` (`AWS API Call via CloudTrail`), the `eventSource`, and the scoping to this runtime. A raw `pattern` passthrough is deliberately **not** exposed, since a pattern that matches nothing still deploys successfully and gives no indication that it is inert.

Two details of the generated pattern are worth knowing, because they explain how the rules find your runtime:

- **Rules are scoped by every identity form CloudTrail records** — `requestParameters.agentRuntimeId`, `requestParameters.agentRuntimeArn`, and `resources[].ARN` — combined with `$or`. All three are needed because the field carrying the runtime's identity differs per API: `InvokeAgentRuntime` events carry a **null** `requestParameters` and identify the runtime *only* in the `resources` array, while the lifecycle APIs use `requestParameters`. An EventBridge pattern naming a field the event lacks does not match.
- **The AgentCore CloudTrail source is matched, with a forward-compatible fallback.** AgentCore is served by two endpoints (control plane and data plane), but CloudTrail records both under the single `eventSource` `bedrock-agentcore.amazonaws.com`. The `bedrock-agentcore-control` variant is also listed in case the service later splits them; since an EventBridge list is an OR, a value that never appears cannot narrow matching.

Notification is **EventBridge → SNS**, with an input transformer rendering a readable message (principal, error code, source IP, event name). No Lambda is created for notification — SNS already delivers to email, Slack, or PagerDuty via subscription.

`targetLambdaArn` optionally attaches a **customer-supplied** remediation function as an additional target. MDAA does not create or ship one: revoking an execution role or stopping sessions is destructive and site-specific, so kill-switch actions remain a deliberate customer decision. The rule grants EventBridge `lambda:InvokeFunction` on a same-account function; a cross-account function must grant that permission on its own side.

If your `alarms` block references an existing topic by ARN, MDAA cannot modify that topic's resource policy and emits a synth-time warning: ensure the topic allows the `events.amazonaws.com` service principal to `sns:Publish` (and, if the topic is CMK-encrypted, to use the key), or the rules will match but deliver nothing.

```yaml
eventBridgeAlerts:
  rules:
    auth-failure:
      description: 'Denied AgentCore invocations'
      # 'AccessDenied' — the value CloudTrail records for an IAM denial.
      # NOT 'AccessDeniedException', which CloudTrail never emits for authorization.
      errorCodes: ['AccessDenied']
      # Notifies the alarms topic above by default
    config-change:
      description: 'Out-of-band runtime configuration change'
      eventNames: ['UpdateAgentRuntime', 'DeleteAgentRuntime']
      # (Optional) Also invoke a customer-supplied remediation function
      targetLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:agentcore-remediation'
```

### Troubleshooting

For common deployment issues and their solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Common issues:

- [X-Ray Transaction Search Config Already Exists](./TROUBLESHOOTING.md#x-ray-transaction-search-config-already-exists) - `AlreadyExists` error during deployment
- [Cross-Account ECR Access Denied](./TROUBLESHOOTING.md#cross-account-ecr-access-denied) - `Failed to pull image` error in cloudwatch logs

---

[Config Schema Docs](SCHEMA.md)
