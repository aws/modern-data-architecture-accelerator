/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
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
});
