/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Effect, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaTableBucketPolicy, MdaaTablePolicy } from '../lib';

const BUCKET_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics';
const TABLE_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics/table/page-views';

describe('S3 Tables policy constructs compliance', () => {
  const testApp = new MdaaTestApp();

  new MdaaTableBucketPolicy(testApp.testStack, 'bucket-policy', {
    tableBucketArn: BUCKET_ARN,
    additionalStatements: [
      new PolicyStatement({
        sid: 'DenyAll',
        effect: Effect.DENY,
        principals: [new StarPrincipal()],
        actions: ['s3tables:*'],
        resources: [BUCKET_ARN],
        conditions: { StringNotLike: { 'aws:PrincipalArn': ['arn:test-partition:iam::test-account:role/reader'] } },
      }),
    ],
    naming: testApp.naming,
  });

  new MdaaTablePolicy(testApp.testStack, 'table-policy', {
    tableArn: TABLE_ARN,
    naming: testApp.naming,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('synthesizes TLS-enforced bucket and table policies', () => {
    template.resourceCountIs('AWS::S3Tables::TableBucketPolicy', 1);
    template.resourceCountIs('AWS::S3Tables::TablePolicy', 1);
  });

  test('bucket DenyNonTLS covers the bucket ARN and its contained-tables wildcard', () => {
    template.hasResourceProperties('AWS::S3Tables::TableBucketPolicy', {
      ResourcePolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'DenyNonTLS',
            Effect: 'Deny',
            Action: 's3tables:*',
            Resource: [BUCKET_ARN, `${BUCKET_ARN}/table/*`],
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      },
    });
  });

  test('table DenyNonTLS targets the single table ARN', () => {
    template.hasResourceProperties('AWS::S3Tables::TablePolicy', {
      ResourcePolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'DenyNonTLS',
            Effect: 'Deny',
            Action: 's3tables:*',
            // CDK renders a single-element resource list as a scalar string.
            Resource: TABLE_ARN,
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      },
    });
  });
});
