/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match } from 'aws-cdk-lib/assertions';
import { Template } from 'aws-cdk-lib/assertions';
import { ServerProps, SftpServerL3Construct, SftpServerL3ConstructProps } from '../lib/sftp-server-l3-construct';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const serverProps: ServerProps = {
    vpcId: 'testvpc',
    subnetIds: ['subnet1', 'subnet2'],
    ingressCidrs: ['cidr1', 'cidr2'],
    internetFacing: true,
  };

  const constructProps: SftpServerL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    server: serverProps,
  };

  new SftpServerL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  //console.log(JSON.stringify(template,undefined,2))

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    template.resourceCountIs('AWS::Transfer::Server', 1);
  });

  test('Test server template properties', () => {
    template.hasResourceProperties('AWS::Transfer::Server', {
      EndpointDetails: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': ['teststackSFTPSecurityGroup8A7B0A3A', 'GroupId'],
          },
        ],
        SubnetIds: ['subnet1', 'subnet2'],
        VpcId: 'testvpc',
      },
      EndpointType: 'VPC',
      LoggingRole: {
        'Fn::GetAtt': ['teststackTransferServerSFTPLoggingRole30EDA323', 'Arn'],
      },
      Protocols: ['SFTP'],
      SecurityPolicyName: 'TransferSecurityPolicy-FIPS-2020-06',
    });
  });

  test('SecurityGroup Testing', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: 'cidr1',
          FromPort: 22,
          IpProtocol: 'tcp',
          ToPort: 22,
        }),
        Match.objectLike({
          CidrIp: 'cidr2',
          FromPort: 22,
          IpProtocol: 'tcp',
          ToPort: 22,
        }),
      ]),
      VpcId: 'testvpc',
    });
  });
});
