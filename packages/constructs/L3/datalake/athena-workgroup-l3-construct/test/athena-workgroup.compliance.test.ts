/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '../lib/athena-workgroup-l3-construct';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const dataAdminRoleRef: MdaaRoleRef = {
    id: 'test-data-admin-role',
    arn: 'arn:test-partition:iam::test-account:role/S3Access',
  };

  const resultsBucketOnlyRoleRef: MdaaRoleRef = {
    id: 'test-read-write-role-id',
    arn: 'arn:test-partition:iam::test-account:role/S3Access',
    immutable: true,
  };

  const athenaUserRoleRef: MdaaRoleRef = {
    id: 'test-results-bucket-only-role',
    arn: 'arn:test-partition:iam::test-account:role/S3Access',
  };

  const constructProps: AthenaWorkgroupL3ConstructProps = {
    dataAdminRoles: [dataAdminRoleRef],
    athenaUserRoles: [athenaUserRoleRef, resultsBucketOnlyRoleRef],

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AthenaWorkgroupL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  //console.log(JSON.stringify(template, undefined, 2))

  test('KMSUsage', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:*',
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:root',
            },
            Resource: '*',
          }),
          Match.objectLike({
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-data-admin-role:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          }),
          Match.objectLike({
            Action: [
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
            ],
            Effect: 'Allow',
            Principal: {
              Service: 's3.amazonaws.com',
            },
            Resource: '*',
          }),
        ]),
      },
    });
  });

  test('athena workgroup properties', () => {
    template.hasResourceProperties('AWS::Athena::WorkGroup', {
      Name: 'test-org-test-env-test-domain-test-module',
      WorkGroupConfiguration: {
        EnforceWorkGroupConfiguration: true,
        PublishCloudWatchMetricsEnabled: true,
        ResultConfiguration: {
          EncryptionConfiguration: {
            EncryptionOption: 'SSE_KMS',
            KmsKey: {
              'Fn::GetAtt': ['CaefWorkgroupKeyB5F3DF98', 'Arn'],
            },
          },
          OutputLocation: {
            'Fn::Join': [
              '',
              [
                's3://',
                {
                  Ref: 'Bucketworkgroup1C478AC6',
                },
                '/athena-results/',
              ],
            ],
          },
        },
      },
    });
  });

  test('workgroup access policy resource ARN uses ATHENA_WORKGROUP resource type', () => {
    const expectedWorkgroupName = testApp.naming.withResourceType(MdaaResourceType.ATHENA_WORKGROUP).resourceName();
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['athena:StartQueryExecution']),
            Resource: `arn:test-partition:athena:test-region:test-account:workgroup/${expectedWorkgroupName}`,
          }),
        ]),
      },
    });
  });
});

describe('Athena Workgroup Lifecycle Configuration', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AthenaWorkgroupL3ConstructProps = {
    dataAdminRoles: [{ id: 'admin-role', arn: 'arn:test-partition:iam::test-account:role/Admin' }],
    athenaUserRoles: [{ id: 'user-role', arn: 'arn:test-partition:iam::test-account:role/User' }],
    lifecycleConfiguration: [
      { id: 'expire-results', status: 'Enabled', expirationdays: 7, abortIncompleteMultipartUploadAfter: 1 },
      {
        id: 'archive-large',
        status: 'Enabled',
        prefix: 'custom/',
        transitions: [{ days: 30, storageClass: 'GLACIER' }],
      },
    ],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AthenaWorkgroupL3Construct(stack, 'lifecycle-test', constructProps);
  const template = Template.fromStack(stack);

  test('auto-prefixes rules without explicit prefix to athena-results/', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: Match.objectLike({
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: 'expire-results',
            Prefix: 'athena-results/',
            Status: 'Enabled',
            ExpirationInDays: 7,
          }),
        ]),
      }),
    });
  });

  test('preserves explicit prefix as-is', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: Match.objectLike({
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: 'archive-large',
            Prefix: 'custom/',
            Status: 'Enabled',
            Transitions: [{ StorageClass: 'GLACIER', TransitionInDays: 30 }],
          }),
        ]),
      }),
    });
  });
});
