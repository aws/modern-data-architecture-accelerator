# SageMaker

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/governance/sagemaker-app/index.html).

Deploys SageMaker Unified Studio (SMUS) domains with domain units, user/group profiles, managed blueprint configurations, cross-account associations, and Lake Formation integration for governed analytics environments. SMUS is the successor to Amazon DataZone and provides a unified experience for data engineering, analytics, and ML workloads within a single portal. Choose this module over the [DataZone module](../datazone-app/README.md) when you want the latest SageMaker Unified Studio experience; choose DataZone if you are on an existing DataZone V1 deployment. Use this module when you need a unified portal for your data teams to collaborate on analytics, data engineering, and machine learning projects with governed access to shared data assets.

---

## Deployed Resources

This module deploys and integrates the following resources:

**SageMaker Domain** - A SageMaker (DataZone V2) domain with configurable user assignment and encryption.

**Domain Units** - Hierarchical organizational units within the domain for project scoping and access control, with authorization policies.

**User/Group Profiles** - IAM and SSO principal profiles for domain access.

**KMS CMK** - Customer-managed encryption key specific to each domain.

**Domain Service Role** - IAM role used by the SageMaker domain service.

**Domain Bucket** - S3 bucket for domain-specific resources such as custom blueprint templates.

**Associated Account Stacks** - Deployed to associated accounts providing account-specific resources for cross-account domain access.

**Tooling Resources** - Account-specific resources used by the core Tooling blueprint.

**Blueprint Configurations** - Standard configurations for Tooling blueprints, optional configurations for other managed blueprints.

**RAM Resource Shares** - Cross-account blueprint access for associated accounts.

![datazone](../../../constructs/L3/governance/datazone-l3-construct/docs/DataZone.png)

---

## Related Modules

- [SageMaker Project](../sagemaker-project-app/README.md) — Deploy projects, project profiles, and data sources within a SageMaker domain
- [DataOps Project](../../dataops/dataops-project-app/README.md) — Register DataOps project resources as SageMaker project data sources and assets
- [Lake Formation Settings](../lakeformation-settings-app/README.md) — Configure Lake Formation admin roles required for SageMaker domain data governance
- [Roles](../roles-app/README.md) — Create IAM roles and federation providers for SageMaker domain user/group profiles
- [DataZone](../datazone-app/README.md) — Alternative to SageMaker for data governance and catalog management using Amazon DataZone

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - Each domain gets a dedicated customer-managed KMS key
  - Domain bucket and all domain resources encrypted at rest
- **Least Privilege**:
  - Blueprint provisioning roles follow least-privilege with base policies
  - User/group profiles control domain membership via IAM roles or SSO identities
- **Separation of Duties**:
  - Domain units provide hierarchical access scoping with authorization policies (CREATE_DOMAIN_UNIT, CREATE_PROJECT)
- **Network Isolation**:
  - Tooling blueprint requires VPC and subnet configuration for network-bound resources (See SageMaker Project Module for VPC Endpoint requirements)

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
sagemaker: # Module Name can be customized
  module_path: '@aws-mdaa/sagemaker' # Must match module NPM package name
  module_configs:
    - ./sagemaker.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./sagemaker.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Required properties only — a single domain with an admin role and tooling blueprint VPC configuration. Start here for a basic SageMaker Unified Studio domain with one administrator.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Creates SageMaker Unified Studio domains with user/group management, domain units, associated accounts, managed and custom blueprints, and Lake Formation integration for centralized data governance. Start here when evaluating all available options for domain units, blueprints, cross-account associations, and user/group profiles.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
