# Bedrock Builder

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/bedrock-builder-app/index.html).

Deploys a secure Bedrock Agent with Knowledge Bases, Action Groups, Vector Stores, Lambda functions, and Guardrails for building AI-powered conversational workflows. Common scenarios include building Q&A chatbots over internal documents, automating business workflows with AI agents, or adding retrieval-augmented generation to your applications.

---

## Deployed Resources

This module deploys and integrates the following resources:

- **Bedrock Agent** — Amazon Bedrock Agent(s) for automating workflows using Foundation Models. Includes Agent Alias for versioned access.
- **Agent Execution Role** — IAM role with Bedrock Execution Policy for accessing Knowledge Bases, Foundation Models, and Guardrails.
- **Agent KMS Key** — Encrypts Agent resources. Auto-generated if not provided in config.
- **Lambda Functions** (Optional) — Functions for Agent Action Groups and Knowledge Base custom transformations. May be VPC-bound with configurable security groups.
- **Lambda Layers** (Optional) — Shared code layers for Lambda functions.
- **Action Group(s)** — Agent Action Groups linking Lambda functions or API schemas to the Agent. Supports existing Lambda ARNs or `generated-function:` references.
- **Knowledge Base(s)** (Optional) — Bedrock Knowledge Bases with S3 and SharePoint data sources, multiple parsing strategies (default, BDA, Foundation Model, custom), and chunking configurations.
- **Vector Store(s)** (Optional) — OpenSearch Serverless collections or Aurora Serverless clusters for Knowledge Base vector storage.
- **Bedrock Guardrail** (Optional) — Content filters, contextual grounding, PII entity detection, and regex-based sensitive information filtering.
- **AgentCore Harness(es)** (Optional) — Declarative agent loops (model + system prompt + tools) on AgentCore Runtime, declared under `harnesses`. Deploys the harness, a scoped execution role, an optional versioned endpoint, and MDAA-managed VPC endpoints. See the [construct README](../../../constructs/L3/ai/bedrock-agentcore-harness-l3-construct/README.md).

![bedrock-builder](../../../constructs/L3/ai/bedrock-builder-l3-construct/docs/bedrock-builder.png)

---

## Related Modules

- [Bedrock Settings](../bedrock-settings-app/README.md) — Configure Bedrock model invocation audit logging before deploying agents
- [Bedrock AgentCore Runtime](../bedrock-agentcore-runtime-app/README.md) — Deploy custom agent runtimes as an alternative to managed Bedrock Agents
- [DataOps Lambda](../../dataops/dataops-lambda-app/README.md) — Deploy Lambda functions independently that can be referenced as Action Group handlers via ARN
- [Roles](../../governance/roles-app/README.md) — Create IAM roles for agent execution or Lambda function access

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - Agent resources encrypted with customer-managed KMS keys (auto-generated if not provided)
  - OpenSearch Serverless collections use encryption-at-rest security policies
  - Aurora Serverless clusters encrypted with KMS
  - AgentCore Harness log groups encrypted with a customer-managed KMS key
- **Encryption in Transit**:
  - All Bedrock API communications use TLS
  - OpenSearch and Aurora connections encrypted in transit
- **Least Privilege**:
  - Agent execution role scoped to specific Knowledge Bases, Foundation Models, and Guardrails
  - Lambda execution roles scoped to required services only
  - OpenSearch Serverless uses data access policies for fine-grained control
  - AgentCore Harness execution role scoped to its resolved model, guardrail, gateway, and image grants, with an `sts:AssumeRole` deny and a configurable tool allowlist
- **Network Isolation**:
  - Lambda functions and Aurora clusters can be VPC-bound with configurable security groups
  - OpenSearch Serverless collections support VPC endpoints
  - No public connectivity to VPC-bound resources
  - AgentCore Harnesses run in mandatory VPC-only network mode behind an MDAA-managed endpoint security group
- **Content Safety**:
  - Guardrails provide content filters and contextual grounding checks
  - PII entity detection and regex-based sensitive information filtering
  - AgentCore Harness log groups apply an always-on PII masking floor, extensible via config

---

## AWS Service Endpoints

The following VPC endpoints may be required for VPC-bound resources (Lambda functions, Aurora Serverless, OpenSearch Serverless, AgentCore Harnesses) if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures). For a harness, MDAA can create the ones it needs itself — set `networkConfiguration.vpcEndpoints` and see the [construct README](../../../constructs/L3/ai/bedrock-agentcore-harness-l3-construct/README.md#container-and-vpc-networking) for the derived set:

| AWS Service           | Endpoint Service Name                              | Type      |
| --------------------- | -------------------------------------------------- | --------- |
| Bedrock Runtime       | `com.amazonaws.{region}.bedrock-runtime`           | Interface |
| Bedrock Agent         | `com.amazonaws.{region}.bedrock-agent`             | Interface |
| ECR API               | `com.amazonaws.{region}.ecr.api`                   | Interface |
| ECR Docker Registry   | `com.amazonaws.{region}.ecr.dkr`                   | Interface |
| AgentCore Gateway     | `com.amazonaws.{region}.bedrock-agentcore.gateway` | Interface |
| Lambda                | `com.amazonaws.{region}.lambda`                    | Interface |
| KMS                   | `com.amazonaws.{region}.kms`                       | Interface |
| CloudWatch Logs       | `com.amazonaws.{region}.logs`                      | Interface |
| STS                   | `com.amazonaws.{region}.sts`                       | Interface |
| S3                    | `com.amazonaws.{region}.s3`                        | Gateway   |
| OpenSearch Serverless | `com.amazonaws.{region}.aoss`                      | Interface |
| RDS                   | `com.amazonaws.{region}.rds`                       | Interface |

Additional VPC endpoints may be required depending on the AWS services accessed by your custom Lambda function code.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
bedrock-builder: # Module Name can be customized
  module_path: '@aws-mdaa/bedrock-builder' # Must match module NPM package name
  module_configs:
    - ./bedrock-builder.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./bedrock-builder.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single Bedrock Agent with a foundation model. Start here for a quick proof-of-concept agent before adding knowledge bases, action groups, or guardrails.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-builder-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Deploys Bedrock agents with action groups, knowledge bases backed by Aurora and OpenSearch vector stores, Lambda functions, guardrails with content and sensitive information filters, and S3/SharePoint data sources with multiple parsing and chunking strategies. Use this as a reference when you need full control over agent orchestration, RAG pipelines, and content safety policies.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-builder-app/sample_configs/sample-config-comprehensive.yaml"
```

#### AgentCore Harness Configuration (Minimal)

Deploys a single AgentCore Harness — a declarative agent loop (foundation model + system prompt) configured via the top-level `harnesses` map, independently of `agents`. Sets only the mandatory fields (model, system prompt, VPC network configuration) and takes the default path for everything else. Start here for a quick agent-loop proof-of-concept on AgentCore rather than classic Bedrock Agents.

[sample-config-harness-minimal.yaml](sample_configs/sample-config-harness-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-builder-app/sample_configs/sample-config-harness-minimal.yaml"
```

#### AgentCore Harness Configuration (Comprehensive)

Deploys an AgentCore Harness exercising the optional features on a single harness: model sampling and iteration limits, idle/max-lifetime lifecycle, inbound JWT auth, a guardrail and an AgentCore Gateway tool resolved via `config:<name>` references into sibling maps, an inline-function tool, a tool allowlist, skills, a bring-your-own ECR container image, VPC network placement with MDAA-managed endpoints, additive PII masking, log retention, a summarization truncation strategy, and a named versioned endpoint. Use this as a reference for full control over an AgentCore agent loop.

[sample-config-harness-comprehensive.yaml](sample_configs/sample-config-harness-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-builder-app/sample_configs/sample-config-harness-comprehensive.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
