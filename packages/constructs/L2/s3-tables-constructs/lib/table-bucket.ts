/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { RemovalPolicy } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnTableBucket } from 'aws-cdk-lib/aws-s3tables';
import { Construct } from 'constructs';
import { MdaaTableBucketPolicy } from './policy';

/**
 * Configuration for Iceberg compaction maintenance. Compaction is a property of
 * AWS::S3Tables::Table and is applied per-table by {@link MdaaTable}.
 */
export interface IcebergCompactionProps {
  /**
   * Target file size in MB for compaction (64-512).
   * @minimum 64
   * @maximum 512
   */
  readonly targetFileSizeMB?: number;
  /** Whether compaction is enabled. */
  readonly enabled?: boolean;
}

/**
 * Configuration for Iceberg snapshot management maintenance. Snapshot management is a property
 * of AWS::S3Tables::Table and is applied per-table by {@link MdaaTable}.
 */
export interface IcebergSnapshotManagementProps {
  /**
   * Minimum number of snapshots to retain (1-100).
   * @minimum 1
   * @maximum 100
   */
  readonly minSnapshotsToKeep?: number;
  /**
   * Maximum snapshot age in hours (1-8760).
   * @minimum 1
   * @maximum 8760
   */
  readonly maxSnapshotAgeHours?: number;
  /** Whether snapshot management is enabled. */
  readonly enabled?: boolean;
}

/**
 * Configuration for Iceberg unreferenced file removal maintenance.
 *
 * This is the only maintenance task supported at the table-bucket level — it maps to the
 * AWS::S3Tables::TableBucket `UnreferencedFileRemoval` property.
 */
export interface TableBucketMaintenanceUnreferencedFileRemovalProps {
  /**
   * Days before unreferenced files are removed (1-365).
   * @minimum 1
   * @maximum 365
   */
  readonly unreferencedDays?: number;
  /**
   * Days for non-current file removal (1-365).
   * @minimum 1
   * @maximum 365
   */
  readonly nonCurrentDays?: number;
  /** Whether unreferenced file removal is enabled. */
  readonly enabled?: boolean;
}

/**
 * Table bucket maintenance configuration options.
 *
 * Only {@link unreferencedFileRemoval} is a table-bucket property; {@link compaction} and
 * {@link snapshotManagement} are AWS::S3Tables::Table properties and are applied per-table by
 * {@link MdaaTable}. They are grouped here so the maintenance surface can be declared once per
 * bucket and applied to every table in that bucket.
 */
export interface TableBucketMaintenanceProps {
  /** Iceberg compaction settings (applied per-table). */
  readonly compaction?: IcebergCompactionProps;
  /** Iceberg snapshot management settings (applied per-table). */
  readonly snapshotManagement?: IcebergSnapshotManagementProps;
  /** Iceberg unreferenced file removal settings (applied at the table-bucket level). */
  readonly unreferencedFileRemoval?: TableBucketMaintenanceUnreferencedFileRemovalProps;
}

/**
 * Behavioral interface for building the additional statements appended to the bucket policy.
 *
 * A behavioral interface (rather than a function-typed prop) is used because the bucket policy is
 * created inside the {@link MdaaTableBucket} constructor: the bucket ARN token is not available to
 * the caller beforehand, so {@link buildStatements} receives it and returns the statements to append
 * after the mandatory deny-non-TLS statement. jsii does not support function-typed properties, so
 * this method-bearing interface is the idiomatic callback equivalent.
 */
export interface IMdaaTableBucketPolicyStatementsBuilder {
  /**
   * Builds the additional statements (e.g. the deny-all baseline and least-privilege grant Allow
   * statements) to append after the mandatory deny-non-TLS statement in the bucket policy.
   *
   * @param tableBucketArn - The ARN of the table bucket (the CfnTableBucket attribute token).
   * @returns The statements to append to the bucket policy.
   */
  buildStatements(tableBucketArn: string): PolicyStatement[];
}

/**
 * Props for the MdaaTableBucket construct.
 */
export interface MdaaTableBucketProps extends MdaaConstructProps {
  /** Logical name for the table bucket (processed by naming.resourceName()). */
  readonly tableBucketName: string;
  /** KMS key for server-side encryption (mandatory). */
  readonly encryptionKey: IMdaaKmsKey;
  /**
   * Optional unreferenced file removal configuration. Omit for S3 Tables service defaults.
   * Compaction and snapshot management are table properties, not bucket properties, so they are
   * applied per-table by {@link MdaaTable} rather than here.
   */
  readonly unreferencedFileRemoval?: TableBucketMaintenanceUnreferencedFileRemovalProps;
  /**
   * Whether to attach the single {@link MdaaTableBucketPolicy} that this bucket owns. Defaults to
   * true, which bakes in the mandatory deny-non-TLS (in-transit) control as compliance-by-default.
   *
   * Setting this to false is a documented escape hatch that suppresses the bucket resource policy
   * entirely — leaving the bucket with encryption-at-rest but NO in-transit (TLS) enforcement and
   * NO deny-by-default protection. Only opt out when the caller intentionally manages the single
   * allowed table-bucket policy elsewhere; otherwise leave this at its default to remain compliant.
   */
  readonly attachBucketPolicy?: boolean;
  /**
   * Builder invoked to produce the additional statements (e.g. the deny-all baseline and
   * least-privilege grant Allow statements) to append after the mandatory deny-non-TLS statement
   * in the bucket policy. Its {@link IMdaaTableBucketPolicyStatementsBuilder.buildStatements} method
   * receives the bucket ARN so callers can scope statements without having to re-derive the physical
   * name / ARN. Only invoked when {@link attachBucketPolicy} is not false.
   *
   * A builder (rather than a plain array) is used because the policy is created inside this
   * constructor: the bucket ARN token is not available to the caller beforehand, but it is passed
   * here so statements can be built against `this.tableBucketArn`.
   */
  readonly additionalPolicyStatements?: IMdaaTableBucketPolicyStatementsBuilder;
}

/**
 * L2 construct wrapping AWS::S3Tables::TableBucket with MDAA naming,
 * KMS encryption enforcement, and data protection via RETAIN removal policy.
 *
 * In-transit protection (deny-non-TLS) is baked in by default: this construct owns the single
 * AWS::S3Tables::TableBucketPolicy allowed per table bucket and always attaches it (via
 * {@link MdaaTableBucketPolicy}, which injects the deny-non-TLS statement) unless
 * {@link MdaaTableBucketProps.attachBucketPolicy} is explicitly set to false. Callers append the
 * deny-all baseline and least-privilege grant statements through
 * {@link MdaaTableBucketProps.additionalPolicyStatements}. This keeps exactly one policy per bucket
 * with TLS enforcement always present, rather than relying on a separate resource being wired up.
 */
export class MdaaTableBucket extends Construct {
  /** The ARN of the provisioned Table Bucket. */
  public readonly tableBucketArn: string;
  /** The physical name applied to the Table Bucket. */
  public readonly tableBucketName: string;

  constructor(scope: Construct, id: string, props: MdaaTableBucketProps) {
    super(scope, id);

    const physicalName = props.naming
      .withResourceType(MdaaResourceType.S3_TABLES)
      .resourceName(props.tableBucketName, 63);

    const cfnTableBucket = new CfnTableBucket(this, 'Resource', {
      tableBucketName: physicalName,
      encryptionConfiguration: {
        sseAlgorithm: 'aws:kms',
        kmsKeyArn: props.encryptionKey.keyArn,
      },
      // Unreferenced file removal is the only maintenance task modeled on the table bucket.
      // Compaction and snapshot management are table properties, applied per-table by MdaaTable.
      ...(props.unreferencedFileRemoval
        ? { unreferencedFileRemoval: MdaaTableBucket.buildUnreferencedFileRemoval(props.unreferencedFileRemoval) }
        : {}),
    });

    cfnTableBucket.applyRemovalPolicy(RemovalPolicy.RETAIN);

    this.tableBucketArn = cfnTableBucket.attrTableBucketArn;
    this.tableBucketName = physicalName;

    // The bucket owns the single table-bucket policy allowed by S3 Tables. Attach it by default so
    // deny-non-TLS is always present (compliance-by-default); callers append deny-all/grant
    // statements via additionalPolicyStatements, which receives the bucket ARN token.
    if (props.attachBucketPolicy !== false) {
      new MdaaTableBucketPolicy(this, 'Policy', {
        tableBucketArn: this.tableBucketArn,
        additionalStatements: props.additionalPolicyStatements?.buildStatements(this.tableBucketArn),
        naming: props.naming,
      });
    }
  }

  /**
   * Maps the friendly unreferenced-file-removal props to the CfnTableBucket typed property.
   * An explicit `enabled: false` renders status 'Disabled'; otherwise status is 'Enabled'.
   */
  private static buildUnreferencedFileRemoval(
    unreferenced: TableBucketMaintenanceUnreferencedFileRemovalProps,
  ): CfnTableBucket.UnreferencedFileRemovalProperty {
    return {
      status: unreferenced.enabled === false ? 'Disabled' : 'Enabled',
      ...(unreferenced.unreferencedDays === undefined ? {} : { unreferencedDays: unreferenced.unreferencedDays }),
      ...(unreferenced.nonCurrentDays === undefined ? {} : { noncurrentDays: unreferenced.nonCurrentDays }),
    };
  }
}
