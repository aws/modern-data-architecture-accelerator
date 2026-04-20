/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import {
  AccessPolicyProps,
  BucketDefinition,
  DataLakeL3ConstructProps,
  LifecycleConfigurationRuleProps,
  LifecycleTransitionProps,
  S3DatalakeBucketL3Construct,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const testReadRoleRef: MdaaRoleRef = {
    id: 'test-read-role-id',
  };

  const testReadWriteRoleRef: MdaaRoleRef = {
    id: 'test-read-write-role-id',
  };

  const testReadWriteSuperRoleRef: MdaaRoleRef = {
    id: 'test-read-write-super-role-id',
  };

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/testing',
    readRoleRefs: [testReadRoleRef],
    readWriteRoleRefs: [testReadWriteRoleRef],
    readWriteSuperRoleRefs: [testReadWriteSuperRoleRef],
  };

  const testLifecycleTransition: LifecycleTransitionProps = {
    days: 30,
    storageClass: 'GLACIER',
  };

  const testNonCurrentVersionsLifecycleTransition: LifecycleTransitionProps = {
    days: 30,
    storageClass: 'GLACIER',
  };

  const testLifecycleConfiguration: LifecycleConfigurationRuleProps = {
    id: 'test-lifecycle-configuration-id',
    prefix: 'test-prefix',
    status: 'Enabled',
    objectSizeGreaterThan: 1000000000,
    objectSizeLessThan: 1000000000,
    expirationdays: 270,
    noncurrentVersionExpirationDays: 270,
    noncurrentVersionsToRetain: 5,
    transitions: [testLifecycleTransition],
    noncurrentVersionTransitions: [testNonCurrentVersionsLifecycleTransition],
  };

  const testBucketProps: BucketDefinition = {
    bucketZone: 'test-zone',
    accessPolicies: [testAccessPolicy],
    lifecycleConfiguration: [testLifecycleConfiguration],
    defaultDeny: true,
    inventories: {
      test: {
        prefix: 'data',
      },
      'test-destination': {
        prefix: 'data',
        destinationBucket: 'test-dest',
        destinationPrefix: 'test-dest-prefix',
      },
    },
  };

  const testLfBucketProps: BucketDefinition = {
    bucketZone: 'test-lf-zone',
    accessPolicies: [testAccessPolicy],
    lifecycleConfiguration: [testLifecycleConfiguration],
    defaultDeny: true,
    lakeFormationLocations: {
      'read-only': {
        prefix: 'data',
      },
      'read-write': {
        prefix: 'data',
        write: true,
      },
      'read-write-false': {
        prefix: 'data',
        write: false,
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [testBucketProps, testLfBucketProps],
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('LifecycleConfiguration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: 'test-lifecycle-configuration-id',
            ExpirationInDays: 270,
            NoncurrentVersionExpiration: {
              NewerNoncurrentVersions: 5,
              NoncurrentDays: 270,
            },
            Prefix: 'test-prefix',
            Status: 'Enabled',
            ObjectSizeGreaterThan: 1000000000,
            ObjectSizeLessThan: 1000000000,
            Transitions: [
              {
                TransitionInDays: 30,
                StorageClass: 'GLACIER',
              },
            ],
            NoncurrentVersionTransitions: [
              {
                TransitionInDays: 30,
                StorageClass: 'GLACIER',
              },
            ],
          }),
        ]),
      },
    });
  });

  test('KMSUsageAccess', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
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
                'aws:userId': [
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['folderfunctionroleC7D41C6D', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['lakeformationrole7FEE6C3C', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  'test-read-role-id:*',
                  'test-read-write-role-id:*',
                  'test-read-write-super-role-id:*',
                ],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          }),
        ]),
      },
    });
  });

  test('BucketReadAccess', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Condition: {
              StringLike: {
                'aws:userId': ['test-read-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
                  },
                  '/testing/*',
                ],
              ],
            },
            Sid: '/testing_Read',
          }),
        ]),
      },
    });
  });

  test('BucketReadWriteAccess', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:GetObject*', 's3:PutObject', 's3:PutObjectTagging', 's3:DeleteObject'],
            Condition: {
              StringLike: {
                'aws:userId': ['test-read-write-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
                  },
                  '/testing/*',
                ],
              ],
            },
            Sid: '/testing_ReadWrite',
          }),
        ]),
      },
    });
  });

  test('BucketReadWriteSuperAccess', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              's3:GetObject*',
              's3:PutObject',
              's3:PutObjectTagging',
              's3:DeleteObject',
              's3:DeleteObjectVersion',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-read-write-super-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
                  },
                  '/testing/*',
                ],
              ],
            },
            Sid: '/testing_ReadWriteSuper',
          }),
        ]),
      },
    });
  });

  test('BucketBasicAllow', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:List*', 's3:GetBucket*'],
            Condition: {
              StringLike: {
                'aws:userId': [
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['lakeformationrole7FEE6C3C', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  'test-read-role-id:*',
                  'test-read-write-role-id:*',
                  'test-read-write-super-role-id:*',
                ],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
                    },
                    '/*',
                  ],
                ],
              },
              {
                'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
              },
            ],
            Sid: 'BucketAllow',
          }),
        ]),
      },
    });
  });

  test('BucketDefaultDeny', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:PutObject*', 's3:GetObject*', 's3:DeleteObject*'],
            Condition: {
              'ForAnyValue:StringNotLike': {
                'aws:userId': [
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['lakeformationrole7FEE6C3C', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  'test-read-role-id:*',
                  'test-read-write-role-id:*',
                  'test-read-write-super-role-id:*',
                ],
                'aws:PrincipalArn': [
                  {
                    'Fn::GetAtt': ['folderfunctionroleC7D41C6D', 'Arn'],
                  },
                ],
              },
            },
            Effect: 'Deny',
            Principal: {
              AWS: '*',
            },
            NotResource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['buckettestzone627FCEC7', 'Arn'],
                  },
                  '/inventory/*',
                ],
              ],
            },
            Sid: 'BucketDeny',
          }),
        ]),
      },
    });
  });
});

describe('DataLake with EventBridge Notifications', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const eventBridgeBucketProps: BucketDefinition = {
    bucketZone: 'eventbridge-zone',
    accessPolicies: [testAccessPolicy],
    enableEventBridgeNotifications: true,
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [eventBridgeBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-eventbridge-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('EventBridge notification enabled on bucket', () => {
    template.hasResource('AWS::S3::Bucket', {
      Properties: Match.objectLike({
        NotificationConfiguration: {
          EventBridgeConfiguration: {
            EventBridgeEnabled: true,
          },
        },
      }),
    });
  });
});

describe('DataLake with createFolderSkeleton disabled', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const noFolderBucketProps: BucketDefinition = {
    bucketZone: 'no-folder-zone',
    accessPolicies: [testAccessPolicy],
    createFolderSkeleton: false,
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [noFolderBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-no-folder-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('No custom resource for folder creation when createFolderSkeleton is false', () => {
    const customResources = template.findResources('AWS::CloudFormation::CustomResource');
    expect(Object.keys(customResources).length).toBe(0);
  });

  test('Bucket still created', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});

describe('CORS Configuration', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const corsBucketProps: BucketDefinition = {
    bucketZone: 'cors-zone',
    accessPolicies: [testAccessPolicy],
    corsRules: [
      {
        id: 'sagemaker-rule',
        allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST],
        allowedOrigins: ['https://sagemaker.*.amazonaws.com'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ],
  };

  const noCorsProps: BucketDefinition = {
    bucketZone: 'no-cors-zone',
    accessPolicies: [testAccessPolicy],
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [corsBucketProps, noCorsProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-cors-stack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Bucket with CORS rules has CorsConfiguration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('cors-zone'),
      CorsConfiguration: {
        CorsRules: [
          {
            Id: 'sagemaker-rule',
            AllowedMethods: ['GET', 'PUT', 'POST'],
            AllowedOrigins: ['https://sagemaker.*.amazonaws.com'],
            AllowedHeaders: ['*'],
            ExposedHeaders: ['ETag'],
            MaxAge: 3000,
          },
        ],
      },
    });
  });

  test('Bucket without CORS rules has no CorsConfiguration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('no-cors-zone'),
      CorsConfiguration: Match.absent(),
    });
  });
});
