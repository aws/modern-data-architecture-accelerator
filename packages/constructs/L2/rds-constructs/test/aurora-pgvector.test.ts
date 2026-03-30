/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Annotations, Match } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaAuroraPgVector } from '../lib';

function buildStack(overrides: { engineVersion?: string; numberOfReaderInstances?: number } = {}) {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testKey = MdaaKmsKey.fromKeyArn(
    stack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const testVpc = Vpc.fromVpcAttributes(stack, 'test-vpc', {
    vpcId: 'test-vpc-id',
    availabilityZones: ['test-az'],
    privateSubnetIds: ['test-subnet-id'],
  });
  const testSubnet = Subnet.fromSubnetId(stack, 'test-subnet', 'test-subnet-id');
  const testSg = new SecurityGroup(stack, 'test-sg', { vpc: testVpc });

  new MdaaAuroraPgVector(stack, 'test-pgvector', {
    naming: testApp.naming,
    vpc: testVpc,
    subnets: { subnets: [testSubnet] },
    region: 'test-region',
    partition: 'test-partition',
    dbSecurityGroup: testSg,
    encryptionKey: testKey,
    clusterIdentifier: 'test-pgvector',
    ...overrides,
  });

  return Template.fromStack(stack);
}

describe('MdaaAuroraPgVector engine version', () => {
  test('defaults to 16.6 when not specified', () => {
    const template = buildStack();
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EngineVersion: '16.6',
    });
  });

  test('uses specified engine version', () => {
    const template = buildStack({ engineVersion: '15.4' });
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EngineVersion: '15.4',
    });
  });

  test('throws on invalid engine version format', () => {
    expect(() => buildStack({ engineVersion: 'banana' })).toThrow(
      "Invalid engineVersion format: 'banana'. Expected format: 'major.minor' (e.g., '16.6')",
    );
  });

  // eslint-disable-next-line jest/expect-expect
  test('warns when engine version is not recognized by CDK', () => {
    const app = new MdaaTestApp();
    const stack = app.testStack;
    const testKey = MdaaKmsKey.fromKeyArn(
      stack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    const testVpc = Vpc.fromVpcAttributes(stack, 'test-vpc', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['test-az'],
      privateSubnetIds: ['test-subnet-id'],
    });
    const testSubnet = Subnet.fromSubnetId(stack, 'test-subnet', 'test-subnet-id');
    const testSg = new SecurityGroup(stack, 'test-sg', { vpc: testVpc });
    new MdaaAuroraPgVector(stack, 'test-pgvector', {
      naming: app.naming,
      vpc: testVpc,
      subnets: { subnets: [testSubnet] },
      region: 'test-region',
      partition: 'test-partition',
      dbSecurityGroup: testSg,
      encryptionKey: testKey,
      clusterIdentifier: 'test-pgvector',
      engineVersion: '99.9',
    });
    Annotations.fromStack(stack).hasWarning('*', Match.stringLikeRegexp('not recognized by CDK'));
  });

  test('does not warn for a known CDK engine version', () => {
    const app = new MdaaTestApp();
    const stack = app.testStack;
    const testKey = MdaaKmsKey.fromKeyArn(
      stack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    const testVpc = Vpc.fromVpcAttributes(stack, 'test-vpc', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['test-az'],
      privateSubnetIds: ['test-subnet-id'],
    });
    const testSubnet = Subnet.fromSubnetId(stack, 'test-subnet', 'test-subnet-id');
    const testSg = new SecurityGroup(stack, 'test-sg', { vpc: testVpc });
    new MdaaAuroraPgVector(stack, 'test-pgvector', {
      naming: app.naming,
      vpc: testVpc,
      subnets: { subnets: [testSubnet] },
      region: 'test-region',
      partition: 'test-partition',
      dbSecurityGroup: testSg,
      encryptionKey: testKey,
      clusterIdentifier: 'test-pgvector',
      engineVersion: '15.4',
    });
    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('not recognized by CDK'));
    expect(warnings.length).toBe(0);
  });
});

describe('MdaaAuroraPgVector reader instances', () => {
  test('creates 1 reader by default (writer + 1 reader = 2 instances)', () => {
    const template = buildStack();
    const instances = template.findResources('AWS::RDS::DBInstance');
    const serverless = Object.values(instances).filter(
      (i: Record<string, Record<string, string>>) => i.Properties?.DBInstanceClass === 'db.serverless',
    );
    expect(serverless.length).toBe(2);
  });

  test('creates 3 readers when numberOfReaderInstances is 3 (writer + 3 = 4 instances)', () => {
    const template = buildStack({ numberOfReaderInstances: 3 });
    const instances = template.findResources('AWS::RDS::DBInstance');
    const serverless = Object.values(instances).filter(
      (i: Record<string, Record<string, string>>) => i.Properties?.DBInstanceClass === 'db.serverless',
    );
    expect(serverless.length).toBe(4);
  });
});
