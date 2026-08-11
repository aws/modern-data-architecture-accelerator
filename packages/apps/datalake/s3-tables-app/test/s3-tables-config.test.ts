/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Aws, Token } from 'aws-cdk-lib';
import { S3TablesConfigParser } from '../lib/s3-tables-config';
import { S3TablesCDKApp } from '../lib/s3-tables';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Builds a minimal, schema-valid config that can be mutated per test to trigger
 * a specific validation failure.
 */
function baseConfig(): any {
  return {
    roles: {
      DataEngineer: [{ arn: 'arn:test-partition:iam::test-account:role/data-engineer' }],
    },
    accessPolicies: {
      EngWrite: { ReadWriteRoles: ['DataEngineer'] },
    },
    tableBuckets: {
      'analytics-data': {
        accessPolicies: ['EngWrite'],
        namespaces: {
          events: {
            tables: {
              page_views: {
                columns: {
                  event_id: { type: 'string', required: true },
                },
              },
            },
          },
        },
      },
    },
  };
}

function parse(config: any): S3TablesConfigParser {
  const app = new MdaaTestApp();
  return new S3TablesConfigParser(app.testStack, {
    org: 'test-org',
    domain: 'test-domain',
    environment: 'test-env',
    module_name: 'test-module',
    naming: app.naming,
    rawConfig: config,
  });
}

// Convenience accessors into the loosely-typed config for mutation.
function bucket(config: any): any {
  return config.tableBuckets['analytics-data'];
}
function table(config: any): any {
  return bucket(config).namespaces.events.tables.page_views;
}

describe('S3TablesConfigParser happy path', () => {
  it('parses a valid config and exposes resolved buckets and access policies', () => {
    const parser = parse(baseConfig());
    expect(Object.keys(parser.tableBuckets)).toEqual(['analytics-data']);
    expect(Object.keys(parser.accessPolicies)).toContain('EngWrite');
    expect(parser.accessPolicies.EngWrite.writerRoleRefs).toHaveLength(1);
  });

  it('transforms keyed-map columns into ordered L3 schema columns', () => {
    const config = baseConfig();
    table(config).columns = {
      event_id: { type: 'string', required: true },
      user_id: { type: 'string' },
    };
    const parser = parse(config);
    const columns = parser.tableBuckets['analytics-data'].namespaces.events.tables.page_views.schema.columns;
    // Declaration order is preserved (it determines Iceberg field ids), and the
    // 'type' key is transformed to the L3 'columnType' with a default of required:false.
    expect(columns).toEqual([
      { name: 'event_id', columnType: 'string', required: true },
      { name: 'user_id', columnType: 'string', required: false },
    ]);
  });

  it('parses a valid config with maintenance, partitions, sort order, and table policies', () => {
    const config = baseConfig();
    bucket(config).maintenance = {
      compaction: { targetFileSizeMB: 256, enabled: true },
      snapshots: { minToKeep: 5, maxAgeHours: 168 },
      removeUnreferenced: { afterDays: 7, keepNonCurrentDays: 3 },
    };
    table(config).partitions = { event_id: { transform: 'identity' } };
    table(config).sortBy = { event_id: { direction: 'ASC', nullOrder: 'nulls-first' } };
    table(config).accessPolicies = ['EngWrite'];
    expect(() => parse(config)).not.toThrow();
  });

  it('maps the friendly maintenance field names to the L2/L3 maintenance props', () => {
    const config = baseConfig();
    bucket(config).maintenance = {
      compaction: { targetFileSizeMB: 256, enabled: true },
      snapshots: { minToKeep: 5, maxAgeHours: 168, enabled: true },
      removeUnreferenced: { afterDays: 7, keepNonCurrentDays: 3, enabled: true },
    };
    const parser = parse(config);
    const maintenance = parser.tableBuckets['analytics-data'].maintenance;
    expect(maintenance).toEqual({
      compaction: { targetFileSizeMB: 256, enabled: true },
      snapshotManagement: { minSnapshotsToKeep: 5, maxSnapshotAgeHours: 168, enabled: true },
      unreferencedFileRemoval: { unreferencedDays: 7, nonCurrentDays: 3, enabled: true },
    });
  });

  it('maps the keyed sortBy map to the ordered L3 sortOrder array with resolved values', () => {
    const config = baseConfig();
    table(config).columns = {
      event_id: { type: 'string', required: true },
      event_timestamp: { type: 'timestamptz', required: true },
    };
    table(config).sortBy = {
      event_timestamp: { direction: 'DESC', nullOrder: 'nulls-last' },
      event_id: { direction: 'ASC', nullOrder: 'nulls-first' },
    };
    const parser = parse(config);
    const sortOrder = parser.tableBuckets['analytics-data'].namespaces.events.tables.page_views.sortOrder;
    expect(sortOrder).toEqual([
      { column: 'event_timestamp', direction: 'DESC', nullOrder: 'nulls-last' },
      { column: 'event_id', direction: 'ASC', nullOrder: 'nulls-first' },
    ]);
  });

  it('accepts a kmsKeyArn that is an unresolved CDK token (skips ARN validation)', () => {
    const config = baseConfig();
    const app = new MdaaTestApp();
    // An ARN built from CFN pseudo-parameters is an unresolved CDK token at parse time
    // (e.g. `arn:${Token[AWS.Partition.n]}:kms:...`). It contains no `{{` and would fail the
    // regex, so validateKmsArn must skip it via Token.isUnresolved rather than a string check.
    bucket(config).kmsKeyArn = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/abc`;
    expect(Token.isUnresolved(bucket(config).kmsKeyArn)).toBe(true);
    expect(
      () =>
        new S3TablesConfigParser(app.testStack, {
          org: 'test-org',
          domain: 'test-domain',
          environment: 'test-env',
          module_name: 'test-module',
          naming: app.naming,
          rawConfig: config,
        }),
    ).not.toThrow();
  });

  it('accepts a standard UUID KMS key ARN', () => {
    const config = baseConfig();
    bucket(config).kmsKeyArn = 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012';
    expect(() => parse(config)).not.toThrow();
  });

  it('accepts a multi-region (mrk-) KMS key ARN', () => {
    const config = baseConfig();
    bucket(config).kmsKeyArn = 'arn:aws:kms:us-east-1:123456789012:key/mrk-1234567890abcdef1234567890abcdef';
    expect(() => parse(config)).not.toThrow();
  });
});

describe('S3TablesConfigParser bucket name validation', () => {
  it('throws when a bucket name is shorter than 3 characters', () => {
    const config = baseConfig();
    config.tableBuckets['ab'] = config.tableBuckets['analytics-data'];
    delete config.tableBuckets['analytics-data'];
    expect(() => parse(config)).toThrow(/at least 3 characters/);
  });

  it('throws when a bucket name exceeds 63 characters', () => {
    const config = baseConfig();
    const longName = 'a'.repeat(64);
    config.tableBuckets[longName] = config.tableBuckets['analytics-data'];
    delete config.tableBuckets['analytics-data'];
    expect(() => parse(config)).toThrow(/exceeds 63 characters/);
  });

  it('throws when a bucket name contains invalid characters', () => {
    const config = baseConfig();
    config.tableBuckets['Invalid_Name'] = config.tableBuckets['analytics-data'];
    delete config.tableBuckets['analytics-data'];
    expect(() => parse(config)).toThrow(/is invalid/);
  });

  it('throws a helpful error suggesting hyphens when a bucket name contains underscores', () => {
    const config = baseConfig();
    config.tableBuckets['analytics_data'] = config.tableBuckets['analytics-data'];
    delete config.tableBuckets['analytics-data'];
    let message = '';
    try {
      parse(config);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/use hyphens/i);
    expect(message).toContain("'analytics-data'"); // suggested corrected name
    expect(message).toContain('s3-tables-buckets-naming.html');
  });
});

describe('S3TablesConfigParser namespace name validation', () => {
  it('throws when a namespace name is empty', () => {
    const config = baseConfig();
    bucket(config).namespaces[''] = bucket(config).namespaces.events;
    delete bucket(config).namespaces.events;
    expect(() => parse(config)).toThrow(/cannot be empty/);
  });

  it('throws when a namespace name contains invalid characters', () => {
    const config = baseConfig();
    bucket(config).namespaces['Bad Namespace'] = bucket(config).namespaces.events;
    delete bucket(config).namespaces.events;
    expect(() => parse(config)).toThrow(/is invalid/);
  });

  it('throws a helpful error suggesting underscores when a namespace name contains a hyphen', () => {
    const config = baseConfig();
    bucket(config).namespaces['raw-ingestion'] = bucket(config).namespaces.events;
    delete bucket(config).namespaces.events;
    let message = '';
    try {
      parse(config);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/use underscores/i);
    expect(message).toContain("'raw_ingestion'"); // suggested corrected name
    expect(message).toContain('s3-tables-buckets-naming.html'); // AWS docs link
  });

  it('throws when a namespace name exceeds 255 characters', () => {
    const config = baseConfig();
    const longNs = 'n'.repeat(256);
    bucket(config).namespaces[longNs] = bucket(config).namespaces.events;
    delete bucket(config).namespaces.events;
    expect(() => parse(config)).toThrow(/exceeds 255 characters/);
  });
});

describe('S3TablesConfigParser table name validation', () => {
  it('throws a helpful error suggesting underscores when a table name contains a hyphen', () => {
    const config = baseConfig();
    bucket(config).namespaces.events.tables['page-views'] = table(config);
    delete bucket(config).namespaces.events.tables.page_views;
    let message = '';
    try {
      parse(config);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/Table name .* is invalid/);
    expect(message).toMatch(/use underscores/i);
    expect(message).toContain("'page_views'"); // suggested corrected name
    expect(message).toContain('s3-tables-buckets-naming.html');
  });

  it('throws when a table name exceeds 255 characters', () => {
    const config = baseConfig();
    const longTable = 't'.repeat(256);
    bucket(config).namespaces.events.tables[longTable] = table(config);
    delete bucket(config).namespaces.events.tables.page_views;
    expect(() => parse(config)).toThrow(/exceeds 255 characters/);
  });
});

describe('S3TablesConfigParser KMS ARN validation', () => {
  it('throws when kmsKeyArn is malformed', () => {
    const config = baseConfig();
    bucket(config).kmsKeyArn = 'not-a-valid-arn';
    expect(() => parse(config)).toThrow(/is malformed/);
  });
});

describe('S3TablesConfigParser access policy reference validation', () => {
  it('throws when a bucket references an undefined access policy', () => {
    const config = baseConfig();
    bucket(config).accessPolicies = ['DoesNotExist'];
    expect(() => parse(config)).toThrow(/not defined in top-level 'accessPolicies'/);
  });

  it('throws when a table references an undefined access policy', () => {
    const config = baseConfig();
    table(config).accessPolicies = ['DoesNotExist'];
    expect(() => parse(config)).toThrow(/not defined in top-level 'accessPolicies'/);
  });

  it('throws when an access policy references a role not defined in top-level roles', () => {
    const config = baseConfig();
    config.accessPolicies.EngWrite = { ReadWriteRoles: ['GhostRole'] };
    expect(() => parse(config)).toThrow(/not defined in top-level 'roles'/);
  });
});

describe('S3TablesConfigParser partition and sort-order validation', () => {
  it('throws when a partition references a column missing from the schema', () => {
    const config = baseConfig();
    table(config).partitions = { ghost: { transform: 'identity' } };
    expect(() => parse(config)).toThrow(/does not exist in the table schema/);
  });

  it('throws when a bucket transform is missing numBuckets', () => {
    const config = baseConfig();
    table(config).partitions = { event_id: { transform: 'bucket' } };
    expect(() => parse(config)).toThrow(/requires a positive integer 'numBuckets'/);
  });

  it('throws when a truncate transform is missing width', () => {
    const config = baseConfig();
    table(config).partitions = { event_id: { transform: 'truncate' } };
    expect(() => parse(config)).toThrow(/requires a positive integer 'width'/);
  });

  it('throws when a sort order references a column missing from the schema', () => {
    const config = baseConfig();
    table(config).sortBy = { ghost: { direction: 'ASC', nullOrder: 'nulls-first' } };
    expect(() => parse(config)).toThrow(/does not exist in the table schema/);
  });
});

describe('S3TablesCDKApp', () => {
  it('applies default (empty) app props and requires org context', () => {
    // Exercises the default parameter (props: AppProps = {}); the MdaaCdkApp base
    // then asserts required context, so instantiation without context throws.
    expect(() => new S3TablesCDKApp()).toThrow(/Organization must be specified/);
  });
});

describe('S3TablesConfigParser schema-enforced validation', () => {
  it('rejects an unsupported Iceberg column type via the schema pattern', () => {
    const config = baseConfig();
    table(config).columns = { event_id: { type: 'notatype', required: true } };
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a maintenance value outside its allowed range via the schema', () => {
    const config = baseConfig();
    bucket(config).maintenance = { compaction: { targetFileSizeMB: 10, enabled: true } };
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a table with no columns', () => {
    const config = baseConfig();
    table(config).columns = {};
    // The empty columns map trips the schema's minProperties constraint (reported as
    // config "shape errors") before reaching the app-layer at-least-one-column guard.
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a table bucket with no namespaces', () => {
    const config = baseConfig();
    bucket(config).namespaces = {};
    // The empty namespaces map trips the schema's minProperties constraint (reported as
    // config "shape errors"), enforcing the documented "at least one namespace" rule.
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a table with more than 200 columns', () => {
    const config = baseConfig();
    const columns: Record<string, { type: string }> = {};
    for (let i = 0; i < 201; i++) {
      columns[`col_${i}`] = { type: 'string' };
    }
    table(config).columns = columns;
    // The 201-column map trips the schema's maxProperties constraint (reported as
    // config "shape errors") before reaching the app-layer max-column guard.
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a bare decimal type without precision/scale parameters', () => {
    const config = baseConfig();
    table(config).columns = { amount: { type: 'decimal', required: true } };
    expect(() => parse(config)).toThrow(/shape errors/);
  });

  it('rejects a bare fixed type without a length parameter', () => {
    const config = baseConfig();
    table(config).columns = { hash: { type: 'fixed', required: true } };
    expect(() => parse(config)).toThrow(/shape errors/);
  });
});
