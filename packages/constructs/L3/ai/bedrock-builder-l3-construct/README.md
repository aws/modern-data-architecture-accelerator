# Construct Overview

The Bedrock Builder CDK L3 construct is used to configure and deploy a secure Bedrock Builder and associated resources.

---

## Deployed Resources

![bedrock-builder](docs/bedrock-builder.png)

- **Bedrock Builder**: Deploys Amazon Bedrock Component(s) to streamline workflows and/or automate repetitive tasks using Foundational Models
- **Bedrock Execution Policies**: For Knowledge Bases, the construct creates consolidated IAM policies per execution role:
  - **Vector Store Policy**: Permissions for Aurora PostgreSQL (rds-data, secretsmanager) or OpenSearch Serverless (aoss:APIAccessAll)
  - **Foundation Model Policy**: Permissions to invoke embedding and parsing models (bedrock:InvokeModel)
  - **Data Sync Policy**: Permissions for data source synchronization (bedrock:StartIngestionJob, GetIngestionJob, ListIngestionJobs)

  _Policies are consolidated per role - multiple KBs sharing the same role share the same 3 policies to avoid hitting the AWS limit of 10 managed policies per role._

- **Bedrock Execution Role**: Execution policies are attached to the KB execution role. This role should have Bedrock Service as a Trusted Principal.
- **Bedrock KMS Key**: Encrypt Bedrock resources with the KMS Key. One will be generated if a KMS key is not provided as part of Configuration
- **Lambdas**: (Optional) Allows you to generate Lambda Layer, Lambda Function or both, which can be associated with Agent Action Group. (_Refer: [MDAA DataOps-LambdaFunctions](../../dataops/dataops-lambda-l3-construct/README.md)_)
  - **Lambda Layers** - Lambda layers which can be used in Lambda functions (inside or outside of this config).
  - **Lambda Functions** - Lambda function(s) for Agent Action Group(s)
    - May be optionally VPC bound with configurable VPC, Subnet, and Security Group Parameters

    - Can use an existing security group (from Project, for instance), or create a new security group per function
    - If creating a per-function security group:
      - All egress allowed by default (configurable)
      - No ingress allowed (not configurable)

- **Action Group(s)**: Create Agent Action group for Bedrock Agent. It allows you to either use an existing Lambda function (by providing its ARN directly) or create a new one as part of the agent configuration. The `generated-function:` prefix tells the system to use the Lambda that was created from the configuration rather than looking for an existing function ARN

- **Bedrock Guardrail**: (Optional) If Bedrock Guardrail is mentioned in the configuration, the Agent will be associated with Bedrock Guardrail.

  _Bedrock execution policy will also be updated to allow `ApplyGuardrail` permission on the provided `GuardrailID`_

- **OpenSearch Serverless VPC Endpoints**: For OpenSearch Serverless vector stores, the construct automatically creates VPC endpoints for secure connectivity. If you already have an existing VPC endpoint for OpenSearch Serverless in your VPC, you can provide the endpoint ID and security group ID in the vector store configuration to reuse it instead of creating a new one. This prevents deployment failures when a VPC endpoint already exists.

- **AgentCore Harness(es)**: (Optional) Deploys one or more [`AWS::BedrockAgentCore::Harness`](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html) resources - a declarative agent loop (model + system prompt + tools). Configured via the top-level `harnesses` map, independently of `agents`.
  - A harness's `guardrail.id` and `tools[].agentCoreGateway.gatewayArn` may reference a guardrail or gateway defined elsewhere in the same module via a `config:<name>` reference (resolved to the live guardrail id/version or gateway ARN), or a literal id/ARN.
  - Covers model and sampling config, execution role, guardrails, session lifecycle and cost caps, `inline_function` and `agentcore_gateway` tools, VPC networking, and context truncation - see [`@aws-mdaa/bedrock-agentcore-harness-l3-construct`](../bedrock-agentcore-harness-l3-construct/README.md) for the full configuration surface.

- **Harness VPC Endpoints**: (Optional) Deploys the interface and gateway VPC endpoints of each set in the top-level `vpcEndpoints` map, each with its own security group, via [`@aws-mdaa/vpc-endpoint-l3-construct`](../../utility/vpc-endpoint-l3-construct/README.md). Which endpoints exist is derived from the harnesses referencing the set; the set states only which VPC it serves and how each endpoint is reached. See [Harness VPC endpoints](../../../../apps/ai/bedrock-builder-app/README.md#harness-vpc-endpoints) for the config surface and what is rejected at synth.

## Configuration

### Using Existing OpenSearch Serverless VPC Endpoints

If you already have an OpenSearch Serverless VPC endpoint in your VPC, you can configure the vector store to use it instead of creating a new one. This is useful when:

- You have an existing VPC endpoint that you want to reuse across multiple deployments
- You want to avoid deployment failures caused by attempting to create duplicate VPC endpoints
- You need to manage VPC endpoints separately from your Bedrock deployment

To use an existing VPC endpoint, add the `ossVpce` property with `vpceId` and `securityGroupId` to your OpenSearch Serverless vector store configuration:

```yaml
vectorStores:
  my-vector-store:
    vectorStoreType: OPENSEARCH_SERVERLESS
    vpcId: 'vpc-1234567890abcdef0'
    subnetIds:
      - 'subnet-1234567890abcdef0'
      - 'subnet-0987654321fedcba0'
    standbyReplicas: ENABLED
    # Provide existing VPC endpoint details to reuse instead of creating new
    ossVpce:
      vpceId: 'vpce-1234567890abcdef0'
      securityGroupId: 'sg-1234567890abcdef0'
```

**Important Notes:**

- The `ossVpce` configuration is only applicable to OpenSearch Serverless vector stores (not Aurora Serverless)
- Both `vpceId` and `securityGroupId` must be provided together within `ossVpce`
- If multiple OpenSearch Serverless vector stores use the same VPC, they must all use the same existing VPC endpoint configuration or all create a new one
- The existing VPC endpoint must be configured for OpenSearch Serverless service
- The security group must allow appropriate network access for your use case

To get started, see the [sample configurations](../../../../apps/ai/bedrock-builder-app/sample_configs/).
