/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match } from 'aws-cdk-lib/assertions';
import { createGaiaTemplate } from './test-helpers';

describe('AdminUi Infrastructure Tests', () => {
  test('creates admin UI CloudFront distribution with HTTPS enforced, OAC, and KMS-encrypted logging', () => {
    const template = createGaiaTemplate({
      adminUi: {
        domainName: 'admin.example.com',
        acmCertArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test',
      },
    });
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
        }),
        Origins: Match.arrayWith([
          Match.objectLike({
            OriginAccessControlId: Match.anyValue(),
          }),
        ]),
        Logging: Match.objectLike({
          Bucket: Match.anyValue(),
        }),
        ViewerCertificate: Match.objectLike({
          MinimumProtocolVersion: 'TLSv1.2_2021',
        }),
      }),
    });
    template.hasResource('AWS::CloudFront::OriginAccessControl', {});
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'aws:kms',
            }),
          }),
        ]),
      }),
    });
  });
});
