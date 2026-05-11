# GAIA (GenAI Accelerator)

> **:warning: Deprecated in favor of [`@aws-mdaa/gaia-v2`](../gaia-v2-app/README.md).**
> New deployments should use `@aws-mdaa/gaia-v2`, which deploys a re-architected GAIA backend built on Cognito, AppSync Events, and CloudFront.
> This v1 module remains published and functional for existing deployments but will not receive new features. It will be removed in a future major release.
> See [MIGRATION_TO_V2.md](./MIGRATION_TO_V2.md) for guidance on migrating existing deployments.

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/gaia-app/index.html).

Deploys a comprehensive GenAI application backend with API Gateway, Cognito authentication, DynamoDB tables, Lambda functions, SQS queues, SNS topics, Step Functions workflows, and optional RAG engines (Aurora PgVector, Kendra). Supports Bedrock and SageMaker LLM integrations with WAF protection and custom domain configuration. Common scenarios include deploying an enterprise chatbot with document-based Q&A, building a conversational AI interface with RAG over internal knowledge bases, or prototyping GenAI applications with multiple LLM providers.

---

## Deployed Resources

This module deploys and integrates the following resources:

**Web Application Firewall (WAF)** - Deployed in front of the API Gateway with a configurable approved CIDR range. Can be opted out if Firewall Manager applies WAF automatically.

**REST/WebSocket APIs** - API Gateway entry points to the GenAI backend, gated by Cognito authentication and custom authorizers.

**Socket Lambdas** - Custom Authorizer, Incoming, Outgoing, and Connections Lambda functions that broker messages through the WebSocket API.

**REST API Handler** - Lambda that handles CRUD operations for workspaces, prompt templates, data ingestion, models, and semantic search.

**SNS Messages Topic** - Topic broker for all SQS queues that interact with model interfaces and outgoing messages.

**SQS Queues** - Queues for incoming and outgoing messages handled by the socket and model interface Lambdas, plus an ingestion queue that listens to S3 put events for RAG file uploads.

**Model Interface Lambdas** - Handle incoming messages from SQS queues and interface with embedding models, RAG engines, and LLMs via SageMaker and Bedrock.

**Upload Files Bucket** - S3 bucket that receives file uploads and triggers the ingestion queue for RAG store processing.

**Upload Handler Lambda** - Consumes ingestion queue events and triggers Step Functions workflows based on the ingested data type.

**DynamoDB Tables** - Connections, Sessions, Workspaces, and Documents tables for managing WebSocket connections, chat sessions, workspace metadata, and document ingestion statistics.

**Step Functions Workflows** - State machines for data ingestion (AWS Batch file import, website crawling) and workspace management (create/delete workspaces in vector databases and metadata tables).

**RAG Engines** (Optional) - Aurora Serverless PgVector cluster with cross-encoder and embedding models on SageMaker/Bedrock, and/or Kendra index integration for retrieval-augmented generation.

**Large Language Models** - SageMaker LLMs (Falcon, Mistral, Mixtral), Bedrock LLMs (Claude, Jurassic, Cohere, Mistral, Titan), and third-party LLMs (ChatGPT via stored API key), all driven by configuration.

**Comprehend** - Infers the dominant language for prompts and Aurora Vector store ingestion to support multi-lingual semantic search.

**Cognito Authentication** - Supports username/password, Active Directory SAML federation, or integration with an existing Cognito User Pool and app client.

**Custom Domain** (Optional) - Route 53 hosted zone and ACM certificates for custom domain names on API Gateway endpoints.

**Secrets** - Database credentials (auto-rotated), X-Origin-Verify header secret (auto-rotated), and optional third-party LLM API keys stored in Secrets Manager.

![gaia-l3-construct](../../../constructs/L3/ai/gaia-l3-construct/docs/ai-gaia.png)

---

## Related Modules

- [Bedrock Settings](../bedrock-settings-app/README.md) — Configure Bedrock model invocation audit logging for GAIA's Bedrock LLM calls
- [Bedrock Builder](../bedrock-builder-app/README.md) — Deploy managed Bedrock Agents as an alternative or complement to GAIA's conversational backend
- [Data Lake](../../datalake/datalake-app/README.md) — Data lake buckets can serve as data sources for RAG ingestion
- [Roles](../../governance/roles-app/README.md) — Create IAM roles for GAIA Lambda execution or API access

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - All data stores (DynamoDB, Aurora, S3) encrypted with customer-managed KMS keys
  - Secrets (DB credentials, API keys, X-Origin-Verify) stored in AWS Secrets Manager with automatic rotation
- **Encryption in Transit**:
  - All API communications use TLS
  - Database connections encrypted in transit
- **Least Privilege**:
  - Lambda execution roles scoped to required services
  - WebSocket API uses custom authorizer Lambda for token verification
  - 3rd party API keys are never logged or stored at runtime
- **Separation of Duties**:
  - Cognito-based authentication supports username/password, Active Directory SAML federation, or existing user pool integration
  - WAF protects API Gateway with configurable CIDR allowlists
- **Network Isolation**:
  - All compute resources (Lambda, Aurora, Batch, ECS) deployed within VPC with configurable security groups
  - No public endpoints unless custom DNS is configured

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service       | Endpoint Service Name                      | Type      |
| ----------------- | ------------------------------------------ | --------- |
| API Gateway       | `com.amazonaws.{region}.execute-api`       | Interface |
| Lambda            | `com.amazonaws.{region}.lambda`            | Interface |
| Bedrock Runtime   | `com.amazonaws.{region}.bedrock-runtime`   | Interface |
| SageMaker Runtime | `com.amazonaws.{region}.sagemaker.runtime` | Interface |
| Kendra            | `com.amazonaws.{region}.kendra`            | Interface |
| DynamoDB          | `com.amazonaws.{region}.dynamodb`          | Gateway   |
| S3                | `com.amazonaws.{region}.s3`                | Gateway   |
| SQS               | `com.amazonaws.{region}.sqs`               | Interface |
| SNS               | `com.amazonaws.{region}.sns`               | Interface |
| Step Functions    | `com.amazonaws.{region}.states`            | Interface |
| Secrets Manager   | `com.amazonaws.{region}.secretsmanager`    | Interface |
| KMS               | `com.amazonaws.{region}.kms`               | Interface |
| CloudWatch Logs   | `com.amazonaws.{region}.logs`              | Interface |
| STS               | `com.amazonaws.{region}.sts`               | Interface |
| ECR API           | `com.amazonaws.{region}.ecr.api`           | Interface |
| ECR Docker        | `com.amazonaws.{region}.ecr.dkr`           | Interface |
| Comprehend        | `com.amazonaws.{region}.comprehend`        | Interface |

Additional VPC endpoints may be required depending on the AWS services accessed by your custom Lambda function code.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
gaia: # Module Name can be customized
  module_path: '@aws-mdaa/gaia' # Must match module NPM package name
  module_configs:
    - ./gaia.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./gaia.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a basic GAIA application with email/password Cognito authentication, no RAG engines, no SageMaker LLMs, and default settings. Start here for a quick proof-of-concept chatbot before adding RAG engines or enterprise authentication.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/gaia-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Deploys a conversational AI chatbot with Bedrock foundation models, RAG engines (SageMaker, Aurora, Kendra, Knowledge Base), Cognito auth, VPC networking, and API Gateway endpoints. Uses email/password authentication and covers every available configuration option. Start here when evaluating all available options for a production-grade GenAI backend.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/gaia-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Active Directory Authentication Configuration

Use this variant when integrating GAIA with an enterprise Active Directory via SAML for SSO. Choose this approach when your organization manages user identities in Active Directory and requires federated single sign-on. Differs from the primary config only in the auth section, which uses AD-specific SAML metadata and email claim parameters.

[sample-config-ad.yaml](sample_configs/sample-config-ad.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/gaia-app/sample_configs/sample-config-ad.yaml"
```

#### Existing Cognito User Pool Configuration

Use this variant when integrating GAIA with a pre-existing Cognito User Pool and app client, for example when sharing authentication infrastructure across multiple applications. Choose this approach when you already have a Cognito pool and want to avoid creating a duplicate. Differs from the primary config only in the auth section, which references an existing Cognito pool instead of creating a new one.

[sample-config-existing.yaml](sample_configs/sample-config-existing.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/gaia-app/sample_configs/sample-config-existing.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
