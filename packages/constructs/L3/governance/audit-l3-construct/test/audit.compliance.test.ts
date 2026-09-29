/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AuditL3Construct, AuditL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    sourceAccounts: [],
    sourceRegions: [],
    readRoleRefs: [],
    inventoryPrefix: 'inventory',
  };

  new AuditL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Audit bucket created', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('KMS key created', () => {
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('Glue database created', () => {
    template.resourceCountIs('AWS::Glue::Database', 1);
  });

  test('Glue database name uses GLUE_DATABASE resource type', () => {
    const expectedName = testApp.naming
      .withResourceType(MdaaResourceType.GLUE_DATABASE)
      .resourceName()
      .replace(/-/gi, '_');
    template.hasResourceProperties('AWS::Glue::Database', {
      DatabaseInput: {
        Name: expectedName,
      },
    });
  });

  test('Glue audit table created without bucket inventories', () => {
    // At least one Glue table for audit logs
    const tables = template.findResources('AWS::Glue::Table');
    expect(Object.keys(tables).length).toBeGreaterThanOrEqual(1);
  });
});

describe('Audit with Bucket Inventories', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    sourceAccounts: [],
    sourceRegions: [],
    readRoleRefs: [],
    inventoryPrefix: 'inventory',
    bucketInventories: [
      {
        bucketName: 'source-bucket-1',
        inventoryName: 'daily-inventory',
      },
      {
        bucketName: 'source-bucket-2',
        inventoryName: 'weekly-inventory',
      },
    ],
  };

  new AuditL3Construct(stack, 'teststack-inv', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Additional Glue inventory table created when bucketInventories provided', () => {
    // Should have more Glue tables than the base case (audit table + inventory table)
    const tables = template.findResources('AWS::Glue::Table');
    expect(Object.keys(tables).length).toBeGreaterThanOrEqual(2);
  });

  test('Audit bucket still created with inventories', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});

describe('Multiple Source Accounts Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    sourceAccounts: ['111111111111', '222222222222'],
    sourceRegions: ['us-east-1', 'us-west-2'],
    readRoleRefs: [{ id: 'test-read-role-id' }],
    inventoryPrefix: 'inventory',
  };

  new AuditL3Construct(stack, 'multistack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple CloudTrail Write Statements in Bucket Policy', () => {
    // Should have write statements for each source account plus the local account
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AWSCloudTrailWrite20150319-111111111111',
          }),
          Match.objectLike({
            Sid: 'AWSCloudTrailWrite20150319-222222222222',
          }),
        ]),
      },
    });
  });

  test('same-account read role is granted audit CMK usage via the aws:userId condition', () => {
    // The read roles are the audit CMK's key users. Without this grant the trail objects are
    // readable but not decryptable, so the audit data is unusable.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
            Condition: {
              StringLike: {
                'aws:userId': ['test-read-role-id:*'],
              },
            },
            Sid: Match.stringLikeRegexp('usage-stmt'),
          }),
        ]),
      },
    });
  });
});

describe('Audit with cross-account read role', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    sourceAccounts: [],
    sourceRegions: [],
    readRoleRefs: [{ arn: 'arn:test-partition:iam::999999999999:role/CrossAccountAuditor' }],
    inventoryPrefix: 'inventory',
  };

  new AuditL3Construct(stack, 'xacctstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('no role resolution custom resource is created for the cross-account role', () => {
    // Resolving a cross-account role ID would call IAM in the deploying account and fail the
    // deployment with 'The role with name <name> cannot be found'.
    expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toHaveLength(0);
  });

  test('cross-account read role is granted by ARN principal in the bucket policy', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: 'arn:test-partition:iam::999999999999:role/CrossAccountAuditor' },
          }),
        ]),
      },
    });
  });

  test('cross-account read role is granted key usage by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: 'arn:test-partition:iam::999999999999:role/CrossAccountAuditor' },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
          }),
        ]),
      },
    });
  });
});
