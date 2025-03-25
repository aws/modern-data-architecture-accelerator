/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import { QuickSightAccountL3Construct, QuickSightAccountL3ConstructProps } from '../lib';

describe('QS Account Mandatory Tests', () => {
  const testApp = new MdaaTestApp();
  const testQSSecurityGroup: MdaaSecurityGroupRuleProps = {
    sg: [
      {
        sgId: 'sg-1234abcd',
        port: 1111,
        protocol: Protocol.TCP,
      },
    ],
    ipv4: [
      {
        cidr: '10.0.0.0/32',
        port: 1000,
        toPort: 2000,
        protocol: Protocol.TCP,
      },
    ],
    prefixList: [
      {
        prefixList: 'pl-abc123',
        port: 1000,
        toPort: 2000,
        protocol: Protocol.TCP,
      },
    ],
  };

  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      securityGroupAccess: testQSSecurityGroup,
      edition: 'ENTERPRISE_AND_Q',
      authenticationMethod: 'IAM_AND_QUICKSIGHT',
      notificationEmail: 'test@example.com',
      firstName: 'testFirstName',
      lastName: 'testLastName',
      emailAddress: 'test@example.com',
      contactNumber: '1234546879',
      vpcId: 'vpc-abcd1234',
      subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
      glueResourceAccess: ['database/some-database-name*'],
      ipRestrictions: [
        {
          cidr: '1.1.1.1/1',
          description: 'testing1',
        },
        {
          cidr: '2.2.2.2/2',
        },
      ],
    },
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Test QS Account With Sample Config', () => {
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      accountDetail: Match.objectLike({
        edition: 'ENTERPRISE_AND_Q',
        authenticationMethod: 'IAM_AND_QUICKSIGHT',
        notificationEmail: 'test@example.com',
        accountName: 'test-org-test-env-test-domain-test-module',
      }),
    });
  });

  test('Test IP Restrictions', () => {
    template.hasResourceProperties('Custom::ip-restrictions', {
      accountId: 'test-account',
      ipRestrictionsMap: {
        '1.1.1.1/1': 'testing1',
        '2.2.2.2/2': 'Restriction for 2.2.2.2/2',
      },
    });
  });

  test('Test Security Group Ingress', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      CidrIp: '10.0.0.0/32',
      Description: 'from 10.0.0.0/32:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      ToPort: 65535,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      Description: 'from sg-1234abcd:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      SourceSecurityGroupId: 'sg-1234abcd',
      ToPort: 65535,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      Description: 'from pl-abc123:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      SourcePrefixListId: 'pl-abc123',
      ToPort: 65535,
    });
  });

  test('Test Security Group Egress', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      CidrIp: '10.0.0.0/32',
      Description: 'to 10.0.0.0/32:tcp RANGE 1000-2000',
      FromPort: 1000,
      ToPort: 2000,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      Description: 'to sg-1234abcd:tcp PORT 1111',
      DestinationSecurityGroupId: 'sg-1234abcd',
      FromPort: 1111,
      ToPort: 1111,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      Description: 'to pl-abc123:tcp RANGE 1000-2000',
      DestinationPrefixListId: 'pl-abc123',
      FromPort: 1000,
      ToPort: 2000,
    });
  });
});
