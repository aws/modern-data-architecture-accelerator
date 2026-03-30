# Bedrock AgentCore Runtime

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/bedrock-agentcore-runtime-app/index.html).

Deploys Amazon Bedrock AgentCore Runtimes with custom Docker containers, VPC networking, JWT authentication, and lifecycle management. Supports both pre-built ECR images and building from local source code. Use this module when you need to run custom AI agent logic in your own containers with full control over the runtime environment and authentication.

---

## Deployed Resources

This module deploys and integrates the following resources:

<!-- TODO: Add architecture diagram -->

- **Bedrock AgentCore Runtime** — Custom agent runtime deployed in VPC mode. Supports Docker containers from ECR or built from source at deploy time.
- **Bedrock AgentCore Runtime Endpoint** (Optional) — API endpoint for invoking the agent runtime via Bedrock AgentCore APIs.
- **ECR Docker Image Asset** — Container image built and pushed to ECR at deploy time (when using `codePath`).
- **IAM Execution Role + Managed Policy** — Runtime execution role with permissions for ECR image access, CloudWatch Logs, X-Ray tracing, CloudWatch Metrics, Bedrock AgentCore workload identity tokens, and Bedrock model invocation. Can use an existing role via `roleArn` or auto-create one.
- **CloudWatch Log Group** — Log group for runtime execution logs.
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
  - CloudWatch log groups encrypted per account settings
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

| AWS Service         | Endpoint Service Name                          | Type      |
| ------------------- | ---------------------------------------------- | --------- |
| Bedrock AgentCore   | `com.amazonaws.{region}.bedrock-agent-runtime` | Interface |
| Bedrock Runtime     | `com.amazonaws.{region}.bedrock-runtime`       | Interface |
| ECR API             | `com.amazonaws.{region}.ecr.api`               | Interface |
| ECR Docker          | `com.amazonaws.{region}.ecr.dkr`               | Interface |
| CloudWatch Logs     | `com.amazonaws.{region}.logs`                  | Interface |
| SSM Parameter Store | `com.amazonaws.{region}.ssm`                   | Interface |
| STS                 | `com.amazonaws.{region}.sts`                   | Interface |
| S3                  | `com.amazonaws.{region}.s3`                    | Gateway   |
| X-Ray               | `com.amazonaws.{region}.xray`                  | Interface |

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
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration (Pre-built Container Image)

Deploys an agent runtime using a pre-built ECR container image with VPC networking, JWT authentication, IAM policies, header forwarding, and lifecycle management. Start here when evaluating all available options for securing and managing a production AgentCore runtime.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

#### Local Code Path Variant

Builds the container image from a local Dockerfile instead of referencing a pre-built ECR image. Choose this variant when developing custom agent runtimes from source code and you want CDK to build and push the image at deploy time. Also demonstrates the alternative `jwtAuthorizer` (vs `customJwtAuthorizer` in the comprehensive config).

[sample-config-codepath.yaml](sample_configs/sample-config-codepath.yaml)

```yaml
--8<-- "sample_configs/sample-config-codepath.yaml"
```

### Troubleshooting

For common deployment issues and their solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Common issues:
- [X-Ray Transaction Search Config Already Exists](./TROUBLESHOOTING.md#x-ray-transaction-search-config-already-exists) - `AlreadyExists` error during deployment

---

[Config Schema Docs](SCHEMA.md)
