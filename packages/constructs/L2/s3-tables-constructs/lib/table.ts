/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { RemovalPolicy } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnTable } from 'aws-cdk-lib/aws-s3tables';
import { Construct } from 'constructs';
import { IcebergCompactionProps, IcebergSnapshotManagementProps } from './table-bucket';
import { MdaaTablePolicy } from './policy';

/**
 * Builder for the additional statements appended to the table policy after the mandatory
 * deny-non-TLS statement. Mirrors {@link IMdaaTableBucketPolicyStatementsBuilder}: the policy is
 * created inside the {@link MdaaTable} constructor, so the table ARN token is passed to
 * {@link buildStatements} rather than requiring the caller to have it beforehand. jsii does not
 * support function-typed properties, so this method-bearing interface is the callback equivalent.
 */
export interface IMdaaTablePolicyStatementsBuilder {
  /**
   * Builds the additional statements (e.g. table-level grant Allow statements) to append after the
   * mandatory deny-non-TLS statement in the table policy.
   *
   * @param tableArn - The ARN of the table (the CfnTable attribute token).
   * @returns The statements to append to the table policy.
   */
  buildStatements(tableArn: string): PolicyStatement[];
}

/**
 * Definition of a single Iceberg table column.
 */
export interface IcebergColumnDef {
  /** Column name. */
  readonly name: string;
  /**
   * Iceberg data type (e.g. string, int, long, timestamp). Parameterized types must include
   * their parameters: decimal(p,s) and fixed[n].
   * @pattern ^(boolean|int|long|float|double|decimal\([0-9]+, ?[0-9]+\)|date|time|timestamp|timestamptz|string|uuid|fixed\[[0-9]+\]|binary)$
   */
  readonly columnType: string;
  /** Whether the column is required (non-nullable). */
  readonly required: boolean;
}

/**
 * Definition of an Iceberg partition field.
 */
export interface IcebergPartitionDef {
  /** Source column name from the table schema. */
  readonly column: string;
  /** Partition transform to apply. */
  readonly transform: 'identity' | 'bucket' | 'truncate' | 'year' | 'month' | 'day' | 'hour';
  /** Number of buckets (required when transform is 'bucket'). */
  readonly numBuckets?: number;
  /** Truncation width (required when transform is 'truncate'). */
  readonly width?: number;
}

/**
 * Definition of an Iceberg sort order field.
 */
export interface IcebergSortOrderDef {
  /** Source column name from the table schema. */
  readonly column: string;
  /** Sort direction. */
  readonly direction: 'ASC' | 'DESC';
  /** Null ordering preference. */
  readonly nullOrder: 'nulls-first' | 'nulls-last';
}

/**
 * Props for the MdaaTable construct.
 */
export interface MdaaTableProps extends MdaaConstructProps {
  /** ARN of the parent Table Bucket. */
  readonly tableBucketArn: string;
  /** Name of the parent Namespace. */
  readonly namespaceName: string;
  /** Table name. */
  readonly tableName: string;
  /** Column definitions (at least one, max 200). */
  readonly columns: IcebergColumnDef[];
  /** Partition specifications. */
  readonly partitions?: IcebergPartitionDef[];
  /** Sort order specifications. */
  readonly sortOrder?: IcebergSortOrderDef[];
  /**
   * Optional Iceberg compaction settings. Rendered into the table's Compaction property.
   * Compaction is a table property (not a bucket property).
   */
  readonly compaction?: IcebergCompactionProps;
  /**
   * Optional Iceberg snapshot management settings. Rendered into the table's SnapshotManagement
   * property. Snapshot management is a table property (not a bucket property).
   */
  readonly snapshotManagement?: IcebergSnapshotManagementProps;
  /**
   * Whether to attach the single {@link MdaaTablePolicy} that this table owns. Defaults to true,
   * which bakes in the mandatory deny-non-TLS (in-transit) control as compliance-by-default, so a
   * table provisioned directly through this construct is TLS-enforced at its own resource level.
   *
   * Setting this to false is a documented escape hatch that suppresses the table resource policy
   * entirely — leaving the table with NO in-transit (TLS) enforcement of its own (it would then
   * rely solely on the parent bucket policy). Only opt out when the caller intentionally manages
   * the single allowed table policy elsewhere; otherwise leave this at its default to remain compliant.
   */
  readonly attachTablePolicy?: boolean;
  /**
   * Builder invoked to produce the additional statements (e.g. table-level grant Allow statements)
   * to append after the mandatory deny-non-TLS statement in the table policy. Its
   * {@link IMdaaTablePolicyStatementsBuilder.buildStatements} method receives the table ARN so
   * callers can scope statements without re-deriving it. Only invoked when {@link attachTablePolicy}
   * is not false.
   */
  readonly additionalPolicyStatements?: IMdaaTablePolicyStatementsBuilder;
}

/** Maximum number of columns permitted in an Iceberg table schema. */
export const MAX_TABLE_COLUMNS = 200;

/**
 * L2 construct wrapping AWS::S3Tables::Table with Iceberg schema,
 * partition specs, and sort order configuration.
 *
 * Schema, partitions, and sort order are rendered into the resource's IcebergMetadata
 * property. Iceberg fields are assigned 1-based field ids (in declared column order), and
 * partition/sort fields reference those columns by their numeric source id.
 *
 * In-transit protection is compliance-by-default: unless {@link MdaaTableProps.attachTablePolicy}
 * is set to false, the table attaches the single {@link MdaaTablePolicy} it owns, which always
 * injects a deny-non-TLS statement scoped to the table ARN. A table created through this construct
 * is therefore TLS-enforced at its own resource level, not only via the parent bucket policy.
 */
export class MdaaTable extends Construct {
  /** The ARN of the provisioned Table. */
  public readonly tableArn: string;
  /** The table name. */
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props: MdaaTableProps) {
    super(scope, id);

    if (props.columns.length === 0) {
      throw new Error(`Table '${props.tableName}' must define at least one column`);
    }
    if (props.columns.length > MAX_TABLE_COLUMNS) {
      throw new Error(
        `Table '${props.tableName}' defines ${props.columns.length} columns, exceeding the maximum of ${MAX_TABLE_COLUMNS}`,
      );
    }

    const cfnTable = new CfnTable(this, 'Resource', {
      tableBucketArn: props.tableBucketArn,
      namespace: props.namespaceName,
      tableName: props.tableName,
      openTableFormat: 'ICEBERG',
      icebergMetadata: MdaaTable.buildIcebergMetadata(props),
      ...(props.compaction ? { compaction: MdaaTable.buildCompaction(props.compaction) } : {}),
      ...(props.snapshotManagement
        ? { snapshotManagement: MdaaTable.buildSnapshotManagement(props.snapshotManagement) }
        : {}),
    });

    // Retain the table (and its Iceberg data) on stack deletion, for data protection. This mirrors
    // the RETAIN policy on the parent MdaaTableBucket: a retained bucket does not protect its child
    // tables, so without this the tables would be deleted on stack deletion while the bucket remains.
    cfnTable.applyRemovalPolicy(RemovalPolicy.RETAIN);

    this.tableArn = cfnTable.attrTableArn;
    this.tableName = props.tableName;

    // Attach the single table resource policy this table owns (compliance-by-default): MdaaTablePolicy
    // always bakes in the deny-non-TLS statement scoped to the table ARN, so a table provisioned
    // directly through this construct gets in-transit enforcement without the caller wiring a separate
    // policy. Grant statements (when any) are supplied via the builder, which receives the table ARN.
    if (props.attachTablePolicy !== false) {
      new MdaaTablePolicy(this, 'Policy', {
        tableArn: this.tableArn,
        additionalStatements: props.additionalPolicyStatements?.buildStatements(this.tableArn),
        naming: props.naming,
      });
    }
  }

  /**
   * Builds the IcebergMetadata property: schema field list (with 1-based field ids),
   * and optional partition spec and sort order referencing columns by source id.
   */
  private static buildIcebergMetadata(props: MdaaTableProps): CfnTable.IcebergMetadataProperty {
    // Assign 1-based Iceberg field ids in declared column order.
    const columnIdByName = new Map<string, number>();
    const schemaFieldList: CfnTable.SchemaFieldProperty[] = props.columns.map((col, index) => {
      const fieldId = index + 1;
      columnIdByName.set(col.name, fieldId);
      return { id: fieldId, name: col.name, type: col.columnType, required: col.required };
    });

    const metadata: CfnTable.IcebergMetadataProperty = {
      icebergSchema: { schemaFieldList },
      ...(props.partitions && props.partitions.length > 0
        ? {
            icebergPartitionSpec: {
              fields: props.partitions.map(p => MdaaTable.buildPartitionField(p, columnIdByName)),
            },
          }
        : {}),
      ...(props.sortOrder && props.sortOrder.length > 0
        ? {
            icebergSortOrder: {
              fields: props.sortOrder.map(s => MdaaTable.buildSortField(s, columnIdByName)),
            },
          }
        : {}),
    };

    return metadata;
  }

  /**
   * Maps the compaction settings to the CfnTable typed Compaction property.
   * An explicit `enabled: false` renders status 'disabled'; otherwise status is 'enabled'.
   */
  private static buildCompaction(compaction: IcebergCompactionProps): CfnTable.CompactionProperty {
    return {
      status: compaction.enabled === false ? 'disabled' : 'enabled',
      ...(compaction.targetFileSizeMB === undefined ? {} : { targetFileSizeMb: compaction.targetFileSizeMB }),
    };
  }

  /**
   * Maps the snapshot management settings to the CfnTable typed SnapshotManagement property.
   * An explicit `enabled: false` renders status 'disabled'; otherwise status is 'enabled'.
   */
  private static buildSnapshotManagement(
    snapshot: IcebergSnapshotManagementProps,
  ): CfnTable.SnapshotManagementProperty {
    return {
      status: snapshot.enabled === false ? 'disabled' : 'enabled',
      ...(snapshot.minSnapshotsToKeep === undefined ? {} : { minSnapshotsToKeep: snapshot.minSnapshotsToKeep }),
      ...(snapshot.maxSnapshotAgeHours === undefined ? {} : { maxSnapshotAgeHours: snapshot.maxSnapshotAgeHours }),
    };
  }

  /**
   * Maps a partition definition to an Iceberg partition field. Bucket/truncate transforms
   * are encoded in the Iceberg transform string (e.g. `bucket[16]`, `truncate[10]`).
   */
  private static buildPartitionField(
    partition: IcebergPartitionDef,
    columnIdByName: Map<string, number>,
  ): CfnTable.IcebergPartitionFieldProperty {
    const sourceId = columnIdByName.get(partition.column);
    if (sourceId === undefined) {
      throw new Error(
        `Partition field references column '${partition.column}' which does not exist in the table schema`,
      );
    }
    return {
      name: `${partition.column}_${partition.transform}`,
      sourceId,
      transform: MdaaTable.partitionTransformString(partition),
    };
  }

  /**
   * Renders the Iceberg transform string for a partition definition. The 'bucket' transform
   * requires a positive `numBuckets` and 'truncate' requires a positive `width`; both throw a
   * clear error when the required parameter is missing so direct L2 consumers do not silently
   * emit a parameterless transform.
   */
  private static partitionTransformString(partition: IcebergPartitionDef): string {
    if (partition.transform === 'bucket') {
      if (partition.numBuckets === undefined || partition.numBuckets < 1) {
        throw new Error(
          `Partition transform 'bucket' on column '${partition.column}' requires a positive integer 'numBuckets' parameter`,
        );
      }
      return `bucket[${partition.numBuckets}]`;
    }
    if (partition.transform === 'truncate') {
      if (partition.width === undefined || partition.width < 1) {
        throw new Error(
          `Partition transform 'truncate' on column '${partition.column}' requires a positive integer 'width' parameter`,
        );
      }
      return `truncate[${partition.width}]`;
    }
    return partition.transform;
  }

  /**
   * Maps a sort order definition to an Iceberg sort field. Sorting is applied on the raw
   * column value (identity transform); direction is normalized to Iceberg's lowercase form.
   */
  private static buildSortField(
    sortField: IcebergSortOrderDef,
    columnIdByName: Map<string, number>,
  ): CfnTable.IcebergSortFieldProperty {
    const sourceId = columnIdByName.get(sortField.column);
    if (sourceId === undefined) {
      throw new Error(`Sort field references column '${sortField.column}' which does not exist in the table schema`);
    }
    return {
      sourceId,
      transform: 'identity',
      direction: sortField.direction === 'DESC' ? 'desc' : 'asc',
      nullOrder: sortField.nullOrder,
    };
  }
}
