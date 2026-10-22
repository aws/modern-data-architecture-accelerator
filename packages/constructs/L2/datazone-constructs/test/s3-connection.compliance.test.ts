/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaDatazoneS3Connection } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('MdaaDatazoneS3Connection', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new MdaaDatazoneS3Connection(stack, 'test-s3-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'dzd_testdomain',
      projectIdentifier: 'prjtest123',
      environmentIdentifier: 'envtest123',
      bucketName: 'test-bucket',
      prefix: 'raw/',
      registerS3AccessGrantLocation: true,
      s3AccessGrantLocationId: 'test-access-grant-location-id',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/env-user-role',
      kmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
  });
});
