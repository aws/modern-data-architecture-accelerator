/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pre-defined permission set levels for S3 Tables IAM grants.
 * Each level maps to a fixed, least-privilege set of S3 Tables API actions.
 * - 'reader': read-only access to tables and metadata
 * - 'writer': reader + data write operations
 * - 'admin': writer + table/namespace management operations
 */
export type PermissionSet = 'reader' | 'writer' | 'admin';

/**
 * The scope at which a permission grant is applied.
 * - 'bucket': grant applies to the entire table bucket and all resources within it
 * - 'table': grant applies to a specific individual table
 */
export type GrantScope = 'bucket' | 'table';

/**
 * Bucket-scope reader actions: read-only access to table bucket resources.
 */
const BUCKET_READER_ACTIONS: string[] = [
  's3tables:GetTable',
  's3tables:GetTableData',
  's3tables:GetTableMetadataLocation',
  's3tables:GetNamespace',
  's3tables:GetTableBucket',
  's3tables:ListTables',
  's3tables:ListNamespaces',
];

/**
 * Bucket-scope writer actions: reader + data write operations.
 */
const BUCKET_WRITER_ACTIONS: string[] = [
  ...BUCKET_READER_ACTIONS,
  's3tables:PutTableData',
  's3tables:UpdateTableMetadataLocation',
];

/**
 * Bucket-scope admin actions: writer + management operations.
 */
const BUCKET_ADMIN_ACTIONS: string[] = [
  ...BUCKET_WRITER_ACTIONS,
  's3tables:CreateTable',
  's3tables:DeleteTable',
  's3tables:RenameTable',
  's3tables:CreateNamespace',
  's3tables:DeleteNamespace',
  // Deliberately excludes s3tables:PutTablePolicy and s3tables:PutTableBucketPolicy: granting
  // policy-write to a data-plane admin would let that principal replace the resource policy and
  // strip the non-configurable controls (deny-non-TLS, the deny-all baseline). The module owns
  // those resource policies; admins get data/table management only.
];

/**
 * Table-scope reader actions: read-only access to an individual table.
 */
const TABLE_READER_ACTIONS: string[] = [
  's3tables:GetTable',
  's3tables:GetTableData',
  's3tables:GetTableMetadataLocation',
];

/**
 * Table-scope writer actions: reader + data write operations on a table.
 */
const TABLE_WRITER_ACTIONS: string[] = [
  ...TABLE_READER_ACTIONS,
  's3tables:PutTableData',
  's3tables:UpdateTableMetadataLocation',
];

/**
 * Table-scope admin actions: writer + table management operations.
 */
const TABLE_ADMIN_ACTIONS: string[] = [
  ...TABLE_WRITER_ACTIONS,
  's3tables:DeleteTable',
  's3tables:RenameTable',
  // Deliberately excludes s3tables:PutTablePolicy: granting policy-write to a data-plane admin
  // would let that principal replace the table policy and strip the non-configurable deny-non-TLS
  // control. The module owns the table resource policy; admins get table management only.
];

/**
 * Returns the list of S3 Tables API actions for the given permission set at bucket scope.
 * Each call returns a new array copy to prevent mutation of internal state.
 *
 * @param permissionSet - The permission level ('reader', 'writer', or 'admin')
 * @returns Array of S3 Tables action strings for the bucket-scoped permission set
 */
export function getBucketPermissionSetActions(permissionSet: PermissionSet): string[] {
  switch (permissionSet) {
    case 'reader':
      return [...BUCKET_READER_ACTIONS];
    case 'writer':
      return [...BUCKET_WRITER_ACTIONS];
    case 'admin':
      return [...BUCKET_ADMIN_ACTIONS];
  }
}

/**
 * Returns the list of S3 Tables API actions for the given permission set at table scope.
 * Each call returns a new array copy to prevent mutation of internal state.
 *
 * @param permissionSet - The permission level ('reader', 'writer', or 'admin')
 * @returns Array of S3 Tables action strings for the table-scoped permission set
 */
export function getTablePermissionSetActions(permissionSet: PermissionSet): string[] {
  switch (permissionSet) {
    case 'reader':
      return [...TABLE_READER_ACTIONS];
    case 'writer':
      return [...TABLE_WRITER_ACTIONS];
    case 'admin':
      return [...TABLE_ADMIN_ACTIONS];
  }
}
