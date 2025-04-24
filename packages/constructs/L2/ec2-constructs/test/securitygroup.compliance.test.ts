/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const ingressRules: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '1.1.1.1/32',
        protocol: 'TCP',
        port: 100,
      },
      {
        cidr: '1.1.1.1/32',
        protocol: 'TCP',
        port: 100,
        toPort: 200,
      },
      {
        cidr: '1.1.1.1/32',
        protocol: 'ALL',
        suppressions: [
          {
            id: 'NIST.800.53.R5-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
          {
            id: 'HIPAA.Security-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
          {
            id: 'PCI.DSS.321-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
        ],
      },
    ],
    sg: [
      {
        sgId: 'sg-12345677890',
        protocol: 'TCP',
        port: 100,
      },
    ],
    prefixList: [
      {
        prefixList: 'pl-12345677890',
        protocol: 'TCP',
        port: 100,
      },
    ],
  };

  const egressRules: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '1.1.1.1/32',
        protocol: 'TCP',
        port: 100,
      },
      {
        cidr: '1.1.1.1/32',
        protocol: 'ALL',
        suppressions: [
          {
            id: 'NIST.800.53.R5-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
          {
            id: 'HIPAA.Security-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
          {
            id: 'PCI.DSS.321-EC2RestrictedCommonPorts',
            reason: 'security group testing',
          },
        ],
      },
    ],
    sg: [
      {
        sgId: 'sg-12345677890',
        protocol: 'TCP',
        port: 100,
      },
    ],
    prefixList: [
      {
        prefixList: 'pl-12345677890',
        protocol: 'TCP',
        port: 100,
      },
    ],
  };
  describe('Test Ingress/Egress', () => {
    const testApp = new MdaaTestApp();
    const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'VPC', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['az1', 'az2'],
      privateSubnetIds: ['subnet1', 'subnet2'],
    });
    const testContstructProps: MdaaSecurityGroupProps = {
      naming: testApp.naming,
      vpc: testVpc,
      ingressRules: ingressRules,
      egressRules: egressRules,
      addSelfReferenceRule: false,
      allowAllOutbound: false,
    };
    new MdaaSecurityGroup(testApp.testStack, 'test-construct1', testContstructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);
    // console.log( JSON.stringify( template, undefined, 2 ) )
    test('SG name', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupName: 'test-org-test-env-test-domain-test-module',
      });
    });
    describe('Ingress', () => {
      test('Ingress Rule Count', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 5);
      });
      test('CIDR ALL Traffic', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: '-1',
          CidrIp: '1.1.1.1/32',
          Description: 'from 1.1.1.1/32:-1 ALL TRAFFIC',
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
        });
      });
      test('CIDR TCP Port 100', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
          CidrIp: '1.1.1.1/32',
          Description: 'from 1.1.1.1/32:tcp PORT 100',
          FromPort: 100,
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          ToPort: 100,
        });
      });
      test('CIDR TCP Port 100 to 200', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
          CidrIp: '1.1.1.1/32',
          Description: 'from 1.1.1.1/32:tcp RANGE 100-200',
          FromPort: 100,
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          ToPort: 200,
        });
      });
      test('SG TCP Port 100', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
          Description: 'from sg-12345677890:tcp PORT 100',
          FromPort: 100,
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          SourceSecurityGroupId: 'sg-12345677890',
          ToPort: 100,
        });
      });
      test('PrefixList TCP Port 100', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
          IpProtocol: 'tcp',
          Description: 'from pl-12345677890:tcp PORT 100',
          FromPort: 100,
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          SourcePrefixListId: 'pl-12345677890',
          ToPort: 100,
        });
      });
    });
    describe('Egress', () => {
      test('Ingress Rule Count', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 4);
      });
      test('CIDR TCP Port 100', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          IpProtocol: 'tcp',
          CidrIp: '1.1.1.1/32',
          Description: 'to 1.1.1.1/32:tcp PORT 100',
          FromPort: 100,
          ToPort: 100,
        });
      });
      test('SG TCP Port 100', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          IpProtocol: 'tcp',
          Description: 'to sg-12345677890:tcp PORT 100',
          DestinationSecurityGroupId: 'sg-12345677890',
          FromPort: 100,
          ToPort: 100,
        });
      });
      test('PrefixList Default TCP', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
          GroupId: {
            'Fn::GetAtt': ['testconstruct1379026B5', 'GroupId'],
          },
          IpProtocol: 'tcp',
          Description: 'to pl-12345677890:tcp PORT 100',
          DestinationPrefixListId: 'pl-12345677890',
          FromPort: 100,
          ToPort: 100,
        });
      });
    });
  });

  describe('Test AllowAllOutput', () => {
    const testApp = new MdaaTestApp();
    const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'VPC', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['az1', 'az2'],
      privateSubnetIds: ['subnet1', 'subnet2'],
    });
    const testContstructProps: MdaaSecurityGroupProps = {
      naming: testApp.naming,
      vpc: testVpc,
      addSelfReferenceRule: false,
      allowAllOutbound: true,
    };
    new MdaaSecurityGroup(testApp.testStack, 'test-construct2', testContstructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);
    // console.log( JSON.stringify( template, undefined, 2 ) )

    test('Allow All Outbound', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          Match.objectLike({
            CidrIp: '0.0.0.0/0',
            Description: 'Allow all outbound traffic by default',
            IpProtocol: '-1',
          }),
        ]),
      });
    });
  });

  describe('Test Self Ref', () => {
    const testApp = new MdaaTestApp();
    const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'VPC', {
      vpcId: 'test-vpc-id',
      availabilityZones: ['az1', 'az2'],
      privateSubnetIds: ['subnet1', 'subnet2'],
    });
    const testContstructProps: MdaaSecurityGroupProps = {
      naming: testApp.naming,
      vpc: testVpc,
      addSelfReferenceRule: true,
      allowAllOutbound: false,
    };
    new MdaaSecurityGroup(testApp.testStack, 'test-construct2', testContstructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);
    // console.log( JSON.stringify( template, undefined, 2 ) )

    test('Self Referencing rule Ingress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: '-1',
        Description: 'Self-Ref',
        GroupId: {
          'Fn::GetAtt': ['testconstruct21F12ADDD', 'GroupId'],
        },
        SourceSecurityGroupId: {
          'Fn::GetAtt': ['testconstruct21F12ADDD', 'GroupId'],
        },
      });
    });
    test('Self Referencing rule Egress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        IpProtocol: '-1',
        Description: 'Self-Ref',
        GroupId: {
          'Fn::GetAtt': ['testconstruct21F12ADDD', 'GroupId'],
        },
        DestinationSecurityGroupId: {
          'Fn::GetAtt': ['testconstruct21F12ADDD', 'GroupId'],
        },
      });
    });
  });
});
