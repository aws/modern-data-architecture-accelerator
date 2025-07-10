# Bedrock Agent L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock Agents with associated resources.

## Features

- **Agent Creation**: Creates Bedrock agents with customizable configurations
- **Action Groups**: Support for Lambda-based action groups with OpenAPI schemas
- **Knowledge Base Integration**: Connect agents to knowledge bases for RAG capabilities
- **Guardrail Integration**: Apply content filtering and safety guardrails
- **IAM Management**: Automatic creation of required IAM policies and roles
- **Lambda Permissions**: Automatic setup of Lambda invoke permissions for Bedrock

## Usage

```typescript
import { BedrockAgentL3Construct } from '@aws-mdaa/bedrock-agent-l3-construct';

const agent = new BedrockAgentL3Construct(this, 'MyAgent', {
  agentName: 'my-agent',
  agentConfig: {
    role: agentExecutionRole,
    foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    instruction: 'You are a helpful assistant',
    description: 'My custom agent',
    actionGroups: [
      {
        actionGroupName: 'my-actions',
        actionGroupExecutor: {
          lambda: 'arn:aws:lambda:region:account:function:my-function'
        },
        description: 'Custom action group'
      }
    ]
  },
  kmsKey: myKmsKey,
  roleHelper: roleHelper,
  naming: naming
});
```

## Configuration Options

### Agent Properties
- `foundationModel`: The foundation model to use (required)
- `instruction`: Instructions for the agent (required)
- `role`: Execution role for the agent (required)
- `description`: Optional description
- `autoPrepare`: Whether to auto-prepare the agent
- `idleSessionTtlInSeconds`: Session timeout
- `agentAliasName`: Optional alias name

### Action Groups
- `actionGroupName`: Name of the action group
- `actionGroupExecutor`: Lambda function configuration
- `apiSchema`: OpenAPI schema for the actions
- `description`: Optional description

### Knowledge Base Integration
- `knowledgeBases`: Array of knowledge base associations
- Each association includes ID, description, and state

### Guardrail Integration
- `guardrail`: Guardrail configuration with ID and version

## IAM Permissions

The construct automatically creates IAM policies with permissions for:
- Foundation model invocation
- KMS key usage
- Knowledge base retrieval (if configured)
- Guardrail application (if configured)

## Dependencies

- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/kms-constructs`
- `@aws-mdaa/l3-construct`
- `aws-cdk-lib`
- `constructs`