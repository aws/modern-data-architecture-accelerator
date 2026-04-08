/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { ClusterSubnetGroup, NodeType } from '@aws-cdk/aws-redshift-alpha';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { MdaaRedshiftCluster, MdaaRedshiftClusterParameterGroup, MdaaRedshiftClusterProps } from '../lib';
import { MultiAzValidationError } from '../lib/utils';

function createTestProps(
  testApp: MdaaTestApp,
  overrides: Partial<MdaaRedshiftClusterProps> = {},
): MdaaRedshiftClusterProps {
  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'test-vpc', {
    vpcId: 'test-vpc-id',
    availabilityZones: ['test-az'],
    privateSubnetIds: ['test-subnet-id'],
  });
  const testSubnetGroup = new ClusterSubnetGroup(testApp.testStack, 'test-subnet-group', {
    vpc: testVpc,
    description: 'test-vpc-description',
    vpcSubnets: {
      subnets: [Subnet.fromSubnetId(testApp.testStack, 'test-subnet-id', 'test-subnet-id')],
    },
  });
  const testSecurityGroup = new SecurityGroup(testApp.testStack, 'test-security-group', { vpc: testVpc });
  const testParameterGroup = new MdaaRedshiftClusterParameterGroup(testApp.testStack, 'test-param-group', {
    naming: testApp.naming,
    parameters: {},
  });
  const testLoggingBucket = Bucket.fromBucketName(testApp.testStack, 'test-logging-bucket', 'test-logging-bucket');

  return {
    naming: testApp.naming,
    clusterName: 'test-cluster',
    masterUsername: 'admin',
    encryptionKey: testKey,
    port: 5440,
    vpc: testVpc,
    preferredMaintenanceWindow: 'Sun:23:45-Mon:00:15',
    subnetGroup: testSubnetGroup,
    securityGroup: testSecurityGroup,
    parameterGroup: testParameterGroup,
    loggingProperties: {
      loggingBucket: testLoggingBucket,
      loggingKeyPrefix: '/testing',
    },
    ...overrides,
  };
}

describe('Multi-AZ deployment', () => {
  test('enables MultiAZ when multiAz is true', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, { multiAz: true, nodeType: NodeType.RA3_XLPLUS, numberOfNodes: 2 });
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Redshift::Cluster', {
      MultiAZ: true,
    });
  });

  test('does not enable MultiAZ when multiAz is false', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, { multiAz: false });
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);
    const clusters = template.findResources('AWS::Redshift::Cluster');
    const cluster = Object.values(clusters)[0];
    expect(cluster.Properties.MultiAZ).not.toBe(true);
  });

  test('does not set MultiAZ when multiAz is undefined', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp);
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);
    const clusters = template.findResources('AWS::Redshift::Cluster');
    const cluster = Object.values(clusters)[0];
    expect(cluster.Properties.MultiAZ).not.toBe(true);
  });
});

describe('Cross-region snapshot copy', () => {
  test('configures snapshot copy when backupRegion is set', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      backupRegion: 'us-west-2',
    });
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('Custom::RedshiftSnapshotCopy', 1);
  });

  test('does not configure snapshot copy when backupRegion is absent', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp);
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('Custom::RedshiftSnapshotCopy', 0);
  });
});

describe('Defaults unchanged', () => {
  test('existing defaults are preserved when no new props are set', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp);
    new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Redshift::Cluster', {
      EnhancedVpcRouting: true,
      Encrypted: true,
      PubliclyAccessible: false,
    });

    // No Custom Resource for snapshot copy when not configured
    template.resourceCountIs('Custom::RedshiftSnapshotCopy', 0);

    // MultiAZ should not be true when not configured
    const clusters = template.findResources('AWS::Redshift::Cluster');
    const cluster = Object.values(clusters)[0];
    expect(cluster.Properties.MultiAZ).not.toBe(true);

    template.hasResource('AWS::Redshift::Cluster', {
      DeletionPolicy: 'Retain',
    });
  });
});

describe('CDK Nag compliance - multiAz enabled', () => {
  const testApp = new MdaaTestApp();
  const props = createTestProps(testApp, {
    multiAz: true,
    nodeType: NodeType.RA3_XLPLUS,
    numberOfNodes: 2,
    adminPasswordRotationDays: 30,
  });
  new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('CDK Nag compliance - cross-region snapshot enabled', () => {
  const testApp = new MdaaTestApp();
  const props = createTestProps(testApp, {
    backupRegion: 'us-west-2',
    adminPasswordRotationDays: 30,
  });
  new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('CDK Nag compliance - all new props enabled', () => {
  const testApp = new MdaaTestApp();
  const props = createTestProps(testApp, {
    multiAz: true,
    nodeType: NodeType.RA3_XLPLUS,
    numberOfNodes: 2,
    backupRegion: 'us-west-2',
    adminPasswordRotationDays: 30,
  });
  new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('Multi-AZ input validation', () => {
  test('throws MultiAzValidationError when multiAz is true and numberOfNodes < 2', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      multiAz: true,
      nodeType: NodeType.RA3_XLPLUS,
      numberOfNodes: 1,
    });
    expect(() => new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props)).toThrow(MultiAzValidationError);
  });

  test('throws MultiAzValidationError when multiAz is true and port is outside valid ranges', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      multiAz: true,
      nodeType: NodeType.RA3_XLPLUS,
      numberOfNodes: 2,
      port: 5430,
    });
    expect(() => new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props)).toThrow(MultiAzValidationError);
  });

  test('does not throw when multiAz is true with valid config', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      multiAz: true,
      nodeType: NodeType.RA3_XLPLUS,
      numberOfNodes: 2,
      port: 5440,
    });
    expect(() => new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props)).not.toThrow();
  });

  test('does not throw when multiAz is true with port in second valid range', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      multiAz: true,
      nodeType: NodeType.RA3_XLPLUS,
      numberOfNodes: 2,
      port: 8200,
    });
    expect(() => new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props)).not.toThrow();
  });

  test('does not validate when multiAz is false', () => {
    const testApp = new MdaaTestApp();
    const props = createTestProps(testApp, {
      multiAz: false,
      port: 5430,
    });
    expect(() => new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props)).not.toThrow();
  });
});
