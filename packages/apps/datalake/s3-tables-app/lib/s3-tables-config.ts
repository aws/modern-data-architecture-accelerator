/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import {
  IcebergColumnDef,
  IcebergPartitionDef,
  IcebergSortOrderDef,
  MAX_TABLE_COLUMNS,
  NamespaceConfig as namespaceConfig,
  S3TablesAccessPolicyProps,
  TableBucketConfig as tableBucketConfig,
  TableBucketMaintenanceProps,
  TableConfig as tableConfig,
} from '@aws-mdaa/s3-tables-l3-construct';
import { Stack, Token } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Regex pattern for valid table bucket names: 3-63 lowercase alphanumeric characters and
 * hyphens, beginning and ending with a letter or number (no underscores or periods).
 */
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/**
 * Regex pattern for valid namespace and table names: lowercase letters, digits, and
 * underscores only, beginning with a letter or number. Hyphens and periods are NOT allowed.
 * See https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-buckets-naming.html
 */
const NAMESPACE_NAME_PATTERN = /^[a-z0-9][a-z0-9_]*$/;

/** Table names follow the same rules as namespace names. */
const TABLE_NAME_PATTERN = NAMESPACE_NAME_PATTERN;

/** AWS documentation for S3 Tables bucket/namespace/table naming rules. */
const S3_TABLES_NAMING_DOCS = 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-buckets-naming.html';

/**
 * Builds an actionable hint for an invalid namespace/table name. When the name contains the
 * common mistake of hyphens or periods, it calls that out and suggests the underscore form.
 */
function underscoreNameHint(name: string): string {
  if (/[-.]/.test(name)) {
    return (
      `Hyphens (-) and periods (.) are not allowed in namespace and table names — use underscores (_) ` +
      `instead (for example, '${name.replace(/[-.]/g, '_')}').`
    );
  }
  return 'Use only lowercase letters, numbers, and underscores, beginning with a letter or number.';
}

/**
 * Regex pattern for valid KMS key ARN format. Allows alphanumeric partition/region/account for
 * MDAA token resolution. The key-id class accepts both standard UUID key ids and multi-region key
 * (MRK) ids, which carry an `mrk-` prefix.
 */
const KMS_ARN_PATTERN = /^arn:[a-z0-9-]+:kms:[a-z0-9-]+:[a-z0-9-]+:key\/[a-zA-Z0-9-]+$/;

/**
 * Definition of a single table column as declared in YAML, keyed by column name.
 * Maps to an Iceberg schema field. Declaration order determines the Iceberg field id.
 *
 * Use cases: Defining a table's data model
 *
 * AWS: Iceberg schema field within AWS::S3Tables::Table IcebergMetadata
 *
 * Validation: type must match the supported Iceberg type pattern
 */
export interface ColumnConfig {
  /**
   * Iceberg data type. Parameterized types must include their parameters: decimal(p,s) and fixed[n].
   *
   * Use cases: string/timestamptz for event data; long/decimal for measures
   *
   * Validation: Required; must match the supported Iceberg type pattern
   * @pattern ^(boolean|int|long|float|double|decimal\([0-9]+, ?[0-9]+\)|date|time|timestamp|timestamptz|string|uuid|fixed\[[0-9]+\]|binary)$
   */
  readonly type: string;
  /**
   * Whether the column is required (non-nullable).
   *
   * Use cases: Enforcing presence of key columns
   *
   * Validation: Optional; defaults to false
   */
  readonly required?: boolean;
}

/**
 * Partition specification as declared in YAML, keyed by the source column name.
 *
 * Use cases: Time-based partitioning (day/month); hashed distribution (bucket)
 *
 * AWS: Iceberg partition field within AWS::S3Tables::Table IcebergMetadata
 *
 * Validation: source column (the key) must exist in the table columns; bucket requires
 *             numBuckets; truncate requires width
 */
export interface PartitionConfig {
  /**
   * Iceberg partition transform to apply to the source column.
   *
   * Validation: Required; one of identity | bucket | truncate | year | month | day | hour
   */
  readonly transform: 'identity' | 'bucket' | 'truncate' | 'year' | 'month' | 'day' | 'hour';
  /**
   * Number of buckets. Required when transform is 'bucket'.
   *
   * Validation: Positive integer when transform is 'bucket'
   * @minimum 1
   */
  readonly numBuckets?: number;
  /**
   * Truncation width. Required when transform is 'truncate'.
   *
   * Validation: Positive integer when transform is 'truncate'
   * @minimum 1
   */
  readonly width?: number;
}

/**
 * Sort order specification as declared in YAML, keyed by the source column name.
 *
 * Use cases: Ordering data files by time or key to improve query pruning
 *
 * AWS: Iceberg sort field within AWS::S3Tables::Table IcebergMetadata
 *
 * Validation: source column (the key) must exist in the table columns
 */
export interface SortConfig {
  /**
   * Sort direction.
   *
   * Validation: Required; ASC or DESC
   */
  readonly direction: 'ASC' | 'DESC';
  /**
   * Null ordering preference.
   *
   * Validation: Required; nulls-first or nulls-last
   */
  readonly nullOrder: 'nulls-first' | 'nulls-last';
}

/**
 * Configuration for an individual Iceberg table within a namespace, as declared in YAML.
 * Columns, partitions, and sort order are keyed maps (never arrays), following MDAA
 * conventions; the parser transforms them into the array-based L3 construct shapes.
 *
 * Use cases: Declaring an Iceberg table's schema, layout, and (optionally) additional access
 *
 * Validation: at least one column required; partition/sort column keys must exist in columns
 */
export interface TableConfig {
  /**
   * Table columns keyed by column name. Declaration order sets Iceberg field ids.
   *
   * Validation: Required; map of column name to ColumnConfig; at least one and at most 200 columns
   * @minProperties 1
   * @maxProperties 200
   */
  readonly columns: { [columnName: string]: ColumnConfig };
  /**
   * Partition specifications keyed by source column name.
   *
   * Validation: Optional; each key must reference a column in `columns`
   */
  readonly partitions?: { [columnName: string]: PartitionConfig };
  /**
   * Sort order specifications keyed by source column name.
   *
   * Validation: Optional; each key must reference a column in `columns`
   */
  readonly sortBy?: { [columnName: string]: SortConfig };
  /**
   * Table-level access policy names. These grants are ADDITIVE — they add table-scoped Allow
   * statements on top of any bucket-level grants; they cannot reduce or override access already
   * granted at the bucket scope. Use them to grant additional principals access to a specific
   * table beyond the bucket-level policies.
   *
   * Validation: Optional; each name must exist in top-level accessPolicies
   */
  readonly accessPolicies?: string[];
}

/**
 * Configuration for a namespace within a table bucket, as declared in YAML.
 *
 * Use cases: Grouping related tables (e.g. clickstream, metrics)
 *
 * Validation: at least one table required
 */
export interface NamespaceConfig {
  /**
   * Tables within this namespace, keyed by table name.
   *
   * Validation: Required; map of table name to table config; at least one table
   * @minProperties 1
   */
  readonly tables: { [tableName: string]: TableConfig };
}

/**
 * Iceberg compaction settings as declared in YAML.
 *
 * Use cases: Coalescing many small data files into fewer, larger ones
 *
 * Validation: targetFileSizeMB within 64–512 when set
 */
export interface CompactionConfig {
  /**
   * Target file size in MB for compaction.
   *
   * Validation: Optional; 64–512
   * @minimum 64
   * @maximum 512
   */
  readonly targetFileSizeMB?: number;
  /**
   * Whether compaction is enabled.
   *
   * Validation: Optional; defaults to enabled when the block is present
   */
  readonly enabled?: boolean;
}

/**
 * Iceberg snapshot management settings as declared in YAML.
 *
 * Use cases: Bounding snapshot retention for time-travel vs. storage cost
 *
 * Validation: minToKeep within 1–100, maxAgeHours within 1–8760 when set
 */
export interface SnapshotsConfig {
  /**
   * Minimum number of snapshots to retain.
   *
   * Validation: Optional; 1–100
   * @minimum 1
   * @maximum 100
   */
  readonly minToKeep?: number;
  /**
   * Maximum snapshot age in hours.
   *
   * Validation: Optional; 1–8760 (up to one year)
   * @minimum 1
   * @maximum 8760
   */
  readonly maxAgeHours?: number;
  /**
   * Whether snapshot management is enabled.
   *
   * Validation: Optional; defaults to enabled when the block is present
   */
  readonly enabled?: boolean;
}

/**
 * Iceberg unreferenced file removal settings as declared in YAML.
 *
 * Use cases: Reclaiming storage from files no longer referenced by any snapshot
 *
 * Validation: afterDays and keepNonCurrentDays within 1–365 when set
 */
export interface RemoveUnreferencedConfig {
  /**
   * Days before unreferenced files are removed.
   *
   * Validation: Optional; 1–365
   * @minimum 1
   * @maximum 365
   */
  readonly afterDays?: number;
  /**
   * Days to retain non-current files before removal.
   *
   * Validation: Optional; 1–365
   * @minimum 1
   * @maximum 365
   */
  readonly keepNonCurrentDays?: number;
  /**
   * Whether unreferenced file removal is enabled.
   *
   * Validation: Optional; defaults to enabled when the block is present
   */
  readonly enabled?: boolean;
}

/**
 * Table bucket maintenance configuration as declared in YAML. Uses friendly names that map
 * to the underlying Iceberg maintenance tasks; all sub-blocks and settings are optional.
 *
 * Scope differs by setting: `removeUnreferenced` is a genuine table-bucket-wide setting that
 * applies to all tables in the bucket (including tables created outside MDAA), whereas
 * `compaction` and `snapshots` are per-table Iceberg properties — the single bucket-level block
 * is fanned out (copied) onto every table MDAA provisions in that bucket.
 *
 * Use cases: Tuning compaction, snapshot retention, and file cleanup per bucket
 */
export interface MaintenanceConfig {
  /** Iceberg compaction settings. Applied per-table to every table MDAA provisions in the bucket. */
  readonly compaction?: CompactionConfig;
  /** Iceberg snapshot management settings. Applied per-table to every table MDAA provisions in the bucket. */
  readonly snapshots?: SnapshotsConfig;
  /** Iceberg unreferenced file removal settings. Applied bucket-wide to all tables in the bucket. */
  readonly removeUnreferenced?: RemoveUnreferencedConfig;
}

/**
 * Access policy configuration as declared in YAML. Maps role tiers to logical role names
 * defined in the top-level roles section, mirroring the datalake module's tier model:
 *   ReadRoles           -> read-only  (Get and List on table data + metadata)
 *   ReadWriteRoles      -> read-write (Read + Put/Update table data)
 *   ReadWriteSuperRoles -> full admin (ReadWrite + create/delete/rename, manage policy)
 *
 * Use cases: Reusable permission sets; consistent access patterns across table buckets
 *
 * AWS: S3 Tables resource policy statements derived from named access policies
 *
 * Validation: role names must exist in top-level roles
 */
export interface AccessPolicyConfig {
  /**
   * Logical role names granted read-only access.
   *
   * Use cases: Data analysts; reporting tools; read-only integrations
   *
   * Validation: Optional; array of strings matching keys in top-level roles
   */
  readonly ReadRoles?: string[];
  /**
   * Logical role names granted read-write access.
   *
   * Use cases: Data engineers; ETL pipelines; streaming ingestion
   *
   * Validation: Optional; array of strings matching keys in top-level roles
   */
  readonly ReadWriteRoles?: string[];
  /**
   * Logical role names granted full admin access.
   *
   * Use cases: Platform administrators; schema management; policy management
   *
   * Validation: Optional; array of strings matching keys in top-level roles
   */
  readonly ReadWriteSuperRoles?: string[];
}

/**
 * Configuration for a table bucket as declared in YAML.
 *
 * Use cases: Multi-bucket deployments; isolated data domains
 *
 * AWS: S3 Tables table buckets with resource policies, KMS encryption
 *
 * Validation: accessPolicies and namespaces required; kmsKeyArn must be a valid KMS ARN when set
 */
export interface TableBucketConfig {
  /**
   * Access policy names applied to this table bucket. Each name must reference a policy
   * defined in the top-level accessPolicies configuration.
   *
   * Validation: Required; array of names present in top-level accessPolicies
   */
  readonly accessPolicies: string[];
  /**
   * External KMS key ARN. When omitted, MDAA creates a dedicated CMK scoped to the granted roles
   * and automatically grants the S3 Tables maintenance principal access on it.
   *
   * BYOK responsibility: when you supply an external key, MDAA does NOT (and cannot) modify that
   * key's policy, so you MUST grant the S3 Tables maintenance principal access yourself or table
   * creation fails with "Insufficient access to perform table maintenance". Add a statement to the
   * key policy granting `kms:Decrypt` and `kms:GenerateDataKey` to the service principal
   * `maintenance.s3tables.amazonaws.com`, conditioned on `kms:EncryptionContext:aws:s3:arn` matching
   * `<tableBucketArn>/*`.
   *
   * Validation: Optional; must match the KMS key ARN format when set
   */
  readonly kmsKeyArn?: string;
  /**
   * Maintenance configuration for compaction, snapshots, and unreferenced file removal.
   *
   * Validation: Optional; secure/cost-aware defaults applied when omitted
   */
  readonly maintenance?: MaintenanceConfig;
  /**
   * Namespaces within this bucket, keyed by namespace name.
   *
   * Validation: Required; map of namespace name to namespace config; at least one namespace
   * @minProperties 1
   */
  readonly namespaces: { [namespaceName: string]: NamespaceConfig };
}

/**
 * Top-level config contents for the S3 Tables module extending MdaaBaseConfigContents.
 * Mirrors the datalake module pattern: roles -> accessPolicies -> resources.
 *
 * The build script (`build_package.sh S3TablesConfigContents`) generates a JSON Schema
 * from this interface at build time for AJV validation.
 *
 * Validation: roles and tableBuckets required; accessPolicies required if referenced
 */
export interface S3TablesConfigContents extends MdaaBaseConfigContents {
  /**
   * Named role references for use in access policies. Each key is a logical role name,
   * value is an array of physical IAM role references (ARN, name, ID, or SSM parameter).
   *
   * Use cases: Multi-role access patterns; cross-account access; SSO role mapping
   *
   * AWS: IAM role references for S3 Tables resource policies and KMS key policies
   *
   * Validation: Required; map of role name to MdaaRoleRef[]; roles referenced in
   *             accessPolicies must be defined here
   */
  readonly roles: { [key: string]: MdaaRoleRef[] };
  /**
   * Named access policies defining role-based permissions for S3 Tables resources.
   * Policies are referenced by name in table bucket (and optionally table) configurations.
   *
   * Use cases: Reusable permission sets; read/write/admin separation across buckets
   *
   * AWS: S3 Tables resource policy statements
   *
   * Validation: Required; map of policy name to AccessPolicyConfig (may be an empty map when no
   *             table bucket references an access policy)
   */
  readonly accessPolicies: { [key: string]: AccessPolicyConfig };
  /**
   * Table bucket definitions keyed by logical bucket name.
   * Each bucket provisions an AWS::S3Tables::TableBucket with nested namespaces and tables.
   *
   * Use cases: Multi-bucket deployments; isolated data domains
   *
   * AWS: S3 Tables table buckets with resource policies, KMS encryption
   *
   * Validation: Required; map of bucket name to the YAML table bucket shape
   */
  readonly tableBuckets: { [key: string]: TableBucketConfig };
}

/**
 * S3 Tables configuration parser. Validates the YAML config against the generated JSON Schema,
 * resolves logical role names to MdaaRoleRef arrays, and transforms the friendly, keyed-map
 * YAML shape into the array-based configuration objects expected by the L3 construct.
 *
 * Pipeline:
 * 1. Parse and validate config via AJV (JSON Schema over the YAML shape)
 * 2. Extract top-level roles
 * 3. Build resolved access policies (ReadRoles/ReadWriteRoles/ReadWriteSuperRoles -> MdaaRoleRef[])
 * 4. Transform the YAML table buckets (keyed maps) into the L3 TableBucketConfig shape (arrays)
 * 5. Perform cross-field validation beyond what JSON Schema can express
 */
export class S3TablesConfigParser extends MdaaAppConfigParser<S3TablesConfigContents> {
  /** Resolved role references keyed by logical role name. */
  public readonly roles: { [key: string]: MdaaRoleRef[] };
  /** Table bucket configurations in the array-based format expected by the L3 construct. */
  public readonly tableBuckets: { [bucketName: string]: tableBucketConfig };
  /** Resolved access policies with role names expanded to MdaaRoleRef arrays. */
  public readonly accessPolicies: { [name: string]: S3TablesAccessPolicyProps };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema);

    // Extract roles (same pattern as DataLakeConfigParser)
    this.roles = 'roles' in this.configContents ? this.configContents['roles'] : {};

    // Build resolved access policies from role tiers -> MdaaRoleRef[]
    this.accessPolicies =
      'accessPolicies' in this.configContents ? this.buildAccessPolicies(this.configContents.accessPolicies) : {};

    // Transform the friendly YAML table bucket shape into the L3 construct shape.
    this.tableBuckets = this.buildTableBuckets(this.configContents.tableBuckets);

    // Cross-field validations beyond JSON Schema
    this.validate();
  }

  /**
   * Resolves the role tiers in each access policy to MdaaRoleRef arrays.
   * ReadRoles -> reader, ReadWriteRoles -> writer, ReadWriteSuperRoles -> admin.
   */
  private buildAccessPolicies(accessPolicyConfigs: { [key: string]: AccessPolicyConfig }): {
    [name: string]: S3TablesAccessPolicyProps;
  } {
    const accessPolicies: { [name: string]: S3TablesAccessPolicyProps } = {};
    Object.entries(accessPolicyConfigs).forEach(([policyName, policyConfig]) => {
      const readerRoles: string[] = policyConfig.ReadRoles || [];
      const writerRoles: string[] = policyConfig.ReadWriteRoles || [];
      const adminRoles: string[] = policyConfig.ReadWriteSuperRoles || [];

      // Validate that referenced role names exist in top-level roles
      [...readerRoles, ...writerRoles, ...adminRoles].forEach(roleName => {
        if (!(roleName in this.roles)) {
          throw new Error(
            `Role '${roleName}' is referenced in accessPolicy '${policyName}' ` +
              `but not defined in top-level 'roles'`,
          );
        }
      });

      accessPolicies[policyName] = {
        name: policyName,
        readerRoleRefs: readerRoles.flatMap(x => this.roles[x] || []),
        writerRoleRefs: writerRoles.flatMap(x => this.roles[x] || []),
        adminRoleRefs: adminRoles.flatMap(x => this.roles[x] || []),
      };
    });
    return accessPolicies;
  }

  /**
   * Transforms the keyed-map YAML table bucket shape into the array-based L3 TableBucketConfig.
   */
  private buildTableBuckets(tableBuckets: { [name: string]: TableBucketConfig }): {
    [name: string]: tableBucketConfig;
  } {
    const result: { [name: string]: tableBucketConfig } = {};
    Object.entries(tableBuckets).forEach(([bucketName, bucketConfig]) => {
      result[bucketName] = {
        accessPolicies: bucketConfig.accessPolicies,
        kmsKeyArn: bucketConfig.kmsKeyArn,
        maintenance: this.buildMaintenance(bucketConfig.maintenance),
        namespaces: this.buildNamespaces(bucketConfig.namespaces),
      };
    });
    return result;
  }

  /**
   * Maps the friendly maintenance config names to the underlying L3/L2 maintenance props.
   * Returns undefined when no maintenance block is declared.
   */
  private buildMaintenance(maintenance?: MaintenanceConfig): TableBucketMaintenanceProps | undefined {
    if (!maintenance) {
      return undefined;
    }
    return {
      ...(maintenance.compaction
        ? {
            compaction: {
              targetFileSizeMB: maintenance.compaction.targetFileSizeMB,
              enabled: maintenance.compaction.enabled,
            },
          }
        : {}),
      ...(maintenance.snapshots
        ? {
            snapshotManagement: {
              minSnapshotsToKeep: maintenance.snapshots.minToKeep,
              maxSnapshotAgeHours: maintenance.snapshots.maxAgeHours,
              enabled: maintenance.snapshots.enabled,
            },
          }
        : {}),
      ...(maintenance.removeUnreferenced
        ? {
            unreferencedFileRemoval: {
              unreferencedDays: maintenance.removeUnreferenced.afterDays,
              nonCurrentDays: maintenance.removeUnreferenced.keepNonCurrentDays,
              enabled: maintenance.removeUnreferenced.enabled,
            },
          }
        : {}),
    };
  }

  /**
   * Transforms keyed-map namespaces/tables into the array-based L3 NamespaceConfig shape.
   */
  private buildNamespaces(namespaces: { [name: string]: NamespaceConfig }): {
    [name: string]: namespaceConfig;
  } {
    const result: { [name: string]: namespaceConfig } = {};
    Object.entries(namespaces).forEach(([nsName, nsConfig]) => {
      const tables: { [tableName: string]: tableConfig } = {};
      Object.entries(nsConfig.tables).forEach(([tableName, tableConfig]) => {
        tables[tableName] = this.buildTable(tableConfig);
      });
      result[nsName] = { tables };
    });
    return result;
  }

  /**
   * Transforms a single keyed-map table config into the array-based L3 TableConfig shape.
   * Column declaration order is preserved (it determines Iceberg field ids); partition and
   * sort maps are expanded with their key as the source column name.
   */
  private buildTable(tableConfig: TableConfig): tableConfig {
    const columns: IcebergColumnDef[] = Object.entries(tableConfig.columns).map(([name, col]) => ({
      name,
      columnType: col.type,
      required: col.required ?? false,
    }));

    const partitions: IcebergPartitionDef[] | undefined = tableConfig.partitions
      ? Object.entries(tableConfig.partitions).map(([column, part]) => ({
          column,
          transform: part.transform,
          numBuckets: part.numBuckets,
          width: part.width,
        }))
      : undefined;

    const sortOrder: IcebergSortOrderDef[] | undefined = tableConfig.sortBy
      ? Object.entries(tableConfig.sortBy).map(([column, sort]) => ({
          column,
          direction: sort.direction,
          nullOrder: sort.nullOrder,
        }))
      : undefined;

    return {
      schema: { columns },
      partitions,
      sortOrder,
      accessPolicies: tableConfig.accessPolicies,
    };
  }

  /**
   * Cross-field validations beyond what JSON Schema can express.
   * Validates naming conventions, partition/sort-order references,
   * access policy references, and KMS ARN format.
   */
  private validate(): void {
    Object.entries(this.tableBuckets).forEach(([bucketName, bucketConfig]) => {
      this.validateBucket(bucketName, bucketConfig);
    });
  }

  /**
   * Validates a single table bucket: name format, KMS ARN,
   * access policy references, and all nested namespaces.
   */
  private validateBucket(bucketName: string, bucketConfig: tableBucketConfig): void {
    this.validateBucketName(bucketName);

    if (bucketConfig.kmsKeyArn) {
      this.validateKmsArn(bucketConfig.kmsKeyArn, bucketName);
    }

    this.validateAccessPolicyRefs(bucketConfig.accessPolicies, `tableBuckets.${bucketName}.accessPolicies`);

    // Namespace names are object keys and therefore inherently unique; validate each.
    Object.entries(bucketConfig.namespaces).forEach(([nsName, nsConfig]) => {
      this.validateNamespaceName(nsName, bucketName);
      this.validateNamespaceTables(bucketName, nsName, nsConfig);
    });
  }

  /**
   * Validates all tables within a namespace: schema and table-level access policy references.
   */
  private validateNamespaceTables(bucketName: string, nsName: string, nsConfig: namespaceConfig): void {
    Object.entries(nsConfig.tables).forEach(([tableName, tableConfig]) => {
      this.validateTableName(tableName, nsName, bucketName);
      this.validateTableSchema(tableName, nsName, bucketName, tableConfig);

      if (tableConfig.accessPolicies) {
        this.validateAccessPolicyRefs(tableConfig.accessPolicies, `table '${bucketName}/${nsName}/${tableName}'`);
      }
    });
  }

  /**
   * Validates that each referenced access policy name exists in the top-level accessPolicies map.
   */
  private validateAccessPolicyRefs(policyNames: string[], referencedIn: string): void {
    policyNames.forEach(policyName => {
      if (!(policyName in this.accessPolicies)) {
        throw new Error(
          `Access policy '${policyName}' is referenced in ${referencedIn} ` +
            `but not defined in top-level 'accessPolicies'`,
        );
      }
    });
  }

  /**
   * Validates table bucket name format.
   * Must be 3-63 characters, lowercase alphanumeric and hyphens only, beginning and ending
   * with a letter or number (no underscores or periods).
   */
  private validateBucketName(bucketName: string): void {
    if (!bucketName || bucketName.length < 3) {
      throw new Error(`Table bucket name '${bucketName}' must be at least 3 characters`);
    }
    if (bucketName.length > 63) {
      throw new Error(`Table bucket name '${bucketName}' exceeds 63 characters (length: ${bucketName.length})`);
    }
    if (!BUCKET_NAME_PATTERN.test(bucketName)) {
      // Table bucket names are the inverse of table/namespace names: hyphens allowed, underscores not.
      const hint = /[_.]/.test(bucketName)
        ? `Underscores (_) and periods (.) are not allowed in table bucket names — use hyphens (-) ` +
          `instead (for example, '${bucketName.replace(/[_.]/g, '-')}').`
        : 'Use only lowercase letters, numbers, and hyphens, beginning and ending with a letter or number.';
      throw new Error(
        `Table bucket name '${bucketName}' is invalid. ${hint} See S3 Tables naming rules: ${S3_TABLES_NAMING_DOCS}`,
      );
    }
  }

  /**
   * Validates namespace name format.
   * Must be 1-255 characters, lowercase letters, digits, and underscores only, beginning with a
   * letter or number. Hyphens and periods are not allowed.
   */
  private validateNamespaceName(nsName: string, bucketName: string): void {
    if (!nsName || nsName.length === 0) {
      throw new Error(`Namespace name cannot be empty in table bucket '${bucketName}'`);
    }
    if (nsName.length > 255) {
      throw new Error(
        `Namespace name '${nsName}' in table bucket '${bucketName}' exceeds 255 characters ` +
          `(length: ${nsName.length})`,
      );
    }
    if (!NAMESPACE_NAME_PATTERN.test(nsName)) {
      throw new Error(
        `Namespace name '${nsName}' in table bucket '${bucketName}' is invalid. ${underscoreNameHint(nsName)} ` +
          `See S3 Tables naming rules: ${S3_TABLES_NAMING_DOCS}`,
      );
    }
  }

  /**
   * Validates table name format.
   * Must be 1-255 characters, lowercase letters, digits, and underscores only, beginning with a
   * letter or number. Hyphens and periods are not allowed.
   */
  private validateTableName(tableName: string, nsName: string, bucketName: string): void {
    const tableRef = `'${bucketName}/${nsName}/${tableName}'`;
    if (!tableName || tableName.length === 0) {
      throw new Error(`Table name cannot be empty in namespace '${bucketName}/${nsName}'`);
    }
    if (tableName.length > 255) {
      throw new Error(`Table name ${tableRef} exceeds 255 characters (length: ${tableName.length})`);
    }
    if (!TABLE_NAME_PATTERN.test(tableName)) {
      throw new Error(
        `Table name ${tableRef} is invalid. ${underscoreNameHint(tableName)} ` +
          `See S3 Tables naming rules: ${S3_TABLES_NAMING_DOCS}`,
      );
    }
  }

  /**
   * Validates KMS key ARN format.
   * Skips validation when the value is an unresolved CDK token. By the time this runs, the base
   * config parser has already substituted MDAA reference tokens (e.g. `{{partition}}`, `{{account}}`)
   * into literals, so a remaining unresolved value can only be a CDK token (e.g. an `${Token[...]}`
   * from `stack.partition`/`stack.account`, or an SSM/ref-valued `kmsKeyArn`). Such tokens contain no
   * `{{` and would spuriously fail the regex, so they are skipped and left for CDK/KMS to resolve.
   */
  private validateKmsArn(kmsArn: string, bucketName: string): void {
    // Skip validation for unresolved CDK tokens; the concrete ARN is only known at synth/deploy time.
    if (Token.isUnresolved(kmsArn)) {
      return;
    }
    if (!KMS_ARN_PATTERN.test(kmsArn)) {
      throw new Error(
        `KMS key ARN '${kmsArn}' in table bucket '${bucketName}' is malformed. ` +
          `Expected format: arn:<partition>:kms:<region>:<account>:key/<key-id>`,
      );
    }
  }

  /**
   * Validates table partition specifications and sort orders against the table schema.
   * Column types are validated by the JSON Schema (type pattern) and maintenance value ranges
   * by the schema minimum/maximum constraints, so this method focuses on the cross-field checks
   * the schema cannot express: partition/sort-order column references and partition transform
   * parameter requirements.
   */
  private validateTableSchema(tableName: string, nsName: string, bucketName: string, tableConfig: tableConfig): void {
    const tableRef = `'${bucketName}/${nsName}/${tableName}'`;

    // Enforce column-count bounds the JSON Schema cannot always express reliably: at least one
    // column (an empty schema renders an empty SchemaFieldList and fails deploy) and at most 200.
    if (tableConfig.schema.columns.length === 0) {
      throw new Error(`Table ${tableRef} must define at least one column`);
    }
    if (tableConfig.schema.columns.length > MAX_TABLE_COLUMNS) {
      throw new Error(
        `Table ${tableRef} defines ${tableConfig.schema.columns.length} columns, ` +
          `exceeding the maximum of ${MAX_TABLE_COLUMNS}`,
      );
    }

    const columnNames = new Set(tableConfig.schema.columns.map(col => col.name));

    // Validate partition column references exist in schema
    if (tableConfig.partitions) {
      tableConfig.partitions.forEach(partition => {
        if (!columnNames.has(partition.column)) {
          throw new Error(
            `Partition in table ${tableRef} references column '${partition.column}' ` +
              `which does not exist in the table schema`,
          );
        }

        // Validate partition transform parameters
        if (partition.transform === 'bucket') {
          if (!partition.numBuckets || partition.numBuckets < 1) {
            throw new Error(
              `Partition transform 'bucket' on column '${partition.column}' in table ${tableRef} ` +
                `requires a positive integer 'numBuckets' parameter`,
            );
          }
        }
        if (partition.transform === 'truncate') {
          if (!partition.width || partition.width < 1) {
            throw new Error(
              `Partition transform 'truncate' on column '${partition.column}' in table ${tableRef} ` +
                `requires a positive integer 'width' parameter`,
            );
          }
        }
      });
    }

    // Validate sort-order column references exist in schema
    if (tableConfig.sortOrder) {
      tableConfig.sortOrder.forEach(sortField => {
        if (!columnNames.has(sortField.column)) {
          throw new Error(
            `Sort order in table ${tableRef} references column '${sortField.column}' ` +
              `which does not exist in the table schema`,
          );
        }
      });
    }
  }
}
