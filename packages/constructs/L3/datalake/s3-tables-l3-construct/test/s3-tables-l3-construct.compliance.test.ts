/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { S3TablesAccessPolicyProps, S3TablesL3Construct, S3TablesL3ConstructProps } from '../lib';

function roleRef(name: string): MdaaRoleRef {
  return { arn: `arn:test-partition:iam::test-account:role/${name}`, id: `${name}-id` };
}

describe('S3TablesL3Construct compliance', () => {
  const testApp = new MdaaTestApp();

  const accessPolicies: { [name: string]: S3TablesAccessPolicyProps } = {
    engineers: {
      name: 'engineers',
      readerRoleRefs: [roleRef('reader')],
      writerRoleRefs: [roleRef('writer')],
      adminRoleRefs: [roleRef('admin')],
    },
  };

  const props: S3TablesL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    accessPolicies,
    tableBuckets: {
      analytics: {
        accessPolicies: ['engineers'],
        namespaces: {
          events: {
            tables: {
              'page-views': {
                schema: {
                  columns: [
                    { name: 'event_id', columnType: 'string', required: true },
                    { name: 'event_timestamp', columnType: 'timestamptz', required: true },
                  ],
                },
                accessPolicies: ['engineers'],
              },
            },
          },
        },
      },
    },
  };

  new S3TablesL3Construct(testApp.testStack, 's3-tables', props);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('creates the table bucket with a KMS encryption key', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      EncryptionConfiguration: {
        SSEAlgorithm: 'aws:kms',
      },
    });
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('creates exactly one bucket-owned TableBucketPolicy per bucket', () => {
    // S3 Tables allows only one resource policy per table bucket; the bucket owns that single
    // policy. A second policy would silently overwrite the first via PutTableBucketPolicy.
    const buckets = template.findResources('AWS::S3Tables::TableBucket');
    const policies = template.findResources('AWS::S3Tables::TableBucketPolicy');
    expect(Object.keys(policies)).toHaveLength(Object.keys(buckets).length);
  });

  test('bucket policy enforces TLS via deny-non-TLS statement', () => {
    const policies = template.findResources('AWS::S3Tables::TableBucketPolicy');
    const doc = Object.values(policies)[0].Properties.ResourcePolicy;
    const denyNonTls = doc.Statement.find((s: { Sid: string }) => s.Sid === 'DenyNonTLS');
    expect(denyNonTls).toBeDefined();
    expect(denyNonTls.Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } });
  });

  test('table policy enforces TLS for tables with table-level access policies', () => {
    const policies = template.findResources('AWS::S3Tables::TablePolicy');
    expect(Object.keys(policies)).toHaveLength(1);
    const doc = Object.values(policies)[0].Properties.ResourcePolicy;
    expect(doc.Statement.some((s: { Sid: string }) => s.Sid === 'DenyNonTLS')).toBe(true);
  });
});
