# Construct Overview

The VPC Endpoint CDK L3 construct deploys the interface and gateway VPC endpoints of **one VPC**, each with its own security group and endpoint policy, and exposes each interface endpoint's security group id so the orchestrating module can wire its own workloads to them.

It is a nested primitive, not a module of its own: an orchestrating module reconciles what its workloads need against what its own configuration declares, instantiates one of these per VPC, and grants each workload access to the endpoints it uses. See the [Bedrock Builder module](../../../../apps/ai/bedrock-builder-app/README.md#harness-vpc-endpoints) for how its AgentCore Harness endpoint sets are declared and reconciled.

---

## Deployed Resources

<!-- Architecture diagram not yet available -->

- **Interface VPC Endpoint** - One per entry in `interfaces`, placed in the configured subnets with Private DNS enabled. Any service the caller can express as an `aws-cdk-lib` interface endpoint service.

- **Endpoint Security Group** - One per interface endpoint, created with no ingress rules. The orchestrating module adds scoped ingress per consumer.

- **Gateway VPC Endpoint** - One per entry in `gateways`, associated with the configured route tables and carrying its required policy. AWS offers gateway endpoints for S3, S3 Express One Zone and DynamoDB only.

---

## The Consumer Contract

`interfaceEndpointSecurityGroupIds` maps each created interface endpoint's `name` to its security group id. A consumer creates its own client security group and is granted HTTPS ingress on the groups of the services it uses, so workloads sharing a VPC share the endpoints without a shared workload security group, and a consumer never reaches a service it does not need. Gateway endpoints have no security group and so contribute no entry.

---

## Service Names

Both endpoint entries carry an **`aws-cdk-lib` service object** rather than a name: `InterfaceVpcEndpointAwsService.STS`, `...ECR_DOCKER`, `...STS_FIPS`, `GatewayVpcEndpointAwsService.S3`. It renders the full service name for the deployment's region and partition (`com.amazonaws....`, `cn.com.amazonaws....`) and carries the port, so neither is configured here. A service the CDK does not catalogue is expressible as an `InterfaceVpcEndpointService`, as are FIPS variants and third-party PrivateLink services.

Each entry also requires a **`name`**, used for its construct id, its security group name, and its key in `interfaceEndpointSecurityGroupIds`. Pass the service's short name; a `.` in it (`ecr.api`) becomes `-` in ids and physical names.

**`nameScope`** qualifies each endpoint security group's physical name. Set it to something distinct per instance — two instances in one module would otherwise synthesize colliding group names.

---

## Endpoint Policies

Policies are passed in fully formed; the construct holds no per-service policy knowledge, so which actions a given workload needs belongs in that workload's documentation.

- **Gateway** endpoints require a `policy`, and every statement must name its `resources` (`['*']` is accepted). A gateway endpoint has no security group, so its policy is the only control on it.
- **Interface** endpoints take an optional `policy`. Private DNS makes such an endpoint VPC-wide, so a restrictive policy applies to every workload in the VPC that resolves it.

A `principals` entry is rendered as `{"AWS": ...}` or `"*"`, the forms IAM accepts.

A statement also takes `conditions`, passed through verbatim in the `{ Operator: { key: value } }` shape. It is how a statement is scoped where `principals` cannot be: an endpoint policy is evaluated with the caller's account and organization in the request context even where the calling role's ARN is not matchable, so `{ StringEquals: { 'aws:PrincipalAccount': '111122223333' } }` narrows a statement that would otherwise stay on `"*"`.

---

## Validation

Rejected at synth rather than mid-deploy:

- A configuration that creates no endpoint.
- One interface service, or one gateway endpoint name, listed twice — AWS allows a single Private DNS endpoint per service per VPC.
- A route table listed twice for one gateway endpoint.
- An endpoint policy with no statements, or with an empty `actions`, `resources`, or `principals` list, or an empty `conditions` block.
- A gateway statement that omits `resources`.
- A `resources` entry that is neither an ARN nor `*`.

---

## Not Supported

- **Private DNS off** — there is no `privateDnsEnabled: false` option.
- **More than one VPC per instance** — the orchestrating module creates one instance per VPC.
- **Cross-region endpoints** — an `InterfaceVpcEndpointAwsService` renders its name for the deployment's own region.
- **Service-managed endpoint resources** (e.g. `AWS::OpenSearchServerless::VpcEndpoint`) — only EC2 interface and gateway endpoints are modelled.
- **Service principals** — a statement's `principals` are IAM role/user ARNs or `*`; a service principal is not expressible.

---

## Dependencies

- `@aws-mdaa/construct`
- `@aws-mdaa/ec2-constructs`
- `@aws-mdaa/l3-construct`
- `@aws-mdaa/naming`
- `aws-cdk-lib`
- `constructs`
