/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  IcebergColumnDef,
  IcebergPartitionDef,
  IcebergSortOrderDef,
  MdaaNamespace,
  MdaaTable,
  MdaaTableBucket,
  TableBucketMaintenanceProps,
} from '@aws-mdaa/s3-tables-constructs';
import { ArnFormat, BOOTSTRAP_QUALIFIER_CONTEXT, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import {
  buildBucketPolicyStatements,
  buildTablePolicyStatements,
  collectBucketAndTableRoleRefs,
} from './policy-builder';

/**
 * S3 Tables service principal that performs Iceberg table maintenance (compaction, snapshot
 * management, unreferenced file removal). When a table bucket is encrypted with a customer
 * managed KMS key, that key's resource policy must grant this principal decrypt/data-key
 * access, otherwise maintenance fails and table creation is rolled back.
 */
const S3_TABLES_MAINTENANCE_PRINCIPAL = 'maintenance.s3tables.amazonaws.com';

/**
 * Resolved access policy with role refs already expanded from logical names.
 * Maps permission levels (reader, writer, admin) to arrays of resolved IAM role references.
 */
export interface S3TablesAccessPolicyProps {
  /** Logical name of the access policy for identification in policy statements. */
  readonly name: string;
  /** Roles granted read-only access (GetTable, GetTableData, List*, etc.). */
  readonly readerRoleRefs: MdaaRoleRef[];
  /** Roles granted read-write access (reader + PutTableData, UpdateTableMetadataLocation). */
  readonly writerRoleRefs: MdaaRoleRef[];
  /** Roles granted admin access (writer + Create/Delete/Rename, PutPolicy). */
  readonly adminRoleRefs: MdaaRoleRef[];
}

/**
 * Schema definition for an Iceberg table containing column definitions.
 */
export interface TableSchemaConfig {
  /** Column definitions for the table. */
  readonly columns: IcebergColumnDef[];
}

/**
 * Configuration for an individual Iceberg table within a namespace.
 */
export interface TableConfig {
  /** Table schema with column definitions. */
  readonly schema: TableSchemaConfig;
  /** Partition specifications for the table. */
  readonly partitions?: IcebergPartitionDef[];
  /** Sort order specifications for the table. */
  readonly sortOrder?: IcebergSortOrderDef[];
  /** Table-level access policies. Additive: add table-scoped grants on top of bucket-level
   * policies; they cannot narrow or override access granted at the bucket scope. */
  readonly accessPolicies?: string[];
}

/**
 * Configuration for a namespace within a table bucket.
 */
export interface NamespaceConfig {
  /** Map of table names to their configurations within this namespace. */
  readonly tables: { [tableName: string]: TableConfig };
}

/**
 * Configuration for a table bucket including namespaces, policies, and encryption.
 */
export interface TableBucketConfig {
  /** Map of namespace names to their configurations. */
  readonly namespaces: { [namespaceName: string]: NamespaceConfig };
  /** Access policy names applied to this table bucket (must reference top-level accessPolicies). */
  readonly accessPolicies: string[];
  /** Optional maintenance configuration for compaction, snapshots, and unreferenced file removal. */
  readonly maintenance?: TableBucketMaintenanceProps;
  /** Optional external KMS key ARN. When omitted, a dedicated MdaaKmsKey is created. */
  readonly kmsKeyArn?: string;
}

/**
 * Props for the S3TablesL3Construct orchestrator.
 */
export interface S3TablesL3ConstructProps extends MdaaL3ConstructProps {
  /** Table bucket definitions keyed by logical bucket name. */
  readonly tableBuckets: { [bucketName: string]: TableBucketConfig };
  /** Resolved access policies (role names already expanded to MdaaRoleRef[]). */
  readonly accessPolicies: { [name: string]: S3TablesAccessPolicyProps };
}

/**
 * L3 construct that orchestrates S3 Tables resources: table buckets, namespaces, tables,
 * KMS encryption, and SSM parameter exports. Receives pre-resolved access policies
 * from the config parser and creates all required infrastructure.
 *
 * For each table bucket:
 * 1. Creates or resolves a KMS key for encryption
 * 2. Creates the MdaaTableBucket with KMS encryption
 * 3. Exports the table bucket ARN to SSM
 * 4. Creates namespaces and exports their names to SSM
 * 5. Creates tables and exports their ARNs to SSM
 */
export class S3TablesL3Construct extends MdaaL3Construct {
  constructor(scope: Construct, id: string, props: S3TablesL3ConstructProps) {
    super(scope, id, props);

    Object.entries(props.tableBuckets).forEach(([bucketName, bucketConfig]) => {
      this.createTableBucket(bucketName, bucketConfig, props);
    });
  }

  /**
   * Creates a single table bucket and everything scoped to it: its KMS key, the bucket-owned
   * TableBucketPolicy, the SSM ARN export, and the namespaces it contains (each of which creates
   * its own tables). Split out of the constructor so the per-bucket/namespace/table iteration does
   * not nest callbacks beyond a readable depth.
   */
  private createTableBucket(
    bucketName: string,
    bucketConfig: TableBucketConfig,
    props: S3TablesL3ConstructProps,
  ): void {
    // 1. Collect all roles from access policies for KMS key policy
    const allRoles = this.collectRoles(bucketName, bucketConfig, props.accessPolicies);

    // 2. Create or resolve KMS key
    const kmsKey = this.resolveKmsKey(bucketName, bucketConfig, allRoles, props);

    // 3. Create table bucket with KMS encryption. Only unreferenced file removal is a
    // table-bucket property; compaction and snapshot management are table properties and
    // are applied per-table below.
    //
    // The bucket owns the single TableBucketPolicy: MdaaTableBucket always attaches it with the
    // mandatory deny-non-TLS statement, and we feed the deny-all baseline + least-privilege grant
    // statements through additionalPolicyStatements. The builder callback receives the bucket ARN
    // so the ARN-parameterized statements are scoped without re-deriving the physical name.
    //
    // The deny-all baseline denies every principal outside its allowlist (no account-wide escape),
    // so the deploy principal that manages the resource must be explicitly exempted or CloudFormation
    // would lock itself out when it calls s3tables:GetTableBucketPolicy during deploy. That principal
    // is the CDK bootstrap CloudFormation execution role, whose ARN is deterministic from the
    // bootstrap qualifier — see deployExemptPrincipalArns().
    const tableBucket = new MdaaTableBucket(this, `bucket-${bucketName}`, {
      tableBucketName: bucketName,
      encryptionKey: kmsKey,
      unreferencedFileRemoval: bucketConfig.maintenance?.unreferencedFileRemoval,
      additionalPolicyStatements: {
        buildStatements: (arn: string) =>
          buildBucketPolicyStatements(
            arn,
            bucketConfig.accessPolicies,
            props.accessPolicies,
            this.baseprops.roleHelper,
            this.deployExemptPrincipalArns(),
            bucketConfig.namespaces,
          ),
      },
      naming: props.naming,
    });

    // 3a. For construct-created keys, grant the S3 Tables maintenance principal access scoped
    // to this bucket. Skipped for BYOK (external ARN), where the caller owns the key policy.
    if (!bucketConfig.kmsKeyArn) {
      this.grantMaintenanceAccess(kmsKey, tableBucket.tableBucketName);
    }

    // 4. Export table bucket ARN to SSM
    new MdaaParamAndOutput(
      tableBucket,
      {
        resourceType: 'table-bucket',
        resourceId: bucketName,
        name: 'arn',
        value: tableBucket.tableBucketArn,
        naming: props.naming,
      },
      this,
    );

    // 5. Loop namespaces
    Object.entries(bucketConfig.namespaces).forEach(([nsName, nsConfig]) => {
      this.createNamespace(bucketName, nsName, nsConfig, bucketConfig, tableBucket, props);
    });
  }

  /**
   * Creates a namespace within a table bucket, exports its name to SSM, and creates the tables it
   * contains. Extracted from the bucket loop so the namespace and table iteration each stay one
   * callback deep.
   */
  private createNamespace(
    bucketName: string,
    nsName: string,
    nsConfig: NamespaceConfig,
    bucketConfig: TableBucketConfig,
    tableBucket: MdaaTableBucket,
    props: S3TablesL3ConstructProps,
  ): void {
    const namespace = new MdaaNamespace(this, `ns-${bucketName}-${nsName}`, {
      tableBucketArn: tableBucket.tableBucketArn,
      namespaceName: nsName,
      naming: props.naming,
    });

    // Export namespace name to SSM
    new MdaaParamAndOutput(
      namespace,
      {
        resourceType: 'table-bucket',
        resourceId: `${bucketName}/namespace/${nsName}`,
        name: 'name',
        value: namespace.namespaceName,
        naming: props.naming,
      },
      this,
    );

    // 6. Loop tables within this namespace
    Object.entries(nsConfig.tables).forEach(([tableName, tableConfig]) => {
      this.createTable(bucketName, tableName, tableConfig, bucketConfig, tableBucket, namespace, props);
    });
  }

  /**
   * Creates a single Iceberg table within a namespace, wires its table-level policy, declares the
   * namespace dependency, and exports its ARN to SSM. Extracted so the table body — including its
   * inline policy-statement builder — does not add another callback level to the bucket/namespace
   * iteration.
   */
  private createTable(
    bucketName: string,
    tableName: string,
    tableConfig: TableConfig,
    bucketConfig: TableBucketConfig,
    tableBucket: MdaaTableBucket,
    namespace: MdaaNamespace,
    props: S3TablesL3ConstructProps,
  ): void {
    const nsName = namespace.namespaceName;
    // Capture the per-table access policies for the statements builder below. MdaaTable owns
    // the single table policy (deny-non-TLS baked in); the L3 supplies the grant statements
    // via the builder, which receives the table ARN so it does not need it beforehand.
    const tableAccessPolicies = tableConfig.accessPolicies ?? [];
    const table = new MdaaTable(this, `table-${bucketName}-${nsName}-${tableName}`, {
      tableBucketArn: tableBucket.tableBucketArn,
      namespaceName: nsName,
      tableName: tableName,
      columns: tableConfig.schema.columns,
      partitions: tableConfig.partitions,
      sortOrder: tableConfig.sortOrder,
      // Compaction and snapshot management are table properties; apply the bucket-config
      // maintenance settings to every table in the bucket.
      compaction: bucketConfig.maintenance?.compaction,
      snapshotManagement: bucketConfig.maintenance?.snapshotManagement,
      // MdaaTable attaches the single table policy (with the mandatory deny-non-TLS statement);
      // append the table-level grant Allow statements built against the table ARN.
      additionalPolicyStatements: {
        buildStatements: (tableArn: string) =>
          buildTablePolicyStatements(tableArn, tableAccessPolicies, props.accessPolicies, this.baseprops.roleHelper),
      },
      naming: props.naming,
    });

    // AWS::S3Tables::Table CreateTable fails if the owning namespace does not yet exist, and
    // AWS::S3Tables::Namespace exposes no GetAtt attributes to reference intrinsically. Add an
    // explicit construct dependency so CloudFormation emits a DependsOn on the CfnTable pointing
    // at the CfnNamespace, forcing the namespace to be created first.
    table.node.addDependency(namespace);

    // Export table ARN to SSM
    new MdaaParamAndOutput(
      table,
      {
        resourceType: 'table-bucket',
        resourceId: `${bucketName}/namespace/${nsName}/table/${tableName}`,
        name: 'arn',
        value: table.tableArn,
        naming: props.naming,
      },
      this,
    );

    // The table policy (deny-non-TLS + any table-level grants) is attached by MdaaTable itself
    // above via additionalPolicyStatements, keeping exactly one policy per table.
  }

  /**
   * Deploy principals that must be exempted from the bucket deny-all baseline so CloudFormation
   * does not lock itself out. The deny-all allows only its allowlisted ARNs, so the principal that
   * applies the resource policy (and calls s3tables:GetTableBucketPolicy during deploy) has to be in
   * that list. Under CDK's DefaultStackSynthesizer that principal is the bootstrap CloudFormation
   * execution role, whose ARN is deterministic from the bootstrap qualifier
   * (cdk-<qualifier>-cfn-exec-role-<account>-<region>). The qualifier is read from context, falling
   * back to the CDK default, matching how other MDAA L3 constructs derive bootstrap resource ARNs.
   */
  private deployExemptPrincipalArns(): string[] {
    const qualifier = this.node.tryGetContext(BOOTSTRAP_QUALIFIER_CONTEXT) ?? DefaultStackSynthesizer.DEFAULT_QUALIFIER;
    const cfnExecRoleArn = `arn:${this.partition}:iam::${this.account}:role/cdk-${qualifier}-cfn-exec-role-${this.account}-${this.region}`;
    return [cfnExecRoleArn];
  }

  /**
   * Creates a new MdaaKmsKey or resolves an externally provided key ARN.
   * When creating a new key, grants USER_ACTIONS to collected role IDs via StringLike on aws:userId,
   * and exports the key ARN to SSM. The S3 Tables maintenance grant is applied separately by
   * grantMaintenanceAccess() once the owning table bucket exists so it can be bucket-scoped.
   *
   * For an externally provided key (BYOK), the caller is responsible for granting the S3 Tables
   * maintenance principal access on that key; this construct cannot modify a key it does not own.
   */
  private resolveKmsKey(
    bucketName: string,
    bucketConfig: TableBucketConfig,
    keyUserRoles: MdaaResolvableRole[],
    props: S3TablesL3ConstructProps,
  ): IMdaaKmsKey {
    if (bucketConfig.kmsKeyArn) {
      // Use externally provided KMS key
      return Key.fromKeyArn(this, `kms-${bucketName}`, bucketConfig.kmsKeyArn);
    }

    // Create a dedicated MdaaKmsKey with key user role grants.
    // MdaaKmsKey automatically exports its ARN and ID to SSM via MdaaParamAndOutput.
    // The S3 Tables maintenance grant is added separately (see grantMaintenanceAccess) once the
    // owning table bucket exists, so the grant can be scoped to that specific bucket.
    return new MdaaKmsKey(this, `kms-${bucketName}`, {
      naming: props.naming,
      alias: bucketName,
      keyUserRoles: keyUserRoles,
    });
  }

  /**
   * Grants the S3 Tables maintenance service principal decrypt/data-key access on a
   * construct-created key; without it, table creation fails with "Insufficient access to perform
   * table maintenance". Scoped to the owning bucket via the kms:EncryptionContext:aws:s3:arn
   * condition, the least-privilege pattern documented for this principal:
   * https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-kms-permissions.html
   * The bucket ARN is built from the physical bucket name (a plain string) rather than the bucket's
   * CFN ARN attribute, since the bucket depends on this key and referencing the attribute would
   * create a circular dependency. Not called for BYOK keys, whose policy the caller owns.
   */
  private grantMaintenanceAccess(kmsKey: IMdaaKmsKey, tableBucketName: string): void {
    const tableBucketArn = Stack.of(this).formatArn({
      service: 's3tables',
      resource: 'bucket',
      resourceName: tableBucketName,
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
    });

    kmsKey.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowS3TablesMaintenance',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal(S3_TABLES_MAINTENANCE_PRINCIPAL)],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        // In a KMS key resource policy, '*' denotes the key the policy is attached to (a key
        // policy can only reference its own key), so this grant is scoped to this single key.
        resources: ['*'],
        conditions: {
          // Restrict to objects within this bucket. aws:SourceAccount is not sufficient on a
          // per-bucket key; the encryption-context ARN pins the grant to the owning bucket.
          StringLike: { 'kms:EncryptionContext:aws:s3:arn': `${tableBucketArn}/*` },
        },
      }),
    );
  }

  /**
   * Collects all unique roles from access policies referenced by a table bucket, for the KMS key
   * policy. Uses the shared bucket+table traversal (collectBucketAndTableRoleRefs) so it cannot drift
   * from the deny-all baseline's principal collection, then de-duplicates by reference id: a role
   * referenced by more than one access policy would otherwise be repeated in the KMS key policy
   * (template bloat; harmless for IAM evaluation).
   */
  private collectRoles(
    bucketName: string,
    bucketConfig: TableBucketConfig,
    accessPolicies: { [name: string]: S3TablesAccessPolicyProps },
  ): MdaaResolvableRole[] {
    const allRoleRefs = collectBucketAndTableRoleRefs(
      bucketConfig.accessPolicies,
      accessPolicies,
      bucketConfig.namespaces,
    );

    const resolvedRoles = this.baseprops.roleHelper.resolveRoleRefsWithOrdinals(allRoleRefs, `s3tables-${bucketName}`);
    return [...new Map(resolvedRoles.map(r => [r.refId(), r])).values()];
  }
}
