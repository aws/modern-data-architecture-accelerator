/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaTableBucketPolicy, MdaaTablePolicy } from '../lib';

const BUCKET_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics';
const TABLE_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics/table/page-views';

const GRANT = new PolicyStatement({
  sid: 'ReaderGrant-example',
  effect: Effect.ALLOW,
  principals: [new ArnPrincipal('arn:test-partition:iam::test-account:role/reader')],
  actions: ['s3tables:GetTable'],
  resources: [BUCKET_ARN],
});

describe('MdaaTableBucketPolicy', () => {
  test('always includes a deny-non-TLS statement as the first statement', () => {
    const testApp = new MdaaTestApp();
    new MdaaTableBucketPolicy(testApp.testStack, 'bucket-policy', {
      tableBucketArn: BUCKET_ARN,
      naming: testApp.naming,
    });
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
    const doc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties.ResourcePolicy;
    expect(doc.Version).toBe('2012-10-17');
    expect(doc.Statement[0].Sid).toBe('DenyNonTLS');
    expect(doc.Statement[0].Effect).toBe('Deny');
    // Bucket deny-non-TLS must cover the bucket ARN AND its contained-tables wildcard, so
    // table-level data actions cannot be performed over non-TLS connections.
    expect(doc.Statement[0].Resource).toEqual([BUCKET_ARN, `${BUCKET_ARN}/table/*`]);
    expect(doc.Statement[0].Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } });
  });

  test('appends additional statements after the deny-non-TLS statement', () => {
    const testApp = new MdaaTestApp();
    new MdaaTableBucketPolicy(testApp.testStack, 'bucket-policy', {
      tableBucketArn: BUCKET_ARN,
      additionalStatements: [GRANT],
      naming: testApp.naming,
    });
    const template = Template.fromStack(testApp.testStack);
    const doc = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties.ResourcePolicy;
    expect(doc.Statement).toHaveLength(2);
    expect(doc.Statement[0].Sid).toBe('DenyNonTLS');
    expect(doc.Statement[1].Sid).toBe('ReaderGrant-example');
  });
});

describe('MdaaTablePolicy', () => {
  test('always includes a deny-non-TLS statement scoped to the table ARN', () => {
    const testApp = new MdaaTestApp();
    new MdaaTablePolicy(testApp.testStack, 'table-policy', {
      tableArn: TABLE_ARN,
      naming: testApp.naming,
    });
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::S3Tables::TablePolicy', 1);
    const doc = Object.values(template.findResources('AWS::S3Tables::TablePolicy'))[0].Properties.ResourcePolicy;
    expect(doc.Statement[0].Sid).toBe('DenyNonTLS');
    expect(doc.Statement[0].Resource).toBe(TABLE_ARN);
  });
});
