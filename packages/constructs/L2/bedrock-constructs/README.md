# Construct Overview

Opinionated L2 constructs for Amazon Bedrock AgentCore.

## AgentCore Gateway (`MdaaAgentcoreGateway`)

`MdaaAgentcoreGateway` wraps the L1 `CfnGateway` and enforces MDAA's gateway-resource compliance invariants.
It creates no dependencies of its own — the execution role, KMS CMK, and interceptor Lambda
functions are resolved by the caller (the `bedrock-agentcore-gateway-l3-construct` orchestration
construct) and supplied here as ARNs / resolved configurations.

### Security/Compliance

* Enforce customer-managed KMS CMK encryption — `kmsKeyArn` is required; the gateway is never left
  on an AWS-managed key
* Restrict inbound authorization to `CUSTOM_JWT` or `AWS_IAM` — `NONE` (unauthenticated) and
  `AUTHENTICATE_ONLY` (no per-caller authorization) are rejected

## AgentCore Gateway Target (`MdaaAgentcoreGatewayTarget`)

`MdaaAgentcoreGatewayTarget` wraps the L1 `CfnGatewayTarget` and enforces MDAA's target-resource
compliance invariants. It creates no dependencies of its own — the gateway is supplied by
identifier, and the `lambda:InvokeFunction` grant on the gateway execution role plus the explicit
CloudFormation dependency on the gateway are owned by the caller (the
`bedrock-agentcore-gateway-l3-construct` orchestration construct, which registers targets alongside
the gateway).

The `targetConfiguration` declares one tool source. The type surface covers all AWS target types
(`lambda`, `openApiSchema`, `smithyModel`, `mcpServer`, `apiGateway`) so the configuration is stable
as support is added; validation currently builds only `lambda` and rejects the others as not yet
supported. A Lambda `toolSchema` is one of `inlinePayload` or `s3`.

### Security/Compliance

* Default and restrict the outbound credential provider to `GATEWAY_IAM_ROLE` — an unsupported type
  is rejected
