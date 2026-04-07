/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AccessPolicyProps, DataLakeL3ConstructProps, S3DatalakeBucketL3Construct } from '../lib';

function createTestProps(
  testApp: MdaaTestApp,
  overrides: Partial<DataLakeL3ConstructProps> = {},
): DataLakeL3ConstructProps {
  const testRoleRef: MdaaRoleRef = { id: 'test-role-id' };
  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/',
    readRoleRefs: [testRoleRef],
  };
  const testBucket = {
    bucketZone: 'raw',
    accessPolicies: [testAccessPolicy],
  };
  return {
    buckets: [testBucket],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    ...overrides,
  };
}

describe('Storage Lens Tests', () => {
  test('No Storage Lens when storageLensEnabled is absent', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp);
    new S3DatalakeBucketL3Construct(testApp.testStack, 'no-obs', props);
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::S3::StorageLens', 0);
  });

  test('No Storage Lens when storageLensEnabled is false', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, { storageLensEnabled: false });
    new S3DatalakeBucketL3Construct(testApp.testStack, 'obs-disabled', props);
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::S3::StorageLens', 0);
  });

  test('Storage Lens created when storageLensEnabled is true', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, { storageLensEnabled: true });
    new S3DatalakeBucketL3Construct(testApp.testStack, 'obs-enabled', props);
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::S3::StorageLens', 1);
    template.hasResourceProperties('AWS::S3::StorageLens', {
      StorageLensConfiguration: {
        Include: {
          Buckets: Match.anyValue(),
        },
      },
    });
  });

  test('Storage Lens includes all managed buckets', () => {
    const testApp = new MdaaTestApp();
    const testRoleRef: MdaaRoleRef = { id: 'test-role-id' };
    const testAccessPolicy: AccessPolicyProps = {
      name: 'test-policy',
      s3Prefix: '/',
      readRoleRefs: [testRoleRef],
    };
    const props: DataLakeL3ConstructProps = {
      buckets: [
        { bucketZone: 'bronze', accessPolicies: [testAccessPolicy] },
        { bucketZone: 'silver', accessPolicies: [testAccessPolicy] },
        { bucketZone: 'gold', accessPolicies: [testAccessPolicy] },
      ],
      storageLensEnabled: true,
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    };
    new S3DatalakeBucketL3Construct(testApp.testStack, 'multi-bucket', props);
    const template = Template.fromStack(testApp.testStack);
    const storageLens = template.findResources('AWS::S3::StorageLens');
    const resourceKeys = Object.keys(storageLens);
    expect(resourceKeys).toHaveLength(1);
    const config = storageLens[resourceKeys[0]].Properties.StorageLensConfiguration;
    expect(config.Include.Buckets).toHaveLength(3);
  });
});

describe('Storage Lens CDK Nag Compliance', () => {
  const testApp = new MdaaTestApp();
  const props = createTestProps(testApp, { storageLensEnabled: true });
  new S3DatalakeBucketL3Construct(testApp.testStack, 'nag-test', props);
  testApp.checkCdkNagCompliance(testApp.testStack);
});
