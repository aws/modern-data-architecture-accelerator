/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Effect, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaTableBucket } from '../lib';

describe('MdaaTableBucket', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  new MdaaTableBucket(testApp.testStack, 'test-bucket', {
    tableBucketName: 'analytics',
    encryptionKey: testKey,
    naming: testApp.naming,
  });

  const template = Template.fromStack(testApp.testStack);

  test('creates a TableBucket resource', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucket', 1);
  });

  test('attaches exactly one TableBucketPolicy by default (compliance-by-default)', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
  });

  test('the attached policy enforces deny-non-TLS', () => {
    const policies = template.findResources('AWS::S3Tables::TableBucketPolicy');
    const statements = Object.values(policies)[0].Properties.ResourcePolicy.Statement;
    const denyTls = statements.find((s: { Sid?: string }) => s.Sid === 'DenyNonTLS');
    expect(denyTls).toBeDefined();
    expect(denyTls.Effect).toBe('Deny');
    expect(denyTls.Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } });
  });

  test('applies KMS encryption configuration', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      EncryptionConfiguration: {
        SSEAlgorithm: 'aws:kms',
        KMSKeyArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      },
    });
  });

  test('applies MDAA naming to bucket name', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucket', {
      TableBucketName: testApp.naming.resourceName('analytics', 63),
    });
  });

  test('sets removal policy to RETAIN', () => {
    const resources = template.findResources('AWS::S3Tables::TableBucket');
    const logicalId = Object.keys(resources)[0];
    expect(resources[logicalId].DeletionPolicy).toBe('Retain');
  });

  test('omits UnreferencedFileRemoval when not provided', () => {
    const resources = template.findResources('AWS::S3Tables::TableBucket');
    const props = Object.values(resources)[0].Properties;
    expect(props.UnreferencedFileRemoval).toBeUndefined();
  });

  test('applies unreferenced file removal settings when enabled', () => {
    const app6 = new MdaaTestApp();
    const key6 = MdaaKmsKey.fromKeyArn(
      app6.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaTableBucket(app6.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key6,
      naming: app6.naming,
      unreferencedFileRemoval: { unreferencedDays: 7, nonCurrentDays: 3, enabled: true },
    });
    const template6 = Template.fromStack(app6.testStack);
    // UnreferencedFileRemoval is the only maintenance task modeled on the table bucket; note the
    // CFN key casing: NoncurrentDays (lowercase c) and Status values 'Enabled'/'Disabled'.
    template6.hasResourceProperties('AWS::S3Tables::TableBucket', {
      UnreferencedFileRemoval: {
        Status: 'Enabled',
        UnreferencedDays: 7,
        NoncurrentDays: 3,
      },
    });
  });

  test('disables unreferenced file removal when enabled is false', () => {
    const app7 = new MdaaTestApp();
    const key7 = MdaaKmsKey.fromKeyArn(
      app7.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaTableBucket(app7.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key7,
      naming: app7.naming,
      unreferencedFileRemoval: { enabled: false },
    });
    const template7 = Template.fromStack(app7.testStack);
    template7.hasResourceProperties('AWS::S3Tables::TableBucket', {
      UnreferencedFileRemoval: { Status: 'Disabled' },
    });
  });

  test('attachBucketPolicy: false suppresses the bucket policy (documented escape hatch)', () => {
    const app8 = new MdaaTestApp();
    const key8 = MdaaKmsKey.fromKeyArn(
      app8.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaTableBucket(app8.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key8,
      naming: app8.naming,
      attachBucketPolicy: false,
    });
    const template8 = Template.fromStack(app8.testStack);
    template8.resourceCountIs('AWS::S3Tables::TableBucket', 1);
    template8.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 0);
  });

  test('additionalPolicyStatements are appended after the deny-non-TLS statement', () => {
    const app9 = new MdaaTestApp();
    const key9 = MdaaKmsKey.fromKeyArn(
      app9.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaTableBucket(app9.testStack, 'test-bucket', {
      tableBucketName: 'analytics',
      encryptionKey: key9,
      naming: app9.naming,
      additionalPolicyStatements: {
        buildStatements: (arn: string) => [
          new PolicyStatement({
            sid: 'DenyAll',
            effect: Effect.DENY,
            principals: [new StarPrincipal()],
            actions: ['s3tables:*'],
            resources: [arn, `${arn}/table/*`],
            conditions: {
              StringNotEquals: { 'aws:PrincipalAccount': 'test-account' },
            },
          }),
        ],
      },
    });
    const template9 = Template.fromStack(app9.testStack);
    template9.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
    const statements = Object.values(template9.findResources('AWS::S3Tables::TableBucketPolicy'))[0].Properties
      .ResourcePolicy.Statement;
    // deny-non-TLS is always first, then the caller-supplied statements.
    expect(statements[0].Sid).toBe('DenyNonTLS');
    expect(statements.find((s: { Sid?: string }) => s.Sid === 'DenyAll')).toBeDefined();
  });
});
