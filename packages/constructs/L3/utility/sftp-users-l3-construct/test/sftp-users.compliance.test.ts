/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { Template } from 'aws-cdk-lib/assertions';
import { SftpUsersL3Construct, SftpUsersL3ConstructProps, UserProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const userProps: UserProps = {
    name: 'teststack',
    homeBucketName: 'teststackbucket',
    homeBucketKmsKeyArn: 'teststackbucketkmskeyarn',
    homeDirectory: 'testhomedir',
    publicKeys: [],
  };

  const constructProps: SftpUsersL3ConstructProps = {
    users: [userProps],
    serverId: 'test-server-id',

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new SftpUsersL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  //console.log(JSON.stringify(template,undefined,2))

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::Transfer::User', 1);
  });

  test('Test users properties', () => {
    template.hasResourceProperties('AWS::Transfer::User', {
      Role: {
        'Fn::GetAtt': ['teststackTransferUserSFTPRoleteststackDC08A045', 'Arn'],
      },
      ServerId: 'test-server-id',
      UserName: 'teststack',
      HomeDirectory: '/teststackbucket/testhomedir',
    });
  });
});
