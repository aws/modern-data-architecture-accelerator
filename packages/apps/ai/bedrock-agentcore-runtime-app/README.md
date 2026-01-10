# Bedrock AgentCore Runtime App

MDAA application for deploying Amazon Bedrock AgentCore Runtimes with custom Docker containers.

## Overview

This app enables deployment of custom agent runtimes using Docker containers in Amazon Bedrock AgentCore. It provides configuration-driven deployment with support for:

- Docker image building and deployment
- IAM role management
- VPC network configuration (required for security)
- JWT authorization
- Lifecycle management
- Runtime endpoints

## Configuration

### Basic Configuration

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: myAgentRuntime
  description: "Custom agent runtime for development"
  agentRuntimeArtifact:
    containerConfiguration:
      codePath: ./agent-code
      platform: linux/arm64
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
  environmentVariables:
    ENVIRONMENT: dev
    LOG_LEVEL: INFO
```

### With Pre-built Container Image

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: myAgentRuntime
  agentRuntimeArtifact:
    containerConfiguration:
      containerUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest"
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
```



### With JWT Authorization

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: mySecureRuntime
  agentRuntimeArtifact:
    containerConfiguration:
      codePath: ./agent-code
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
  authorizerConfiguration:
    customJwtAuthorizer:
      discoveryUrl: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/openid-configuration"
      allowedAudience:
        - "client-id-1"
      allowedClients:
        - "client-id-1"
```

### With Lifecycle Configuration

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: myManagedRuntime
  agentRuntimeArtifact:
    containerConfiguration:
      codePath: ./agent-code
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
  lifecycleConfiguration:
    idleRuntimeSessionTimeout: 3600
    maxLifetime: 7200
```

### With Runtime Endpoint

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: myRuntime
  agentRuntimeArtifact:
    containerConfiguration:
      codePath: ./agent-code
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
  runtimeEndpoint:
    name: my_runtime_endpoint
    description: "Endpoint for runtime invocation"
```

### With Custom IAM Policies

```yaml
- type: bedrock_agentcore_runtime
  agentRuntimeName: myRuntime
  agentRuntimeArtifact:
    containerConfiguration:
      codePath: ./agent-code
  networkConfiguration:
    securityGroups:
      - sg-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
  policies:
    - policyArn: arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

## Configuration Properties

### Required Properties

- `agentRuntimeName`: Name of the runtime
- `agentRuntimeArtifact`: Container configuration
  - `containerConfiguration`: Container image configuration
    - `containerUri`: Pre-built ECR image URI (mutually exclusive with codePath)
    - `codePath`: Local directory path for building Docker image (mutually exclusive with containerUri)
    - `platform`: Target platform (linux/arm64 or linux/amd64, defaults to linux/arm64)
- `networkConfiguration`: VPC network configuration (required for security)
  - `securityGroups`: Array of security group IDs (1-16 items)
  - `subnets`: Array of subnet IDs (1-16 items)
  
  Note: All runtimes are deployed in VPC mode for security.

### Optional Properties

- `description`: Runtime description
- `environmentVariables`: Environment variables for the container
- `lifecycleConfiguration`: Session management configuration
  - `idleRuntimeSessionTimeout`: Idle timeout in seconds (60-28800)
  - `maxLifetime`: Maximum lifetime in seconds (60-28800)
- `authorizerConfiguration`: Access control configuration
  - `customJwtAuthorizer`: JWT authorizer configuration
    - `discoveryUrl`: OIDC discovery URL (required, must end with /.well-known/openid-configuration)
    - `allowedAudience`: Array of allowed audience values
    - `allowedClients`: Array of allowed client IDs
- `requestHeaderConfiguration`: HTTP header forwarding configuration
  - `requestHeaderAllowlist`: Array of header names to forward (1-20 items)
- `protocolConfiguration`: Protocol-specific configuration
- `roleArn`: Existing IAM role ARN (if not provided, role will be created)
- `policies`: Array of IAM policies to attach to the runtime role
  - `policyArn`: Managed policy ARN
  - `policyDocument`: Inline policy document
- `runtimeEndpoint`: Endpoint configuration
  - `name`: Endpoint name (alphanumeric and underscores only)
  - `description`: Endpoint description
  - `agentRuntimeVersion`: Specific runtime version

## Docker Container Requirements

Your Docker container must:
- Expose the required ports for Bedrock AgentCore
- Implement the Bedrock AgentCore Runtime API
- Be compatible with the specified platform (ARM64 or AMD64)

## IAM Permissions

The app automatically creates IAM roles with permissions for:
- ECR image access
- CloudWatch Logs
- X-Ray tracing
- CloudWatch Metrics (bedrock-agentcore namespace)
- Bedrock AgentCore workload identity tokens
- Bedrock model invocation

## SSM Parameters

The app stores runtime information in SSM Parameter Store:
- Runtime ARN
- Runtime ID
- Runtime Name
- Endpoint ARN (if configured)
- Endpoint ID (if configured)

## Dependencies

- `@aws-mdaa/app`
- `@aws-mdaa/bedrock-agentcore-runtime-l3-construct`
- `@aws-mdaa/config`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/l3-construct`
