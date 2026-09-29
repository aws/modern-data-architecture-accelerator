/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '../lib';

describe('Studio Domain Mandatory Props', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: SagemakerStudioDomainL3ConstructProps = {
    domain: {
      authMode: 'IAM',
      vpcId: 'test-vpc-id',
      subnetIds: ['test-sub-id'],
      dataAdminRoles: [
        {
          name: 'test',
        },
      ],
    },
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new SagemakerStudioDomainL3Construct(stack, 'domain', constructProps);
  const template = Template.fromStack(stack);

  testApp.checkCdkNagCompliance(stack);

  test('Validate if Domain is created', () => {
    template.resourceCountIs('AWS::SageMaker::Domain', 1);
  });

  test('Execution Role Policy', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: '',
      ManagedPolicyName: 'test-org-test-env-test-domain-test-module-basic-execution',
      Path: '/',
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
              'kms:CreateGrant',
              'kms:DescribeKey',
              'kms:ListAliases',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': ['domainefskeyF34BE10B', 'Arn'],
            },
          },
          {
            Action: [
              'sagemaker:CreateApp',
              'sagemaker:DeleteApp',
              'sagemaker:DescribeApp',
              'sagemaker:CreateSpace',
              'sagemaker:UpdateSpace',
              'sagemaker:DeleteSpace',
              'sagemaker:DescribeSpace',
            ],
            Effect: 'Allow',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:test-partition:sagemaker:test-region:test-account:app/',
                    {
                      'Fn::GetAtt': ['domainCA282C9B', 'DomainId'],
                    },
                    '/*',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:test-partition:sagemaker:test-region:test-account:space/',
                    {
                      'Fn::GetAtt': ['domainCA282C9B', 'DomainId'],
                    },
                    '/*',
                  ],
                ],
              },
            ],
          },
          {
            Action: 'sagemaker:DescribeDomain',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:test-partition:sagemaker:test-region:test-account:domain/',
                  {
                    'Fn::GetAtt': ['domainCA282C9B', 'DomainId'],
                  },
                ],
              ],
            },
          },
          {
            Action: 'sagemaker:ListStudioLifecycleConfigs',
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'sagemaker:DescribeStudioLifecycleConfig',
            Effect: 'Allow',
            Resource: 'arn:test-partition:sagemaker:test-region:test-account:studio-lifecycle-config/*',
          },
          {
            Action: ['sagemaker:DescribeImage', 'sagemaker:DescribeImageVersion'],
            Effect: 'Allow',
            Resource: [
              'arn:test-partition:sagemaker:test-region:test-account:image/*',
              'arn:test-partition:sagemaker:test-region:test-account:image-version/*/*',
            ],
          },
          {
            Action: ['logs:CreateLogGroup', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams'],
            Effect: 'Allow',
            Resource: 'arn:test-partition:logs:test-region:test-account:log-group:/aws/sagemaker/studio',
          },
          {
            Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            Effect: 'Allow',
            Resource: 'arn:test-partition:logs:test-region:test-account:log-group:/aws/sagemaker/studio:log-stream:*',
          },
        ],
        Version: '2012-10-17',
      },
      Roles: [
        {
          Ref: 'domaindefaultexecutionrole3CFE4307',
        },
      ],
    });
  });

  test('SecurityGroup VPC ID Testing', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      VpcId: 'test-vpc-id',
    });
  });

  describe('Domain bucket default-deny policy', () => {
    const dataAdminUserId = {
      'Fn::Join': ['', [{ 'Fn::GetAtt': ['RoleResDataAdmin0', 'id'] }, ':*']],
    };

    test('every allow statement produced by RestrictBucketToRoles is attached to the bucket', () => {
      // The domain bucket passes only roleExcludeIds, so RestrictBucketToRoles yields exactly one
      // bucket-level allow statement. Counting the BucketAllow* sids pins that the construct
      // attaches all of allowStatements() rather than a single hard-coded one, and that the
      // cross-account companion statement is not emitted when no resolved role is cross-account.
      const policies = template.findResources('AWS::S3::BucketPolicy');
      const statements = Object.values(policies).flatMap(
        policy => policy.Properties.PolicyDocument.Statement as { Sid?: string }[],
      );
      const bucketAllowSids = statements.map(statement => statement.Sid).filter(sid => sid?.startsWith('BucketAllow'));
      expect(bucketAllowSids).toEqual(['BucketAllow']);
    });

    test('the allow statement grants bucket listing to the data admin by aws:userId', () => {
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: 'BucketAllow',
              Effect: 'Allow',
              Action: ['s3:List*', 's3:GetBucket*'],
              Principal: { AWS: '*' },
              Condition: { StringLike: { 'aws:userId': [dataAdminUserId] } },
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });

    test('the deny statement still excludes the data admin and the domain roles', () => {
      // The allow statement is only half of the pair: without the deny, every role reaches the
      // bucket, and without the data admin in its exclusion list the admin is denied its own bucket.
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: 'BucketDeny',
              Effect: 'Deny',
              Action: ['s3:PutObject*', 's3:GetObject*', 's3:DeleteObject*'],
              Principal: { AWS: '*' },
              Condition: {
                'ForAnyValue:StringNotLike': {
                  'aws:userId': [dataAdminUserId],
                  'aws:PrincipalArn': Match.arrayWith([
                    { 'Fn::GetAtt': ['domaindefaultexecutionrole3CFE4307', 'Arn'] },
                  ]),
                },
              },
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });
  });
});
