/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaReplicationInstance, MdaaReplicationInstanceProps } from '../lib';
import { CfnReplicationSubnetGroup } from 'aws-cdk-lib/aws-dms';
import { Key } from 'aws-cdk-lib/aws-kms';

describe('Replication Instance Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const subnetGroup = new CfnReplicationSubnetGroup(testApp.testStack, 'test-subnet-group', {
    replicationSubnetGroupIdentifier: 'testing',
    replicationSubnetGroupDescription: 'testing',
    subnetIds: ['test-subnet1'],
  });
  const testKey = Key.fromKeyArn(
    testApp.testStack,
    'testKey',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const replicationInstanceProps: MdaaReplicationInstanceProps = {
    kmsKey: testKey,
    replicationInstanceClass: 'dms.t3.micro',
    naming: testApp.naming,
    replicationSubnetGroupIdentifier: subnetGroup.attrId,
  };

  new MdaaReplicationInstance(testApp.testStack, 'test-rep-isntance', replicationInstanceProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  test('Replication Instance ID', () => {
    template.hasResourceProperties('AWS::DMS::ReplicationInstance', {
      ReplicationInstanceIdentifier: 'test-org-test-env-test-domain-test-module',
    });
  });

  test('Kms Key Id', () => {
    template.hasResourceProperties('AWS::DMS::ReplicationInstance', {
      KmsKeyId: 'test-key',
    });
  });

  test('Non-Publicly Accessible', () => {
    template.hasResourceProperties('AWS::DMS::ReplicationInstance', {
      PubliclyAccessible: false,
    });
  });
});
describe('Replication Instance Long Name Tests', () => {
  const testApp = new MdaaTestApp({
    org: 'caef-testing-us-east-1--123456789012',
  });

  const subnetGroup = new CfnReplicationSubnetGroup(testApp.testStack, 'test-subnet-group', {
    replicationSubnetGroupIdentifier: 'testing',
    replicationSubnetGroupDescription: 'testing',
    subnetIds: ['test-subnet1'],
  });
  const testKey = Key.fromKeyArn(
    testApp.testStack,
    'testKey',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const replicationInstanceProps: MdaaReplicationInstanceProps = {
    kmsKey: testKey,
    replicationInstanceClass: 'dms.t3.micro',
    naming: testApp.naming,
    replicationSubnetGroupIdentifier: subnetGroup.attrId,
  };

  new MdaaReplicationInstance(testApp.testStack, 'test-rep-isntance', replicationInstanceProps);

  const template = Template.fromStack(testApp.testStack);

  test('Replication Instance ID', () => {
    template.hasResourceProperties('AWS::DMS::ReplicationInstance', {
      ReplicationInstanceIdentifier: 'caef-testing-us-east-1-123456789012-test-env-test-do-6c3ea4b6',
    });
  });
});
