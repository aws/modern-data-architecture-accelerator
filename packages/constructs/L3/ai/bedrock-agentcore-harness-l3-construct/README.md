# Bedrock AgentCore Harness L3 Construct

This construct deploys an [Amazon Bedrock AgentCore Harness](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html) — a declarative agent loop (model + system prompt + tools) built on AgentCore Runtime.

Like the [Bedrock AgentCore Gateway L3 construct](../bedrock-agentcore-gateway-l3-construct), this package has **no standalone app** — it is meant to be composed into an orchestrating module (e.g. `bedrock-builder`) that owns the shared CMK, guardrails, and gateways it can reference.

## Model support: Amazon Bedrock only

This construct exposes **only** the Harness `bedrockModelConfig` model surface — an Amazon Bedrock foundation-model id / inference-profile id / model ARN, plus the sampling tuning below. The other model-provider formats documented for the Harness (`openAiModelConfig`, `geminiModelConfig`, and the invoke-time LiteLLM route) are **not supported** by MDAA. If you need one of those, raise a feature request. The API format is fixed to the Converse API (`converse_stream`) and is not a config option — the OpenAI-compatible Bedrock Mantle formats are out of scope; see [Model API format](#model-api-format).

> **Application inference profiles are not supported.** `modelId` accepts an on-demand model id, a cross-region (system) inference profile id, or a foundation-model / system inference-profile ARN. An `application-inference-profile/...` ARN is **rejected at synth**. Invoking through any inference profile requires `bedrock:InvokeModel` on the profile _and_ on the foundation model it routes to ([inference-profile prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html)); a system profile id carries its model name so that paired grant is derivable, while an application profile id is opaque. Accepting one would generate an execution role with invoke on the profile alone — deploying cleanly and then failing at first invoke with `AccessDeniedException` — so it fails fast instead. If you need application inference profiles (typically for cost allocation), raise a feature request.

## Features

- **Declarative agent loop**: model, system prompt, `modelConfig` (temperature/topP/maxTokens), maxIterations, timeoutSeconds
- **IAM Role Management**: create-or-reference execution role, scoped to the resolved model ARN (not `*`), plus scoped grants for guardrails and gateways
- **Model API format**: fixed to Converse (`converse_stream`); the harness always calls the model over the Converse API (see below)
- **Guardrail support**: applies a Bedrock Guardrail to the agent loop and grants scoped `bedrock:ApplyGuardrail` (see below)
- **JWT Authorization**: shared `customJwt` / AWS IAM inbound-auth model (same as AgentCore Runtime and Gateway)
- **Tools**: `inline_function` (client-executed) and `agentcore_gateway` (gateway-fronted, `AWS_IAM` outbound auth)
- **Tool allowlist**: `allowedTools` scopes which tools (including the built-in `shell` / `file_operations`) the agent may select at invocation time (see [Tool allowlist](#tool-allowlist))
- **Skills**: filesystem-path skill bundles injected into the runtime image via `skills` (path source only — see [Skills](#skills))
- **Memory**: not supported yet — every harness is deployed with memory disabled (see [Memory](#memory))
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

The orchestrating module passes `gateways: { 'my-gateway': gatewayConstruct.gateway.attrGatewayArn }` — a live in-stack token, no SSM round-trip.

### Guardrails: `config:` references

`guardrail.id` also accepts a `config:<name>` reference into a `guardrails` map of `{ guardrailId, guardrailVersion }`, resolved by the orchestrating module. When `id` is a literal guardrail id (not a `config:` reference), `version` is required.

## Tool allowlist

`allowedTools` restricts which tools the agent may select during an `InvokeHarness` call, including the built-in `shell` and `file_operations` tools the harness runtime ships with. Entries support the AgentCore `allowedTools` patterns: `*`, plain tool names, `@builtin`, `@server/tool`, and globs; 1-64 entries.

To allow all tools (the service default), **omit the property entirely** — do not pass an empty list. The config schema sets `minItems: 1`, so `allowedTools: []` is rejected at config validation. (A direct TypeScript caller passing `[]` is treated as unset, but config authors cannot express it that way.)

```yaml
allowedTools:
  - 'get_order_status'
  - '@builtin'
```

> **Scope:** `allowedTools` only gates LLM tool selection during `InvokeHarness`. It does **not** gate the separate `InvokeAgentRuntimeCommand` API, which executes commands directly without the LLM. To prevent direct command execution, do not grant `bedrock-agentcore:InvokeAgentRuntimeCommand` on the invoking principal.

> **These config values are per-invocation _defaults_, not enforced controls.** Per the [`InvokeHarness` API](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html), a caller can override `model`, `tools`, `allowedTools`, `skills`, `systemPrompt`, `maxIterations`, `maxTokens`, `timeoutSeconds`, and `actorId` at invoke time, and `additionalParams` can redirect inference to an arbitrary endpoint or inject headers. So the guardrail config, `allowedTools` allowlist, truncation strategy, and cost caps this construct sets are starting defaults that a caller with `InvokeHarness` can replace. The **enforcement boundary** is therefore two-fold: (1) who you grant `bedrock-agentcore:InvokeHarness` to (the invoking principal), and (2) application-layer validation of caller-supplied invoke parameters. Config-time hardening still applies where it cannot be overridden — the execution role's IAM grants (including the `sts:AssumeRole` **Deny** below, which no `additionalParams` override can bypass) and the enforced VPC network mode.

## Skills

`skills` injects skill bundles (curated instruction/script sets) into the agent's context by filesystem path — the paths must resolve inside the runtime image (typically a bring-your-own `container`). Only the `path` skill source is exposed; the `git` / `s3` / `awsSkills` sources are **not yet supported**. Raise a feature request if you need them.

```yaml
skills:
  - path: '/opt/skills/support-playbook'
```

## Memory

AgentCore Memory is **not supported** by this construct yet. Every harness is deployed with memory disabled (`Memory: { Disabled: {} }`): no memory resource is created and the execution role receives no memory permissions. There is no `memory` configuration field.

Support for customer-managed-key-encrypted memory is planned for a future release. If you need it, please raise a feature request.

## Container and VPC networking

- **`container.containerUri`** — a pre-built `linux/arm64` ECR image URI supplying the session _environment_ (your dependencies, runtimes, and tools). It does not replace the agent: the service overrides the image's `ENTRYPOINT`/`CMD` and runs it as an environment, while the agent loop comes from the AWS-managed harness image. Only bring-your-own image is supported (no build-from-source), matching the harness's managed-runtime model. The execution role is granted scoped ECR pull on the resolved repository in addition to the always-granted AWS-managed `harness-<region>` repository.
- **`networkConfiguration`** (required) — `securityGroups` (1–16) and `subnets` (1–16) run the harness's runtime sessions in your VPC (`NetworkMode: VPC`) for private access to internal resources.
- **`networkConfiguration.vpcId` + `networkConfiguration.vpcEndpoints`** (optional) — opt in to MDAA-managed VPC endpoints so a VPC-mode harness's sessions have a private outbound path (no NAT/internet). `vpcId` is required whenever `vpcEndpoints` is set.

  Which endpoints get created is **derived** from the harness's own configuration rather than listed, so a needed endpoint cannot be omitted by accident:

  | Endpoint                    | Created                                      | Needed for                                                                                                                                                                   |
  | --------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `bedrock-runtime`           | always                                       | Model inference (Converse). Without it the harness reaches `READY` but every invoke hangs                                                                                    |
  | `ecr.api` / `ecr.dkr`       | always                                       | The session container image pull                                                                                                                                             |
  | `sts`                       | always                                       | Credential vending                                                                                                                                                           |
  | `logs`                      | always                                       | Log delivery                                                                                                                                                                 |
  | `bedrock-agentcore.gateway` | when an `agentcore_gateway` tool is declared | Reaching the gateway's MCP host — a **distinct** service endpoint from the AgentCore data plane; without it the tool load fails with a DNS "Name or service not known" error |
  | `s3` (Gateway)              | when `s3RouteTableIds` is supplied           | Container image **layer** downloads, which come from the ECR layer bucket over S3 rather than through the ECR endpoints                                                      |

  The AgentCore data-plane endpoint (`bedrock-agentcore`) is deliberately **not** created here. Per the AgentCore [PrivateLink docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/vpc-interface-endpoints.html) it serves _inbound_ API connectivity for callers reaching `InvokeHarness` privately — a property of the caller's VPC, not of the harness's session subnets — and it is a per-VPC singleton, so several harnesses in one module could not each create one. Provision it alongside whatever invokes the harness.
  - **`vpcEndpoints.exclude`** — endpoints the VPC already has (from LZA or a central networking team). Only one endpoint with Private DNS is allowed per service per VPC, so an unexcluded duplicate fails to deploy. The same one-per-VPC limit applies **between harnesses**: when two or more harnesses in a module configure endpoints in the same VPC, all but one must `exclude` the shared endpoints (they then reuse the remaining harness's endpoints), and every co-located harness must declare identical `networkConfiguration.securityGroups` — a shared endpoint admits inbound HTTPS only from its creator's security groups, so a harness with different security groups would reach `READY` and then hang at first invoke. Both conditions are enforced at synth for harnesses that configure `vpcEndpoints`; a co-located harness with different security groups and no `vpcEndpoints` block is not currently caught. Place harnesses in separate VPCs to avoid the constraint entirely.
  - **`vpcEndpoints.s3RouteTableIds`** — route tables for the S3 gateway endpoint. A gateway endpoint installs prefix-list routes into route tables rather than placing ENIs in subnets, and imported subnets expose no route table, so they must be named explicitly. **Blast radius:** the endpoint therefore intercepts _all_ S3 traffic from every subnet on those route tables, not just the harness's. MDAA scopes its policy to `s3:GetObject` on the ECR image-layer bucket, so co-located workloads lose S3 access through this endpoint unless their buckets are named in **`vpcEndpoints.additionalS3BucketArns`**. If those workloads need broad S3 access, provision the S3 gateway endpoint out of band instead.

  No endpoint policy is exposed as a config knob. The **supporting** interface endpoints (Bedrock runtime, ECR API/Docker, STS, Logs) carry no policy: each is traversed **outbound** by the AgentCore service and this harness's execution role across a range of actions, and Private DNS makes an interface endpoint VPC-wide, so restricting their actions would deny the harness's own image pulls and break unrelated workloads in the same VPC — access to those is governed by the execution role's identity policy (scoped to the resolved model, gateway, and repository ARNs). Two endpoints are scoped rather than left to the default, because each carries only one kind of legitimate traffic: the **AgentCore Gateway** interface endpoint carries an action-scoped (`bedrock-agentcore:InvokeGateway`) policy — its sole traffic is gateway data-plane invokes, management going to the separate `bedrock-agentcore-control` service — and the **S3 gateway** endpoint is scoped by _resource_ (see above).

> **VPC network isolation is enforced.** Like the AgentCore _Runtime_ construct, the Harness enforces VPC mode: `networkConfiguration` is required and there is no public-network option. This places the harness's runtime sessions behind your own security groups and subnets so egress is governed by your VPC controls (in addition to the harness's scoped IAM execution role), rather than running on the AgentCore-managed public network. Inbound invocation is separately authenticated (AWS IAM SigV4 by default, or `authorizerConfiguration` JWT).

> **No inbound VPC-only enforcement.** Unlike the AgentCore _Runtime_ construct, the Harness cannot attach a resource-based policy restricting _inbound_ invocation to a specific VPC (`aws:SourceVpc`): per the AgentCore [resource-based-policy docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html), the resource-policy API supports Runtime/Endpoint, Gateway, and Memory — not a Harness resource type. The gap matters most for a JWT-authorized harness, where a VPC-endpoint policy cannot restrict OAuth callers (they have no IAM identity) and SCPs cannot bind them, leaving an `aws:SourceVpc` resource-policy condition the only inbound network-boundary lever. Egress is still governed by your VPC — VPC network mode is enforced — so this limitation applies only to the inbound network boundary for OAuth callers.

> **Execution role permissions.** These grants land on the execution role whether it is created here or referenced via `role` — the permission set is attached through a customer-managed policy bound with `roles: [role]` (see [IAM Permissions](#iam-permissions)). Alongside the model, gateway, and observability grants, the role gets: scoped ECR pull on the AWS-managed harness image repository (`harness-<region>`), always — required even when a `container` of your own is configured — and read-only `kms:Decrypt`/`DescribeKey` on the module CMK when a `guardrail` is configured (so guardrail invocation can read the CMK-encrypted guardrail; no encrypt-side access is granted on the shared key).

## Cost controls

- **`maxTokens`** — a global cap on tokens generated across the whole agent-loop invocation. Distinct from `modelConfig.maxTokens`, which bounds a single model call.
- **`lifecycleConfiguration.idleRuntimeSessionTimeout`** / **`maxLifetime`** — idle-session and hard maximum-lifetime session bounds (60–28800 seconds each) on the underlying runtime environment.

## Context truncation

`truncation` controls how the agent loop trims conversation context when it exceeds the model's context window. Omit it to accept the service default. Set `strategy` to one of:

| Strategy         | Tuning fields                                                                           | Behavior                                                      |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `sliding_window` | `messagesCount` (≥ 1)                                                                   | Retain only the most recent `messagesCount` messages          |
| `summarization`  | `preserveRecentMessages` (≥ 0), `summarizationSystemPrompt`, `summaryRatio` (0 < r ≤ 1) | Summarize older context, preserving the newest turns verbatim |
| `none`           | —                                                                                       | Do not truncate                                               |

Tuning fields are validated against the selected strategy at synth: sliding-window tuning with a `summarization` strategy (or vice versa) is rejected rather than silently ignored at deploy.

```yaml
truncation:
  strategy: 'summarization'
  preserveRecentMessages: 5
  summaryRatio: 0.5
```

## Harness endpoint

An optional `endpoint` creates a named, versioned invocation target (`AWS::BedrockAgentCore::HarnessEndpoint`) so callers can pin to a specific harness version for blue/green management. Fields: `name` (alphanumeric + underscores, ≤ 48 chars; defaults to a name derived from the harness name), `description` (1-256 chars), and `targetVersion` (a numeric version string, `^([1-9][0-9]{0,4})$`).

> **`targetVersion` must be set explicitly to pin.** Omitting it does **not** freeze the endpoint: it defaults to the harness's _current_ version (`CfnHarness.attrVersion`), which the service increments on every successful update, so the endpoint re-points on each redeploy. That default is deliberate — a create-time pin would otherwise leave the endpoint serving v1 forever, and invoking a stale version whose execution role was replaced fails with "execution role cannot be assumed". For blue/green, set `targetVersion` explicitly to the version you want held.

```yaml
endpoint:
  name: 'prod'
  description: 'Production endpoint pinned to a released harness version'
```

## Data protection and log retention

The Harness's service-created log groups always carry a CloudWatch Logs Data Protection policy that masks a floor of PII identifiers and are always CMK-encrypted — neither can be disabled. The optional `dataProtection` block is **additive**: it can only tighten the posture by adding identifiers on top of the built-in floor.

`logRetentionDays` sets the retention applied to those same log groups. **Omit it and retention is indefinite** — logs are kept, and billed, forever. It accepts any CloudWatch Logs retention value (e.g. `7`, `30`, `90`, `365`), plus `9999` (`RetentionDays.INFINITE`) to lock never-expire into config explicitly rather than relying on omission. For a finite value, retention, the CMK, and the masking policy are all applied by the same log-protection Custom Resource after the service creates the groups; `9999` and omission both apply no retention policy (never-expire).

## Model API format

The API protocol (and Amazon Bedrock endpoint) the harness uses to call the model is fixed — it is not a config option. The harness always uses Converse:

| Value             | Endpoint                     | Notes                                                                   |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `converse_stream` | `bedrock-runtime` (Converse) | Service default; **the only format compatible with Bedrock Guardrails** |

Every harness always renders `ApiFormat: converse_stream`; there is no field to change it.

The OpenAI-compatible Bedrock Mantle formats (`responses` / `chat_completions`) are **out of scope**. They route to a physically separate `bedrock-mantle` endpoint host, for which this construct provisions no VPC-mode private route (see the NOTE in `lib/vpc-endpoints.ts`); Converse is also the only format compatible with guardrails. Adding the Mantle formats would require VPC-endpoint changes and is deferred to a feature request.

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

The execution role is either **created** (an `MdaaRole` trusting `bedrock-agentcore.amazonaws.com`, scoped via `aws:SourceAccount` + an `aws:SourceArn` of `arn:<partition>:bedrock-agentcore:<region>:<account>:*` — service-wide within the account/region, deliberately **not** narrowed to a `harness/<harnessName>-*` prefix, because the ARN the AgentCore control plane presents at harness-creation role validation is not the harness ARN and any `harness/` prefix fails validation deterministically; `aws:SourceAccount` therefore carries the confused-deputy protection) or **referenced** via `role` (an `MdaaRoleRef`). Either way the permission set is attached through a customer-managed policy bound with `roles: [role]`, so a referenced role receives the same grants (a referenced role is otherwise deployed with no permissions and fails at first invoke). The permission set mirrors the [AgentCore Harness sample execution-role policy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) statement-for-statement (each `Sid` matches the doc), scoped tighter than the doc's broad samples where possible. It grants:

- `bedrock:InvokeModel` / `InvokeModelWithResponseStream` (+ `GetInferenceProfile` for inference profiles), scoped to the resolved model ARN (the doc samples all foundation models but recommends scoping down). For a cross-region inference-profile id, a second `bedrock:InvokeModel*` statement grants the underlying foundation-model ARN (region-wildcarded, since destination regions are not knowable at synth) gated by the `bedrock:InferenceProfileArn` condition — required because invoking through a profile also authorizes against the destination-region foundation model, so the profile ARN alone would fail with `AccessDeniedException`
- X-Ray tracing (`PutTraceSegments` / `PutTelemetryRecords` / `GetSamplingRules` / `GetSamplingTargets`)
- CloudWatch Logs: `CreateLogGroup` / `DescribeLogStreams` on the runtime log-group prefix, `CreateLogStream` / `PutLogEvents` on its `:log-stream:*`, `DescribeLogGroups` on `log-group:*`, and `PutResourcePolicy` scoped to the `/aws/bedrock-agentcore/runtimes/*` log-group prefix (not a bare `*` — `PutResourcePolicy` is permission-management and does honor its `resourceArn`); plus `cloudwatch:PutMetricData` restricted to the `bedrock-agentcore` metrics namespace
- AgentCore workload-identity tokens (`GetWorkloadAccessToken` / `GetWorkloadAccessTokenForJWT`) on the `default` directory / this harness's `harness_<harnessName>*` workload prefix (the service names the workload identity `harness_<HarnessName>-<hash>`)
- The built-in AWS-managed browser and code-interpreter tool actions, scoped to the AWS-owned `browser/*` and `code-interpreter/*` prefixes
- `bedrock:ApplyGuardrail`, scoped to the resolved guardrail ARN, when a guardrail is configured (a `guardrail.id` given as a full `arn:...:guardrail/...` is used verbatim; a bare id is wrapped into the account/region guardrail ARN), plus read-only `kms:Decrypt` / `kms:DescribeKey` on the module CMK (`GuardrailKmsDecrypt`) so a CMK-encrypted guardrail can be read — no encrypt-side access (`kms:GenerateDataKey`) is granted
- `bedrock-agentcore:InvokeGateway`, scoped to the resolved gateway ARN(s), when one or more `agentcore_gateway` tools are configured
- Harness-image ECR pull permissions (`ecr:GetDownloadUrlForLayer` / `BatchGetImage` / `BatchCheckLayerAvailability`) plus the resource-less `ecr:GetAuthorizationToken` (`HarnessImageEcrPull` / `HarnessImageEcrToken`), always granted so the runtime can pull its container images from private ECR. Two repositories are in scope and the grants are **additive, not one-or-the-other**: the AWS-managed `harness-<region>` repository always (the service pulls that agent-loop image every session in VPC mode, including for a BYO container; its account segment is wildcarded because it is AWS-service-owned and varies by region), plus the resolved repository of a configured `container`. See the AgentCore [execution-role guidance](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html#harness-vpc-managed-ecr)
- An explicit **Deny** on `sts:AssumeRole` (`DenyRoleAssumption`): the harness never switches roles, and the [security guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) notes a caller can override model `additionalParams` (e.g. `aws_role_name`) at invoke time to attempt role assumption from the execution role — this Deny closes that path. It does not affect the role's trust policy (the service assuming the role), only this role assuming others.

Aside from the guardrail `kms:Decrypt` grant above, no CMK grant is included on this role for logging. The log-protection Custom Resource associates the caller-provided KMS key with the service-created log groups directly (matching the AgentCore Runtime construct's pattern).

## SSM Parameters

Published under `resourceType: 'harness'`, keyed by `harnessName`:

- `arn` — Harness ARN
- `id` — Harness ID
- `role-arn` — execution role ARN

And, when an `endpoint` is configured, under `resourceType: 'harnessEndpoint'`, keyed by `harnessName`:

- `id` — the harness endpoint's CloudFormation `Ref` (its primary identifier)

And, when `networkConfiguration.vpcEndpoints` creates MDAA-managed interface endpoints, one parameter per interface endpoint under `resourceType: 'vpc-endpoint'`, keyed by `harness-<harnessName>-<endpointName>`:

- `id` — the interface endpoint's VPC endpoint id. Gateway-type endpoints (S3) are not published: traffic reaches them via route-table prefix lists rather than by connecting to an id.

## Dependencies

- `@aws-mdaa/agentcore-shared`
- `@aws-mdaa/ai-helper`
- `@aws-mdaa/construct`
- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/l3-construct`
- `@aws-mdaa/naming`
- `aws-cdk-lib`
- `constructs`
