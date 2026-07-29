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
- **KMS Key** — Customer-managed encryption key for the CloudWatch log groups.
- **CloudWatch Data Protection Policy** — PII masking policy applied to the log groups on ingestion. Extendable via `dataProtection.additionalIdentifiers`.
- **SSM Parameters** — Runtime ARN, Runtime ID, Runtime Name, and optionally Endpoint ARN/ID stored in Parameter Store for cross-module reference.

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

Deploys an agent runtime using a pre-built ECR container image with VPC networking, JWT authentication, IAM policies, header forwarding, and lifecycle management. Start here when evaluating all available options for securing and managing a production AgentCore runtime.

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

### Troubleshooting

For common deployment issues and their solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Common issues:

- [X-Ray Transaction Search Config Already Exists](./TROUBLESHOOTING.md#x-ray-transaction-search-config-already-exists) - `AlreadyExists` error during deployment
- [Cross-Account ECR Access Denied](./TROUBLESHOOTING.md#cross-account-ecr-access-denied) - `Failed to pull image` error in cloudwatch logs

---

[Config Schema Docs](SCHEMA.md)
