# Bedrock AgentCore Runtime App - Troubleshooting Guide

This guide helps you diagnose and resolve common issues when deploying Bedrock AgentCore Runtimes.

---

## Table of Contents
- [X-Ray Transaction Search Config Already Exists](#x-ray-transaction-search-config-already-exists)
- [Cross-Account ECR Access Denied](#cross-account-ecr-access-denied)

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

---

## Cross-Account ECR Access Denied

### Symptom

Runtime deployment succeeds, but the container fails to start with an error in CloudWatch Logs:

```
Failed to pull image: <account>.dkr.ecr.<region>.amazonaws.com/<repository>:latest!
Message: failed to resolve image: unexpected status from HEAD request to 
https://<account>.dkr.ecr.<region>.amazonaws.com/v2/<repository>/manifests/latest: 403 Forbidden
```

Or you see errors like:
```
Error response from daemon: pull access denied for <account>.dkr.ecr.<region>.amazonaws.com/<repository>
```

### Cause

The runtime is trying to pull a container image from an ECR repository in a different AWS account, but the ECR repository policy doesn't grant the runtime role permission to pull the image.

**Example scenario**: Runtime deployed in Account A, container image stored in ECR in Account B.

### Solution

Add an ECR repository policy in the source account (Account B) to grant the runtime role access. Check **Cross-Account ECR Access** in README.
