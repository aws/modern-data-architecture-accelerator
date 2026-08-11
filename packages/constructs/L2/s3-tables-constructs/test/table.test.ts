/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaTable } from '../lib';

const BUCKET_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics';

describe('MdaaTable', () => {
  test('creates a Table resource with Iceberg schema fields (1-based ids) in order', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [
        { name: 'event_id', columnType: 'string', required: true },
        { name: 'user_id', columnType: 'string', required: true },
        { name: 'duration_ms', columnType: 'long', required: false },
      ],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      Namespace: 'events',
      TableName: 'page-views',
      OpenTableFormat: 'ICEBERG',
      IcebergMetadata: {
        IcebergSchema: {
          SchemaFieldList: [
            { Id: 1, Name: 'event_id', Type: 'string', Required: true },
            { Id: 2, Name: 'user_id', Type: 'string', Required: true },
            { Id: 3, Name: 'duration_ms', Type: 'long', Required: false },
          ],
        },
      },
    });
  });

  test('omits partition spec and sort order when not provided', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    const props = Object.values(template.findResources('AWS::S3Tables::Table'))[0].Properties;
    expect(props.IcebergMetadata.IcebergPartitionSpec).toBeUndefined();
    expect(props.IcebergMetadata.IcebergSortOrder).toBeUndefined();
  });

  test('maps identity and bucket partition transforms referencing source ids', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'sessions',
      columns: [
        { name: 'user_id', columnType: 'string', required: true },
        { name: 'event_type', columnType: 'string', required: true },
      ],
      partitions: [
        { column: 'user_id', transform: 'bucket', numBuckets: 16 },
        { column: 'event_type', transform: 'identity' },
      ],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      IcebergMetadata: {
        IcebergPartitionSpec: {
          Fields: [
            { Name: 'user_id_bucket', SourceId: 1, Transform: 'bucket[16]' },
            { Name: 'event_type_identity', SourceId: 2, Transform: 'identity' },
          ],
        },
      },
    });
  });

  test('maps truncate partition transform with width', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'sessions',
      columns: [{ name: 'user_agent', columnType: 'string', required: false }],
      partitions: [{ column: 'user_agent', transform: 'truncate', width: 10 }],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      IcebergMetadata: {
        IcebergPartitionSpec: {
          Fields: [{ Name: 'user_agent_truncate', SourceId: 1, Transform: 'truncate[10]' }],
        },
      },
    });
  });

  test('maps sort order fields with source id, identity transform, and normalized direction', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [
        { name: 'event_id', columnType: 'string', required: true },
        { name: 'event_timestamp', columnType: 'timestamptz', required: true },
      ],
      sortOrder: [{ column: 'event_timestamp', direction: 'DESC', nullOrder: 'nulls-last' }],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      IcebergMetadata: {
        IcebergSortOrder: {
          Fields: [{ SourceId: 2, Transform: 'identity', Direction: 'desc', NullOrder: 'nulls-last' }],
        },
      },
    });
  });

  test('normalizes ascending sort direction to lowercase', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      sortOrder: [{ column: 'event_id', direction: 'ASC', nullOrder: 'nulls-first' }],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      IcebergMetadata: {
        IcebergSortOrder: {
          Fields: [{ SourceId: 1, Transform: 'identity', Direction: 'asc', NullOrder: 'nulls-first' }],
        },
      },
    });
  });

  test('exposes tableArn and tableName as public properties', () => {
    const testApp = new MdaaTestApp();
    const table = new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      naming: testApp.naming,
    });

    expect(table.tableName).toBe('page-views');
    expect(table.tableArn).toBeDefined();
  });

  test('sets removal policy to RETAIN to protect table data on stack deletion', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    const resources = template.findResources('AWS::S3Tables::Table');
    const logicalId = Object.keys(resources)[0];
    expect(resources[logicalId].DeletionPolicy).toBe('Retain');
  });

  test('renders Compaction and SnapshotManagement table properties (not bucket properties)', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      compaction: { targetFileSizeMB: 256, enabled: true },
      snapshotManagement: { minSnapshotsToKeep: 5, maxSnapshotAgeHours: 168, enabled: true },
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      Compaction: { Status: 'enabled', TargetFileSizeMB: 256 },
      SnapshotManagement: { Status: 'enabled', MinSnapshotsToKeep: 5, MaxSnapshotAgeHours: 168 },
    });
  });

  test('disables compaction and snapshot management when enabled is false', () => {
    const testApp = new MdaaTestApp();
    new MdaaTable(testApp.testStack, 'test-table', {
      tableBucketArn: BUCKET_ARN,
      namespaceName: 'events',
      tableName: 'page-views',
      columns: [{ name: 'event_id', columnType: 'string', required: true }],
      compaction: { enabled: false },
      snapshotManagement: { enabled: false },
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3Tables::Table', {
      Compaction: { Status: 'disabled' },
      SnapshotManagement: { Status: 'disabled' },
    });
  });

  test('throws when no columns are provided', () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns: [],
          naming: testApp.naming,
        }),
    ).toThrow(/at least one column/);
  });

  test("throws when a 'bucket' partition transform is missing numBuckets", () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns: [{ name: 'user_id', columnType: 'string', required: true }],
          partitions: [{ column: 'user_id', transform: 'bucket' }],
          naming: testApp.naming,
        }),
    ).toThrow(/requires a positive integer 'numBuckets'/);
  });

  test("throws when a 'truncate' partition transform is missing width", () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns: [{ name: 'user_agent', columnType: 'string', required: false }],
          partitions: [{ column: 'user_agent', transform: 'truncate' }],
          naming: testApp.naming,
        }),
    ).toThrow(/requires a positive integer 'width'/);
  });

  test('throws when a partition references a column missing from the schema', () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns: [{ name: 'event_id', columnType: 'string', required: true }],
          partitions: [{ column: 'ghost', transform: 'identity' }],
          naming: testApp.naming,
        }),
    ).toThrow(/does not exist in the table schema/);
  });

  test('throws when a sort field references a column missing from the schema', () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns: [{ name: 'event_id', columnType: 'string', required: true }],
          sortOrder: [{ column: 'ghost', direction: 'ASC', nullOrder: 'nulls-first' }],
          naming: testApp.naming,
        }),
    ).toThrow(/does not exist in the table schema/);
  });

  test('throws when more than 200 columns are provided', () => {
    const testApp = new MdaaTestApp();
    const columns = Array.from({ length: 201 }, (_, i) => ({
      name: `col_${i}`,
      columnType: 'string',
      required: false,
    }));
    expect(
      () =>
        new MdaaTable(testApp.testStack, 'test-table', {
          tableBucketArn: BUCKET_ARN,
          namespaceName: 'events',
          tableName: 'page-views',
          columns,
          naming: testApp.naming,
        }),
    ).toThrow(/exceeding the maximum of 200/);
  });
});
