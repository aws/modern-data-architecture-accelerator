# QuickSight Project

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/analytics/quicksight-project-app/index.html).

Deploys QuickSight shared folders with hierarchical permissions and data sources (Redshift, Athena, etc.) for organizing and governing QuickSight assets across teams. Use this module when you need to organize QuickSight dashboards and data sources into team-level folders with controlled access permissions.

---

## Architecture

### QuickSight Permissions: End to End Flow

![quicksight-project-high-level](../../../constructs/L3/analytics/quicksight-project-l3-construct/docs/quicksight-project-high-level.png)

### Sample QuickSight Shared Folders for QS Asset Management

![quicksight-project-shared-folders](../../../constructs/L3/analytics/quicksight-project-l3-construct/docs/quicksight-project-shared-folders.png)

### QuickSight Shared Folders Deployed Resources

![quicksight-project-deployed-resources](../../../constructs/L3/analytics/quicksight-project-l3-construct/docs/quicksight-project-deployed-resources.png)

---

## Deployed Resources

This module deploys and integrates the following resources:

**QuickSight Shared Folders** - Creates QuickSight Shared Folders (Root and Child Folders with Permissions to QS Groups)

- Each shared folder can have read or read/write permissions granted for QS principals
- Each shared folder can have child folders with their own permissions

**QuickSight Data Sources** - QS data sources which can be used within QS Datasets and Analysis

---

## Related Modules

- [QuickSight Account](../quicksight-account-app/README.md) — Configure the QuickSight account and VPC connection before deploying projects
- [QuickSight Namespace](../quicksight-namespace-app/README.md) — Create namespaces with user groups that can be granted folder and data source permissions
- [Data Warehouse](../datawarehouse-app/README.md) — Deploy a Redshift cluster that can be referenced as a QuickSight data source

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Least Privilege**:
  - Shared folders support granular read/read-write permissions per QuickSight principal (users and groups)
  - Child folders inherit or override parent permissions
  - Data source permissions scoped per principal with reader/author action sets
- **Separation of Duties**:
  - Data source credentials can be dynamically retrieved from Secrets Manager (recommended, supports rotation) or referenced via static credential pairs

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
quicksight-project: # Module Name can be customized
  module_path: '@aws-mdaa/quicksight-project' # Must match module NPM package name
  module_configs:
    - ./quicksight-project.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./quicksight-project.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a shared folder and an Athena data source. Start here for a quick QuickSight project setup before adding Redshift sources, multi-LOB folder hierarchies, or VPC connectivity.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Sets up QuickSight principals, a Redshift data source with secret-based credentials, VPC connectivity, SSL properties, and a multi-LOB shared folder hierarchy with dev/test/prod/self-serve/datasets tiers and granular permissions. Use this as a reference when you need full control over data source connectivity, folder organization, and team-level access policies.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "sample_configs/sample-config-comprehensive.yaml"
```

#### Copy Source Configuration

Uses copied credentials from another data source to share credentials across multiple data sources without duplicating secret references. Choose this variant when you have multiple data sources that should authenticate with the same credentials managed in a single location.

[sample-config-copysource.yaml](sample_configs/sample-config-copysource.yaml)

```yaml
--8<-- "sample_configs/sample-config-copysource.yaml"
```

#### Credential Pair Configuration

Uses direct username/password credentials for data source connectivity instead of secret ARN-based authentication. This approach does not support automatic secret rotation. Choose this variant for development or testing environments where Secrets Manager integration is not required.

[sample-config-credentialpair.yaml](sample_configs/sample-config-credentialpair.yaml)

```yaml
--8<-- "sample_configs/sample-config-credentialpair.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
