/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockDeviceProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
  Ec2L3Construct,
  Ec2L3ConstructProps,
  InstanceProps,
  NamedNetworkInterfaceProps,
  NetworkInterfaceAttachmentProps,
} from '../lib/ec2-l3-construct';

// Misconfiguration of a network interface attachment must fail at synth with a message naming
// the offending instance, rather than reaching CloudFormation and failing mid-deploy.
describe('Ec2L3Construct Network Interface Exception Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  const blockDevices: BlockDeviceProps[] = [
    { deviceName: '/dev/xvda', volumeSizeInGb: 32, ebsType: EbsDeviceVolumeType.GP3 },
  ];

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  function instance(attachments: NetworkInterfaceAttachmentProps[]): InstanceProps {
    return {
      securityGroupId: 'sg-testing',
      instanceType: 't3.medium',
      amiId: 'ami-proxy',
      vpcId: 'test-vpc-id',
      subnetId: 'test-sub-id',
      blockDevices: blockDevices,
      instanceRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
      availabilityZone: 'test-region-a',
      osType: 'linux',
      networkInterfaces: attachments,
    };
  }

  function build(props: Partial<Ec2L3ConstructProps>): () => void {
    return () =>
      new Ec2L3Construct(testApp.testStack, 'instances', {
        adminRoles: [{ id: 'admin-role-id' }],
        naming: testApp.naming,
        roleHelper,
        ...props,
      });
  }

  function buildWithEni(
    attachments: NetworkInterfaceAttachmentProps[],
    networkInterfaces: NamedNetworkInterfaceProps = {
      'proxy-eni': { subnetId: 'subnet-eni', securityGroupIds: ['sg-eni'] },
    },
  ): () => void {
    return build({
      networkInterfaces: networkInterfaces,
      instances: { 'proxy-1': instance(attachments) },
    });
  }

  test('deviceIndex 0 throws, because the primary interface cannot be customized', () => {
    expect(buildWithEni([{ networkInterface: 'proxy-eni', deviceIndex: 0 }])).toThrow(
      /Instance proxy-1 networkInterfaces deviceIndex must be an integer >= 1, got 0/,
    );
  });

  test('negative deviceIndex throws', () => {
    expect(buildWithEni([{ networkInterface: 'proxy-eni', deviceIndex: -1 }])).toThrow(
      /deviceIndex must be an integer >= 1, got -1/,
    );
  });

  test('non-integer deviceIndex throws', () => {
    expect(buildWithEni([{ networkInterface: 'proxy-eni', deviceIndex: 1.5 }])).toThrow(
      /deviceIndex must be an integer >= 1, got 1.5/,
    );
  });

  test('duplicate deviceIndex on one instance throws', () => {
    expect(
      buildWithEni(
        [
          { networkInterface: 'proxy-eni', deviceIndex: 1 },
          { networkInterface: 'other-eni', deviceIndex: 1 },
        ],
        {
          'proxy-eni': { subnetId: 'subnet-eni', securityGroupIds: ['sg-eni'] },
          'other-eni': { subnetId: 'subnet-eni', securityGroupIds: ['sg-eni'] },
        },
      ),
    ).toThrow(/Instance proxy-1 networkInterfaces specifies deviceIndex 1 more than once/);
  });

  test('specifying both networkInterface and networkInterfaceId throws', () => {
    expect(
      buildWithEni([{ networkInterface: 'proxy-eni', networkInterfaceId: 'eni-existing', deviceIndex: 1 }]),
    ).toThrow(/specifies both networkInterface and networkInterfaceId/);
  });

  test('specifying neither networkInterface nor networkInterfaceId throws', () => {
    expect(buildWithEni([{ deviceIndex: 1 }])).toThrow(/specifies neither networkInterface nor networkInterfaceId/);
  });

  test('referencing an unknown network interface name throws', () => {
    expect(buildWithEni([{ networkInterface: 'not-declared', deviceIndex: 1 }])).toThrow(
      /Instance proxy-1 networkInterfaces references Network Interface not-declared, which is not known to this module/,
    );
  });

  test('a network interface name colliding with an inherited Object member throws', () => {
    // `this.networkInterfaces` is a plain object, so a config key like `constructor` would resolve
    // to an inherited member and satisfy a truthiness guard -- the lookup must be own-property only.
    expect(buildWithEni([{ networkInterface: 'constructor', deviceIndex: 1 }])).toThrow(
      /references Network Interface constructor, which is not known to this module/,
    );
  });

  test('attaching the same config-declared interface twice on one instance throws', () => {
    // A plausible copy/paste error: two entries, two device indexes, one interface.
    expect(
      buildWithEni([
        { networkInterface: 'proxy-eni', deviceIndex: 1 },
        { networkInterface: 'proxy-eni', deviceIndex: 2 },
      ]),
    ).toThrow(
      /Instance proxy-1 networkInterfaces attaches Network Interface proxy-eni more than once. An interface can occupy only one device index./,
    );
  });

  test('attaching the same pre-existing interface twice on one instance throws', () => {
    expect(
      buildWithEni([
        { networkInterfaceId: 'eni-existing', deviceIndex: 1 },
        { networkInterfaceId: 'eni-existing', deviceIndex: 2 },
      ]),
    ).toThrow(/Instance proxy-1 networkInterfaces attaches Network Interface eni-existing more than once/);
  });

  test('an interface named like an id does not collide with that id referenced by another instance', () => {
    // Names and ids live in separate claim namespaces, so these are two distinct interfaces
    // despite sharing a string, and neither is a duplicate of the other.
    expect(
      build({
        networkInterfaces: { 'eni-collide': { subnetId: 'subnet-eni', securityGroupIds: ['sg-eni'] } },
        instances: {
          'proxy-1': instance([{ networkInterface: 'eni-collide', deviceIndex: 1 }]),
          'proxy-2': instance([{ networkInterfaceId: 'eni-collide', deviceIndex: 1 }]),
        },
      }),
    ).not.toThrow();
  });

  test('attaching one config-declared interface to two instances throws', () => {
    expect(
      build({
        networkInterfaces: { 'proxy-eni': { subnetId: 'subnet-eni', securityGroupIds: ['sg-eni'] } },
        instances: {
          'proxy-1': instance([{ networkInterface: 'proxy-eni', deviceIndex: 1 }]),
          'proxy-2': instance([{ networkInterface: 'proxy-eni', deviceIndex: 1 }]),
        },
      }),
    ).toThrow(
      /Network Interface proxy-eni is attached to both instance proxy-1 and instance proxy-2. A network interface can be attached to only one instance./,
    );
  });

  test('attaching one pre-existing interface to two instances throws', () => {
    expect(
      build({
        instances: {
          'proxy-1': instance([{ networkInterfaceId: 'eni-shared', deviceIndex: 1 }]),
          'proxy-2': instance([{ networkInterfaceId: 'eni-shared', deviceIndex: 1 }]),
        },
      }),
    ).toThrow(/Network Interface eni-shared is attached to both instance proxy-1 and instance proxy-2/);
  });

  test('a duplicate ssm:-referenced interface is described rather than printed as a token', () => {
    // An ssm: networkInterfaceId reaches this module already resolved to a CloudFormation token, so
    // interpolating it raw would put ${Token[TOKEN.nn]} in front of the user.
    const ssmReference = StringParameter.valueForStringParameter(testApp.testStack, '/test/eni/id');
    expect(
      build({
        instances: {
          'proxy-1': instance([{ networkInterfaceId: ssmReference, deviceIndex: 1 }]),
          'proxy-2': instance([{ networkInterfaceId: ssmReference, deviceIndex: 1 }]),
        },
      }),
    ).toThrow(
      /Network Interface <ssm: networkInterfaceId reference> is attached to both instance proxy-1 and instance proxy-2/,
    );
  });

  test('a network interface with neither securityGroups nor securityGroupIds throws', () => {
    // Compliance by default: EC2 would place the interface in the VPC default security group, and
    // that association is made outside CloudFormation, so neither the template nor CDK Nag shows
    // it. Rejected at synth, as the module already does for an instance's own security group.
    expect(
      build({
        networkInterfaces: { 'proxy-eni': { subnetId: 'subnet-eni' } },
        instances: { 'proxy-1': instance([{ networkInterface: 'proxy-eni', deviceIndex: 1 }]) },
      }),
    ).toThrow(
      /Network Interface proxy-eni specifies neither securityGroups nor securityGroupIds. At least one is required/,
    );
  });

  test('a network interface with an empty securityGroups list throws', () => {
    expect(
      build({
        networkInterfaces: { 'proxy-eni': { subnetId: 'subnet-eni', securityGroups: [], securityGroupIds: [] } },
        instances: { 'proxy-1': instance([{ networkInterface: 'proxy-eni', deviceIndex: 1 }]) },
      }),
    ).toThrow(/Network Interface proxy-eni specifies neither securityGroups nor securityGroupIds/);
  });

  test('a network interface referencing an unknown security group name throws', () => {
    expect(
      build({
        networkInterfaces: { 'proxy-eni': { subnetId: 'subnet-eni', securityGroups: ['not-declared'] } },
      }),
    ).toThrow(
      /Network Interface proxy-eni securityGroups references Security Group not-declared, which is not known to this module/,
    );
  });

  test('a security group name colliding with an inherited Object member throws', () => {
    expect(
      build({
        networkInterfaces: { 'proxy-eni': { subnetId: 'subnet-eni', securityGroups: ['toString'] } },
      }),
    ).toThrow(/references Security Group toString, which is not known to this module/);
  });
});
