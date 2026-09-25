# Bedrock AgentCore Harness L3 Construct

This construct deploys an [Amazon Bedrock AgentCore Harness](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html) - a declarative agent loop (model + system prompt + tools) built on AgentCore Runtime.

Like the [Bedrock AgentCore Gateway L3 construct](../bedrock-agentcore-gateway-l3-construct), this package has **no standalone app** - it is meant to be composed into an orchestrating module (e.g. `bedrock-builder`) that owns the shared CMK, guardrails, and gateways it can reference.

## Model support: Amazon Bedrock only

This construct exposes **only** the Harness `bedrockModelConfig` model surface - an Amazon Bedrock foundation-model id / inference-profile id / model ARN, plus the sampling tuning below. The other model-provider formats documented for the Harness (`openAiModelConfig`, `geminiModelConfig`, and the invoke-time LiteLLM route) are **not supported**. The API format is fixed to the Converse API (`converse_stream`) and is not a config option; see [Model API format](#model-api-format).

> **Application inference profiles are not supported.** `modelId` accepts an on-demand model id, a cross-region (system) inference profile id, or a foundation-model / system inference-profile ARN. An `application-inference-profile/...` ARN is **rejected at synth**.

## Features

- **Declarative agent loop**: model, system prompt, `modelConfig` (temperature/topP/maxTokens), maxIterations, timeoutSeconds
- **IAM Role Management**: create-or-reference execution role, scoped to the resolved model ARN (not `*`), plus scoped grants for guardrails and gateways
- **Model API format**: fixed to Converse (`converse_stream`); the harness always calls the model over the Converse API (see below)
- **Guardrail support**: applies a Bedrock Guardrail to the agent loop and grants scoped `bedrock:ApplyGuardrail` (see below)
- **JWT Authorization**: shared `customJwt` / AWS IAM inbound-auth model (same as AgentCore Runtime and Gateway)
- **Tools**: `inline_function` (client-executed) and `agentcore_gateway` (gateway-fronted, `AWS_IAM` outbound auth)
- **Tool allowlist**: `allowedTools` scopes which tools (including the built-in `shell` / `file_operations`) the agent may select at invocation time (see [Tool allowlist](#tool-allowlist))
- **Skills**: filesystem-path skill bundles injected into the runtime image via `skills` (path source only - see [Skills](#skills))
- **Memory**: not supported yet - every harness is deployed with memory disabled (see [Memory](#memory))
- **Container & VPC**: bring-your-own ECR container image (`container`) and private VPC networking (`networkConfiguration`) for the underlying AgentCore Runtime environment
- **Cost controls**: `maxTokens` (global generation cap per invocation) and `lifecycleConfiguration` (`idleRuntimeSessionTimeout` / `maxLifetime`)
- **Context truncation**: `truncation` trims conversation context to the model window via a `sliding_window` / `summarization` / `none` strategy (see [Context truncation](#context-truncation))
- **Environment variables**: `environmentVariables` passed to the runtime environment
- **Versioned endpoint**: an optional named `endpoint` giving callers a stable invocation target, pinnable to a specific harness version via `targetVersion` (see [Harness endpoint](#harness-endpoint))
- **Log retention**: `logRetentionDays` on the Harness's service-created log groups, defaulting to indefinite retention (see [Data protection and log retention](#data-protection-and-log-retention))
- **Always-on CMK log protection**: the caller-provided CMK is applied to the Harness's service-created log groups
- **Data protection**: always-on PII masking floor on the log groups, extensible with additional identifiers via `dataProtection`
- **SSM Parameter Storage**: harness ARN, id, execution role ARN, and (when configured) endpoint id

## Usage

```typescript
import { BedrockAgentcoreHarnessL3Construct } from '@aws-mdaa/bedrock-agentcore-harness-l3-construct';

const harness = new BedrockAgentcoreHarnessL3Construct(this, 'MyHarness', {
  harnessName: 'my-agent',
  modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
  systemPrompt: 'You are a helpful assistant.',
  modelConfig: {
    temperature: 0.7,
  },
  guardrail: {
    id: 'my-guardrail-id',
    version: '1',
  },
  authorizerConfiguration: {
    customJwt: {
      discoveryUrl: 'https://cognito-idp.region.amazonaws.com/pool/.well-known/openid-configuration',
      allowedAudience: ['client-id'],
    },
  },
  tools: {
    get_weather: {
      inlineFunction: {
        description: 'Returns the current weather for a city',
        inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
      },
    },
  },
  kmsKey: myKey, // caller-provided CMK, pre-granted for CloudWatch Logs
  naming: naming,
  roleHelper: roleHelper,
});
```

`kmsKey` is required: the harness is a pure key consumer and applies the caller's CMK to its service-created log groups, so its logs are never left on an AWS-managed key.

### Attaching to a gateway created in the same module

`tools.<name>.agentCoreGateway.gatewayArn` accepts either a literal ARN or a `config:<name>` reference, resolved by the orchestrating module against its own gateway map (the same `config:` convention MDAA uses elsewhere for sibling-resource references):

```typescript
tools: {
  gateway_tools: {
    agentCoreGateway: {
      gatewayArn: 'config:my-gateway', // resolved against the `gateways` prop map
    },
  },
},
```

The orchestrating module passes `gateways: { 'my-gateway': gatewayConstruct.gateway.attrGatewayArn }` - a live in-stack token, no SSM round-trip.

### Guardrails: `config:` references

`guardrail.id` also accepts a `config:<name>` reference into a `guardrails` map of `{ guardrailId, guardrailVersion }`, resolved by the orchestrating module. When `id` is a literal guardrail id (not a `config:` reference), `version` is required.

## Tool allowlist

`allowedTools` restricts which tools the agent may select during an `InvokeHarness` call, including the built-in `shell` and `file_operations` tools the harness runtime ships with. Entries support the AgentCore `allowedTools` patterns: `*`, plain tool names, `@builtin`, `@server/tool`, and globs; 1-64 entries.

To allow all tools (the service default), **omit the property entirely** - do not pass an empty list. The config schema sets `minItems: 1`, so `allowedTools: []` is rejected at config validation.

```yaml
allowedTools:
  - 'get_order_status'
  - '@builtin'
```

> **Scope:** `allowedTools` only gates LLM tool selection during `InvokeHarness`. It does **not** gate the separate `InvokeAgentRuntimeCommand` API, which executes commands directly without the LLM. To prevent direct command execution, do not grant `bedrock-agentcore:InvokeAgentRuntimeCommand` on the invoking principal.

> **These config values are per-invocation _defaults_, not enforced controls.** Per the [`InvokeHarness` API](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html), a caller can override the model, tools, `allowedTools`, prompts, and limits at invoke time. The **enforcement boundary** is who you grant `bedrock-agentcore:InvokeHarness` to, plus application-layer validation of caller-supplied invoke parameters. The execution role's IAM grants (including the `sts:AssumeRole` **Deny** below) and the enforced VPC network mode cannot be overridden.

## Skills

`skills` injects skill bundles (curated instruction/script sets) into the agent's context by filesystem path - the paths must resolve inside the runtime image (typically a bring-your-own `container`). Only the `path` skill source is exposed; the `git` / `s3` / `awsSkills` sources are **not supported**.

```yaml
skills:
  - path: '/opt/skills/support-playbook'
```

## Memory

AgentCore Memory is **not supported**. Every harness is deployed with memory disabled (`Memory: { Disabled: {} }`): no memory resource is created and the execution role receives no memory permissions. There is no `memory` configuration field.

## Container and VPC networking

- **`container.containerUri`** - a pre-built `linux/arm64` ECR image URI supplying the session _environment_ (your dependencies, runtimes, and tools). It does not replace the agent: the service overrides the image's `ENTRYPOINT`/`CMD` and runs it as an environment, while the agent loop comes from the AWS-managed harness image. Only bring-your-own image is supported (no build-from-source). The execution role is granted scoped ECR pull on the resolved repository in addition to the always-granted AWS-managed `harness-<region>` repository.
- **`networkConfiguration`** (required) - `securityGroups` (1-16, or 1-15 when `vpcEndpoints` names a set, since the harness appends its own client security group) and `subnets` (1-16) run the harness's runtime sessions in your VPC (`NetworkMode: VPC`) for private access to internal resources.
- **`networkConfiguration.vpcEndpoints`** (optional) - names a VPC endpoint set declared in the orchestrating module's own `vpcEndpoints` map, giving a VPC-mode harness's sessions a private outbound path (no NAT/internet). Omit it for a harness whose egress follows the VPC's existing path.

  ```yaml
  networkConfiguration:
    securityGroups: ['sg-0123456789abcdef0']
    subnets: ['subnet-0123456789abcdef0']
    vpcEndpoints: 'agentcore-private'
  ```

  Which endpoints the harness needs is **derived from its own configuration** - there is no per-service selection or mapping here:

  | Service                     | Required                                     | Needed for                                                                                                                                                                   |
  | --------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `bedrock-runtime`           | always                                       | Model inference (Converse). Without it the harness reaches `READY` but every invoke hangs                                                                                    |
  | `ecr.api`                   | always                                       | The session container image pull                                                                                                                                             |
  | `ecr.dkr`                   | always                                       | The session container image pull                                                                                                                                             |
  | `sts`                       | always                                       | Credential vending                                                                                                                                                           |
  | `logs`                      | always                                       | Log delivery                                                                                                                                                                 |
  | `s3` (gateway)              | always                                       | Container image _layers_, served from the ECR layer bucket over S3, which the ECR endpoints cannot fetch                                                                     |
  | `bedrock-agentcore.gateway` | when an `agentcore_gateway` tool is declared | Reaching the gateway's MCP host - a **distinct** service endpoint from the AgentCore data plane; without it the tool load fails with a DNS "Name or service not known" error |

  This construct creates no endpoint itself. **The orchestrating module owns them**: it reconciles that derived list against the referenced set - which states only which VPC it serves, where created endpoints go, and how each is reached (created there, an existing one to wire to, or reached without an endpoint the set manages) - and passes back the security groups of the ones this harness reaches. The harness then creates its own **client security group** and one HTTPS egress/ingress rule pair per endpoint, and attaches that client group to its sessions alongside the configured `securityGroups` (which is why they are capped at 15 rather than 16). Every harness referencing one set shares its endpoints, and each is wired only to what it needs - a harness with no gateway tool gets no rule to the gateway endpoint a sibling needed. A set must be removed in the same change as the last harness referencing it; a set no harness references is rejected at synth.

  See [Harness VPC endpoints](../../../../apps/ai/bedrock-builder-app/README.md#harness-vpc-endpoints) for the set's own configuration surface, the three endpoint states, and what is rejected at synth.

  One endpoint is **not** created and cannot be: the **AgentCore data-plane endpoint (`bedrock-agentcore`)** serves _inbound_ `InvokeHarness` connectivity for callers ([PrivateLink docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/vpc-interface-endpoints.html)), which is a property of the caller's VPC rather than of the harness's session subnets. Provision it there.

> **VPC network isolation is enforced.** Like the AgentCore _Runtime_ construct, the Harness enforces VPC mode: `networkConfiguration` is required and there is no public-network option. This places the harness's runtime sessions behind your own security groups and subnets so egress is governed by your VPC controls (in addition to the harness's scoped IAM execution role), rather than running on the AgentCore-managed public network. Inbound invocation is separately authenticated (AWS IAM SigV4 by default, or `authorizerConfiguration` JWT).

> **No inbound VPC-only enforcement.** Unlike the AgentCore _Runtime_ construct, the Harness cannot attach a resource-based policy restricting _inbound_ invocation to a specific VPC (`aws:SourceVpc`): per the AgentCore [resource-based-policy docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html), the resource-policy API supports Runtime/Endpoint, Gateway, and Memory - not a Harness resource type. The gap matters most for a JWT-authorized harness, where a VPC-endpoint policy cannot restrict OAuth callers (they have no IAM identity) and SCPs cannot bind them, leaving an `aws:SourceVpc` resource-policy condition the only inbound network-boundary lever. Egress is still governed by your VPC - VPC network mode is enforced - so this limitation applies only to the inbound network boundary for OAuth callers.

> **Execution role permissions.** These grants land on the execution role whether it is created here or referenced via `role` - the permission set is attached through a customer-managed policy bound with `roles: [role]` (see [IAM Permissions](#iam-permissions)). Alongside the model, gateway, and observability grants, the role gets: scoped ECR pull on the AWS-managed harness image repository (`harness-<region>`), always - required even when a `container` of your own is configured - and read-only `kms:Decrypt`/`DescribeKey` on the module CMK, bounded by a `kms:ViaService` Bedrock condition, when a `guardrail` is configured.

## Cost controls

- **`maxTokens`** - a global cap on tokens generated across the whole agent-loop invocation. Distinct from `modelConfig.maxTokens`, which bounds a single model call.
- **`lifecycleConfiguration.idleRuntimeSessionTimeout`** / **`maxLifetime`** - idle-session and hard maximum-lifetime session bounds (60-28800 seconds each) on the underlying runtime environment.

## Context truncation

`truncation` controls how the agent loop trims conversation context when it exceeds the model's context window. Omit it to accept the service default. Set `strategy` to one of:

| Strategy         | Tuning fields                                                                             | Behavior                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `sliding_window` | `messagesCount` (>= 1)                                                                    | Retain only the most recent `messagesCount` messages          |
| `summarization`  | `preserveRecentMessages` (>= 0), `summarizationSystemPrompt`, `summaryRatio` (0 < r <= 1) | Summarize older context, preserving the newest turns verbatim |
| `none`           | -                                                                                         | Do not truncate                                               |

Tuning fields are validated against the selected strategy at synth: sliding-window tuning with a `summarization` strategy (or vice versa) is rejected rather than silently ignored at deploy.

```yaml
truncation:
  strategy: 'summarization'
  preserveRecentMessages: 5
  summaryRatio: 0.5
```

## Harness endpoint

An optional `endpoint` creates a named, versioned invocation target (`AWS::BedrockAgentCore::HarnessEndpoint`) so callers can pin to a specific harness version for blue/green management. Fields: `name` (alphanumeric + underscores, <= 48 chars; defaults to a name derived from the harness name), `description` (1-256 chars), and `targetVersion` (a numeric version string, `^([1-9][0-9]{0,4})$`).

> **`targetVersion` must be set explicitly to pin.** Omitting it does **not** freeze the endpoint: it defaults to the harness's _current_ version, which the service increments on every successful update, so the endpoint re-points on each redeploy. For blue/green, set `targetVersion` explicitly to the version you want held.

```yaml
endpoint:
  name: 'prod'
  description: 'Production endpoint pinned to a released harness version'
```

## Data protection and log retention

The Harness's service-created log groups always carry a CloudWatch Logs Data Protection policy that masks a floor of PII identifiers and are always CMK-encrypted - neither can be disabled. The optional `dataProtection` block is **additive**: it can only tighten the posture by adding identifiers on top of the built-in floor.

`logRetentionDays` sets the retention applied to those same log groups. **Omit it and retention is indefinite** - logs are kept, and billed, forever. It accepts any CloudWatch Logs retention value (e.g. `7`, `30`, `90`, `365`), plus `9999` (`RetentionDays.INFINITE`) for explicit never-expire; `9999` and omission are equivalent.

## Model API format

The API protocol (and Amazon Bedrock endpoint) the harness uses to call the model is fixed - it is not a config option. Every harness renders `ApiFormat: converse_stream` (the `bedrock-runtime` Converse endpoint), the only format compatible with Bedrock Guardrails. The OpenAI-compatible Bedrock Mantle formats (`responses` / `chat_completions`) are **not supported**.

## Guardrail rendering

A configured `guardrail` is rendered as a Converse `guardrailConfig` on the harness's model config, paired with `ApiFormat: converse_stream` (guardrails are only enforced over the Converse API):

```json
{
  "Model": {
    "BedrockModelConfig": {
      "ApiFormat": "converse_stream",
      "AdditionalParams": {
        "guardrailConfig": {
          "guardrailIdentifier": "...",
          "guardrailVersion": "...",
          "trace": "enabled"
        }
      }
    }
  }
}
```

`trace` accepts the Converse `GuardrailConfiguration` values `enabled` (default) / `disabled` / `enabled_full` via `guardrail.trace`.

## IAM Permissions

The execution role is either **created** (an `MdaaRole` trusting `bedrock-agentcore.amazonaws.com`, scoped via `aws:SourceAccount` plus an `aws:SourceArn` of `arn:<partition>:bedrock-agentcore:<region>:<account>:*`) or **referenced** via `role` (an `MdaaRoleRef`). Either way the permission set is attached through a customer-managed policy bound with `roles: [role]`, so a referenced role receives the same grants. The permission set mirrors the [AgentCore Harness sample execution-role policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) statement-for-statement (each `Sid` matches the doc), scoped tighter where possible. It grants:

- `bedrock:InvokeModel` / `InvokeModelWithResponseStream` (+ `GetInferenceProfile` for inference profiles), scoped to the resolved model ARN (the doc samples all foundation models but recommends scoping down). For a cross-region inference-profile id, a second `bedrock:InvokeModel*` statement grants the underlying foundation-model ARN (region-wildcarded, since destination regions are not knowable at synth) gated by the `bedrock:InferenceProfileArn` condition - required because invoking through a profile also authorizes against the destination-region foundation model, so the profile ARN alone would fail with `AccessDeniedException`
- X-Ray tracing (`PutTraceSegments` / `PutTelemetryRecords` / `GetSamplingRules` / `GetSamplingTargets`)
- CloudWatch Logs: `CreateLogGroup` / `DescribeLogStreams` on the runtime log-group prefix, `CreateLogStream` / `PutLogEvents` on its `:log-stream:*`, `DescribeLogGroups` on `log-group:*`, and `PutResourcePolicy` scoped to the `/aws/bedrock-agentcore/runtimes/*` log-group prefix; plus `cloudwatch:PutMetricData` restricted to the `bedrock-agentcore` metrics namespace
- AgentCore workload-identity tokens (`GetWorkloadAccessToken` / `GetWorkloadAccessTokenForJWT`) on the `default` directory and a `harness_<name>*` workload prefix, where `<name>` is the MDAA-resolved harness resource name
- The built-in AWS-managed browser and code-interpreter tool actions, scoped to the AWS-owned `browser/*` and `code-interpreter/*` prefixes
- `bedrock:ApplyGuardrail`, scoped to the resolved guardrail ARN, when a guardrail is configured (a `guardrail.id` given as a full `arn:...:guardrail/...` is used verbatim; a bare id is wrapped into the account/region guardrail ARN), plus read-only `kms:Decrypt` / `kms:DescribeKey` on the module CMK bounded by `kms:ViaService: bedrock.<region>.amazonaws.com` (`GuardrailKmsDecrypt`) so a CMK-encrypted guardrail can be read - no encrypt-side access is granted
- `bedrock-agentcore:InvokeGateway`, scoped to the resolved gateway ARN(s), when one or more `agentcore_gateway` tools are configured
- Harness-image ECR pull permissions (`ecr:GetDownloadUrlForLayer` / `BatchGetImage` / `BatchCheckLayerAvailability`) plus the resource-less `ecr:GetAuthorizationToken` (`HarnessImageEcrPull` / `HarnessImageEcrToken`). The grants are **additive**: the AWS-managed `harness-<region>` repository always (the service pulls that agent-loop image every session, including for a BYO container), plus the resolved repository of a configured `container`. See the AgentCore [execution-role guidance](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html#harness-vpc-managed-ecr)
- An explicit **Deny** on `sts:AssumeRole` (`DenyRoleAssumption`): the harness never switches roles, and the [security guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) notes a caller can override model `additionalParams` (e.g. `aws_role_name`) at invoke time to attempt role assumption from the execution role - this Deny closes that path. It does not affect the role's trust policy (the service assuming the role), only this role assuming others.

Aside from the guardrail `kms:Decrypt` grant above, no CMK grant is included on this role for logging. The log-protection Custom Resource associates the caller-provided KMS key with the service-created log groups directly.

## SSM Parameters

Published under `resourceType: 'harness'`, keyed by `harnessName`:

- `arn` - Harness ARN
- `id` - Harness ID
- `role-arn` - execution role ARN

And, when an `endpoint` is configured, under `resourceType: 'harnessEndpoint'`, keyed by `harnessName`:

- `id` - the harness endpoint's CloudFormation `Ref` (its primary identifier)

No VPC endpoint parameters are published here. Endpoints are VPC-scoped resources owned by the orchestrating module, which creates one set per VPC and passes their security groups in directly.

## Dependencies

- `@aws-mdaa/agentcore-shared`
- `@aws-mdaa/ai-helper`
- `@aws-mdaa/construct`
- `@aws-mdaa/ec2-constructs`
- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/l3-construct`
- `@aws-mdaa/naming`
- `aws-cdk-lib`
- `constructs`
