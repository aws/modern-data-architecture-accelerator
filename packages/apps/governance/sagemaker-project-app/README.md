# SageMaker Project

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/governance/sagemaker-project-app/index.html).

Deploys SageMaker Unified Studio projects, project profiles, and associated data sources for organizing and managing analytics workloads within a SageMaker domain. Use this module when you need to create governed analytics projects within SageMaker Unified Studio, with data sources imported from your Glue Catalog for team-based data exploration and publishing.

Note: SageMaker Projects can also be deployed via the [DataOps Project module](../../dataops/dataops-project-app/README.md), allowing for automatic registration of Glue-based data sources and discovery of data assets. This module can be used when all data assets will be created and consumed entirely within SageMaker.

---

## Deployed Resources

This module deploys and integrates the following resources:

**Project Profiles** - Enables blueprints for use in projects, with configurable environment templates.

**Projects** - SageMaker Unified Studio (DataZone V2) projects created within a domain.

**Data Sources** - Allows importing of existing Glue databases as data sources into SageMaker projects for publishing.

![datazone](../../../constructs/L3/governance/sagemaker-project-l3-construct/docs/SageMaker-Project.png)

---

## Related Modules

- [SageMaker (Domain)](../sagemaker-app/README.md) — Deploy the SageMaker domain that hosts projects created by this module
- [DataOps Project](../../dataops/dataops-project-app/README.md) — Alternative way to deploy SageMaker projects with automatic Glue data source registration
- [Glue Catalog Settings](../glue-catalog-app/README.md) — Configure cross-account Glue Catalog access for data sources imported into SageMaker projects
- [Lake Formation Access Control](../lakeformation-access-control-app/README.md) — Manage fine-grained Lake Formation grants for data sources used by SageMaker projects

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - Projects inherit the domain-level customer-managed KMS encryption configuration
- **Least Privilege**:
  - Projects are scoped to specific domain units and project profiles
  - Data sources use Lake Formation access control grants for fine-grained permissions on imported Glue databases

---

## AWS Service Endpoints

When DataZone blueprints provision VPC-bound environments (e.g., SageMaker Studio, Athena, Glue), the following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures). Specific endpoints depend on which blueprints are enabled:

| AWS Service       | Endpoint Service Name                      | Type      |
| ----------------- | ------------------------------------------ | --------- |
| DataZone          | `com.amazonaws.{region}.datazone`          | Interface |
| SageMaker API     | `com.amazonaws.{region}.sagemaker.api`     | Interface |
| SageMaker Runtime | `com.amazonaws.{region}.sagemaker.runtime` | Interface |
| SageMaker Studio  | `com.amazonaws.{region}.studio`            | Interface |
| Athena            | `com.amazonaws.{region}.athena`            | Interface |
| Glue              | `com.amazonaws.{region}.glue`              | Interface |
| Lake Formation    | `com.amazonaws.{region}.lakeformation`     | Interface |
| KMS               | `com.amazonaws.{region}.kms`               | Interface |
| S3                | `com.amazonaws.{region}.s3`                | Gateway   |
| CloudWatch Logs   | `com.amazonaws.{region}.logs`              | Interface |
| STS               | `com.amazonaws.{region}.sts`               | Interface |
| EFS               | `com.amazonaws.{region}.elasticfilesystem` | Interface |

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker-project: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker-project' # Must match module NPM package name
  module_configs:
    - ./sagemaker-project.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker-project.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single SageMaker project with a project profile. Start here for a basic SageMaker project within an existing domain.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Covers both ON_CREATE and ON_DEMAND deployment modes, environment templates, project profiles with all options, and projects with full membership. Use this as a reference when you need full control over deployment modes, environment templates, data sources, and project membership.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
