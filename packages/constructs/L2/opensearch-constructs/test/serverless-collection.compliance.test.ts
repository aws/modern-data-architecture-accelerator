/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { CfnVpcEndpoint } from 'aws-cdk-lib/aws-opensearchserverless';
import { MdaaOpensearchServerlessCollection, MdaaOpensearchServerlessCollectionProps } from '../lib';

describe('MDAA Serverless Collection Compliance Tests', () => {
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

  // Create a VPC endpoint (simulating what would be created at a higher level)
  const testVpcEndpoint = new CfnVpcEndpoint(testApp.testStack, 'test-vpc-endpoint', {
    name: 'test-vpce',
    vpcId: 'test-vpc-id',
    subnetIds: ['subnet-123', 'subnet-456'],
    securityGroupIds: ['sg-123', 'sg-456'],
  });

  const testConstructProps: MdaaOpensearchServerlessCollectionProps = {
    naming: testApp.naming,
    name: 'test-collection',
    standByReplicas: 'ENABLE',
    collectionType: 'SEARCH',
    encryptionKey: testKey,
    network: {
      vpc: testVpc,
      subnetIds: ['subnet-123', 'subnet-456'],
      securityGroupIds: ['sg-123', 'sg-456'],
      vpcEndpointId: testVpcEndpoint.attrId,
    },
    sourceServices: ['s3.amazonaws.com'],
    readOnlyArns: ['arn:test-partition:iam:test-region:test-account:role/read-only-role'],
    readWriteArns: ['arn:test-partition:iam:test-region:test-account:role/read-write-role'],
  };

  new MdaaOpensearchServerlessCollection(testApp.testStack, 'test-construct', testConstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);

  const template = Template.fromStack(testApp.testStack);

  test('Collection Name', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
      Name: testApp.naming.resourceName(testConstructProps.name, 32),
      Type: 'SEARCH',
    });
  });

  test('VPC Endpoint Created Externally', () => {
    // VPC endpoint should be created externally (by the test setup)
    template.hasResourceProperties('AWS::OpenSearchServerless::VpcEndpoint', {
      Name: 'test-vpce',
      VpcId: 'test-vpc-id',
      SubnetIds: ['subnet-123', 'subnet-456'],
      SecurityGroupIds: ['sg-123', 'sg-456'],
    });
  });

  test('Encryption Policy with KMS', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
      Name: testApp.naming.resourceName(`${testConstructProps.name}-encryption-policy`, 32),
      Type: 'encryption',
      Description: 'Encryption policy for OpenSearch Serverless collection',
    });
  });

  test('Network Policy Configuration', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
      Name: testApp.naming.resourceName(`${testConstructProps.name}-network-policy`, 32),
      Type: 'network',
      Description: 'Network policy for OpenSearch Serverless collection',
    });
  });

  test('Data Access Policy Created', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::AccessPolicy', {
      Name: testApp.naming.resourceName(`${testConstructProps.name}-data-access-policy`, 32),
      Type: 'data',
      Description: 'Data access policy for OpenSearch Serverless collection',
    });
  });

  test('Collection Dependencies', () => {
    template.hasResource('AWS::OpenSearchServerless::Collection', {
      DependsOn: [
        'testconstructopensearchserverlessdataaccesspolicy781B5625',
        'testconstructopensearchserverlessencryptionpolicyCD2FED50',
        'testconstructopensearchserverlessnetworkpolicyE25CC7A0',
      ],
    });
  });
});
