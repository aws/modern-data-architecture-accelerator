/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import { AccessPolicyProps, BucketDefinition, DataLakeL3ConstructProps, S3DatalakeBucketL3Construct } from '../lib';
import { LifecycleConfigurationRuleProps, LifecycleTransitionProps } from '@aws-mdaa/s3-helpers';

/**
 * The kms:ViaService value as rendered: the URL suffix is a pseudo-parameter so the condition
 * resolves per partition, rather than the hardcoded commercial suffix a literal would pin.
 */
function viaService(region: string): { 'Fn::Join': (string | { Ref: string })[][] | unknown[] } {
  return { 'Fn::Join': ['', [`s3.${region}.`, { Ref: 'AWS::URLSuffix' }]] };
}

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

  test('S3BucketReplicationEnabled suppressions retained without a replication config', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(bucket => {
      const suppressed: { id: string }[] = bucket.Metadata?.cdk_nag?.rules_to_suppress ?? [];
      expect(suppressed.map(s => s.id)).toEqual(
        expect.arrayContaining([
          'NIST.800.53.R5-S3BucketReplicationEnabled',
          'HIPAA.Security-S3BucketReplicationEnabled',
          'PCI.DSS.321-S3BucketReplicationEnabled',
        ]),
      );
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
    expect(Object.keys(customResources)).toHaveLength(0);
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

describe('DataLake Outbound Replication', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const outboundBucketProps: BucketDefinition = {
    bucketZone: 'outbound-zone',
    accessPolicies: [testAccessPolicy],
    defaultDeny: true,
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-datalake-outbound',
        destinationAccount: '222222222222',
        destinationRegion: 'test-region',
        destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
        // Slashed form on purpose: formatS3Prefix strips them, and every id, filter, object ARN and
        // encryption-context entry below is asserted on the normalized result.
        prefixFilters: ['/data/', 'reports'],
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [outboundBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-outbound-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('One rule per prefix filter, each with a distinct priority and stable id', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Role: { 'Fn::GetAtt': [Match.stringLikeRegexp('replicationroleoutboundzone'), 'Arn'] },
        Rules: [
          Match.objectLike({
            Id: 'replication-outbound-zone-data',
            Priority: 1,
            Filter: { Prefix: 'data/' },
            Status: 'Enabled',
            DeleteMarkerReplication: { Status: 'Disabled' },
          }),
          Match.objectLike({
            Id: 'replication-outbound-zone-reports',
            Priority: 2,
            Filter: { Prefix: 'reports/' },
            Status: 'Enabled',
            DeleteMarkerReplication: { Status: 'Disabled' },
          }),
        ],
      },
    });
  });

  test('Destination carries the configured account and replica key', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Destination: {
              Account: '222222222222',
              Bucket: 'arn:test-partition:s3:::dr-datalake-outbound',
              EncryptionConfiguration: {
                ReplicaKmsKeyID: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
              },
            },
          }),
        ]),
      },
    });
  });

  test('SSE-KMS source objects are opted in to replication', () => {
    // Without this, S3 silently replicates none of the bucket's objects, as MDAA
    // buckets always encrypt with a CMK.
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            SourceSelectionCriteria: { SseKmsEncryptedObjects: { Status: 'Enabled' } },
          }),
        ]),
      },
    });
  });

  test('No AccessControlTranslation, as the destination relies on Object Ownership', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets).length).toBeGreaterThan(0);
    Object.values(buckets).forEach(bucket => {
      const rules = bucket.Properties?.ReplicationConfiguration?.Rules ?? [];
      rules.forEach((rule: { Destination: Record<string, unknown> }) => {
        expect(rule.Destination.AccessControlTranslation).toBeUndefined();
      });
    });
  });

  // A managed policy rather than an inline one, so that the same code path can attach to a
  // referenced role, which CDK would silently refuse to add an inline policy to.
  test('Replication role granted source bucket, source object and destination object access', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:GetReplicationConfiguration', 's3:ListBucket'],
            Effect: 'Allow',
            // Literal, not Fn::GetAtt: the policy must not depend on the bucket, so the bucket
            // can depend on the policy.
            Resource: 'arn:test-partition:s3:::test-org-test-env-test-domain-test-module-outbound-zone',
          }),
          Match.objectLike({
            Action: ['s3:GetObjectVersionForReplication', 's3:GetObjectVersionAcl', 's3:GetObjectVersionTagging'],
            Effect: 'Allow',
          }),
          Match.objectLike({
            // No s3:ReplicateDelete: deleteMarkerReplication is off, so the role never writes one.
            Action: ['s3:ReplicateObject', 's3:ReplicateTags'],
            Effect: 'Allow',
            Resource: [
              'arn:test-partition:s3:::dr-datalake-outbound/data/*',
              'arn:test-partition:s3:::dr-datalake-outbound/reports/*',
            ],
          }),
        ]),
      },
    });
  });

  test('Replication role granted decrypt on the source key and encrypt on the destination key', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Effect: 'Allow',
            Condition: {
              StringEquals: { 'kms:ViaService': viaService('test-region') },
              StringLike: {
                'kms:EncryptionContext:aws:s3:arn': [
                  'arn:test-partition:s3:::test-org-test-env-test-domain-test-module-outbound-zone',
                  'arn:test-partition:s3:::test-org-test-env-test-domain-test-module-outbound-zone/data/*',
                  'arn:test-partition:s3:::test-org-test-env-test-domain-test-module-outbound-zone/reports/*',
                ],
              },
            },
            Resource: { 'Fn::GetAtt': [Match.stringLikeRegexp('cmk'), 'Arn'] },
          }),
          // Exactly these two actions: the shared USER_ACTIONS set also carries ReEncrypt and
          // GenerateDataKey actions, which replication never calls.
          Match.objectLike({
            Action: ['kms:Encrypt', 'kms:Decrypt'],
            Effect: 'Allow',
            Condition: {
              StringEquals: { 'kms:ViaService': viaService('test-region') },
              StringLike: {
                'kms:EncryptionContext:aws:s3:arn': [
                  'arn:test-partition:s3:::dr-datalake-outbound',
                  'arn:test-partition:s3:::dr-datalake-outbound/data/*',
                  'arn:test-partition:s3:::dr-datalake-outbound/reports/*',
                ],
              },
            },
            Resource: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
          }),
        ]),
      },
    });
  });

  test('Replication role excluded from the bucket default-deny statement', () => {
    // Source objects are read with s3:GetObjectVersion* actions, which the deny
    // statement's s3:GetObject* pattern would otherwise block.
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketDeny',
            Condition: {
              'ForAnyValue:StringNotLike': Match.objectLike({
                'aws:userId': Match.arrayWith([
                  {
                    'Fn::Join': [
                      '',
                      [{ 'Fn::GetAtt': [Match.stringLikeRegexp('replicationroleoutboundzone'), 'RoleId'] }, ':*'],
                    ],
                  },
                ]),
              }),
            },
          }),
        ]),
      },
    });
  });

  test('S3BucketReplicationEnabled suppressions withheld from a replicating bucket', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const suppressed = Object.values(buckets).flatMap(bucket => bucket.Metadata?.cdk_nag?.rules_to_suppress ?? []);
    expect(suppressed.filter((s: { id: string }) => s.id.endsWith('S3BucketReplicationEnabled'))).toHaveLength(0);
  });
});

// Referencing an existing role is what makes a two-sided MDAA pair deployable in one pass: the
// receiving data lake has to grant this role before this bucket is deployed, so the role cannot
// be one this stack creates.
describe('DataLake Outbound Replication With Referenced Role', () => {
  const testApp = new MdaaTestApp();
  const referencedRoleArn = 'arn:test-partition:iam::test-account:role/existing-replication';

  const outboundBucketProps: BucketDefinition = {
    bucketZone: 'outbound-zone',
    accessPolicies: [
      {
        name: 'test-policy',
        s3Prefix: '/data',
        readRoleRefs: [{ id: 'test-read-role-id' }],
      },
    ],
    defaultDeny: true,
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-datalake-outbound',
        destinationAccount: '222222222222',
        destinationRegion: 'test-region',
        destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
        prefixFilters: ['data'],
        replicationRole: { arn: referencedRoleArn, id: 'AROAEXISTINGREPLICATION' },
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [outboundBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-outbound-ref-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Replication configuration uses the referenced role', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Role: referencedRoleArn,
      },
    });
  });

  test('No replication role is created', () => {
    const roleNames = Object.values(template.findResources('AWS::IAM::Role')).map(role => role.Properties?.RoleName);
    expect(roleNames.filter((name: string | undefined) => name?.endsWith('-replication'))).toHaveLength(0);
  });

  // The managed policy attaches by role name, which is what lets it apply to a role this module
  // does not own - CDK drops inline policy additions on an imported role.
  test('Replication permissions attached to the referenced role', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Roles: ['existing-replication'],
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            // No s3:ReplicateDelete: deleteMarkerReplication is off, so the role never writes one.
            Action: ['s3:ReplicateObject', 's3:ReplicateTags'],
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  // The role is exempted from the bucket's default deny by AROA id, not by ARN, so a referenced
  // role still has to yield an id - supplied here rather than resolved by custom resource.
  test('Referenced role exempted from the bucket default deny', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketDeny',
            Condition: {
              'ForAnyValue:StringNotLike': Match.objectLike({
                'aws:userId': Match.arrayWith(['AROAEXISTINGREPLICATION:*']),
              }),
            },
          }),
        ]),
      },
    });
  });
});

// Sharing exists because a consumer in another account cannot know two of these values in
// advance: the CMK ARN contains a generated key id, and bucket names are hash-truncated.
describe('DataLake Parameter Sharing', () => {
  const testApp = new MdaaTestApp();

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [
      {
        bucketZone: 'shared-zone',
        accessPolicies: [{ name: 'test-policy', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    shareParametersWithAccounts: ['222222222222'],
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-share-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  const paramPrefix = 'arn:test-partition:ssm:test-region:test-account:parameter/test-org/test-domain/test-module';

  test('Share is confined to this account AWS Organization', () => {
    // RAM defaults to allowing external principals, so the restriction has to be explicit.
    template.hasResourceProperties('AWS::RAM::ResourceShare', {
      AllowExternalPrincipals: false,
    });
  });

  test('Key and bucket parameters shared with the named accounts only', () => {
    template.hasResourceProperties('AWS::RAM::ResourceShare', {
      Principals: ['222222222222'],
      ResourceArns: [
        `${paramPrefix}/kms/arn`,
        `${paramPrefix}/kms/id`,
        `${paramPrefix}/bucket/shared-zone/arn`,
        `${paramPrefix}/bucket/shared-zone/name`,
      ],
    });
  });

  // RAM rejects a share naming a resource that does not exist yet, and these ARNs are built from
  // strings rather than from the parameters' own Refs, so nothing would order them otherwise.
  test('Share depends on the parameter-owning resources', () => {
    const share = Object.entries(template.findResources('AWS::RAM::ResourceShare'))[0][1];
    const dependsOn: string[] = share.DependsOn ?? [];
    const params = Object.keys(template.findResources('AWS::SSM::Parameter'));
    const shareableParams = params.filter(id => /kmsarn|kmsid|bucketsharedzone/i.test(id));
    expect(shareableParams.length).toBeGreaterThan(0);
    shareableParams.forEach(id => expect(dependsOn).toContain(id));
  });

  // RAM refuses to share a Standard-tier parameter, and an Advanced-tier parameter is billed, so
  // the two sets have to be the same: every shared parameter is Advanced, and nothing else is.
  test('Exactly the shared parameters are published in the Advanced tier', () => {
    const share = Object.values(template.findResources('AWS::RAM::ResourceShare'))[0];
    const sharedNames: string[] = share.Properties.ResourceArns.map((arn: string) => arn.split(':parameter')[1]);
    const advanced = Object.values(template.findResources('AWS::SSM::Parameter'))
      .filter(param => param.Properties?.Tier == 'Advanced')
      .map(param => param.Properties.Name);
    expect(advanced.sort()).toEqual(sharedNames.sort());
  });
});

describe('DataLake Without Parameter Sharing', () => {
  const testApp = new MdaaTestApp();

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [
      {
        bucketZone: 'private-zone',
        accessPolicies: [{ name: 'test-policy', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-noshare-stack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('No resource share is created', () => {
    template.resourceCountIs('AWS::RAM::ResourceShare', 0);
  });

  // Advanced-tier parameters are billed, so nothing moves tier without being shared.
  test('All parameters stay in the default tier', () => {
    const params = template.findResources('AWS::SSM::Parameter');
    expect(Object.keys(params).length).toBeGreaterThan(0);
    Object.values(params).forEach(param => expect(param.Properties?.Tier).toBeUndefined());
  });
});

describe('DataLake Inbound Replication', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const inboundBucketProps: BucketDefinition = {
    bucketZone: 'inbound-zone',
    accessPolicies: [testAccessPolicy],
    defaultDeny: true,
    replication: {
      inbound: {
        sourceReplicationRoleArn: 'arn:test-partition:iam::222222222222:role/datalake-replication',
        sourceAccount: '222222222222',
        prefixFilters: ['data'],
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [inboundBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-inbound-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('External replication role granted replicate on the configured prefixes', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InboundReplicationObjects',
            // Delete included unconditionally: the sending rule is the other account's to set.
            Action: ['s3:ReplicateObject', 's3:ReplicateTags', 's3:ReplicateDelete'],
            Effect: 'Allow',
            Principal: { AWS: 'arn:test-partition:iam::222222222222:role/datalake-replication' },
            Resource: {
              'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.stringLikeRegexp('bucketinboundzone'), 'Arn'] }, '/data/*']],
            },
          }),
        ]),
      },
    });
  });

  test('External replication role granted the bucket-scoped versioning actions', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InboundReplicationBucket',
            // No PutBucketVersioning: always-versioned bucket, so it could only be suspended.
            Action: ['s3:GetBucketVersioning', 's3:ListBucket'],
            Effect: 'Allow',
            Principal: { AWS: 'arn:test-partition:iam::222222222222:role/datalake-replication' },
            Resource: { 'Fn::GetAtt': [Match.stringLikeRegexp('bucketinboundzone'), 'Arn'] },
          }),
        ]),
      },
    });
  });

  test('External replication role granted use of the data lake key, scoped to S3', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'inbound-replication-inbound-zone',
            Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey'],
            Effect: 'Allow',
            Condition: { StringEquals: { 'kms:ViaService': viaService('test-region') } },
            Principal: { AWS: 'arn:test-partition:iam::222222222222:role/datalake-replication' },
            Resource: '*',
          }),
        ]),
      },
    });
  });

  test('No ReplicationConfiguration and no replication role on the receiving side', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets).length).toBeGreaterThan(0);
    Object.values(buckets).forEach(bucket => {
      expect(bucket.Properties?.ReplicationConfiguration).toBeUndefined();
    });
    const roleNames = Object.values(template.findResources('AWS::IAM::Role')).map(role => role.Properties?.RoleName);
    expect(roleNames.filter(name => typeof name == 'string' && name.includes('replication'))).toHaveLength(0);
  });

  test('No owner-override grant, as the bucket relies on Object Ownership', () => {
    const statements = Object.values(template.findResources('AWS::S3::BucketPolicy')).flatMap(
      policy => policy.Properties?.PolicyDocument?.Statement ?? [],
    );
    const actions = statements.flatMap((statement: { Action: string | string[] }) =>
      Array.isArray(statement.Action) ? statement.Action : [statement.Action],
    );
    expect(actions).not.toContain('s3:ObjectOwnerOverrideToBucketOwner');
  });
});

describe('DataLake Replication with MDAA managing both ends', () => {
  const testApp = new MdaaTestApp();

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  const sourceBucketProps: BucketDefinition = {
    bucketZone: 'source-zone',
    accessPolicies: [testAccessPolicy],
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-datalake-both',
        destinationAccount: '222222222222',
        destinationRegion: 'test-region',
        destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
      },
    },
  };

  const destinationBucketProps: BucketDefinition = {
    bucketZone: 'destination-zone',
    accessPolicies: [testAccessPolicy],
    replication: {
      inbound: {
        sourceReplicationRoleArn: 'arn:test-partition:iam::222222222222:role/source-replication',
        sourceAccount: '222222222222',
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [sourceBucketProps, destinationBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-both-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Sending bucket replicates the whole bucket when no prefixes are configured', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('source-zone'),
      ReplicationConfiguration: {
        Rules: [
          Match.objectLike({
            Id: 'replication-source-zone-all',
            Priority: 1,
            // CDK always emits a Filter; an empty prefix matches every object.
            Filter: { Prefix: '' },
          }),
        ],
      },
    });
  });

  test('Receiving bucket has no replication configuration of its own', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('destination-zone'),
      ReplicationConfiguration: Match.absent(),
    });
  });

  test('Unscoped inbound grant covers the whole receiving bucket', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InboundReplicationObjects',
            Resource: {
              'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.stringLikeRegexp('bucketdestinationzone'), 'Arn'] }, '/*']],
            },
          }),
        ]),
      },
    });
  });
});

// outbound and inbound are additive rather than mutually exclusive, so one bucket can send and
// receive at once. Both sides then land on the same bucket and the same data lake key.
describe('DataLake Replication on a bucket that both sends and receives', () => {
  const testApp = new MdaaTestApp();

  const bothSidesBucketProps: BucketDefinition = {
    bucketZone: 'exchange-zone',
    accessPolicies: [
      {
        name: 'test-policy',
        s3Prefix: '/data',
        readRoleRefs: [{ id: 'test-read-role-id' }],
      },
    ],
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-datalake-exchange',
        destinationAccount: '222222222222',
        destinationRegion: 'test-region',
        destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
        prefixFilters: ['outgoing'],
      },
      inbound: {
        sourceReplicationRoleArn: 'arn:test-partition:iam::222222222222:role/datalake-replication',
        sourceAccount: '222222222222',
        prefixFilters: ['incoming'],
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [bothSidesBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-exchange-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Outbound rules and an MDAA-managed replication role are created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('exchange-zone'),
      ReplicationConfiguration: {
        Rules: [
          Match.objectLike({
            Id: 'replication-exchange-zone-outgoing',
            Filter: { Prefix: 'outgoing/' },
          }),
        ],
      },
    });
    // MDAA truncates the '-replication' suffix into a hash, so match the zone.
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: Match.stringLikeRegexp('exchange-zone'),
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Principal: { Service: 's3.amazonaws.com' }, Action: 'sts:AssumeRole' }),
        ]),
      },
    });
  });

  test('Inbound grant is scoped to the receiving prefix, separate from the outbound rules', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InboundReplicationObjects',
            Principal: { AWS: 'arn:test-partition:iam::222222222222:role/datalake-replication' },
            Resource: {
              'Fn::Join': [
                '',
                [{ 'Fn::GetAtt': [Match.stringLikeRegexp('bucketexchangezone'), 'Arn'] }, '/incoming/*'],
              ],
            },
          }),
        ]),
      },
    });
  });

  // The inbound grant names the bucket by the name it was created with rather than by its Arn
  // attribute, to stay clear of a dependency cycle on the key that encrypts it. A name that
  // stopped matching the bucket would deny replication silently, so pin the two together.
  test('Inbound encryption context names this bucket, matching its BucketName exactly', () => {
    const bucketName = Object.values(template.findResources('AWS::S3::Bucket'))[0].Properties.BucketName;
    expect(typeof bucketName).toBe('string');
    const keyStatements = Object.values(template.findResources('AWS::KMS::Key'))[0].Properties.KeyPolicy.Statement;
    const inbound = keyStatements.find(
      (statement: { Sid?: string }) => statement.Sid == 'inbound-replication-exchange-zone',
    );
    expect(inbound.Condition.StringLike['kms:EncryptionContext:aws:s3:arn']).toEqual([
      `arn:test-partition:s3:::${bucketName}`,
      `arn:test-partition:s3:::${bucketName}/incoming/*`,
    ]);
  });

  // The outbound grant on the source key and the inbound grant for the external role are both
  // statements on the one data lake key, so neither may displace the other.
  test('Both key grants coexist on the data lake key', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'inbound-replication-exchange-zone',
            Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey'],
            Principal: { AWS: 'arn:test-partition:iam::222222222222:role/datalake-replication' },
          }),
        ]),
      },
    });
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: Match.stringLikeRegexp('exchange-zone'),
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Resource: { 'Fn::GetAtt': [Match.stringLikeRegexp('cmk'), 'Arn'] },
          }),
        ]),
      },
    });
  });
});

describe('DataLake Outbound Replication with delete markers enabled', () => {
  const testApp = new MdaaTestApp();

  const outboundBucketProps: BucketDefinition = {
    bucketZone: 'outbound-zone',
    accessPolicies: [
      {
        name: 'test-policy',
        s3Prefix: '/data',
        readRoleRefs: [{ id: 'test-read-role-id' }],
      },
    ],
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-datalake-outbound',
        destinationAccount: '222222222222',
        destinationRegion: 'test-region',
        destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
        prefixFilters: ['data'],
        deleteMarkerReplication: true,
      },
    },
  };

  const constructProps: DataLakeL3ConstructProps = {
    buckets: [outboundBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-delete-marker-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('The rule replicates delete markers', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Rules: [
          Match.objectLike({
            Id: 'replication-outbound-zone-data',
            DeleteMarkerReplication: { Status: 'Enabled' },
          }),
        ],
      },
    });
  });

  // The grant follows the rule, so the role can write the delete markers the rule replicates.
  test('The replication role is granted s3:ReplicateDelete', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:ReplicateObject', 's3:ReplicateTags', 's3:ReplicateDelete'],
            Effect: 'Allow',
            Resource: 'arn:test-partition:s3:::dr-datalake-outbound/data/*',
          }),
        ]),
      },
    });
  });
});

describe('DataLake Outbound Replication across regions', () => {
  const testApp = new MdaaTestApp();

  const crossRegionBucketProps: BucketDefinition = {
    bucketZone: 'cross-region-zone',
    accessPolicies: [{ name: 'test-policy', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
    replication: {
      outbound: {
        destinationBucketArn: 'arn:test-partition:s3:::dr-cross-region',
        destinationAccount: '222222222222',
        destinationRegion: 'us-west-2',
        destinationKmsKeyArn: 'arn:test-partition:kms:us-west-2:222222222222:key/dest-key',
        prefixFilters: ['data'],
      },
    },
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-cross-region-stack', {
    buckets: [crossRegionBucketProps],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Replica-key grant accepts the S3 endpoint of either end', () => {
    // Which regional endpoint S3 presents on the Encrypt call is undocumented, so pinning one
    // would fail closed and replicate nothing.
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Resource: 'arn:test-partition:kms:us-west-2:222222222222:key/dest-key',
            Condition: Match.objectLike({
              StringEquals: { 'kms:ViaService': [viaService('test-region'), viaService('us-west-2')] },
            }),
          }),
        ]),
      },
    });
  });

  test('Source-key grant stays pinned to this stack region', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Condition: Match.objectLike({ StringEquals: { 'kms:ViaService': viaService('test-region') } }),
          }),
        ]),
      },
    });
  });

  test('Replica key region and account are still validated against the destination', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: Match.objectLike({
        Rules: Match.arrayWith([
          Match.objectLike({
            Destination: Match.objectLike({
              Account: '222222222222',
              Bucket: 'arn:test-partition:s3:::dr-cross-region',
              EncryptionConfiguration: {
                ReplicaKmsKeyID: 'arn:test-partition:kms:us-west-2:222222222222:key/dest-key',
              },
            }),
          }),
        ]),
      }),
    });
  });
});

describe('DataLake Inbound Replication list scoping', () => {
  const testApp = new MdaaTestApp();
  const policy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-list-scope-stack', {
    buckets: [
      {
        bucketZone: 'scoped-zone',
        accessPolicies: [policy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: 'arn:test-partition:iam::222222222222:role/datalake-replication',
            sourceAccount: '222222222222',
            prefixFilters: ['data', 'reports'],
          },
        },
      },
      {
        bucketZone: 'unscoped-zone',
        accessPolicies: [policy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: 'arn:test-partition:iam::222222222222:role/datalake-replication',
            sourceAccount: '222222222222',
          },
        },
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Enumeration is bounded to the prefixes the sender may write', () => {
    // prefixFilters must scope listing as well as writing, or key names leak.
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InboundReplicationBucket',
            Condition: { StringLike: { 's3:prefix': ['data/*', 'reports/*'] } },
          }),
        ]),
      },
    });
  });

  test('An unscoped inbound grant carries no prefix condition', () => {
    const statements = Object.values(template.findResources('AWS::S3::BucketPolicy')).flatMap(
      p => p.Properties?.PolicyDocument?.Statement ?? [],
    );
    const unscoped = statements.filter(
      (st: { Sid?: string; Condition?: unknown }) => st.Sid == 'InboundReplicationBucket' && !st.Condition,
    );
    expect(unscoped).toHaveLength(1);
  });
});

/** The condition key the ForceKMS statement matches on, spelled out once. */
const FORCE_KMS_CONDITION_KEY = 's3:x-amz-server-side-encryption-aws-kms-key-id';

/**
 * Each bucket policy's ForceKMS condition, keyed by the name of the bucket it applies to. Keyed by
 * bucket name rather than by logical id so a per-bucket assertion does not depend on how CDK
 * mangles a construct id.
 */
function forceKmsConditionsByBucketName(template: Template): { [bucketName: string]: unknown } {
  const buckets = template.findResources('AWS::S3::Bucket');
  return Object.fromEntries(
    Object.values(template.findResources('AWS::S3::BucketPolicy')).map(policy => {
      const bucketName = buckets[policy.Properties.Bucket.Ref].Properties.BucketName;
      const statements: { Sid?: string; Condition?: unknown }[] = policy.Properties.PolicyDocument.Statement;
      return [bucketName, statements.find(statement => statement.Sid == 'ForceKMS')?.Condition];
    }),
  );
}

const TEST_BUCKET_NAME_PREFIX = 'test-org-test-env-test-domain-test-module-';

describe('DataLake Additional Bucket KMS Keys', () => {
  const testApp = new MdaaTestApp();
  const policy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };
  const moduleKeyArn = 'arn:test-partition:kms:test-region:test-account:key/module-wide-key';
  const zoneKeyArn = 'arn:test-partition:kms:test-region:test-account:key/zone-only-key';

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-additional-keys-stack', {
    buckets: [
      { bucketZone: 'inherits', accessPolicies: [policy] },
      { bucketZone: 'extends', accessPolicies: [policy], additionalKmsKeyArns: [zoneKeyArn] },
      { bucketZone: 'repeats', accessPolicies: [policy], additionalKmsKeyArns: [moduleKeyArn] },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    additionalBucketKmsKeyArns: [moduleKeyArn],
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  const conditions = forceKmsConditionsByBucketName(template);
  const kmsKeyLogicalIds = Object.keys(template.findResources('AWS::KMS::Key'));
  const ownKey = { 'Fn::GetAtt': [kmsKeyLogicalIds[0], 'Arn'] };

  // The data lake mints exactly one key, so the expectations below can name it positionally.
  test('The module creates a single KMS key', () => {
    expect(kmsKeyLogicalIds).toHaveLength(1);
  });

  test('A module-level key is trusted by every bucket, alongside the bucket own key', () => {
    Object.values(conditions).forEach(condition =>
      expect(condition).toEqual({
        'ForAllValues:StringNotLikeIfExists': {
          [FORCE_KMS_CONDITION_KEY]: expect.arrayContaining([ownKey, moduleKeyArn]),
        },
      }),
    );
  });

  test('A per-bucket key is trusted only by that bucket', () => {
    expect(conditions[`${TEST_BUCKET_NAME_PREFIX}extends`]).toEqual({
      'ForAllValues:StringNotLikeIfExists': {
        [FORCE_KMS_CONDITION_KEY]: [ownKey, moduleKeyArn, zoneKeyArn],
      },
    });
    expect(conditions[`${TEST_BUCKET_NAME_PREFIX}inherits`]).toEqual({
      'ForAllValues:StringNotLikeIfExists': {
        [FORCE_KMS_CONDITION_KEY]: [ownKey, moduleKeyArn],
      },
    });
  });

  test('A key named at both levels appears once', () => {
    expect(conditions[`${TEST_BUCKET_NAME_PREFIX}repeats`]).toEqual({
      'ForAllValues:StringNotLikeIfExists': {
        [FORCE_KMS_CONDITION_KEY]: [ownKey, moduleKeyArn],
      },
    });
  });
});

describe('DataLake Without Additional Bucket KMS Keys', () => {
  const testApp = new MdaaTestApp();

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-own-key-only-stack', {
    buckets: [
      {
        bucketZone: 'own-key-only',
        accessPolicies: [{ name: 'test-policy', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // The single-key form is a bare scalar under StringNotLikeIfExists. Setting neither property has
  // to keep rendering it, or every existing config gets a bucket-policy diff.
  test('A bucket trusting only its own key keeps the single-key condition', () => {
    const ownKey = { 'Fn::GetAtt': [Object.keys(template.findResources('AWS::KMS::Key'))[0], 'Arn'] };
    expect(Object.values(forceKmsConditionsByBucketName(template))).toEqual([
      { StringNotLikeIfExists: { [FORCE_KMS_CONDITION_KEY]: ownKey } },
    ]);
  });
});

describe('DataLake With Empty Additional Bucket KMS Key Lists', () => {
  const testApp = new MdaaTestApp();

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-empty-keys-stack', {
    buckets: [
      {
        bucketZone: 'empty-lists',
        accessPolicies: [{ name: 'test-policy', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
        additionalKmsKeyArns: [],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    additionalBucketKmsKeyArns: [],
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // MdaaBucket branches on any defined value, so an empty union has to reach it as undefined -
  // an empty array would render the multi-key operator around a single key.
  test('An empty union renders the single-key condition, not the multi-key operator', () => {
    const ownKey = { 'Fn::GetAtt': [Object.keys(template.findResources('AWS::KMS::Key'))[0], 'Arn'] };
    expect(Object.values(forceKmsConditionsByBucketName(template))).toEqual([
      { StringNotLikeIfExists: { [FORCE_KMS_CONDITION_KEY]: ownKey } },
    ]);
  });
});

describe('DataLake Outbound Replication role trust policy', () => {
  const testApp = new MdaaTestApp();

  new S3DatalakeBucketL3Construct(testApp.testStack, 'test-trust-stack', {
    buckets: [
      {
        bucketZone: 'trust',
        accessPolicies: [{ name: 'p', s3Prefix: '/data', readRoleRefs: [{ id: 'test-read-role-id' }] }],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:test-partition:s3:::dr-trust',
            destinationAccount: '222222222222',
            destinationRegion: 'test-region',
            destinationKmsKeyArn: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
          },
        },
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Only S3 can assume the replication role', () => {
    // A plausible-but-wrong principal deploys cleanly, passes cdk-nag and replicates nothing.
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test-org-test-env-test-domain-test-module-trust-replication',
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 's3.amazonaws.com' },
          }),
        ],
      },
    });
  });
});
