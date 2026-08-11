/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaNamespace } from '../lib';

describe('MdaaNamespace compliance', () => {
  const testApp = new MdaaTestApp();

  new MdaaNamespace(testApp.testStack, 'test-namespace', {
    tableBucketArn: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
    namespaceName: 'events',
    naming: testApp.naming,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('synthesizes a compliant Namespace resource', () => {
    template.resourceCountIs('AWS::S3Tables::Namespace', 1);
  });
});
