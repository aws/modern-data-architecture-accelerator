# Agentic Application Sample Configuration

This sample configuration demonstrates building a simple agentic application using MDAA, featuring a custom agent runtime powered by Amazon Bedrock AgentCore. This provides a starting point for customers to build intelligent, autonomous applications that can reason, plan, and execute tasks.

***

## Architecture Overview

This configuration deploys a complete agentic application with:

1. **Custom Agent Runtime**: Containerized agent using the Strands framework for flexible agent logic
2. **Secure Authentication**: JWT-based access control via Amazon Cognito
3. **Network Security**: VPC-secured deployment with private subnets
4. **Scalable Infrastructure**: Managed runtime with automatic scaling and high availability
5. **Observability**: CloudWatch logging, metrics, and X-Ray tracing
6. **API Access**: Runtime endpoint for programmatic agent invocation
7. **IAM Security**: Least-privilege roles with appropriate permissions

***

## Deployment Instructions

### Prerequisites
- CDK bootstrapped in target account ([Bootstrap Guide](../../PREDEPLOYMENT.md))
- MDAA source repo cloned locally
- AWS CLI configured with appropriate permissions
- Amazon Cognito User Pool and App Client configured
- VPC with private subnets and security groups configured

### Step-by-Step Deployment

1. **Setup Configuration**
   ```bash
   # Copy sample config to your working directory
   cp -r sample_configs/agentic_app ./my-agentic-app
   cd my-agentic-app
   ```

2. Edit the `mdaa.yaml` to specify an organization name. This must be a globally unique name, as it is used in the naming of all deployed resources.

3. **Configure Context Values**

   Update the `mdaa.yaml` file under the `context:` section with your environment-specific values:
   - `cognito_user_pool_id`: Your Cognito User Pool ID (e.g., `us-east-1_ABC123`)
   - `cognito_client_id`: Your Cognito App Client ID
   - `security_group_id`: Security group ID for the runtime (must allow outbound traffic)
   - `subnet_id_1`: First private subnet ID
   - `subnet_id_2`: Second private subnet ID (for high availability)

4. **Deploy Application**
   ```bash
   # Deploy agentic application
   <path_to_mdaa_repo>/bin/mdaa <path_to_mdaa_repo>/sample_configs/agentic_app/mdaa.yaml deploy
   ```

For detailed deployment procedures, see [DEPLOYMENT](../../DEPLOYMENT.md).

***

## Configuration Files

### Directory Structure
```
agentic_app/
├── mdaa.yaml                                           # Main orchestration config
├── tags.yaml                                           # Resource tagging
└── bedrock-agentcore-runtime/
    ├── bedrock-agentcore-runtime.yaml                 # Runtime configuration
    └── agent_core_code/
        ├── agent.py                                    # FastAPI agent server
        ├── Dockerfile                                  # Container image definition
        ├── pyproject.toml                              # Python dependencies
        ├── uv.lock                                     # Dependency lock file
        └── .python-version                             # Python version specification
```

### Key Configuration Files

#### mdaa.yaml - Main Configuration
**⚠️ Required Changes Before Deployment:**
- `organization`: Must be globally unique (used in resource naming)
- `cognito_user_pool_id`: Your Cognito User Pool ID
- `cognito_client_id`: Your Cognito App Client ID
- `security_group_id`: Security group for the runtime
- `subnet_id_1`, `subnet_id_2`: Private subnet IDs

```yaml
region: default
organization: <org>  # CHANGE THIS

context:
  cognito_user_pool_id: <>      # CHANGE THIS
  cognito_client_id: <>         # CHANGE THIS
  security_group_id: <>         # CHANGE THIS
  subnet_id_1: <>               # CHANGE THIS
  subnet_id_2: <>               # CHANGE THIS

domains:
  ai:
    environments:
      dev:
        modules:
          agent-core-hello:
            module_path: "@aws-mdaa/bedrock-agentcore-runtime"
            module_configs:
              - ./bedrock-agentcore-runtime/bedrock-agentcore-runtime.yaml
```

#### Key Module Configurations

- **bedrock-agentcore-runtime.yaml**: Configures the AgentCore runtime with container settings, network configuration, JWT authentication, and runtime endpoint
- **tags.yaml**: Standard tags applied to all resources
- **agent_core_code/agent.py**: FastAPI server implementing the Strands agent with `/invocations` and `/ping` endpoints
- **agent_core_code/Dockerfile**: Container image definition for ARM64 platform

***

## Components

### Agent Runtime Infrastructure

The runtime infrastructure provides:
- **Containerized Deployment**: Custom Docker container with FastAPI agent server
- **Image Management**: ECR repository for secure container image storage
- **Network Security**: VPC-secured deployment with private subnets
- **Access Control**: JWT authorizer for secure API access
- **API Endpoint**: Runtime endpoint for programmatic agent invocation
- **IAM Security**: Execution role with least-privilege permissions

### Agent Implementation

The Strands-based agent implementation includes:
- **API Server**: FastAPI server with `/invocations` endpoint for agent processing
- **Health Monitoring**: `/ping` endpoint for health checks
- **Data Validation**: Pydantic models for request/response validation
- **Error Handling**: Comprehensive error handling and logging
- **Model Integration**: Direct integration with Bedrock foundation models via Strands framework

### Security & Compliance

The deployment implements:
- **Authentication**: JWT-based authentication via Amazon Cognito
- **Authorization**: Fine-grained IAM permissions for runtime execution
- **Encryption**: Data encryption in transit and at rest
- **Network Isolation**: VPC deployment with private subnets
- **Audit Logging**: CloudWatch logs for all agent interactions

***

## Use Cases

This agentic application starter is ideal for:
- **Intelligent Assistants**: Build conversational agents that can reason and take actions
- **Task Automation**: Create agents that autonomously execute complex workflows
- **Decision Support**: Deploy agents that analyze data and provide recommendations
- **Customer Service**: Implement intelligent customer support agents with custom business logic
- **Process Orchestration**: Build agents that coordinate multiple systems and services
- **Research & Development**: Prototype and test new agentic capabilities and patterns

***

## Usage Instructions

Once the MDAA deployment is complete, follow these steps to test and interact with your agentic application.

### 1. Retrieve Runtime Information

The deployment stores runtime details in SSM Parameter Store:

```bash
# Set your organization and environment names
ORG="your-org-name"
ENV="dev"
REGION="us-east-1"

# Get runtime ARN
RUNTIME_ARN=$(aws ssm get-parameter \
  --name "/mdaa/${ENV}/${ORG}-myAgentRuntimeDev-arn" \
  --region ${REGION} \
  --query "Parameter.Value" \
  --output text)

# Get runtime endpoint ARN
ENDPOINT_ARN=$(aws ssm get-parameter \
  --name "/mdaa/${ENV}/${ORG}-myAgentRuntimeDev-endpoint-arn" \
  --region ${REGION} \
  --query "Parameter.Value" \
  --output text)

echo "Runtime ARN: ${RUNTIME_ARN}"
echo "Endpoint ARN: ${ENDPOINT_ARN}"
```

### 2. Obtain JWT Token from Cognito

To invoke the runtime, you need a valid JWT token from your Cognito User Pool:

```bash
# Authenticate with Cognito
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id ${COGNITO_CLIENT_ID} \
  --auth-parameters USERNAME=${USERNAME},PASSWORD=${PASSWORD} \
  --region ${REGION}

# Extract the IdToken from the response
ID_TOKEN="<id_token_from_response>"
```

### 3. Invoke the Runtime

Use the Bedrock AgentCore Runtime API to invoke your agent:

```bash
# Invoke the runtime endpoint
aws bedrock-agent-runtime invoke-agent-runtime \
  --runtime-endpoint-arn ${ENDPOINT_ARN} \
  --input-text "Hello, what can you help me with?" \
  --authorization-token ${ID_TOKEN} \
  --region ${REGION}
```

### 4. Monitor Runtime Performance

- **CloudWatch Logs**: Monitor agent interactions and container logs
- **CloudWatch Metrics**: Track runtime metrics in the `bedrock-agentcore` namespace
- **X-Ray Traces**: Analyze request traces for performance optimization

***

## Agent Customization

### Modifying the Agent Code

The agent implementation is in `bedrock-agentcore-runtime/agent_core_code/agent.py`. You can customize:

1. **Agent Logic**: Modify the Strands agent initialization and processing
2. **Input/Output Format**: Update Pydantic models for different request/response structures
3. **Additional Endpoints**: Add new FastAPI endpoints for specialized functionality
4. **Error Handling**: Enhance error handling and validation logic

### Updating Dependencies

Dependencies are managed via `pyproject.toml`:

```bash
cd bedrock-agentcore-runtime/agent_core_code

# Add new dependencies
uv add <package-name>

# Update lock file
uv lock
```

### Rebuilding the Container

After code changes, redeploy to rebuild and push the container:

```bash
<path_to_mdaa_repo>/bin/mdaa <path_to_mdaa_repo>/sample_configs/agentic_app/mdaa.yaml deploy
```

***

## Extending the Application

This sample provides a foundation for building more sophisticated agentic applications:

### Adding Knowledge Bases
Integrate Bedrock Knowledge Bases for RAG (Retrieval Augmented Generation) capabilities to give your agent access to domain-specific knowledge.

### Multi-Agent Systems
Deploy multiple agent runtimes with different specializations and orchestrate them to handle complex tasks.

### Tool Integration
Extend the agent with custom tools and APIs to interact with external systems, databases, and services.

### Workflow Orchestration
Implement Step Functions or other orchestration services to coordinate multi-step agent workflows.

### Advanced Authentication
Integrate with enterprise identity providers (SAML, OIDC) for single sign-on and fine-grained access control.

***

## Troubleshooting

### Common Issues

1. **Unrecognized resource types error during deployment**:
   ```
   ValidationError: Template format error: Unrecognized resource types: 
   [AWS::BedrockAgentCore::Runtime, AWS::BedrockAgentCore::RuntimeEndpoint]
   ```
   
   **Cause**: The region you're deploying to doesn't support Bedrock AgentCore yet.
   
   **Solution**: 
   - Check the [Bedrock AgentCore supported regions documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-regions.html) for the list of regions that support AgentCore
   - Update the `region` field in your `mdaa.yaml` to a supported region
   - Ensure your VPC, subnets, and security groups are in the same supported region

2. **JWT authentication failures**:
   - Verify the Cognito User Pool ID and Client ID are correct in the configuration
   - Ensure the discovery URL is properly formatted and ends with `/.well-known/openid-configuration`
   - Check that the JWT token's `aud` claim matches the configured `allowedAudience`
   - Verify the token hasn't expired

3. **Container build or deployment failures**:
   - Check that Docker is installed and running on your deployment machine
   - Verify ECR permissions for pushing images
   - Ensure the specified platform (`linux/arm64` or `linux/amd64`) is supported
   - Review CloudWatch logs for container startup errors

4. **Network connectivity issues**:
   - Verify security groups allow outbound traffic to AWS services
   - Ensure subnets have routes to NAT Gateway or VPC endpoints for AWS service access
   - Check that the runtime can reach Bedrock endpoints
   - Verify VPC DNS resolution is enabled

5. **Runtime invocation failures**:
   - Confirm the runtime is in "Active" state in the Bedrock console
   - Verify the runtime endpoint is properly configured
   - Check IAM permissions for the runtime execution role
   - Review CloudWatch logs for detailed error messages

6. **AgentCore runtime-specific issues after successful deployment**:
   - For detailed troubleshooting of runtime behavior, performance, or operational issues, refer to the [Bedrock AgentCore Runtime Troubleshooting Guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-troubleshooting.html)
   - This includes guidance on container startup issues, memory/CPU constraints, timeout configurations, and runtime state management

***

## Next Steps

After deploying this sample agentic application:

1. **Customize the Agent Logic**: Modify `agent.py` to implement your specific use case
2. **Add Business Logic**: Integrate with your existing systems and data sources
3. **Implement Tools**: Add custom tools and capabilities to extend agent functionality
4. **Scale the Solution**: Deploy multiple agent runtimes for different use cases
5. **Monitor & Optimize**: Use CloudWatch metrics and logs to optimize performance
6. **Secure for Production**: Review and enhance security controls for your production environment

For more information on building agentic applications, see:
- [Amazon Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [Strands Framework Documentation](https://github.com/awslabs/strands)
- [MDAA Documentation](../../README.md)

