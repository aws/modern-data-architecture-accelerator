/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { ResourceTypeAwareNaming } from './resource-type-aware-naming';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaNetworkInterface, MdaaNetworkInterfaceProps } from '../lib/network_interface';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testConstructProps: MdaaNetworkInterfaceProps = {
    naming: testApp.naming,
    networkInterfaceName: 'test-eni',
    subnetId: 'subnet-test',
    description: 'test description',
    privateIpAddress: '10.0.0.50',
    securityGroupIds: ['sg-test1', 'sg-test2'],
    sourceDestCheck: false,
  };

  new MdaaNetworkInterface(testApp.testStack, 'test-construct', testConstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('CreatesNetworkInterface', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterface', {
      SubnetId: 'subnet-test',
      Description: 'test description',
      PrivateIpAddress: '10.0.0.50',
      GroupSet: ['sg-test1', 'sg-test2'],
      SourceDestCheck: false,
    });
  });

  test('IsRetainedAcrossDeletionAndReplacementButNotARolledBackCreate', () => {
    // DeletionPolicy covers stack deletion; UpdateReplacePolicy covers a replacing update, which is
    // the path an AMI patch takes. RetainExceptOnCreate is the DeletionPolicy that excludes a
    // rolled-back create, where a retained interface holding a pinned privateIpAddress would fail
    // every subsequent retry with InvalidIPAddress.InUse.
    template.hasResource('AWS::EC2::NetworkInterface', {
      DeletionPolicy: 'RetainExceptOnCreate',
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('PublishesIdAndPrivateIpAsSsmParams', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: testApp.naming.ssmPath('network-interface/test-eni/id'),
      Value: { 'Fn::GetAtt': ['testconstruct', 'Id'] },
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: testApp.naming.ssmPath('network-interface/test-eni/private-ip'),
      Value: { 'Fn::GetAtt': ['testconstruct', 'PrimaryPrivateIpAddress'] },
    });
  });

  test('PublishesIdAndPrivateIpAsCfnExports', () => {
    // The exports are the cross-stack half of the same publication: another stack consuming this
    // interface imports by export name, so the names are as much a contract as the SSM paths.
    template.hasOutput('*', {
      Value: { 'Fn::GetAtt': ['testconstruct', 'Id'] },
      Export: { Name: testApp.naming.exportName('network-interface:testeni:id') },
    });
    template.hasOutput('*', {
      Value: { 'Fn::GetAtt': ['testconstruct', 'PrimaryPrivateIpAddress'] },
      Export: { Name: testApp.naming.exportName('network-interface:testeni:private-ip') },
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

  new MdaaNetworkInterface(testApp.testStack, 'typed-construct', {
    naming: naming,
    networkInterfaceName: 'test-eni',
    subnetId: 'subnet-test',
    securityGroupIds: ['sg-test1'],
  });

  const template = Template.fromStack(testApp.testStack);

  test('NameTagUsesNetworkInterfaceResourceType', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterface', {
      Tags: Match.arrayWith([
        {
          Key: 'Name',
          Value: naming.withResourceType(MdaaResourceType.EC2_NETWORK_INTERFACE).resourceName('test-eni'),
        },
      ]),
    });
  });
});

describe('MDAA Construct Minimal Props Tests', () => {
  const testApp = new MdaaTestApp();

  new MdaaNetworkInterface(testApp.testStack, 'minimal-construct', {
    naming: testApp.naming,
    networkInterfaceName: 'minimal-eni',
    subnetId: 'subnet-test',
    securityGroupIds: ['sg-test1'],
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('OmitsOptionalProperties', () => {
    // securityGroupIds is absent from this list deliberately: it is required, so the minimal
    // interface still carries a group rather than defaulting into the VPC default one.
    template.hasResourceProperties('AWS::EC2::NetworkInterface', {
      SubnetId: 'subnet-test',
      GroupSet: ['sg-test1'],
      Description: Match.absent(),
      PrivateIpAddress: Match.absent(),
      SourceDestCheck: Match.absent(),
    });
  });
});

describe('MDAA Construct Security Group Enforcement Tests', () => {
  const testApp = new MdaaTestApp();

  test('EmptySecurityGroupIdsThrows', () => {
    // EC2 makes the VPC-default-group association itself, so it reaches neither the template nor
    // CDK Nag. An empty group set is therefore rejected rather than rendered.
    expect(
      () =>
        new MdaaNetworkInterface(testApp.testStack, 'no-sg-construct', {
          naming: testApp.naming,
          networkInterfaceName: 'no-sg-eni',
          subnetId: 'subnet-test',
          securityGroupIds: [],
        }),
    ).toThrow(/Network Interface no-sg-eni securityGroupIds is empty. At least one security group is required/);
  });
});
