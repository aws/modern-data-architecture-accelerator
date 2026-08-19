/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Arn } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaBucket, MdaaBucketProps } from '../lib';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';

describe('MDAA Construct Mandatory Prop Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testContstructProps: MdaaBucketProps = {
    naming: testApp.naming,
    bucketName: 'test-bucket',
    encryptionKey: testKey,
  };

  new MdaaBucket(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('BucketName', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: testApp.naming.resourceName('test-bucket'),
    });
  });

  test('DefaultEncryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            BucketKeyEnabled: true,
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
              KMSMasterKeyID: testKey.keyArn,
            },
          },
        ],
      },
    });
  });

  test('PublicAccessBlockConfiguration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('Versioning', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('EnforceHttps', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:*',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });

  test('BlockAES256', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Condition: {
              StringEquals: {
                's3:x-amz-server-side-encryption': 'AES256',
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });

  test('EnforceExclusiveKms', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Condition: {
              StringNotLikeIfExists: {
                's3:x-amz-server-side-encryption-aws-kms-key-id': testKey.keyArn,
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });

  test('UpdateReplacePolicy', () => {
    template.hasResource('AWS::S3::Bucket', {
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('Bucket DeletionPolicy', () => {
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
    });
  });

  test('BucketPolicy DeletionPolicy', () => {
    template.hasResource('AWS::S3::BucketPolicy', {
      DeletionPolicy: 'Retain',
    });
  });
});

describe('MDAA Construct Optional Prop Compliance Tests', () => {
  const testApp = new MdaaTestApp({
    '@aws-mdaa/enableUniqueBucketNames': 'true',
  });

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const additionalKmsKeyArn = Arn.format(
    {
      service: 'kms',
      resource: 'test-key-id',
    },
    testApp.testStack,
  );

  const testContstructProps: MdaaBucketProps = {
    naming: testApp.naming,
    bucketName: 'test-bucket',
    encryptionKey: testKey,
    additionalKmsKeyArns: [additionalKmsKeyArn],
  };

  new MdaaBucket(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template, undefined, 2 ) )
  test('BucketName', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: {
        'Fn::Join': [
          '',
          [
            {
              'Fn::Select': [
                0,
                {
                  'Fn::Split': [
                    '-',
                    {
                      'Fn::Select': [
                        2,
                        {
                          'Fn::Split': [
                            '/',
                            {
                              Ref: 'AWS::StackId',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            '-test-org-test-env-test-domain-test--3cab3e5a',
          ],
        ],
      },
    });
  });

  test('DefaultEncryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            BucketKeyEnabled: true,
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
              KMSMasterKeyID: testKey.keyArn,
            },
          },
        ],
      },
    });
  });

  test('PublicAccessBlockConfiguration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('Versioning', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('EnforceHttps', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:*',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });

  test('BlockAES256', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Condition: {
              StringEquals: {
                's3:x-amz-server-side-encryption': 'AES256',
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });

  test('EnforceExclusiveKms', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Condition: {
              'ForAllValues:StringNotLikeIfExists': {
                's3:x-amz-server-side-encryption-aws-kms-key-id': [
                  'arn:test-partition:kms:test-region:test-account:key/test-key',
                  'arn:test-partition:kms:test-region:test-account:test-key-id',
                ],
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });
});

describe('Public Methods', () => {
  test('formatS3Prefix defaults', () => {
    expect(MdaaBucket.formatS3Prefix(undefined)).toBe(undefined);
    expect(MdaaBucket.formatS3Prefix('/test/')).toBe('test');
    expect(MdaaBucket.formatS3Prefix('test/')).toBe('test');
    expect(MdaaBucket.formatS3Prefix('test')).toBe('test');
  });
  test('formatS3Prefix optional params', () => {
    expect(MdaaBucket.formatS3Prefix('test', true, true)).toBe('/test/');
    expect(MdaaBucket.formatS3Prefix('test/', true, true)).toBe('/test/');
    expect(MdaaBucket.formatS3Prefix('/test', true, true)).toBe('/test/');
  });
});

describe('CORS Configuration', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'cors-test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  test('Bucket with CORS rules synthesizes CorsConfiguration', () => {
    const corsApp = new MdaaTestApp();
    const corsKey = MdaaKmsKey.fromKeyArn(
      corsApp.testStack,
      'cors-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );

    new MdaaBucket(corsApp.testStack, 'cors-bucket', {
      naming: corsApp.naming,
      bucketName: 'cors-test',
      encryptionKey: corsKey,
      corsRules: [
        {
          id: 'test-rule',
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
          allowedOrigins: ['https://example.com'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
    });

    const template = Template.fromStack(corsApp.testStack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            Id: 'test-rule',
            AllowedMethods: ['GET', 'PUT'],
            AllowedOrigins: ['https://example.com'],
            AllowedHeaders: ['*'],
            ExposedHeaders: ['ETag'],
            MaxAge: 3600,
          },
        ],
      },
    });
  });

  test('Bucket without CORS rules has no CorsConfiguration', () => {
    new MdaaBucket(testApp.testStack, 'no-cors-bucket', {
      naming: testApp.naming,
      bucketName: 'no-cors-test',
      encryptionKey: testKey,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.anyValue(),
      CorsConfiguration: Match.absent(),
    });
  });
});

describe('publicAccessBlockManagedExternally', () => {
  const testApp = new MdaaTestApp({
    '@aws-mdaa/publicAccessBlockManagedExternally': 'true',
  });
  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'pab-test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  new MdaaBucket(testApp.testStack, 'pab-bucket', {
    naming: testApp.naming,
    bucketName: 'pab-test',
    encryptionKey: testKey,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('When enabled via context, PublicAccessBlockConfiguration is absent', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: testApp.naming.resourceName('pab-test'),
      PublicAccessBlockConfiguration: Match.absent(),
    });
  });

  describe('When enabled via prop', () => {
    const propApp = new MdaaTestApp();
    const propKey = MdaaKmsKey.fromKeyArn(
      propApp.testStack,
      'pab-prop-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );

    new MdaaBucket(propApp.testStack, 'pab-prop-bucket', {
      naming: propApp.naming,
      bucketName: 'pab-prop-test',
      encryptionKey: propKey,
      publicAccessBlockManagedExternally: true,
    });

    propApp.checkCdkNagCompliance(propApp.testStack);
    const propTemplate = Template.fromStack(propApp.testStack);

    test('PublicAccessBlockConfiguration is absent', () => {
      propTemplate.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: Match.absent(),
      });
    });
  });

  test('When disabled (default), PublicAccessBlockConfiguration is present', () => {
    const defaultApp = new MdaaTestApp();
    const defaultKey = MdaaKmsKey.fromKeyArn(
      defaultApp.testStack,
      'pab-default-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );

    new MdaaBucket(defaultApp.testStack, 'pab-default-bucket', {
      naming: defaultApp.naming,
      bucketName: 'pab-default-test',
      encryptionKey: defaultKey,
    });

    const defaultTemplate = Template.fromStack(defaultApp.testStack);
    defaultTemplate.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });
});

describe('Replication', () => {
  function buildTemplate(withReplication: boolean): Template {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(
      app.testStack,
      'repl-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    const replication = withReplication
      ? {
          replicationRole: new Role(app.testStack, 'repl-role', {
            assumedBy: new ServicePrincipal('s3.amazonaws.com'),
          }),
          replicationRules: [
            {
              destination: Bucket.fromBucketAttributes(app.testStack, 'repl-dest', {
                bucketArn: 'arn:test-partition:s3:::dest-bucket',
                account: '222222222222',
              }),
              id: 'test-rule',
              priority: 1,
              kmsKey: MdaaKmsKey.fromKeyArn(
                app.testStack,
                'repl-dest-key',
                'arn:test-partition:kms:test-region:222222222222:key/dest-key',
              ),
              sseKmsEncryptedObjects: true,
            },
          ],
        }
      : {};

    new MdaaBucket(app.testStack, 'repl-bucket', {
      naming: app.naming,
      bucketName: 'repl-test',
      encryptionKey: key,
      ...replication,
    });
    // Withholding the S3BucketReplicationEnabled suppressions is only safe if the rules then
    // pass on their own, so both paths are evaluated against the rulesets. checkCdkNagCompliance
    // declares its own describe/test, so it has to run at describe scope, not inside a test.
    app.checkCdkNagCompliance(app.testStack);
    return Template.fromStack(app.testStack);
  }

  const replicatingTemplate = buildTemplate(true);
  const nonReplicatingTemplate = buildTemplate(false);

  function replicationSuppressions(template: Template): string[] {
    return Object.values(template.findResources('AWS::S3::Bucket'))
      .flatMap(bucket => bucket.Metadata?.cdk_nag?.rules_to_suppress ?? [])
      .map((suppression: { id: string }) => suppression.id)
      .filter(id => id.endsWith('S3BucketReplicationEnabled'));
  }

  function buildWithRule(rule: Record<string, unknown>): () => void {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(
      app.testStack,
      'guard-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    return () =>
      new MdaaBucket(app.testStack, 'guard-bucket', {
        naming: app.naming,
        bucketName: 'guard-test',
        encryptionKey: key,
        replicationRole: new Role(app.testStack, 'guard-role', {
          assumedBy: new ServicePrincipal('s3.amazonaws.com'),
        }),
        replicationRules: [
          {
            destination: Bucket.fromBucketAttributes(app.testStack, 'guard-dest', {
              bucketArn: 'arn:test-partition:s3:::dest-bucket',
              account: '222222222222',
            }),
            id: 'guard-rule',
            priority: 1,
            ...rule,
          } as never,
        ],
      });
  }

  test('Replication rules and role flow through to the bucket', () => {
    replicatingTemplate.hasResourceProperties('AWS::S3::Bucket', {
      ReplicationConfiguration: {
        Role: { 'Fn::GetAtt': [Match.stringLikeRegexp('replrole'), 'Arn'] },
        Rules: [
          Match.objectLike({
            Id: 'test-rule',
            Priority: 1,
            SourceSelectionCriteria: { SseKmsEncryptedObjects: { Status: 'Enabled' } },
            Destination: Match.objectLike({
              EncryptionConfiguration: {
                ReplicaKmsKeyID: 'arn:test-partition:kms:test-region:222222222222:key/dest-key',
              },
            }),
          }),
        ],
      },
    });
  });

  test('S3BucketReplicationEnabled suppressions withheld when replicating', () => {
    expect(replicationSuppressions(replicatingTemplate)).toHaveLength(0);
  });

  test('S3BucketReplicationEnabled suppressions applied when not replicating', () => {
    expect(replicationSuppressions(nonReplicatingTemplate)).toEqual([
      'NIST.800.53.R5-S3BucketReplicationEnabled',
      'HIPAA.Security-S3BucketReplicationEnabled',
      'PCI.DSS.321-S3BucketReplicationEnabled',
    ]);
  });

  test('Replication rule without sseKmsEncryptedObjects is rejected', () => {
    expect(
      buildWithRule({
        kmsKey: MdaaKmsKey.fromKeyArn(
          new MdaaTestApp().testStack,
          'unused-key',
          'arn:test-partition:kms:test-region:222222222222:key/dest-key',
        ),
      }),
    ).toThrow(/is missing sseKmsEncryptedObjects/);
  });

  test('Replication rule without a replica key is rejected', () => {
    expect(buildWithRule({ sseKmsEncryptedObjects: true })).toThrow(/is missing kmsKey/);
  });

  test('Replication rules without a replication role are rejected', () => {
    // CDK would create its own role, which misses the bucket-policy exclusion replication needs.
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(
      app.testStack,
      'norole-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    expect(
      () =>
        new MdaaBucket(app.testStack, 'norole-bucket', {
          naming: app.naming,
          bucketName: 'norole-test',
          encryptionKey: key,
          replicationRules: [
            {
              destination: Bucket.fromBucketAttributes(app.testStack, 'norole-dest', {
                bucketArn: 'arn:test-partition:s3:::dest-bucket',
                account: '222222222222',
              }),
              id: 'norole-rule',
              priority: 1,
              kmsKey: key,
              sseKmsEncryptedObjects: true,
            },
          ],
        }),
    ).toThrow(/replicationRules requires replicationRole/);
  });

  test('Replication rule missing both encryption settings names both', () => {
    expect(buildWithRule({})).toThrow(/is missing sseKmsEncryptedObjects and kmsKey/);
  });
});

describe('Parameter tier', () => {
  // tier only takes effect where the construct publishes parameters, so createParams must be on.
  function templateFor(tier?: ParameterTier): Template {
    const app = new MdaaTestApp();
    const key = MdaaKmsKey.fromKeyArn(
      app.testStack,
      'tier-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaBucket(app.testStack, 'tier-bucket', {
      naming: app.naming,
      bucketName: 'tier-test',
      encryptionKey: key,
      createParams: true,
      createOutputs: false,
      tier: tier,
    });
    // checkCdkNagCompliance declares its own describe/test, so it runs at describe scope.
    app.checkCdkNagCompliance(app.testStack);
    return Template.fromStack(app.testStack);
  }

  const advancedTemplate = templateFor(ParameterTier.ADVANCED);
  const defaultTemplate = templateFor();

  test('tier is threaded through to the published name and arn parameters', () => {
    const params = Object.values(advancedTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toEqual('Advanced'));
  });

  test('no Tier emitted when unset, leaving SSM to apply Standard', () => {
    const params = Object.values(defaultTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toBeUndefined());
  });
});
