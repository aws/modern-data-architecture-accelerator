/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { DomainConfig } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('DomainConfig', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new DomainConfig(stack, 'test-domain-config', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainVersion: '1.0.0',
      domainId: 'dzd_test123',
      domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
      domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
      glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
      domainKmsUsagePolicyName: 'test-kms-policy',
      domainBucketUsagePolicyName: 'test-bucket-policy',
      glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
      ssmParamBase: '/test-param',
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
  });
});
