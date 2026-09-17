/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Lazy } from 'aws-cdk-lib';
import { AccessPolicyProps, BucketDefinition, S3DatalakeBucketL3Construct } from '../lib';

describe('S3DatalakeBucketL3Construct Exception Tests', () => {
  let testApp: MdaaTestApp;

  const testAccessPolicy: AccessPolicyProps = {
    name: 'test-policy',
    s3Prefix: '/data',
    readRoleRefs: [{ id: 'test-read-role-id' }],
  };

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  function build(bucketDefinition: BucketDefinition): () => void {
    return () =>
      new S3DatalakeBucketL3Construct(testApp.testStack, 'test-stack', {
        buckets: [bucketDefinition],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
  }

  test('outbound replica key in a different region than the destination bucket throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:eu-west-1:222222222222:key/abcd-1234',
          },
        },
      }),
    ).toThrow(/replica key must be in the same region as the destination bucket/);
  });

  test('outbound replica key in the destination region does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
          },
        },
      }),
    ).not.toThrow();
  });

  test('outbound prefix filters colliding into one replication rule id throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
            prefixFilters: ['data/2024', 'data-2024'],
          },
        },
      }),
    ).toThrow(/duplicate replication rule ids \(replication-test-zone-data-2024\)/);
  });

  test('inbound sourceAccount disagreeing with the replication role ARN throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: 'arn:aws:iam::222222222222:role/datalake-replication',
            sourceAccount: '333333333333',
          },
        },
      }),
    ).toThrow(/sourceAccount is '333333333333', but sourceReplicationRoleArn belongs to account '222222222222'/);
  });

  test('inbound sourceAccount matching the replication role ARN does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: 'arn:aws:iam::222222222222:role/datalake-replication',
            sourceAccount: '222222222222',
          },
        },
      }),
    ).not.toThrow();
  });

  // S3 assumes the replication role as the source bucket owner, so a role in another account
  // would be accepted at synth and then fail once S3 tried to use it.
  test('outbound replicationRole in another account throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
            replicationRole: { arn: 'arn:aws:iam::333333333333:role/foreign-replication' },
          },
        },
      }),
    ).toThrow(/resolves to a role in account '333333333333', but this bucket is deployed to account/);
  });

  test('outbound replicationRole in this account does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
            replicationRole: { arn: 'arn:aws:iam::test-account:role/local-replication' },
          },
        },
      }),
    ).not.toThrow();
  });

  test('outbound replica key owned by an account other than the destination throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:333333333333:key/abcd-1234',
          },
        },
      }),
    ).toThrow(/key in account '333333333333', but destinationAccount is '222222222222'/);
  });

  // A config value sourced from an SSM parameter is still a token at synth, so the account and
  // region cross-checks have to skip it rather than compare against the token's placeholder text.
  test('outbound destinationAccount resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: Lazy.string({ produce: () => '222222222222' }),
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
          },
        },
      }),
    ).not.toThrow();
  });

  test('outbound destinationRegion resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: Lazy.string({ produce: () => 'us-west-2' }),
            destinationKmsKeyArn: 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
          },
        },
      }),
    ).not.toThrow();
  });

  test('inbound sourceAccount resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: 'arn:aws:iam::222222222222:role/datalake-replication',
            sourceAccount: Lazy.string({ produce: () => '222222222222' }),
          },
        },
      }),
    ).not.toThrow();
  });

  // An ARN read from an SSM parameter is a token at synth, and the account and region cannot be
  // parsed out of it. Nothing is comparable, so validation has to be skipped rather than compare
  // an unresolved value against a literal one.
  test('inbound sourceReplicationRoleArn resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          inbound: {
            sourceReplicationRoleArn: Lazy.string({
              produce: () => 'arn:aws:iam::222222222222:role/datalake-replication',
            }),
            sourceAccount: '333333333333',
          },
        },
      }),
    ).not.toThrow();
  });

  test('outbound destinationKmsKeyArn resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        replication: {
          outbound: {
            destinationBucketArn: 'arn:aws:s3:::dest-bucket',
            destinationAccount: '222222222222',
            destinationRegion: 'us-west-2',
            destinationKmsKeyArn: Lazy.string({
              produce: () => 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234',
            }),
          },
        },
      }),
    ).not.toThrow();
  });

  // The share names parameter ARNs built from naming, so RAM would reject it at deploy if the
  // parameters were never created. Surfacing it at synth is the difference between a clear error
  // and a rollback.
  test('sharing parameters while parameter creation is disabled throws', () => {
    const app = new MdaaTestApp({ '@aws-mdaa/skipCreateParams': 'true' });
    expect(
      () =>
        new S3DatalakeBucketL3Construct(app.testStack, 'skip-params-stack', {
          buckets: [{ bucketZone: 'test-zone', accessPolicies: [testAccessPolicy] }],
          naming: app.naming,
          roleHelper: new MdaaRoleHelper(app.testStack, app.naming),
          shareParametersWithAccounts: ['222222222222'],
        }),
    ).toThrow(/needs the 4 parameters it shares to exist, but 0 were created/);
  });

  // A wildcard matches every key ARN under StringNotLikeIfExists, so it would deploy a bucket whose
  // encryption enforcement is off while still looking configured.
  test('a wildcard in a per-bucket additional KMS key ARN throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        additionalKmsKeyArns: ['arn:aws:kms:us-west-2:222222222222:key/*'],
      }),
    ).toThrow(/contains a wildcard.*would permit every key and disable encryption enforcement/s);
  });

  test('a single-character wildcard in an additional KMS key ARN throws', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        additionalKmsKeyArns: ['arn:aws:kms:us-west-2:222222222222:key/abcd-123?'],
      }),
    ).toThrow(/contains a wildcard/);
  });

  test('a wildcard in a module-level additional KMS key ARN throws', () => {
    expect(
      () =>
        new S3DatalakeBucketL3Construct(testApp.testStack, 'module-wildcard-stack', {
          buckets: [{ bucketZone: 'test-zone', accessPolicies: [testAccessPolicy] }],
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          additionalBucketKmsKeyArns: ['arn:aws:kms:*:*:key/*'],
        }),
    ).toThrow(/contains a wildcard/);
  });

  test('a full additional KMS key ARN does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        additionalKmsKeyArns: ['arn:aws:kms:us-west-2:222222222222:key/abcd-1234'],
      }),
    ).not.toThrow();
  });

  // An SSM-sourced ARN is still a token at synth, so it cannot be inspected and must be allowed
  // through - the sample config uses exactly this form.
  test('an additional KMS key ARN resolved at deploy time does not throw', () => {
    expect(
      build({
        bucketZone: 'test-zone',
        accessPolicies: [testAccessPolicy],
        additionalKmsKeyArns: [Lazy.string({ produce: () => 'arn:aws:kms:us-west-2:222222222222:key/abcd-1234' })],
      }),
    ).not.toThrow();
  });
});
