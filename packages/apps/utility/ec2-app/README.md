# EC2

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/utility/ec2-app/index.html).

Deploys secure EC2 instances with KMS-encrypted EBS volumes, managed key pairs stored in Secrets Manager, configurable security groups, and CloudFormation Init bootstrap configurations for both Linux and Windows. Common scenarios include deploying bastion hosts, DataSync agents, database clients, or other utility compute that your data environment requires within a VPC.

---

## Deployed Resources

This module deploys and integrates the following resources:

- **KMS CMK**: Customer-managed KMS key created if an existing key is not provided. Used to encrypt instance EBS volumes and key pair secrets.
- **EC2 Key Pairs**: Created for use by EC2 instances, with private key material stored in Secrets Manager. Key pairs and secrets are retained post stack deletion.
- **EC2 Security Groups**: Controls network access for instances. Supports CIDR, prefix list, and security group-based rules.
- **EC2 Security Group Rules** (via `rules`): Standalone ingress/egress rules added to pre-existing (externally-owned) security groups referenced by id. No security group is created; each rule renders to a standalone `SecurityGroupIngress`/`SecurityGroupEgress` resource. Use this to wire connectivity between two security groups owned by different modules without creating a circular cross-stack dependency.
- **EC2 Instances**: Instances with termination protection enabled and retained post stack deletion. AMI-configured volumes should be accounted for in config to support encryption.
- **EC2 Network Interfaces** (via `networkInterfaces`): Elastic network interfaces (ENIs) with an optional fixed private IP. Each is a resource in its own right, attached to instances as a **secondary** interface via an instance's `networkInterfaces` property with `deleteOnTermination: false`, which is what carries the IP and MAC across the instances it is attached to; interfaces are also retained post stack deletion. See [Network Interfaces](#network-interfaces) for the operational model.
- **CloudFormation Init**: Bootstrap configurations for package installation, file creation, command execution, and service management on both Linux and Windows instances.

![ec2](../../../constructs/L3/utility/ec2-l3-construct/docs/ec2.png)

---

## Network Interfaces

Declare an ENI under `networkInterfaces` when an instance needs a private IP that outlives it — typically a network appliance (proxy, NAT instance, forwarder, inspection host) whose address is allowlisted on a downstream firewall or referenced by on-premises routing. The interface keeps its private IP and MAC when the instance is replaced or terminated, so those rules do not have to change with it.

Declare the interface, then attach it from the instance:

```yaml
networkInterfaces:
  proxy-eni:
    subnetId: ssm:/sample-org/shared/vpc/subnet/private/az1/id
    privateIpAddress: 10.0.1.50
    securityGroups: [proxy-sg]
    sourceDestCheck: false

instances:
  proxy-1:
    availabilityZone: '{{region}}a' # must match the ENI subnet's zone
    userDataScriptPath: './userdata.sh' # installs routing that applies once the ENI attaches
    networkInterfaces:
      - networkInterface: proxy-eni
        deviceIndex: 1
```

### What you have to do yourself

- **Configure routing over the interface.** MDAA creates and attaches it; it does not touch the OS. The interface is attached as a _secondary_ interface, so it is not the default route and outbound traffic uses it only once the OS routes traffic that way — typically `iptables` plus policy routing. CloudFormation attaches it only after the instance resource completes — after its creation signal when `cfnInit`, `signalCount` or `creationTimeOut` is set — on first deploy and after every replacing update, so it is **not** present while `userDataScriptPath` or `cfnInit` run. Use them to install configuration that applies when the interface appears (on Amazon Linux, `ec2-net-utils` on AL2 and `amazon-ec2-net-utils` on AL2023 already add per-interface policy routing on attach; elsewhere, a udev rule or a network profile matched on the interface's MAC), and never wait for the interface before signalling: that blocks until the creation timeout and fails the deploy.
- **Give it a security group.** Set `securityGroups` or `securityGroupIds` on the interface — at least one is required, and omitting both fails at synth. Its groups are independent of the instance's, so a port opened only on the instance's group is dropped on this interface. The requirement exists because EC2 would otherwise place the interface in the VPC default security group, and it makes that association itself, so it appears in neither the template nor CDK Nag. To use the default group deliberately, name its id in `securityGroupIds`.
- **Disable the source/destination check for a forwarding path.** `sourceDestCheck` is per interface; the instance-level setting of the same name does not cover a secondary interface. A proxy or NAT path needs `sourceDestCheck: false` on the ENI itself.
- **Perform failover yourself.** MDAA gives you a movable interface; it does not move it. CloudFormation does not detect an out-of-band instance termination and will not recreate the instance on a plain `mdaa deploy`. If you detach and reattach the interface by hand, the stack's `Instance` and `NetworkInterfaceAttachment` resources no longer describe reality, and the next deploy may fail while the interface is held by an unmanaged instance — reconcile the config before deploying again.
- **Keep the zones aligned.** An ENI's `subnetId` may differ from the instance's own `subnetId` to multi-home the instance, but both subnets must be in the same availability zone. MDAA does not check this at synth; a mismatch fails the attachment at deploy time.

### Behaviour to expect

- Attachments default to `deleteOnTermination: false`, overriding CloudFormation's default of `true`, so the interface outlives the instance.
- A replacing update detaches the interface from the outgoing instance and attaches it to the new one, so traffic over it stops for that window. This is not a zero-downtime path.
- Interfaces are retained on stack deletion and on a replacing update, but not when the deploy that created them rolls back — otherwise a failed first deploy would leave an interface holding the pinned `privateIpAddress` that every retry then needs. An interface declared but never attached is still created, and still persists in the account. A retained interface does keep its address against a later redeploy of the same declaration under a new logical ID — after you rename the interface's config key, or delete the stack and deploy it again — and you have to delete it out of band before that address is free.
- Changing the `deviceIndex` of an already-deployed `networkInterface` attachment is a single deploy. CloudFormation replaces `NetworkInterfaceAttachment` delete-then-create, so the interface detaches and re-attaches at the new index; moving an interface to a different instance and renaming an instance's config key behave the same way. Two edits still need two deploys — remove the entry, deploy, then add it back: changing the `deviceIndex` of a `networkInterfaceId` attachment, and moving an interface onto an index that another interface still holds.
- Changing an instance's own `securityGroup` or `securityGroupId` while a secondary interface is attached may fail. CloudFormation applies that change in place with `ModifyInstanceAttribute`, which AWS documents ["can result in an error if the instance has more than one ENI"](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ModifyInstanceAttribute.html). Change the interface's own `securityGroups`/`securityGroupIds` instead where the rule belongs on the interface.
- Each interface publishes its id and primary private IP for other modules to consume, as the SSM parameters `/{org}/{domain}/{module}/network-interface/{name}/id` and `.../private-ip`, and as the matching CloudFormation exports. The private IP is the value to reference from downstream allowlists.
- `mdaa destroy` fails with `DependencyViolation` on a module-created security group that a retained interface still uses. Unlike the [Lambda ENI case in DEPLOYMENT.md](../../../../DEPLOYMENT.md#security-group-dependencyviolation-on-destroy), waiting does not clear this: detach and delete the retained interface, or move it to a security group the module does not own.

### Why a custom primary interface is not supported

`deviceIndex: 0` is rejected at synth. A primary interface [cannot be detached from its instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html#eni-basics), and any change that replaces the instance — most commonly an AMI update for patching — replaces it create-before-delete. CloudFormation would try to launch the new instance holding an interface the old instance still holds and fail with `Interface: [eni-...] in use`, leaving the instance updatable only by terminating it by hand first.

---

## Related Modules

- [Roles](../../governance/roles-app/README.md) — Create IAM roles for EC2 instance profiles
- [DataSync](../datasync-app/README.md) — Deploy DataSync agents on EC2 instances for data transfer

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - All EBS volumes encrypted with customer-managed KMS key
  - Key pair private keys encrypted in Secrets Manager with the same KMS key
- **Least Privilege**:
  - Admin roles granted scoped KMS key admin/usage permissions and Secrets Manager access for key pair retrieval
  - Instance profiles use dedicated IAM roles
- **Data Protection**:
  - Termination protection enabled by default
  - Key pairs and secrets retained post stack deletion
  - Network interfaces retained post stack deletion and across replacing updates, so a retained interface persists in the account until deleted out of band. Retention is not applied when the deploy that created the interface rolls back
- **Network Isolation**:
  - Security groups deny all ingress by default
  - All egress allowed by default (configurable)
  - Egress rules configurable with CIDR, prefix list, and security group targets
  - Network interface security groups are scoped to the interface, independent of the instance's own group. At least one of `securityGroups` or `securityGroupIds` is required on every interface: omitting both is rejected at synth rather than letting EC2 place the interface in the VPC default security group, which permits all traffic between its members and all outbound traffic and is associated outside CloudFormation where neither the template nor CDK Nag can see it
  - `sourceDestCheck: false` on an interface deliberately disables the anti-spoofing control that requires the instance to be the source or destination of the traffic it handles. It is required for a proxy or NAT path, and should be set only on interfaces that forward traffic

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service     | Endpoint Service Name                   | Type      |
| --------------- | --------------------------------------- | --------- |
| EC2             | `com.amazonaws.{region}.ec2`            | Interface |
| EC2 Messages    | `com.amazonaws.{region}.ec2messages`    | Interface |
| KMS             | `com.amazonaws.{region}.kms`            | Interface |
| Secrets Manager | `com.amazonaws.{region}.secretsmanager` | Interface |
| CloudWatch Logs | `com.amazonaws.{region}.logs`           | Interface |
| STS             | `com.amazonaws.{region}.sts`            | Interface |
| SSM             | `com.amazonaws.{region}.ssm`            | Interface |
| SSM Messages    | `com.amazonaws.{region}.ssmmessages`    | Interface |
| S3              | `com.amazonaws.{region}.s3`             | Gateway   |

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
ec2: # Module Name can be customized
  module_path: '@aws-mdaa/ec2' # Must match module NPM package name
  module_configs:
    - ./ec2.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./ec2.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single EC2 instance with a security group. Start here for a basic instance deployment with default encryption and termination protection.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/utility/ec2-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Provisions EC2 instances with key pairs, security groups, persistent network interfaces, and CloudFormation Init bootstrapping, supporting both Linux and Windows instances with user data scripts and cfnInit configurations. Start here when evaluating all available options for key pairs, security group rules, network interfaces, cfnInit bootstrapping, and multi-OS support.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/utility/ec2-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Inline Init Configuration

Demonstrates using an inline CloudFormation Init definition directly on an instance (via the "init" property) instead of referencing a named init from the top-level cfnInit section. Choose this variant when you prefer to co-locate bootstrap configuration with the instance definition rather than referencing shared init blocks.

[sample-config-inline-init.yaml](sample_configs/sample-config-inline-init.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/utility/ec2-app/sample_configs/sample-config-inline-init.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
