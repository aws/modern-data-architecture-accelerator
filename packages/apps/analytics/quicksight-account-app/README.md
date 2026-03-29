# QuickSight Account

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/analytics/quicksight-account-app/index.html).

Configures and deploys account-level QuickSight resources including the QuickSight account, VPC connection security group, service role, and IP restrictions. Manual post-deployment procedures are required to finalize the account configuration. See [Manual Procedures](MANUAL_PROCEDURES.md). Use this module when you need to set up QuickSight for the first time in an AWS account, establishing the foundation for BI dashboards and data visualization.

---

## Deployed Resources

This module deploys and integrates the following resources:

**QuickSight Service Role** - Will be used by QuickSight to setup account-level resources

**QuickSight Security Group** - Security group for QuickSight VPC connection, controlling network access to VPC-connected data sources such as Redshift.

- QS VPC connection must be manually created within the QS account post deployment, and should be manually configured with this security group

**QuickSight Account** - Creates the QS account for the AWS account.

- Requires manual post deployment configuration in order to use deployed service role and security group

![quicksight-account](../../../constructs/L3/analytics/quicksight-account-l3-construct/docs/quicksight-account.png)

---

## Related Modules

- [QuickSight Namespace](../quicksight-namespace-app/README.md) — Create namespaces for multi-tenant isolation within the QuickSight account configured here
- [QuickSight Project](../quicksight-project-app/README.md) — Deploy shared folders and data sources within the QuickSight account
- [Data Warehouse](../datawarehouse-app/README.md) — Deploy a Redshift cluster that QuickSight can connect to as a VPC data source
- [Roles](../../governance/roles-app/README.md) — Create IAM roles for QuickSight SAML federation

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Least Privilege**:
  - Service role follows least-privilege for account-level operations
  - Glue resource access scoped to specific databases/tables
- **Network Isolation**:
  - Security group controls QuickSight connectivity to VPC data sources
  - VPC connection binds QuickSight to specific subnets
  - QuickSight requires matching ingress rule for each egress rule (allowing return traffic from data source)
  - Optional IP restrictions limit QuickSight console access to approved CIDR ranges

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service     | Endpoint Service Name                  | Type      |
| --------------- | -------------------------------------- | --------- |
| QuickSight      | `com.amazonaws.{region}.quicksight`    | Interface |
| Glue            | `com.amazonaws.{region}.glue`          | Interface |
| Athena          | `com.amazonaws.{region}.athena`        | Interface |
| Redshift        | `com.amazonaws.{region}.redshift`      | Interface |
| Lake Formation  | `com.amazonaws.{region}.lakeformation` | Interface |
| S3              | `com.amazonaws.{region}.s3`            | Gateway   |
| STS             | `com.amazonaws.{region}.sts`           | Interface |
| CloudWatch Logs | `com.amazonaws.{region}.logs`          | Interface |

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
quicksight-account: # Module Name can be customized
  module_path: '@aws-mdaa/quicksight-account' # Must match module NPM package name
  module_configs:
    - ./quicksight-account.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./quicksight-account.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Demonstrates the simplest valid configuration with only required properties, using STANDARD edition and IAM_ONLY authentication. Start here for a quick QuickSight account setup before adding VPC connections, IP restrictions, or enterprise features.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Configures a QuickSight Enterprise account with IAM+QuickSight authentication, VPC connection with security group access rules, IP restrictions, and Glue catalog read access for data source validation. Use this as a reference when you need full control over authentication, network connectivity, and catalog access for a production QuickSight account.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

#### Enterprise+Q Edition Configuration

Demonstrates ENTERPRISE_AND_Q edition with ACTIVE_DIRECTORY authentication. Choose this variant when your organization requires QuickSight Q (natural language querying) and Active Directory-based authentication.

[sample-config-enterprise-q.yaml](sample_configs/sample-config-enterprise-q.yaml)

```yaml
--8<-- "sample_configs/sample-config-enterprise-q.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
