/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { S3TablesAccessPolicyProps, S3TablesL3Construct, S3TablesL3ConstructProps } from '../lib';

const EXTERNAL_KEY_ARN = 'arn:test-partition:kms:test-region:test-account:key/ext-key-id';

function roleRef(name: string): MdaaRoleRef {
  return { arn: `arn:test-partition:iam::test-account:role/${name}`, id: `${name}-id` };
}

const accessPolicies: { [name: string]: S3TablesAccessPolicyProps } = {
  readers: {
    name: 'readers',
    readerRoleRefs: [roleRef('reader')],
    writerRoleRefs: [],
    adminRoleRefs: [],
  },
  writers: {
    name: 'writers',
    readerRoleRefs: [],
    writerRoleRefs: [roleRef('writer')],
    adminRoleRefs: [],
  },
};

describe('S3TablesL3Construct with generated KMS key', () => {
  const testApp = new MdaaTestApp();
  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies,
    tableBuckets: {
      analytics: {
        accessPolicies: ['readers'],
        namespaces: {
          events: {
            tables: {
              'page-views': {
                schema: { columns: [{ name: 'event_id', columnType: 'string', required: true }] },
                partitions: [{ column: 'event_id', transform: 'identity' }],
                sortOrder: [{ column: 'event_id', direction: 'ASC', nullOrder: 'nulls-first' }],
                accessPolicies: ['writers'],
              },
            },
          },
        },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  const template = Template.fromStack(testApp.testStack);

  test('creates a table bucket, namespace, and table', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucket', 1);
    template.resourceCountIs('AWS::S3Tables::Namespace', 1);
    template.resourceCountIs('AWS::S3Tables::Table', 1);
  });

  test('creates a dedicated KMS key when no external ARN is provided', () => {
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('always attaches a bucket policy (deny-non-TLS baseline)', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
  });

  test('attaches a table policy for tables with table-level access policies', () => {
    template.resourceCountIs('AWS::S3Tables::TablePolicy', 1);
  });

  test('exports bucket ARN, namespace name, and table ARN to SSM', () => {
    const params = template.findResources('AWS::SSM::Parameter');
    // At least one param each for bucket arn, namespace name, table arn (plus KMS key exports)
    expect(Object.keys(params).length).toBeGreaterThanOrEqual(3);
  });

  test('bucket policy contains the deny-all baseline and reader grant; table policy contains the writer grant', () => {
    const bucketDoc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy;
    const bucketSids = bucketDoc.Statement.map((s: { Sid: string }) => s.Sid);
    expect(bucketSids).toEqual(expect.arrayContaining(['DenyNonTLS', 'DenyAll', 'ReaderGrant-readers']));

    const tableDoc = Object.values(template.findResources('AWS::S3Tables::TablePolicy'))[0].Properties.ResourcePolicy;
    const tableSids = tableDoc.Statement.map((s: { Sid: string }) => s.Sid);
    expect(tableSids).toEqual(expect.arrayContaining(['DenyNonTLS', 'WriterGrant-writers']));
  });

  test('deny-all baseline exempts the CloudFormation execution role via a single StringNotLike (no account escape)', () => {
    const bucketDoc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy;
    const denyAll = bucketDoc.Statement.find((s: { Sid: string }) => s.Sid === 'DenyAll');
    expect(denyAll.Condition.StringNotEquals).toBeUndefined();
    const allowlist = JSON.stringify(denyAll.Condition.StringNotLike['aws:PrincipalArn']);
    expect(allowlist).toContain('cfn-exec-role');
  });

  test('deny-all allowlist includes the table-scope-only grantee (writer)', () => {
    // The writer role is granted only at the table level; it must still be in the bucket deny-all
    // allowlist so the bucket-scoped deny (which targets the contained-tables wildcard) does not deny it.
    const bucketDoc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy;
    const denyAll = bucketDoc.Statement.find((s: { Sid: string }) => s.Sid === 'DenyAll');
    const allowlist = JSON.stringify(denyAll.Condition.StringNotLike['aws:PrincipalArn']);
    expect(allowlist).toContain('role/writer');
  });

  test('no grant statement confers resource-policy-write (PutTablePolicy / PutTableBucketPolicy)', () => {
    const serialized = JSON.stringify(template.findResources('AWS::S3Tables::TableBucketPolicy'));
    expect(serialized).not.toContain('PutTableBucketPolicy');
    expect(serialized).not.toContain('PutTablePolicy');
  });

  test('KMS key grants usage to collected bucket-level and table-level role ids', () => {
    // collectRoleIds aggregates bucket-level (reader) and table-level-only (writer) role ids.
    const serializedKeys = JSON.stringify(template.findResources('AWS::KMS::Key'));
    expect(serializedKeys).toContain('reader-id');
    expect(serializedKeys).toContain('writer-id');
  });

  test('KMS key grants the S3 Tables maintenance service principal decrypt/data-key access scoped to the owning bucket', () => {
    // Iceberg maintenance runs as maintenance.s3tables.amazonaws.com; without this grant,
    // table creation fails with "Insufficient access to perform table maintenance". The grant is
    // scoped to the owning bucket via the kms:EncryptionContext:aws:s3:arn condition (the
    // least-privilege pattern documented for this principal) so the per-bucket key cannot be used
    // for maintenance of any other bucket in the account.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowS3TablesMaintenance',
            Effect: 'Allow',
            Principal: { Service: 'maintenance.s3tables.amazonaws.com' },
            Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
            Condition: { StringLike: { 'kms:EncryptionContext:aws:s3:arn': Match.anyValue() } },
          }),
        ]),
      },
    });
  });
});

describe('S3TablesL3Construct with external KMS key', () => {
  const testApp = new MdaaTestApp();
  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies,
    tableBuckets: {
      analytics: {
        accessPolicies: ['readers'],
        kmsKeyArn: EXTERNAL_KEY_ARN,
        namespaces: {
          events: {
            tables: {
              'page-views': {
                schema: { columns: [{ name: 'event_id', columnType: 'string', required: true }] },
              },
            },
          },
        },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  const template = Template.fromStack(testApp.testStack);

  test('does not create a new KMS key when an external ARN is provided', () => {
    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  test('references the external key ARN in the bucket encryption configuration', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      EncryptionConfiguration: {
        SSEAlgorithm: 'aws:kms',
        KMSKeyArn: EXTERNAL_KEY_ARN,
      },
    });
  });

  test('still attaches a TLS-only table policy for a table with no table-level access policies', () => {
    // Every table gets a policy so table-scoped operations are TLS-enforced.
    template.resourceCountIs('AWS::S3Tables::TablePolicy', 1);
    const tableDoc = Object.values(template.findResources('AWS::S3Tables::TablePolicy'))[0].Properties.ResourcePolicy;
    expect(tableDoc.Statement).toHaveLength(1);
    expect(tableDoc.Statement[0].Sid).toBe('DenyNonTLS');
  });
});

describe('S3TablesL3Construct with no grants', () => {
  const testApp = new MdaaTestApp();
  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies: {},
    tableBuckets: {
      analytics: {
        accessPolicies: [],
        namespaces: { events: { tables: {} } },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  const template = Template.fromStack(testApp.testStack);

  test('attaches a bucket policy with the always-on deny-all baseline locked to the exempt principals', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
    const policies = template.findResources('AWS::S3Tables::TableBucketPolicy');
    const doc = Object.values(policies)[0].Properties.ResourcePolicy;
    // The deny-all baseline is always emitted, so a bucket with no grants is still locked down.
    const sids = doc.Statement.map((s: { Sid: string }) => s.Sid);
    expect(sids).toEqual(expect.arrayContaining(['DenyNonTLS', 'DenyAll']));
    const denyAll = doc.Statement.find((s: { Sid: string }) => s.Sid === 'DenyAll');
    // With no grants the allowlist is only the deploy-exempt CloudFormation execution role.
    const allowlist = denyAll.Condition.StringNotLike['aws:PrincipalArn'];
    expect(JSON.stringify(allowlist)).toContain('cfn-exec-role');
  });
});

describe('S3TablesL3Construct maintenance pass-through', () => {
  const testApp = new MdaaTestApp();
  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies: {},
    tableBuckets: {
      analytics: {
        accessPolicies: [],
        maintenance: {
          compaction: { targetFileSizeMB: 256, enabled: true },
          snapshotManagement: { minSnapshotsToKeep: 5, maxSnapshotAgeHours: 168, enabled: true },
          unreferencedFileRemoval: { unreferencedDays: 7, nonCurrentDays: 3, enabled: true },
        },
        namespaces: {
          events: {
            tables: {
              page_views: {
                schema: { columns: [{ name: 'event_id', columnType: 'string', required: true }] },
              },
            },
          },
        },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  const template = Template.fromStack(testApp.testStack);

  test('applies unreferenced file removal to the table bucket', () => {
    // Only unreferenced file removal is a table-bucket property.
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      UnreferencedFileRemoval: { Status: 'Enabled', UnreferencedDays: 7, NoncurrentDays: 3 },
    });
  });

  test('applies compaction and snapshot management to each table', () => {
    // Compaction and snapshot management are table properties, applied per-table.
    template.hasResourceProperties('AWS::S3Tables::Table', {
      Compaction: { Status: 'enabled', TargetFileSizeMB: 256 },
      SnapshotManagement: { Status: 'enabled', MinSnapshotsToKeep: 5, MaxSnapshotAgeHours: 168 },
    });
  });
});

describe('S3TablesL3Construct with an undefined access policy reference', () => {
  const testApp = new MdaaTestApp();
  // The L3 tolerates references to access policy names not present in the accessPolicies map
  // (the app-layer parser is responsible for rejecting them); collectRoleIds and the policy
  // builders skip the undefined policy. This exercises those defensive branches.
  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies: {},
    tableBuckets: {
      analytics: {
        accessPolicies: ['does-not-exist'],
        namespaces: {
          events: {
            tables: {
              t1: {
                schema: { columns: [{ name: 'event_id', columnType: 'string', required: true }] },
                accessPolicies: ['also-missing'],
              },
            },
          },
        },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  const template = Template.fromStack(testApp.testStack);

  test('skips undefined policies but still emits the always-on deny-all baseline on the bucket and a TLS-only table policy', () => {
    const bucketDoc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy;
    // Undefined policy names resolve to no grants, but the deny-all baseline is always emitted,
    // locked to the deploy-exempt principals only.
    const bucketSids = bucketDoc.Statement.map((s: { Sid: string }) => s.Sid);
    expect(bucketSids).toEqual(expect.arrayContaining(['DenyNonTLS', 'DenyAll']));
    const denyAll = bucketDoc.Statement.find((s: { Sid: string }) => s.Sid === 'DenyAll');
    expect(JSON.stringify(denyAll.Condition.StringNotLike['aws:PrincipalArn'])).toContain('cfn-exec-role');

    // Table policies have no deny-all baseline, so a table with only undefined policies stays TLS-only.
    const tableDoc = Object.values(template.findResources('AWS::S3Tables::TablePolicy'))[0].Properties.ResourcePolicy;
    expect(tableDoc.Statement).toHaveLength(1);
    expect(tableDoc.Statement[0].Sid).toBe('DenyNonTLS');
  });
});
