/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaTableBucket } from '../lib';

const KEY_ARN = 'arn:test-partition:kms:test-region:test-account:key/test-key';

describe('MdaaTableBucket compliance', () => {
  const testApp = new MdaaTestApp();
  const testKey = MdaaKmsKey.fromKeyArn(testApp.testStack, 'test-key', KEY_ARN);

  new MdaaTableBucket(testApp.testStack, 'test-bucket', {
    tableBucketName: 'analytics',
    encryptionKey: testKey,
    naming: testApp.naming,
    unreferencedFileRemoval: { unreferencedDays: 7, nonCurrentDays: 3, enabled: true },
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('enforces mandatory KMS (aws:kms) encryption at rest', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      EncryptionConfiguration: {
        SSEAlgorithm: 'aws:kms',
        KMSKeyArn: KEY_ARN,
      },
    });
  });

  test('applies RETAIN removal policy for data protection', () => {
    const resources = template.findResources('AWS::S3Tables::TableBucket');
    const logicalId = Object.keys(resources)[0];
    expect(resources[logicalId].DeletionPolicy).toBe('Retain');
  });

  test('enforces in-transit protection via the bucket-owned policy (deny-non-TLS)', () => {
    // A bucket created on its own must still get TLS enforcement: the bucket owns exactly one
    // TableBucketPolicy and always bakes in the deny-non-TLS statement.
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
    const statements = Object.values(template.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy.Statement;
    const denyTls = statements.find((s: { Sid?: string }) => s.Sid === 'DenyNonTLS');
    expect(denyTls).toBeDefined();
    expect(denyTls.Effect).toBe('Deny');
    expect(denyTls.Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } });
  });
});

// Partial-configuration branches for the only maintenance task modeled on the table bucket:
// unreferenced file removal. Compaction and snapshot management are table properties (see
// table.test.ts), not bucket properties.
describe('MdaaTableBucket unreferenced file removal partial configuration', () => {
  test('enabled with only unreferencedDays provided', () => {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(app.testStack, 'test-key', KEY_ARN);
    new MdaaTableBucket(app.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key,
      naming: app.naming,
      unreferencedFileRemoval: { unreferencedDays: 7, enabled: true },
    });
    const template = Template.fromStack(app.testStack);
    const ufr = Object.values(template.findResources('AWS::S3Tables::TableBucket'))[0].Properties
      .UnreferencedFileRemoval;
    expect(ufr.Status).toBe('Enabled');
    expect(ufr.UnreferencedDays).toBe(7);
    expect(ufr.NoncurrentDays).toBeUndefined();
  });

  test('enabled with only nonCurrentDays provided', () => {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(app.testStack, 'test-key', KEY_ARN);
    new MdaaTableBucket(app.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key,
      naming: app.naming,
      unreferencedFileRemoval: { nonCurrentDays: 3, enabled: true },
    });
    const template = Template.fromStack(app.testStack);
    const ufr = Object.values(template.findResources('AWS::S3Tables::TableBucket'))[0].Properties
      .UnreferencedFileRemoval;
    expect(ufr.Status).toBe('Enabled');
    expect(ufr.NoncurrentDays).toBe(3);
    expect(ufr.UnreferencedDays).toBeUndefined();
  });

  test('defaults status to Enabled when the enabled flag is omitted', () => {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(app.testStack, 'test-key', KEY_ARN);
    new MdaaTableBucket(app.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key,
      naming: app.naming,
      unreferencedFileRemoval: { unreferencedDays: 14 },
    });
    const template = Template.fromStack(app.testStack);
    const ufr = Object.values(template.findResources('AWS::S3Tables::TableBucket'))[0].Properties
      .UnreferencedFileRemoval;
    expect(ufr.Status).toBe('Enabled');
    expect(ufr.UnreferencedDays).toBe(14);
  });
});
