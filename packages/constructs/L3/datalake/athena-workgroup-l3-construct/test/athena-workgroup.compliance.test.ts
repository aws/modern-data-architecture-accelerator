/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match } from 'aws-cdk-lib/assertions';
import { Template } from 'aws-cdk-lib/assertions';
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

  test('Test athena workgroup properties', () => {
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
});
