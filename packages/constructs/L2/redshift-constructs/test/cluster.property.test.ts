/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { ClusterSubnetGroup, NodeType } from '@aws-cdk/aws-redshift-alpha';
import { Template } from 'aws-cdk-lib/assertions';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as fc from 'fast-check';
import { MdaaRedshiftCluster, MdaaRedshiftClusterParameterGroup, MdaaRedshiftClusterProps } from '../lib';

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
];

interface RedshiftPropertyInput {
  multiAz: boolean;
  hasBackupRegion: boolean;
  backupRegion: string;
}

const redshiftPropertyArb: fc.Arbitrary<RedshiftPropertyInput> = fc.record({
  multiAz: fc.boolean(),
  hasBackupRegion: fc.boolean(),
  backupRegion: fc.constantFrom(...AWS_REGIONS),
});

function synthesizeCluster(input: RedshiftPropertyInput): Template {
  const testApp = new MdaaTestApp();
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

  const props: MdaaRedshiftClusterProps = {
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
    ...(input.multiAz ? { nodeType: NodeType.RA3_XLPLUS, numberOfNodes: 2 } : {}),
    multiAz: input.multiAz,
    backupRegion: input.hasBackupRegion ? input.backupRegion : undefined,
  };

  new MdaaRedshiftCluster(testApp.testStack, 'test-construct', props);
  return Template.fromStack(testApp.testStack);
}

describe('Redshift cluster properties match config', () => {
  it('should set MultiAZ iff multiAz is true, snapshot copy iff backupRegion is set', () => {
    fc.assert(
      fc.property(redshiftPropertyArb, input => {
        const template = synthesizeCluster(input);

        const clusters = template.findResources('AWS::Redshift::Cluster');
        const cluster = Object.values(clusters)[0];
        if (input.multiAz) {
          template.hasResourceProperties('AWS::Redshift::Cluster', {
            MultiAZ: true,
          });
        } else {
          if (cluster.Properties.MultiAZ !== undefined) {
            template.hasResourceProperties('AWS::Redshift::Cluster', {
              MultiAZ: false,
            });
          }
        }

        if (input.hasBackupRegion) {
          template.resourceCountIs('Custom::RedshiftSnapshotCopy', 1);
        } else {
          template.resourceCountIs('Custom::RedshiftSnapshotCopy', 0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
