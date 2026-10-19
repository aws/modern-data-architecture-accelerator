# Usage

## Deployed Resources

Once deployed, you should see the following in your AWS account(s):

**Naming convention:** `<org>-<env>-<domain>-<module>-<resource>`

**SSM parameters:** `/<org>/<domain>/<module>/<resource-type>/<resource-name>/<attribute>`

Names longer than a service allows are truncated with a hash suffix (always for AgentCore resources), so use the SSM parameters to find exact names.

| Resource | Deployed Name / SSM Path | Config Reference |
|----------|--------------------------|------------------|
| AgentCore Harness (the agent) | `<org>_dev_genai_customer_su...` (truncated)<br>`/<org>/genai/customer-support-agent/harness/customer-support-agent/arn` | `harnesses.customer-support-agent` in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) |
| AgentCore Gateway | `<org>-dev-genai-customer-support-ag...` (truncated)<br>`/<org>/genai/customer-support-agent/gateway/support-gateway/arn` | `gateways.support-gateway` in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) |
| Lambda Function (support tools) | `/<org>/genai/customer-support-agent/lambda/customer-support-agent-lambda/name` | `lambdaFunctions.functions[customer-support-agent-lambda]` in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) |
| Bedrock Knowledge Base | `<org>-dev-genai-customer-support-agent-kb-test-customer-support`<br>`/<org>/genai/customer-support-agent/knowledgebase/kb-test-customer-support/id` | `knowledgeBases.kb-test-customer-support` in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) |
| Bedrock Guardrail | `/<org>/genai/customer-support-agent/guardrail/enterpriseguardrail/id` | `guardrails.enterpriseguardrail` in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) |
| S3 Bucket | `<org>-dev-shared-datalake-customer-support-docs`<br>`/<org>/shared/datalake/bucket/customer-support-docs/name` | `buckets.customer-support-docs` in [`datalake/datalake.yaml`](../datalake/datalake.yaml) |
| S3 Bucket | `<org>-dev-shared-datalake-product-docs`<br>`/<org>/shared/datalake/bucket/product-docs/name` | `buckets.product-docs` in [`datalake/datalake.yaml`](../datalake/datalake.yaml) |
| IAM Role | `<org>-dev-shared-roles-data-admin`<br>`/<org>/shared/generated-role/data-admin/arn` | `generateRoles.data-admin` in [`roles.yaml`](../roles.yaml) |
| IAM Role | `<org>-dev-shared-roles-data-user`<br>`/<org>/shared/generated-role/data-user/arn` | `generateRoles.data-user` in [`roles.yaml`](../roles.yaml) |

## Post-Deployment Steps

### 1. Upload Documents

1. Assume the `<org>-dev-shared-roles-data-user` role.
2. Upload documents to the `data/` prefix of the support documents or product documents bucket. The buckets apply KMS encryption by default.
3. The knowledge base ingests new documents within about 5 minutes. Check progress in **Amazon Bedrock Console** > **Knowledge Bases** > `<org>-dev-genai-customer-support-agent-kb-test-customer-support` > select the data source.

### 2. Test the Agent

1. Assume the `<org>-dev-shared-roles-data-admin` role.
2. Open the harness (`<org>_dev_genai_customer_su...`) in the **Amazon Bedrock AgentCore Console** and chat with the agent.

   The console test isn't available in every region. There, or from your own code, call the [`InvokeHarness`](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeHarness.html) API with the harness ARN from SSM (read it before switching roles: the data-admin role can't read SSM parameters), for example with a recent `boto3`:

   ```python
   import uuid

   import boto3

   client = boto3.client("bedrock-agentcore", region_name="<region>")
   response = client.invoke_harness(
       harnessArn="<harness-arn>",
       runtimeSessionId=str(uuid.uuid4()),  # a new ID starts a conversation; pass the same ID again to continue it
       messages=[{"role": "user", "content": [{"text": "What is the status of account acc-12345?"}]}],
   )
   for event in response["stream"]:
       print(event.get("contentBlockDelta", {}).get("delta", {}).get("text", ""), end="")
   ```

3. Try a question about your uploaded documents, or `What is the status of account acc-12345?`, `Create a support ticket for account acc-12345`, and `What is the status of ticket ticket-001?`. The account and ticket tools serve mock data from [`lambda/src/support_function.py`](../lambda/src/support_function.py); replace it with calls to your own systems.

## Agent Behavior

- **Sessions**: A session ends after 10 minutes idle or 8 hours, and there is no memory across sessions.
- **Guardrail**: `enterpriseguardrail` checks the default model's input and output, not tool results. A caller that passes its own `model` to `InvokeHarness` bypasses it, so grant `InvokeHarness` only to trusted principals. Contextual grounding checks aren't configured.

## Private VPC

For subnets without a NAT gateway, declare a VPC endpoint set in a top-level `vpcEndpoints` map in [`ai/bedrock-builder.yaml`](../ai/bedrock-builder.yaml) and name it in the harness's `networkConfiguration.vpcEndpoints` (see [VPC endpoint sets](../../../packages/apps/ai/bedrock-builder-app/README.md#vpc-endpoint-sets)). Also provision a `secretsmanager` interface endpoint for the vector store's password rotation function.
