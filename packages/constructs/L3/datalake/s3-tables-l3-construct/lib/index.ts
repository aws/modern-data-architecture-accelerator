/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  PermissionSet,
  GrantScope,
  getBucketPermissionSetActions,
  getTablePermissionSetActions,
} from './permission-sets';
export {
  S3TablesL3Construct,
  S3TablesL3ConstructProps,
  S3TablesAccessPolicyProps,
  TableBucketConfig,
  NamespaceConfig,
  TableConfig,
  TableSchemaConfig,
} from './s3-tables-l3-construct';

// Re-export the L2 config-surface types so app modules depend on L3 only,
// keeping the app -> L3 -> L2 dependency direction clean.
export {
  IcebergColumnDef,
  IcebergPartitionDef,
  IcebergSortOrderDef,
  TableBucketMaintenanceProps,
  IcebergCompactionProps,
  IcebergSnapshotManagementProps,
  TableBucketMaintenanceUnreferencedFileRemovalProps,
  MAX_TABLE_COLUMNS,
} from '@aws-mdaa/s3-tables-constructs';
