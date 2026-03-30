# Bedrock AgentCore Runtime App - Troubleshooting Guide

This guide helps you diagnose and resolve common issues when deploying Bedrock AgentCore Runtimes.

---

## Table of Contents
- [X-Ray Transaction Search Config Already Exists](#x-ray-transaction-search-config-already-exists)

---

## X-Ray Transaction Search Config Already Exists

### Symptom

Deployment fails with the following error:

```
CREATE_FAILED | AWS::XRay::TransactionSearchConfig | bedrockagentcoreru...archConfig2B8A09A6
Resource handler returned message: "null" (RequestToken: 91702d2a-d5aa-c0a2-761c-1db8808b6e20, HandlerErrorCode: AlreadyExists)
```

### Cause

The X-Ray TransactionSearchConfig resource is a singleton per AWS account per region. This error occurs when:
- Another AgentCore runtime has already created this resource in the same account/region
- Another AWS service or deployment has configured X-Ray transaction search
- A previous deployment created the resource and it still exists

### Solution

Set `enableTransactionSearch: false` in your configuration to skip creating this resource.

```yaml
agentRuntimeName: myAgentRuntime
enableTransactionSearch: false  # Add this line
agentRuntimeArtifact:
  containerConfiguration:
    containerUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest"
networkConfiguration:
  securityGroups:
    - sg-12345678
  subnets:
    - subnet-12345678
```