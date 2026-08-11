# S3 Tables

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/datalake/s3-tables-app/index.html).

Deploys managed Apache Iceberg table buckets, namespaces, and tables via Amazon S3 Tables with mandatory KMS encryption, deny-by-default resource policies, TLS enforcement, and pre-defined permission sets (reader, writer, admin). Common scenarios include building a governed lakehouse with schema-defined Iceberg tables, providing fine-grained table-level access control for analytics teams, or establishing managed Iceberg storage with automatic compaction, snapshot management, and unreferenced file cleanup.

---

## Prerequisites

- AWS account with access to Amazon S3 Tables (see [Region Availability](#aws-region-availability))
- MDAA core infrastructure deployed (org, environment, domain context)
- IAM roles defined for principals that require access to S3 Tables resources
- **If bringing your own KMS key (`kmsKeyArn`):** the key policy must already grant the S3 Tables maintenance principal access, since MDAA cannot modify a key it does not own. Grant `kms:Decrypt` and `kms:GenerateDataKey` to service principal `maintenance.s3tables.amazonaws.com`, conditioned on `kms:EncryptionContext:aws:s3:arn` matching `<tableBucketArn>/*`. Without this grant, table creation fails with "Insufficient access to perform table maintenance". (MDAA-created keys receive this grant automatically.)

---

## Deployed Resources

This module deploys and integrates the following resources:

| Resource | Description |
|----------|-------------|
| `AWS::S3Tables::TableBucket` | Managed Iceberg storage buckets with KMS encryption and optional maintenance configuration |
| `AWS::S3Tables::Namespace` | Logical table groupings within table buckets |
| `AWS::S3Tables::Table` | Apache Iceberg tables with schema, partition specifications, and sort orders |
| `AWS::S3Tables::TableBucketPolicy` | Bucket-level resource policies (deny-by-default + TLS enforcement + grants) |
| `AWS::S3Tables::TablePolicy` | Table-level resource policies (created for every table to carry the mandatory deny-non-TLS statement; table-level access grants are appended when declared) |
| `AWS::KMS::Key` | Customer-managed encryption key (created when no external key ARN is provided) |
| `AWS::SSM::Parameter` | Resource ARN/name exports for cross-stack discovery |

---

## Security and Compliance

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - KMS encryption is mandatory — there is no configuration option to deploy without encryption
  - Customer-managed KMS key (either auto-created or externally provided)
  - Key usage granted only to explicitly declared IAM role IDs via `aws:userId` conditions
- **Encryption in Transit**:
  - TLS enforced on all resource policies via `aws:SecureTransport` condition
  - Every `TableBucketPolicy` and `TablePolicy` includes a deny-non-TLS statement
- **Least Privilege**:
  - Pre-defined permission sets (reader, writer, admin) map to fixed, minimal action sets
  - Bucket-scope statements target the bucket ARN plus a contained-tables wildcard (`<bucketArn>/table/*`); table-scope statements target a single table ARN
  - KMS key policy limits usage to declared principals only
- **Deny-by-Default**:
  - Table bucket policies always include a deny-all baseline — only explicitly granted principals (plus the CloudFormation execution role needed to deploy the stack) receive access; the baseline denies every other principal, including undeclared same-account principals
  - If no IAM grants are declared, the policy contains the deny-non-TLS statement plus the deny-all baseline locked to the CloudFormation execution role only, so the bucket is not left open to same-account principals holding identity-based permissions
- **Compliance Rulesets**:
  - Passes cdk-nag checks for AwsSolutions, NIST 800-53 R5, HIPAA Security, and PCI DSS 3.2.1

---

## Configuration

### MDAA Config

Add the following snippet to your `mdaa.yaml` under the `modules:` section of a domain/env in order to use this module:

```yaml
s3-tables: # Module name can be customized
  module_path: '@aws-mdaa/s3-tables' # Must match module NPM package name
  module_configs:
    - ./s3-tables.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./s3-tables.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single table bucket with one namespace, one Iceberg table, and one IAM grant using only required properties. Start here for a quick S3 Tables deployment before adding maintenance settings, partition strategies, or fine-grained table-level policies.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/datalake/s3-tables-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Exercises the full config surface: multiple table buckets, maintenance settings (compaction, snapshots, and unreferenced file removal), an externally provided KMS key (BYOK), all partition transforms, sort orders, and table-level access policies. Use it as a reference when adopting the more advanced features.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/datalake/s3-tables-app/sample_configs/sample-config-comprehensive.yaml"
```

---

### Configuration Schema Reference

The module configuration follows the `roles → accessPolicies → tableBuckets` pattern established by the MDAA datalake module.

#### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roles` | `Map<string, MdaaRoleRef[]>` | Yes | Logical role names mapped to IAM role references (ARN, name, ID, or SSM parameter) |
| `accessPolicies` | `Map<string, AccessPolicyConfig>` | Yes (if referenced) | Named access policies mapping permission levels to logical role names |
| `tableBuckets` | `Map<string, TableBucketConfig>` | Yes | Table bucket definitions with nested namespaces and tables |

#### AccessPolicyConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ReadRoles` | `string[]` | No | Logical role names granted read-only access |
| `ReadWriteRoles` | `string[]` | No | Logical role names granted read-write access |
| `ReadWriteSuperRoles` | `string[]` | No | Logical role names granted full admin access |

#### TableBucketConfig

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `accessPolicies` | `string[]` | Yes | Must reference top-level `accessPolicies` keys | Access policy names applied to this bucket |
| `namespaces` | `Map<string, NamespaceConfig>` | Yes | At least one namespace | Namespace definitions within this bucket |
| `maintenance` | `MaintenanceConfig` | No | See maintenance fields | Compaction, snapshot, and cleanup settings |
| `kmsKeyArn` | `string` | No | Must match `arn:<partition>:kms:<region>:<account>:key/<key-id>` | External KMS key ARN; omit to auto-create. **BYOK:** the key policy must already grant `kms:Decrypt` + `kms:GenerateDataKey` to service principal `maintenance.s3tables.amazonaws.com` (conditioned on `kms:EncryptionContext:aws:s3:arn` matching `<tableBucketArn>/*`), or table creation fails — MDAA cannot modify a key it does not own |

**Bucket name constraints:** Lowercase alphanumeric and hyphens only, 3-63 characters, must begin and end with a letter or number.

#### NamespaceConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tables` | `Map<string, TableConfig>` | Yes | Table definitions within this namespace |

**Namespace name constraints:** Lowercase letters, digits, and underscores only, 1-255 characters, must begin with a letter or number. Table names follow the same rules.

#### TableConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | `Map<string, IcebergColumnDef>` | Yes | Column definitions keyed by column name (at least one, max 200 per table); declaration order sets Iceberg field ids |
| `partitions` | `Map<string, PartitionConfig>` | No | Partition specifications keyed by source column name |
| `sortBy` | `Map<string, SortConfig>` | No | Sort order specifications keyed by source column name |
| `accessPolicies` | `string[]` | No | Additive table-level access policy names |

#### IcebergColumnDef

Columns are declared as a keyed map where the **map key is the column name**; each value has the following fields.

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| `type` | `string` | Yes | `boolean`, `int`, `long`, `float`, `double`, `decimal(p,s)`, `date`, `time`, `timestamp`, `timestamptz`, `string`, `uuid`, `fixed[n]`, `binary` (parameterized `decimal`/`fixed` must include their parameters) |
| `required` | `boolean` | No | `true` or `false` (defaults to `false`) |

#### PartitionConfig

Partitions are declared as a keyed map where the **map key is the source column name** (must reference a column in `columns`); each value has the following fields.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transform` | `string` | Yes | One of: `identity`, `bucket`, `truncate`, `year`, `month`, `day`, `hour` |
| `numBuckets` | `number` | Required for `bucket` | Positive integer specifying number of hash buckets |
| `width` | `number` | Required for `truncate` | Positive integer specifying truncation width |

#### SortConfig

Sort fields are declared as a keyed map where the **map key is the source column name** (must reference a column in `columns`); each value has the following fields.

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| `direction` | `string` | Yes | `ASC` or `DESC` |
| `nullOrder` | `string` | Yes | `nulls-first` or `nulls-last` |

#### MaintenanceConfig

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `compaction.targetFileSizeMB` | `number` | 64–512 | Target file size for compaction (applied per-table) |
| `compaction.enabled` | `boolean` | — | Enable/disable compaction |
| `snapshots.minToKeep` | `number` | 1–100 | Minimum snapshots to retain (applied per-table) |
| `snapshots.maxAgeHours` | `number` | 1–8760 | Maximum snapshot age (applied per-table) |
| `snapshots.enabled` | `boolean` | — | Enable/disable snapshot management |
| `removeUnreferenced.afterDays` | `number` | 1–365 | Days before unreferenced files are removed (applied at the table-bucket level) |
| `removeUnreferenced.keepNonCurrentDays` | `number` | 1–365 | Days to retain non-current files before removal |
| `removeUnreferenced.enabled` | `boolean` | — | Enable/disable unreferenced file removal |

> **Important — maintenance scope differs by setting.** The single bucket-level `maintenance` block does not all apply at the same scope:
>
> - **`removeUnreferenced` is a genuine bucket-wide setting.** It maps directly to the `AWS::S3Tables::TableBucket` unreferenced-file-removal property and therefore applies to **all tables in the bucket, including tables created outside MDAA**.
> - **`compaction` and `snapshots` are per-table Iceberg (`AWS::S3Tables::Table`) settings.** They are not bucket properties; MDAA takes the single bucket-level block and **fans it out (copies it) onto every table MDAA provisions in that bucket**. Tables created outside MDAA are unaffected, and changing the block re-applies it to each MDAA-provisioned table.
>
> When maintenance fields are omitted entirely, S3 Tables applies its service default maintenance behavior.

---

[Config Schema Docs](SCHEMA.md)

---

## Deployment

Deploy the module using the standard MDAA deployment process:

1. Define IAM roles in your MDAA roles module (or reference existing roles by ARN).
2. Create a module config YAML file referencing those roles (see [Configuration](#configuration)).
3. Add the module to your `mdaa.yaml` under the appropriate domain/environment.
4. Run the MDAA deployment:

```bash
npx mdaa deploy
```

The module will:

- Validate configuration against the JSON Schema before synthesis
- Create KMS key (if no external ARN provided)
- Provision table buckets with encryption and maintenance settings
- Create namespaces and Iceberg tables with schema definitions
- Apply resource policies with deny-by-default + TLS enforcement + grants
- Export resource ARNs and names to SSM Parameter Store

---

## Permission Sets Reference

Permission sets abstract raw S3 Tables API actions into simple named levels. Each level includes all actions from lower levels.

### Bucket-Scope Permission Sets

| Level | Actions |
|-------|---------|
| **reader** | `GetTable`, `GetTableData`, `GetTableMetadataLocation`, `GetNamespace`, `GetTableBucket`, `ListTables`, `ListNamespaces` |
| **writer** | All reader + `PutTableData`, `UpdateTableMetadataLocation` |
| **admin** | All writer + `CreateTable`, `DeleteTable`, `RenameTable`, `CreateNamespace`, `DeleteNamespace` (policy-write actions are deliberately excluded so admins cannot replace the resource policy) |

### Table-Scope Permission Sets

| Level | Actions |
|-------|---------|
| **reader** | `GetTable`, `GetTableData`, `GetTableMetadataLocation` |
| **writer** | All reader + `PutTableData`, `UpdateTableMetadataLocation` |
| **admin** | All writer + `DeleteTable`, `RenameTable` (policy-write actions are deliberately excluded so admins cannot replace the resource policy) |

All actions use the `s3tables:` service prefix (e.g., `s3tables:GetTable`).

---

## AWS Region Availability

Amazon S3 Tables availability varies by AWS region and changes over time. Check the [AWS Regional Services List](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) for the current list of regions where Amazon S3 Tables is available before deploying.

---

## Service Quotas

| Quota | Default Limit | Adjustable |
|-------|---------------|------------|
| Table buckets per account per region | 10 | Yes |
| Namespaces per table bucket | 10,000 | No |
| Tables per namespace | 10,000 | No |

Request quota increases through the [AWS Service Quotas console](https://console.aws.amazon.com/servicequotas/) if needed.

---

## Iceberg Schema Evolution

S3 Tables manages Apache Iceberg tables with built-in schema and partition evolution support. Understanding which changes are non-destructive (in-place update) vs. destructive (requires table recreation) is critical for operational planning.

### Non-Destructive Changes (Update Config and Redeploy)

These changes can be applied by updating the module configuration and redeploying:

| Change | Details |
|--------|---------|
| Adding columns | Add new entries to the `columns` map |
| Reordering columns | Change the order of columns in the configuration |
| Adding partition fields | Add new entries to the `partitions` map |

S3 Tables handles Iceberg schema evolution transparently for additive changes. Existing data remains readable with the new schema.

### Destructive Changes (Require Table Recreation)

These changes cannot be applied in-place and require dropping and recreating the table:

| Change | Details |
|--------|---------|
| Removing columns | Removing a column from the `columns` map |
| Changing column types | Modifying a column's data type |
| Removing partition fields | Removing entries from the `partitions` map |

**Procedure for destructive changes:**

1. Remove the table from the module configuration
2. Deploy to delete the table resource
3. Add the table back with the updated schema
4. Deploy again to create the table with the new definition

> **Warning:** Destructive schema changes result in data loss for the affected table. Ensure data is backed up or migrated before proceeding.

### Partition Evolution

| Change | Type | Notes |
|--------|------|-------|
| Adding partition fields | Non-destructive | New partition fields apply to newly written data; existing data retains its original partitioning |
| Removing partition fields | Destructive | Requires table recreation |
| Changing partition transforms | Destructive | Requires table recreation |

---

## Related Modules

- [Data Lake](../datalake-app/README.md) — Deploy S3-based data lake buckets for use alongside S3 Tables
- [Athena Workgroup](../athena-workgroup-app/README.md) — Deploy Athena workgroups for querying Iceberg tables
