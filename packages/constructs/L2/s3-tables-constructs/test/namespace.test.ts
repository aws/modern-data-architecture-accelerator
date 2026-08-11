/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaNamespace } from '../lib';

describe('MdaaNamespace', () => {
  const testApp = new MdaaTestApp();

  new MdaaNamespace(testApp.testStack, 'test-namespace', {
    tableBucketArn: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
    namespaceName: 'events',
    naming: testApp.naming,
  });

  const template = Template.fromStack(testApp.testStack);

  test('creates a Namespace resource', () => {
    template.resourceCountIs('AWS::S3Tables::Namespace', 1);
  });

  test('associates the namespace with the parent table bucket ARN', () => {
    template.hasResourceProperties('AWS::S3Tables::Namespace', {
      TableBucketARN: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
      Namespace: 'events',
    });
  });

  test('sets removal policy to RETAIN for consistency with the bucket data-protection posture', () => {
    const resources = template.findResources('AWS::S3Tables::Namespace');
    const logicalId = Object.keys(resources)[0];
    expect(resources[logicalId].DeletionPolicy).toBe('Retain');
  });

  test('exposes the namespace name as a public property', () => {
    const app2 = new MdaaTestApp();
    const namespace = new MdaaNamespace(app2.testStack, 'test-namespace-2', {
      tableBucketArn: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
      namespaceName: 'metrics',
      naming: app2.naming,
    });
    expect(namespace.namespaceName).toBe('metrics');
  });

  test('creates separate resources for multiple namespaces', () => {
    const app3 = new MdaaTestApp();
    new MdaaNamespace(app3.testStack, 'ns-a', {
      tableBucketArn: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
      namespaceName: 'ns-a',
      naming: app3.naming,
    });
    new MdaaNamespace(app3.testStack, 'ns-b', {
      tableBucketArn: 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics',
      namespaceName: 'ns-b',
      naming: app3.naming,
    });
    const template3 = Template.fromStack(app3.testStack);
    template3.resourceCountIs('AWS::S3Tables::Namespace', 2);
  });
});
