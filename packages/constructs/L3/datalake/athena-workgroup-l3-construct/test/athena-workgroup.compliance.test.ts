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

  // Each ref carries its own ARN. MdaaRoleHelper caches resolved roles by ARN, so refs sharing one
  // ARN collapse to whichever resolved first and the later ids never reach any policy.
  const dataAdminRoleRef: MdaaRoleRef = {
    id: 'test-data-admin-role',
    arn: 'arn:test-partition:iam::test-account:role/S3Access',
  };

  const resultsBucketOnlyRoleRef: MdaaRoleRef = {
    id: 'test-read-write-role-id',
    arn: 'arn:test-partition:iam::test-account:role/ResultsBucketOnlyAccess',
    immutable: true,
  };

  const athenaUserRoleRef: MdaaRoleRef = {
    id: 'test-results-bucket-only-role',
    arn: 'arn:test-partition:iam::test-account:role/AthenaUserAccess',
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
                // keyUserRoles is composed of dataAdminRoles + athenaUserRoles + resultsBucketOnlyRoles,
                // so all three role sets have to reach the key-user statement.
                'aws:userId': Match.arrayWith([
                  'test-data-admin-role:*',
                  'test-results-bucket-only-role:*',
                  'test-read-write-role-id:*',
                ]),
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

describe('Athena Workgroup with cross-account roles', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountAnalyst';

  const constructProps: AthenaWorkgroupL3ConstructProps = {
    dataAdminRoles: [{ arn: 'arn:test-partition:iam::test-account:role/S3Access', id: 'test-data-admin-role' }],
    athenaUserRoles: [{ arn: crossAccountArn }],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AthenaWorkgroupL3Construct(stack, 'xacctstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('cross-account athena user is granted results prefix access by ARN principal', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['s3:GetObject*', 's3:PutObject']),
          }),
        ]),
      },
    });
  });

  test('cross-account athena user is granted bucket-level list access', () => {
    // Without this grant the role can read and write objects but cannot list the bucket, which
    // breaks Athena result enumeration.
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketAllowCrossAccount',
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: ['s3:List*', 's3:GetBucket*'],
          }),
        ]),
      },
    });
  });

  test('cross-account athena user is excluded from the bucket default deny', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketDeny',
            Effect: 'Deny',
            Condition: {
              'ForAnyValue:StringNotLike': Match.objectLike({
                'aws:PrincipalArn': [crossAccountArn],
              }),
            },
          }),
        ]),
      },
    });
  });

  test('cross-account athena user is granted workgroup key usage by ARN principal', () => {
    // Without a key grant the role can reach the results objects but cannot decrypt them, so
    // every Athena query it runs fails on the result read.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt', 'kms:DescribeKey']),
            Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
          }),
        ]),
      },
    });
  });

  test('only the same-account data admin reaches the aws:userId condition', () => {
    // A cross-account role has no resolvable role id, so it must arrive as an ARN principal and
    // leave the userId condition holding nothing but the same-account admin.
    const keys = Object.values(template.findResources('AWS::KMS::Key'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameAccountUserIds = keys.flatMap((key: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (key.Properties.KeyPolicy.Statement as any[]).flatMap(stmt => stmt.Condition?.StringLike?.['aws:userId'] ?? []),
    );
    expect([...new Set(sameAccountUserIds)]).toEqual(['test-data-admin-role:*']);
  });

  test('the workgroup managed policy is not attached to the cross-account role', () => {
    // A managed policy is attached by role name in the deploying account, so naming a role from
    // another account either fails the deploy with 'The role with name <name> cannot be found' or
    // attaches the workgroup permissions to an unrelated local role of the same name.
    const policies = Object.values(template.findResources('AWS::IAM::ManagedPolicy'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachedRoles = policies.flatMap((policy: any) => policy.Properties.Roles ?? []);
    expect(attachedRoles).not.toContain('CrossAccountAnalyst');
  });

  test('no role resolution custom resource is created for the cross-account role', () => {
    const crs = template.findResources('AWS::CloudFormation::CustomResource');
    expect(Object.keys(crs).filter(k => k.includes('AthenaUser'))).toHaveLength(0);
  });
});

describe('Athena Workgroup with a cross-account data admin', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const crossAccountAdminArn = 'arn:test-partition:iam::999999999999:role/CrossAccountDataAdmin';

  const constructProps: AthenaWorkgroupL3ConstructProps = {
    dataAdminRoles: [{ arn: crossAccountAdminArn }],
    athenaUserRoles: [{ arn: 'arn:test-partition:iam::test-account:role/S3Access', id: 'test-athena-user-role' }],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AthenaWorkgroupL3Construct(stack, 'xacctadminstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('cross-account data admin is granted the delegable key admin actions by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountAdminArn },
            Action: Match.arrayWith(['kms:CreateGrant', 'kms:DescribeKey']),
            Sid: Match.stringLikeRegexp('xacct-admin-stmt'),
          }),
        ]),
      },
    });
  });

  test('cross-account data admin is also granted key usage by ARN principal', () => {
    // The data admin roles feed both keyAdminRoles and keyUserRoles, so the usage grant has to
    // survive the cross-account routing as well.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountAdminArn },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
            Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
          }),
        ]),
      },
    });
  });
});
