# EC2

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/utility/ec2-app/index.html).

Deploys secure EC2 instances with KMS-encrypted EBS volumes, managed key pairs stored in Secrets Manager, configurable security groups, and CloudFormation Init bootstrap configurations for both Linux and Windows. Common scenarios include deploying bastion hosts, DataSync agents, database clients, or other utility compute that your data environment requires within a VPC.

---

## Deployed Resources

This module deploys and integrates the following resources:

- **KMS CMK**: Customer-managed KMS key created if an existing key is not provided. Used to encrypt instance EBS volumes and key pair secrets.
- **EC2 Key Pairs**: Created for use by EC2 instances, with private key material stored in Secrets Manager. Key pairs and secrets are retained post stack deletion.
- **EC2 Security Groups**: Controls network access for instances. Supports CIDR, prefix list, and security group-based rules.
- **EC2 Instances**: Instances with termination protection enabled and retained post stack deletion. AMI-configured volumes should be accounted for in config to support encryption.
- **CloudFormation Init**: Bootstrap configurations for package installation, file creation, command execution, and service management on both Linux and Windows instances.

![ec2](../../../constructs/L3/utility/ec2-l3-construct/docs/ec2.png)

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
- **Network Isolation**:
  - Security groups deny all ingress by default
  - All egress allowed by default (configurable)
  - Egress rules configurable with CIDR, prefix list, and security group targets

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
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Provisions EC2 instances with key pairs, security groups, and CloudFormation Init bootstrapping, supporting both Linux and Windows instances with user data scripts and cfnInit configurations. Start here when evaluating all available options for key pairs, security group rules, cfnInit bootstrapping, and multi-OS support.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

#### Inline Init Configuration

Demonstrates using an inline CloudFormation Init definition directly on an instance (via the "init" property) instead of referencing a named init from the top-level cfnInit section. Choose this variant when you prefer to co-locate bootstrap configuration with the instance definition rather than referencing shared init blocks.

[sample-config-inline-init.yaml](sample_configs/sample-config-inline-init.yaml)

```yaml
--8<-- "sample_configs/sample-config-inline-init.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
