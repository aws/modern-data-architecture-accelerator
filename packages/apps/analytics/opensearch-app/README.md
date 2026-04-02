# OpenSearch

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/analytics/opensearch-app/index.html).

Deploys a secure, VPC-bound Amazon OpenSearch domain with KMS encryption, fine-grained access control, configurable cluster topology (master, data, and UltraWarm nodes), CloudWatch logging, custom endpoints with Route 53, and optional SAML authentication for SSO integration. Common scenarios include full-text search over application or business data, log analytics and observability dashboards, or near-real-time indexing for operational intelligence.

---

## Deployed Resources

This module deploys and integrates the following resources:

**OpenSearch KMS Key** - Encrypts all data at rest (cluster nodes and storage).

**CloudWatch Log Groups** - Logs Application logs, Audit logs, Index Slow logs, Search Slow logs.

**CNAME Record** - CNAME record created in Private Hosted Zone (in Route 53) if hosted zone configuration is enabled along with custom endpoint.

**Domain Security Group** - Controls network connectivity to the Domain cluster.

**Amazon OpenSearch** - OpenSearch Domain (including OpenSearch Dashboards).

- Cluster nodes hosted on EC2 instances (master nodes, data nodes, UltraWarm data nodes)
- Data at rest stored in EBS storage attached to data nodes
- Cluster is VPC-bound with network connectivity controlled by security group

**SNS Events Topic** - SNS topic for publishing OpenSearch domain event notifications.

![opensearch](../../../constructs/L3/analytics/opensearch-l3-construct/docs/opensearch.png)

---

## Related Modules

- [Data Warehouse](../datawarehouse-app/README.md) — Deploy a Redshift cluster as a complementary structured analytics engine
- [Roles](../../governance/roles-app/README.md) — Create IAM roles that can be granted domain access via access policies
- [Data Lake](../../datalake/datalake-app/README.md) — Index data lake content into OpenSearch for full-text search and analytics

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - All data at rest encrypted with customer-managed KMS key (cluster nodes and EBS storage)
  - Custom endpoint supports ACM TLS certificates
- **Encryption in Transit**:
  - All cluster communications use TLS
- **Least Privilege**:
  - Domain access policies configurable per principal
  - Data admin role granted scoped KMS key admin/usage permissions
- **Separation of Duties**:
  - Fine-grained access control supported
  - Optional SAML authentication for SSO integration with OpenSearch Dashboards
- **Network Isolation**:
  - Domain is VPC-bound with no public addresses
  - Security group denies all ingress by default
  - Custom endpoint uses private hosted zone CNAME records

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service     | Endpoint Service Name         | Type      |
| --------------- | ----------------------------- | --------- |
| OpenSearch      | `com.amazonaws.{region}.es`   | Interface |
| KMS             | `com.amazonaws.{region}.kms`  | Interface |
| CloudWatch Logs | `com.amazonaws.{region}.logs` | Interface |
| S3              | `com.amazonaws.{region}.s3`   | Gateway   |
| SNS             | `com.amazonaws.{region}.sns`  | Interface |
| STS             | `com.amazonaws.{region}.sts`  | Interface |
| ACM             | `com.amazonaws.{region}.acm`  | Interface |

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
opensearch: # Module Name can be customized
  module_path: '@aws-mdaa/opensearch' # Must match module NPM package name
  module_configs:
    - ./opensearch.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./opensearch.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Demonstrates the simplest valid configuration using only required properties. Uses id-style MdaaRoleRef for role resolution by AWS-generated unique ID. Start here for a quick OpenSearch domain deployment before adding multi-AZ, SAML auth, or custom endpoints.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/analytics/opensearch-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Deploys a VPC-bound OpenSearch domain with multi-AZ zone awareness, master/data/warm/coordinator nodes, EBS storage, custom endpoint, access policies, SAML authentication, and event notifications. Start here when evaluating all available options for a production-grade OpenSearch deployment.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/analytics/opensearch-app/sample_configs/sample-config-comprehensive.yaml"
```

#### SAML Authentication Configuration

Demonstrates an OpenSearch domain with SAML SSO authentication enabled, using a minimal cluster configuration to validate the SAML integration path separately from the primary config. Choose this variant when your organization requires SSO access to OpenSearch Dashboards via a SAML identity provider.

[sample-config-saml.yaml](sample_configs/sample-config-saml.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/analytics/opensearch-app/sample_configs/sample-config-saml.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
