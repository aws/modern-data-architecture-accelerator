# Bedrock AgentCore Gateway L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock AgentCore Gateways — managed MCP (Model Context Protocol) servers that front an agent's tools.

It is an orchestration (L3) construct: it wires the gateway's dependencies — a caller-provided always-on customer-managed KMS CMK, a scoped execution role (resolve-or-reference), and any interceptor Lambda functions — into the compliant `MdaaAgentcoreGateway` L2 construct (`@aws-mdaa/bedrock-constructs`), which wraps the typed stable `aws-cdk-lib.aws_bedrockagentcore.CfnGateway` and owns the gateway-resource compliance invariants (CMK always applied, inbound authorizer restricted to `CUSTOM_JWT`/`AWS_IAM`, `protocolType` always `MCP`, name sanitized to the gateway pattern).

## Features

- **Compliance-by-Default Encryption**: A caller-provided customer-managed KMS CMK is always applied; the gateway is never left on an AWS-managed key
- **IAM Role Management**: Automatic creation of a scoped gateway execution role (resolve-or-reference) with a trust policy constrained by `aws:SourceAccount` / `aws:SourceArn`
- **Inbound Authorization**: Configure `CUSTOM_JWT` (OIDC) or `AWS_IAM` inbound auth; `NONE` and `AUTHENTICATE_ONLY` are rejected for compliance
- **JWT Access Control**: Audience and client matching for inbound authorization (OAuth scope gating and custom-claim matching are planned — see JWT Authorizer)
- **Lambda Interceptors**: Attach REQUEST/RESPONSE interceptors (the per-tool authorization mechanism) with `passRequestHeaders` defaulting to `false`. Each interceptor's Lambda is either defined inline and deployed by MDAA (via the shared MDAA Lambda construct) or referenced by ARN (`lambdaArn`) when already deployed by an orchestrating module
- **MCP Protocol Configuration**: Set MCP instructions, semantic search, and supported protocol versions
- **Tool Targets**: Register Lambda tool sources via a `targets` map; MDAA creates one `AWS::BedrockAgentCore::GatewayTarget` per entry, scoped to this gateway, with a scoped `lambda:InvokeFunction` grant on the execution role
- **SSM Parameter Storage**: Automatic storage of gateway ARN, ID, MCP URL, role ARN, and KMS key ARN

## Usage

```typescript
import { BedrockAgentcoreGatewayL3Construct } from '@aws-mdaa/bedrock-agentcore-gateway-l3-construct';

const gateway = new BedrockAgentcoreGatewayL3Construct(this, 'MyGateway', {
  gatewayName: 'my-gateway',
  description: 'MCP gateway for development tools',
  authorizerConfiguration: {
    customJwt: {
      discoveryUrl: 'https://cognito-idp.region.amazonaws.com/pool/.well-known/openid-configuration',
      allowedAudience: ['client-id'],
    },
  },
  protocolConfiguration: {
    instructions: 'Use these tools to query the data lake',
    searchType: 'SEMANTIC',
    supportedVersions: ['2025-06-18'],
  },
  interceptors: [
    {
      interceptionPoints: ['REQUEST'],
      passRequestHeaders: false,
      lambdaFunction: {
        functionName: 'auth-interceptor',
        srcDir: '../lambda/auth',
        handler: 'index.handler',
        runtime: 'python3.13',
        roleArn: 'ssm:/{{org}}/shared/generated-role/interceptor-role/arn',
      },
    },
  ],
  naming: naming,
  roleHelper: roleHelper,
});
```

## Configuration Options

### Gateway Properties

- `gatewayName`: Name of the gateway (required). MDAA-named and sanitized to the gateway pattern `^([0-9a-zA-Z][-]?){1,48}$` (no underscores)
- `description`: Optional description. 1-200 characters (no character-set restriction)
- `authorizerConfiguration`: Inbound authorization (optional, shared with the AgentCore Runtime module). Provide `customJwt`, or omit it for AWS IAM (see Inbound Authorization). `NONE` and `AUTHENTICATE_ONLY` are not exposed
- `protocolConfiguration`: MCP protocol configuration (see below)
- `interceptors`: Lambda interceptor configuration (max 2)
- `exceptionLevel`: Error detail level; only `DEBUG` is settable (omit for the secure service default, INFO). `DEBUG` increases the verbosity of the exception detail the gateway exposes in responses and logs — this can include sensitive internal error/stack and request context — so enable it only for troubleshooting and do not leave it on in production
- `targets`: Map of tools to register against the gateway, keyed by a logical target name (see Targets)
- `kmsKey`: **Required.** The customer-managed CMK, resolved and provided by the caller (the gateway is a pure key consumer — it does not create, import, or mutate a key; the provisioner owns the key and its grants — see KMS Encryption)
- `role`: Reference (`MdaaRoleRef` — by `name`, `arn`, or `id`) to an existing gateway execution role; if omitted, a role is auto-created. Either way MDAA attaches the gateway's required permissions to the resolved role (see IAM Permissions). There is no separate "extra policies" field — to grant more, define a full role in a roles module and reference it here
- `logDelivery`: Gateway audit log delivery (optional; omit for the compliant default). Controls the CMK-encrypted CloudWatch Logs vended delivery pipeline — see [Audit Logging](#audit-logging)

### JWT Authorizer

- `discoveryUrl`: OIDC discovery URL (required; must end with `/.well-known/openid-configuration`)
- `allowedAudience`: Array of allowed audience values (optional)
- `allowedClients`: Array of allowed client IDs (optional)

The `customJwt` shape is shared with the AgentCore Runtime module (`@aws-mdaa/agentcore-shared`). OAuth scope gating (`allowedScopes`) and custom-claim matching (`customClaims`) are not currently exposed; they are tracked as a follow-up to add to both modules together.

### MCP Protocol Configuration

Currently, MCP is the only protocol the gateway service supports, so `protocolType` is always `MCP` (the construct sets it; it is not user-configurable). `supportedVersions` selects which MCP protocol _versions_ the gateway accepts - these are MCP versions, not alternative protocols.

- `instructions`: System instructions surfaced to agents via MCP
- `searchType`: `SEMANTIC` (enables natural-language tool discovery); omit to disable (the service has no `NONE` value)
- `supportedVersions`: Array of supported MCP protocol versions

Note: semantic search can only be enabled at gateway creation time and is immutable afterward.

### Interceptors

Each interceptor supplies exactly one Lambda source — either an **inline** `lambdaFunction` (MDAA deploys it via the shared `LambdaFunctionL3Construct`, encrypted with the gateway CMK, and wires the gateway to its ARN) or a **by-ref** `lambdaArn` (an already-deployed function, wired without MDAA deploying it). This construct itself has no shared `lambdaFunctions` block; the `lambdaArn` mode is how an orchestrating module (e.g. bedrock-builder, which deploys interceptor Lambdas once in its shared `lambdaFunctions` pool) passes a resolved ARN in.

- `interceptionPoints`: Non-empty subset of `['REQUEST', 'RESPONSE']`
- `lambdaFunction` (optional): Inline function definition (`functionName`, `srcDir`, `handler`, `runtime`, `roleArn`, and the other `FunctionProps` fields), deployed by MDAA. The function's own execution role is supplied via `roleArn` — define it in a roles module and reference it (consistent with how the gateway role is handled). Provide exactly one of `lambdaFunction` or `lambdaArn`
- `lambdaArn` (optional): ARN of an already-deployed Lambda to invoke as the interceptor, as an alternative to `lambdaFunction`. MDAA does not deploy the function; it wires the gateway to this ARN and grants the execution role scoped `lambda:InvokeFunction` on it. Provide exactly one of `lambdaFunction` or `lambdaArn`
- `passRequestHeaders`: Whether to pass inbound request headers to the interceptor (default: `false`)

Note: a gateway supports at most one REQUEST and one RESPONSE interceptor (2 total). Request headers may contain sensitive authorization tokens, so `passRequestHeaders` defaults to `false`. The gateway execution role is auto-granted scoped `lambda:InvokeFunction` on each deployed interceptor function.

Interceptor Lambda functions are customer code. Make them idempotent (the gateway may retry on failure or timeout) and avoid logging request headers or other sensitive data.

To reference a pre-existing interceptor Lambda instead of defining one inline, set `lambdaArn` in place of `lambdaFunction`. Shared Lambda layers are not provisioned by the gateway — if an inline interceptor function needs a layer, deploy it elsewhere and reference it via the function's `layerArns`.

```yaml
interceptors:
  - interceptionPoints: [REQUEST]
    passRequestHeaders: false
    lambdaFunction:
      functionName: auth-interceptor
      srcDir: ../lambda/auth
      handler: interceptor.handler
      runtime: python3.13
      roleArn: ssm:/{{org}}/shared/generated-role/interceptor-role/arn
```

### Targets

Targets register the tools the gateway hosts. Set the `targets` map (keyed by a logical target name); the gateway L3 creates one `AWS::BedrockAgentCore::GatewayTarget` per entry via the compliant `MdaaAgentcoreGatewayTarget` L2 construct (`@aws-mdaa/bedrock-constructs`), which owns the target-resource invariants (name sanitized, tool-schema validated, `GATEWAY_IAM_ROLE` credential, per-target SSM outputs). Because the gateway and its targets deploy in one stack, each target is wired to the gateway in-process (the gateway identifier is read from the gateway object — no SSM round-trip) and takes an explicit CloudFormation dependency on the gateway.

For a Lambda tool source, the execution role is granted scoped `lambda:InvokeFunction` on the target tool Lambdas via a **single consolidated** managed policy covering all Lambda target ARNs (deduped) — one policy regardless of target count, so the shared role stays well under the IAM attached-managed-policy limit. Each Lambda target also depends on that policy so the role can invoke the tool before the service synchronizes the target.

Each target's `targetConfiguration` sets exactly one tool source. The configuration surface covers all AWS target types (`lambda`, `openApiSchema`, `smithyModel`, `mcpServer`, `apiGateway`) so it is stable as support is added; **`lambda` is the currently supported type** — any other is rejected at synth as not yet supported. A Lambda tool source sets `lambda.lambdaArn` and a `lambda.toolSchema` (exactly one of `inlinePayload` or `s3`); the credential provider defaults to `GATEWAY_IAM_ROLE` and is currently restricted to it.

Targets take no KMS key of their own: encryption at rest is gateway-scoped (the gateway CMK encrypts the gateway and its target configurations), and `AWS::BedrockAgentCore::GatewayTarget` exposes no KMS parameter. Target types that need encryption (e.g. an OAuth credential-provider secret, or a CMK-encrypted S3 tool schema) rely on the key of that other resource (the secret / the bucket), not the gateway CMK.

#### Target Properties

- `description`: Optional target description (1-200 characters; validated at synth)
- `targetConfiguration`: The tool source — exactly one target type. Currently `lambda`:
  - `targetConfiguration.lambda.lambdaArn`: ARN of the tool Lambda; the gateway role is granted scoped `lambda:InvokeFunction` on exactly this ARN
  - `targetConfiguration.lambda.toolSchema`: The tool catalog the Lambda exposes (tool name + input/output JSON schema, advertised to agents and dispatched to the Lambda). Exactly one of:
    - `inlinePayload`: array of tool definitions (`name`, `description`, `inputSchema`, optional `outputSchema`)
    - `s3`: a tool-schema document in S3 (`{ uri, bucketOwnerAccountId? }`). To keep a tool schema as a file in the source tree, upload it to a bucket you own (e.g. an `MdaaBucket`) and reference the object here. No `s3:GetObject` grant is added to the execution role — the tool schema is read by the deploying (control-plane) principal at `CreateGatewayTarget`, not by the gateway at runtime
    - See the [AWS tool-schema examples](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html#gateway-lambda-example)
- `credentialProvider`: Optional; defaults to `{ type: 'GATEWAY_IAM_ROLE' }` (currently the only supported value)

##### Tool naming (Lambda handler must strip the target-name prefix)

AgentCore Gateway prefixes every tool with the name of the target it is served through, so that tools from different targets never collide in the gateway's unified catalog. The tool name visible over MCP follows the pattern `${target_name}___${tool_name}` (three underscores) — e.g. a target providing `getWeather` surfaces as `<target-name>___getWeather`. See [Understand how AgentCore Gateway tools are named](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-tool-naming.html).

**MDAA-named target exception.** Like every other MDAA resource (and consistent with the AgentCore Runtime construct), the target name is MDAA-named: the map key is prefixed with `org-env-domain-module` and sanitized to the service's name pattern (`^([0-9a-zA-Z][-]?){1,100}$`). This makes the target name - and therefore the tool-name prefix - deployment-specific and long (e.g. `acme-prod-datalake-tools-weather___getWeather`). This is intentional: it keeps target names governed and unique per environment, and because each environment deploys its own gateway (its own MCP endpoint) and target names are unique only _within a gateway_, tool catalogs never span gateways - the full prefix introduces no cross-gateway collision.

**Impact on your Lambda: none beyond what AWS already requires.** A Lambda target handler must strip the target-name prefix from the incoming tool name regardless of how the target is named - this is an AWS requirement for _all_ Lambda targets, not an MDAA one. AWS's published handler boilerplate strips by splitting on the `___` delimiter and keeping the tail, so it is independent of the prefix's length or content (the MDAA prefix needs no special handling). The tool name is delivered on the Lambda `context` object as `bedrockAgentCoreToolName` - see [Lambda function input format](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html#gateway-building-lambda-input):

```python
def lambda_handler(event, context):
    delimiter = "___"
    original_tool_name = context.client_context.custom['bedrockAgentCoreToolName']
    tool_name = original_tool_name[original_tool_name.index(delimiter) + len(delimiter):]
    # dispatch on tool_name (e.g. "getWeather"), NOT on the full prefixed name
```

##### S3 tool-schema bucket owner (confused-deputy protection)

When a target reads its tool schema from S3 (`targetConfiguration.lambda.toolSchema.s3`), the gateway reads that object across a trust boundary using its own (service) identity. Without an owner check, a bucket name that is later re-pointed at an attacker-owned bucket (or a typo'd name claimed by another account) would be read anyway — the classic S3 [confused-deputy](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html) risk. `bucketOwnerAccountId` binds the read to a specific owner account.

MDAA applies this protection **by default**: if you set `s3` without `bucketOwnerAccountId`, the L3 defaults it to the **deploying account** (`Stack.of(this).account`) — correct for the common case of an account-local tool-schema bucket. To read a tool schema from a bucket in **another** account, set `bucketOwnerAccountId` explicitly to that account; an explicit value is always respected and never overwritten. Inline tool schemas are unaffected (no S3 read).

Per target, SSM parameters are published under resource type `gateway-target` keyed by the target name: the target ARN (`.../gateway-target/{name}/arn`, sourced from the resource's `GatewayArn` attribute) and target id (`.../gateway-target/{name}/id`).

```yaml
targets:
  weather:
    description: Weather tools
    targetConfiguration:
      lambda:
        lambdaArn: arn:aws:lambda:us-east-1:111122223333:function:weather-tool
        toolSchema:
          inlinePayload:
            - name: getWeather
              description: Returns the weather for a city
              inputSchema:
                type: object
                properties:
                  city:
                    type: string
                required: [city]
```

A larger tool schema can be kept as a file, uploaded to a bucket you own (e.g. an `MdaaBucket`), and referenced by its S3 object:

```yaml
targets:
  catalog:
    targetConfiguration:
      lambda:
        lambdaArn: arn:aws:lambda:us-east-1:111122223333:function:catalog-tool
        toolSchema:
          s3:
            uri: s3://my-schema-bucket/catalog-tools.json
```

### KMS Encryption

- `kmsKey`: **Required.** The customer-managed CMK is resolved and provided by the caller (the orchestrating module/app), mirroring the Bedrock Knowledge Base construct — the gateway is a pure key consumer: it does not create, import, or mutate the key, so it is never left on an AWS-managed key. The gateway's `KmsKeyArn` is always populated from the provided key.

The key's policy must grant (added by whoever provisions the key, not by this construct):

- The gateway execution role: `kms:DescribeKey`, `kms:Decrypt`, `kms:GenerateDataKey` (scoped via `kms:ViaService` to `bedrock-agentcore.{region}.amazonaws.com`), plus `kms:CreateGrant` constrained to an `EncryptionContextSubset` grant whose operations are limited to `Decrypt`/`GenerateDataKey`. These mirror the [AWS gateway encryption prerequisites](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-encryption.html).
- The two CloudWatch Logs grants required for CMK-encrypted vended log delivery (see [Audit Logging](#audit-logging)).

Keeping all key grants with the key's provisioner (rather than split across the consuming constructs) mirrors the bedrock-builder pattern, where the shared-key construct owns every grant its consumers need and the consumers just use the key.

Note: in a KMS key policy, `Resource: "*"` means "this key" (the key the policy is attached to) and is the only valid value — it is not a broad-resource grant.

## Inbound Authorization

Inbound authorization is set via the optional `authorizerConfiguration` object (shared with the AgentCore Runtime module). Provide `customJwt`, or omit it (or the whole `authorizerConfiguration`) to fall back to AWS IAM:

- `customJwt`: validates inbound JWTs against the configured OIDC provider, with optional audience and client matching. Maps to AWS `authorizerType: CUSTOM_JWT`.
- omitted: callers authorize with IAM SigV4; no configuration is needed. Maps to AWS `authorizerType: AWS_IAM`.

```yaml
# Custom JWT
authorizerConfiguration:
  customJwt:
    discoveryUrl: https://auth.example.com/.well-known/openid-configuration
    allowedAudience: [my-app]

# or AWS IAM — omit authorizerConfiguration entirely (or leave it empty)
```

The service also accepts two authorizer types that MDAA does not expose:

- `NONE` — leaves the gateway unauthenticated and open. Never compliant.
- `AUTHENTICATE_ONLY` — verifies only that the caller is an authenticated AWS principal (valid credentials) and performs no authorization check, so **any** authenticated AWS principal can invoke the gateway. This is a weaker security posture than `AWS_IAM` (which authorizes the specific caller) and does not meet MDAA's requirement for explicit per-caller authorization, so it is rejected.

Per-tool, per-operation, and per-parameter authorization is handled by Lambda interceptors. Cedar / AgentCore Policy (`policyEngineConfiguration`) is out of scope for this module and is never set.

## Semantic Search

When `protocolConfiguration.searchType` is set to `SEMANTIC`, the gateway exposes natural-language tool discovery. Semantic search is immutable after creation, so enable it here at creation time if you need it.

### Deploy-time IAM prerequisite (important)

Creating a gateway with `searchType: SEMANTIC` requires the **deploying principal** to hold `bedrock-agentcore:SynchronizeGatewayTargets`. AWS requires this on the _creating_ identity, not the gateway execution role (see the [AWS gateway-create docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-create.html): "For an identity to create a gateway with semantic search, ensure that it has permissions to use the `bedrock-agentcore:SynchronizeGatewayTargets` IAM action").

It is a control-plane permission and is intentionally **NOT** granted to the gateway execution role by this construct — synchronization is done by the operator/deployer, not the role the gateway service assumes at runtime (granting it to the execution role would be a least-privilege violation and wouldn't help the create call anyway, since the deployer's session predates any stack-added policy). If missing, the `CreateGateway` operation fails with an access-denied error and the stack rolls back. (A gateway without semantic search — the default — does not need it.)

See **Deploy-time prerequisites** under IAM Permissions for the full list of permissions the deploying principal needs.

## Audit Logging

Gateway invocation/audit logs are **captured and CMK-encrypted by default**. Unlike the AgentCore Runtime - which auto-creates a service log group that the runtime module then discovers and CMK-encrypts - the AgentCore service **does not configure any log destination for a gateway by default**. Per the AWS observability documentation ([Add observability to your AgentCore resources](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)): _"for memory, gateway, and built-in tool resources, AgentCore doesn't configure log destinations for you automatically."_ Because there is no service-created log group to discover, the runtime module's discover-and-encrypt approach does not apply here; this construct therefore **actively provisions** a vended log-delivery pipeline (via the shared `createMdaaVendedLogDelivery` helper in `@aws-mdaa/cloudwatch-constructs`, also used by the Bedrock Knowledge Base module): a CMK-encrypted destination log group plus a delivery source on the gateway ARN -> a delivery destination -> a delivery.

By default the construct creates:

- A CloudWatch Logs **destination log group** named `/aws/vendedlogs/bedrock-agentcore/gateway/APPLICATION_LOGS/<mdaa-named-segment>`, encrypted with the gateway CMK, with **indefinite retention** so audit logs are never silently dropped if an operator forgets to set a window (matching the audit-log retention default used across MDAA, e.g. the Bedrock Knowledge Base and Bedrock Settings modules).
- A **vended delivery pipeline**: a delivery **source** on the gateway ARN (log type `APPLICATION_LOGS`) → a delivery **destination** on the log group → a **delivery** linking them.

Configure it via the optional `logDelivery` property:

- `logDelivery.logRetentionDays`: retention (in days) for the destination log group. Must be a valid CloudWatch Logs `RetentionDays` value (e.g. `7`, `30`, `90`, `365`), or `9999` (`RetentionDays.INFINITE`) for explicit never-expire. Omit it for indefinite retention (the default). Set a finite value for cost control or a bounded compliance window.
- `logDelivery.enabled`: set to `false` to opt out of the pipeline entirely (not recommended — gateway audit logs are then not captured). Defaults to `true`.

```yaml
# Compliant default — omit logDelivery entirely (CMK-encrypted CWL destination, indefinite retention)

# Custom retention
logDelivery:
  logRetentionDays: 90

# Opt out (not recommended)
logDelivery:
  enabled: false
```

**KMS grants (on the key's provisioner, not this construct).** This construct adds no grants to the CMK — it only encrypts the destination log group with it. The key's provisioner must add two scoped statements to the CMK's policy, each constrained by the destination log-group ARN via the `kms:EncryptionContext:aws:logs:arn` condition (`ArnEquals` on `arn:{partition}:logs:{region}:{account}:log-group:<destination-log-group-name>`, no trailing `:*`; the destination log group is `/aws/vendedlogs/bedrock-agentcore/gateway/APPLICATION_LOGS/<mdaa-named-segment>`):

- `logs.{region}.amazonaws.com` — the CloudWatch Logs at-rest grant required to create/encrypt the destination log group: `kms:Encrypt*`, `kms:Decrypt*`, `kms:ReEncrypt*`, `kms:GenerateDataKey*`, `kms:Describe*`.
- `delivery.logs.amazonaws.com` — the minimal vended-delivery grant so the pipeline can write CMK-encrypted records: `kms:GenerateDataKey`, `kms:Decrypt`.

Without both grants, the CMK-encrypted log group / delivery fails at deploy with `AccessDenied` and the stack rolls back. Keeping these grants with the key's provisioner (rather than in this construct) matches the bedrock-builder pattern and lets one shared key serve multiple log-delivery consumers.

## IAM Permissions

MDAA attaches to the gateway execution role only the permissions the gateway's runtime identity actually needs:

- `lambda:InvokeFunction` scoped to each configured interceptor Lambda ARN (only when interceptors are configured)
- KMS use on the caller-provided CMK (see KMS Encryption)

With no interceptors, the execution role carries no MDAA-attached identity policy at all (only its trust policy plus the KMS key-policy grant). These are the only permissions MDAA attaches; the module owns them so the gateway works out of the box.

Deliberately **not** granted (least privilege):

- **No CloudWatch Logs permissions** on the execution role. AgentCore gateways do not write logs via the execution role — they use CloudWatch vended log delivery (`delivery.logs.amazonaws.com`), and the AWS gateway service-role prerequisites grant no `logs:*` actions. The construct creates a CMK-encrypted destination log group and vended delivery pipeline (see **Audit Logging**); the CWL / vended-delivery KMS grants live on the key's provisioner and target the **service principals** (`logs.{region}.amazonaws.com` and `delivery.logs.amazonaws.com`), not the execution role — the execution role receives no `logs:*` and no log-group permissions.
- **No `bedrock-agentcore:SynchronizeGatewayTargets`** — a deploy-time control-plane permission for the deploying principal (see Deploy-time prerequisites below), not the execution role.
- **No config field for arbitrary extra permissions** (see Role Patterns) — this keeps a role's full grant surface auditable in one place rather than split across the roles module and the gateway config.

### Deploy-time prerequisites (on the deploying principal, not the execution role)

These permissions are needed by the identity that runs CloudFormation / `cdk deploy` (in MDAA, the CDK CloudFormation execution role, `cdk-hnb659fds-cfn-exec-role-<account>-<region>` by default), not by the gateway execution role. With the default `AdministratorAccess` CloudFormation execution policy (CDK's default, and MDAA's documented example) they are already covered; a scoped-down execution role must include them:

- **`iam:CreateServiceLinkedRole`** — required for AgentCore service-linked roles (per the `aws-cdk-lib/aws-bedrockagentcore` construct-library README, which notes this for the CDK deployment role across all AgentCore primitives).
- **`bedrock-agentcore:SynchronizeGatewayTargets`** — required only when creating a gateway with `searchType: SEMANTIC` (see Semantic Search). Missing it makes the `CreateGateway` operation fail with an access-denied error and the stack rolls back.

### Role Patterns

The execution role follows two patterns (mirroring `bedrock-builder`):

1. **Reference a fully-defined role** via `role` (an `MdaaRoleRef` by `name`, `arn`, or `id` — e.g. a role shared across gateways, resolved from SSM by id). The role is defined completely in a roles module; this construct only adds the gateway-required permissions above. If the gateway needs more than those, add it to the role's definition in the roles module — not to the gateway config.
2. **Auto-create in place** by omitting `role`. MDAA creates an `MdaaRole` whose trust policy allows `bedrock-agentcore.amazonaws.com` to assume it, constrained by `aws:SourceAccount` and an `aws:SourceArn` scoped to this gateway's ARN prefix (`gateway/<gateway-name>-*`).

In both cases the `lambda:InvokeFunction` interceptor permission is attached via `roles: [role]`, so a referenced role does not need to be mutable. (The role's KMS use of the CMK is granted on the key's resource policy by the key's provisioner, not here.) The one exception is a referenced role that resolves as immutable (for example a cross-account role): CDK cannot attach managed policies to it, so the operator must pre-provision the gateway permissions on that role.

## SSM Parameters

The construct stores the following information in SSM Parameter Store (resource type `gateway`, resource id the gateway name):

- Gateway ARN: `.../gateway/{gateway-name}/arn`
- Gateway ID: `.../gateway/{gateway-name}/id`
- Gateway MCP URL: `.../gateway/{gateway-name}/url`
- Role ARN: `.../gateway/{gateway-name}/role-arn`
- KMS Key ARN: `.../gateway/{gateway-name}/kms-key-arn`

These outputs let downstream modules (for example, gateway targets) resolve the gateway without hardcoding ARNs.

## Dependencies

- `@aws-mdaa/agentcore-shared`
- `@aws-mdaa/bedrock-constructs`
- `@aws-mdaa/cloudwatch-constructs`
- `@aws-mdaa/construct`
- `@aws-mdaa/dataops-lambda-l3-construct`
- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/l3-construct`
- `@aws-mdaa/naming`
- `aws-cdk-lib`
- `constructs`
