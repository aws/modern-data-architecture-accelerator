/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaEC2Instance, MdaaEC2InstanceProps, BlockDeviceProps } from '../lib/instance';
import { ResourceTypeAwareNaming } from './resource-type-aware-naming';
import {
  Vpc,
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  Subnet,
  EbsDeviceVolumeType,
} from 'aws-cdk-lib/aws-ec2';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testRole = MdaaRole.fromRoleArn(
    testApp.testStack,
    'test-role',
    'arn:test-partition:iam:test-region:test-account:role/test-role',
  );
  const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'VPC', {
    vpcId: 'test-vpc-id',
    availabilityZones: ['az1', 'az2'],
    privateSubnetIds: ['subnet1', 'subnet2'],
  });
  const testInstanceType = InstanceType.of(InstanceClass.M5, InstanceSize.LARGE);
  const testSubnet = Subnet.fromSubnetAttributes(testApp.testStack, 'Subnet for instance', {
    subnetId: 'test-sub-id',
    availabilityZone: 'az1',
  });
  const testKmsKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'key for root volume',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testBlockDeviceProps: BlockDeviceProps = {
    deviceName: '/dev/sda1',
    volumeSizeInGb: 32,
    ebsType: EbsDeviceVolumeType.GP3,
  };

  const testBlockDevicesProps: BlockDeviceProps[] = [testBlockDeviceProps];

  const testContstructProps: MdaaEC2InstanceProps = {
    naming: testApp.naming,
    instanceType: testInstanceType,
    machineImage: MachineImage.latestAmazonLinux2023(),
    vpc: testVpc,
    instanceSubnet: testSubnet,
    kmsKey: testKmsKey,
    blockDeviceProps: testBlockDevicesProps,
    role: testRole,
  };

  new MdaaEC2Instance(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('PropagateTagsToVolumeOnCreation', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      PropagateTagsToVolumeOnCreation: true,
    });
  });
  test('SubnetId', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      SubnetId: 'test-sub-id',
    });
  });
  test('Monitoring', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      Monitoring: true,
    });
  });
  test('DisableApiTermination', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      DisableApiTermination: true,
    });
  });
  test('BlockDeviceMappings', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            DeleteOnTermination: false,
            Encrypted: true,
            KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
            VolumeSize: 32,
            VolumeType: 'gp3',
          },
        },
      ],
    });
  });
  test('UpdateReplacePolicy', () => {
    template.hasResource('AWS::EC2::Instance', {
      UpdateReplacePolicy: 'Retain',
    });
  });
  test('DeletionPolicy', () => {
    template.hasResource('AWS::EC2::Instance', {
      DeletionPolicy: 'Retain',
    });
  });

  test('LaunchTemplateName uses EC2_INSTANCE resource type', () => {
    const expectedName = testApp.naming.withResourceType(MdaaResourceType.EC2_INSTANCE).resourceName(undefined);
    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateName: expectedName,
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      LaunchTemplate: Match.objectLike({ LaunchTemplateName: expectedName }),
    });
  });
});

describe('MDAA Construct Resource Type Naming Tests', () => {
  const testApp = new MdaaTestApp();
  const naming = new ResourceTypeAwareNaming({
    cdkNode: testApp.testStack.node,
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    moduleName: 'test-module',
  });

  new MdaaEC2Instance(testApp.testStack, 'typed-construct', {
    naming: naming,
    instanceType: InstanceType.of(InstanceClass.M5, InstanceSize.LARGE),
    machineImage: MachineImage.latestAmazonLinux2023(),
    vpc: Vpc.fromVpcAttributes(testApp.testStack, 'typed-vpc', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['az1'],
      privateSubnetIds: ['subnet1'],
    }),
    instanceSubnet: Subnet.fromSubnetAttributes(testApp.testStack, 'typed-subnet', {
      subnetId: 'test-sub-id',
      availabilityZone: 'az1',
    }),
    kmsKey: MdaaKmsKey.fromKeyArn(
      testApp.testStack,
      'typed-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    ),
    blockDeviceProps: [{ deviceName: '/dev/sda1', volumeSizeInGb: 32, ebsType: EbsDeviceVolumeType.GP3 }],
    role: MdaaRole.fromRoleArn(
      testApp.testStack,
      'typed-role',
      'arn:test-partition:iam:test-region:test-account:role/test-role',
    ),
  });

  const template = Template.fromStack(testApp.testStack);

  test('LaunchTemplateName uses EC2_INSTANCE resource type under resource-type-aware naming', () => {
    const expectedName = naming.withResourceType(MdaaResourceType.EC2_INSTANCE).resourceName(undefined);
    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateName: expectedName,
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      LaunchTemplate: Match.objectLike({ LaunchTemplateName: expectedName }),
    });
  });
});
