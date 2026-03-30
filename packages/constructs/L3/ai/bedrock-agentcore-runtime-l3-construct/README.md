# Bedrock AgentCore Runtime L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock AgentCore Runtimes with Docker container deployment.

## Features

- **Custom Runtime Deployment**: Deploy custom agent runtimes using Docker containers
- **Docker Image Management**: Build and push Docker images to ECR or use existing images
- **IAM Role Management**: Automatic creation of IAM roles with required permissions
- **VPC Network Configuration**: Secure VPC deployment (required for all runtimes)
- **JWT Authorization**: Configure custom JWT authorizers for access control
- **Lifecycle Management**: Configure session timeouts and maximum lifetimes
- **Runtime Endpoints**: Create endpoints for runtime invocation
- **SSM Parameter Storage**: Automatic storage of runtime ARNs and IDs

## Usage

```typescript
import { BedrockAgentcoreRuntimeL3Construct } from '@aws-mdaa/bedrock-agentcore-runtime-l3-construct';

const runtime = new BedrockAgentcoreRuntimeL3Construct(this, 'MyRuntime', {
  agentRuntimeName: 'my-agent-runtime',
  description: 'Custom agent runtime for development',
  agentRuntimeArtifact: {
    containerConfiguration: {
      codePath: './agent-code',
      platform: 'linux/arm64'
    }
  },
  networkConfiguration: {
    securityGroups: ['sg-12345678'],
    subnets: ['subnet-12345678', 'subnet-87654321']
  },
  environmentVariables: {
    ENVIRONMENT: 'dev',
    LOG_LEVEL: 'INFO'
  },
  authorizerConfiguration: {
    customJwtAuthorizer: {
      discoveryUrl: 'https://cognito-idp.region.amazonaws.com/pool/.well-known/openid-configuration',
      allowedAudience: ['client-id']
    }
  },
  runtimeEndpoint: {
    name: 'my_runtime_endpoint',
    description: 'Runtime endpoint for invocation'
  },
  naming: naming,
  roleHelper: roleHelper
});
```

## Configuration Options

### Runtime Properties
- `agentRuntimeName`: Name of the runtime (required)
- `description`: Optional description
- `agentRuntimeArtifact`: Container configuration (required)
- `networkConfiguration`: VPC network configuration (required)
- `environmentVariables`: Environment variables for the container
- `lifecycleConfiguration`: Session timeout and lifetime settings
- `authorizerConfiguration`: JWT authorizer configuration
- `requestHeaderConfiguration`: HTTP header forwarding configuration
- `runtimeEndpoint`: Endpoint configuration for runtime invocation
- `enableTransactionSearch`: Enable X-Ray Transaction Search Config (default: true, set to false for multiple runtimes in same region)

### Container Configuration
- `containerUri`: Pre-built ECR image URI
- `codePath`: Local directory path for building Docker image
- `platform`: Target platform (linux/arm64 or linux/amd64)

### Network Configuration
- `securityGroups`: Array of security group IDs (1-16 items, required)
- `subnets`: Array of subnet IDs (1-16 items, required)

Note: All runtimes are deployed in VPC mode for security. The network mode is automatically set to VPC.

### JWT Authorizer
- `discoveryUrl`: OIDC discovery URL (required)
- `allowedAudience`: Array of allowed audience values
- `allowedClients`: Array of allowed client IDs

### Lifecycle Configuration
- `idleRuntimeSessionTimeout`: Idle timeout in seconds (60-28800)
- `maxLifetime`: Maximum lifetime in seconds (60-28800)

## X-Ray Transaction Search

By default, the construct creates an X-Ray Transaction Search Config resource for enhanced trace analysis. Because this resource is limited to one per AWS account per region, set `enableTransactionSearch: false` if this resource already exists in your account/region (either from another runtime deployment or configured separately).

### When to Disable Transaction Search

Set `enableTransactionSearch: false` in these scenarios:
- Deploying multiple AgentCore runtimes in the same region
- The TransactionSearchConfig resource already exists in your account/region
- Another service or deployment has already configured X-Ray transaction search

Example with multiple runtimes:

```typescript
// First runtime - creates transaction search config
const runtime1 = new BedrockAgentcoreRuntimeL3Construct(this, 'Runtime1', {
  agentRuntimeName: 'runtime-1',
  enableTransactionSearch: true, // or omit (defaults to true)
  // ... other config
});

// Additional runtimes - skip transaction search creation
const runtime2 = new BedrockAgentcoreRuntimeL3Construct(this, 'Runtime2', {
  agentRuntimeName: 'runtime-2',
  enableTransactionSearch: false, // Required since config already exists
  // ... other config
});
```

## IAM Permissions

The construct automatically creates IAM roles with permissions for:
- ECR image access (GetAuthorizationToken, BatchGetImage, GetDownloadUrlForLayer)
- CloudWatch Logs (CreateLogGroup, CreateLogStream, PutLogEvents)
- X-Ray tracing (PutTraceSegments, PutTelemetryRecords)
- CloudWatch Metrics (PutMetricData for bedrock-agentcore namespace)
- Bedrock AgentCore workload identity tokens
- Bedrock model invocation

## SSM Parameters

The construct stores the following information in SSM Parameter Store:
- Runtime ARN: `/mdaa/{env}/{runtime-name}-arn`
- Runtime ID: `/mdaa/{env}/{runtime-name}-id`
- Runtime Name: `/mdaa/{env}/{runtime-name}-name`
- Endpoint ARN: `/mdaa/{env}/{runtime-name}-endpoint-arn` (if endpoint configured)
- Endpoint ID: `/mdaa/{env}/{runtime-name}-endpoint-id` (if endpoint configured)

## Dependencies

- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/kms-constructs`
- `@aws-mdaa/l3-construct`
- `aws-cdk-lib`
- `constructs`
