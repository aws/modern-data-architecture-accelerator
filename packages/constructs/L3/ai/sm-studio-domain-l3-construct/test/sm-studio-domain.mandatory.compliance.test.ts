/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock aws-cdk-lib/aws-lambda to avoid Docker build during tests
jest.mock('aws-cdk-lib/aws-lambda', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...actual,
    Code: {
      ...actual.Code,
      fromAsset: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromDockerBuild: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromCustomCommand: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
    },
  };
});

// Mock command-exists to simulate Docker availability
jest.mock('command-exists', () => ({
  sync: jest.fn().mockReturnValue(false), // Simulate Docker not available to use pip fallback
}));

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
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
});
