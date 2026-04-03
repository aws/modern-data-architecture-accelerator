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

  test('users properties', () => {
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

describe('Multiple Users Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const user1: UserProps = {
    name: 'user-one',
    homeBucketName: 'bucket-one',
    homeBucketKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/key-one',
    homeDirectory: 'home-one',
    publicKeys: [],
  };

  const user2: UserProps = {
    name: 'user-two',
    homeBucketName: 'bucket-two',
    homeBucketKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/key-two',
    homeDirectory: 'home-two',
    publicKeys: [],
  };

  const constructProps: SftpUsersL3ConstructProps = {
    users: [user1, user2],
    serverId: 'test-server-id',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new SftpUsersL3Construct(stack, 'multistack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Transfer User Resource Count', () => {
    template.resourceCountIs('AWS::Transfer::User', 2);
  });

  test('User One Properties', () => {
    template.hasResourceProperties('AWS::Transfer::User', {
      UserName: 'user-one',
      HomeDirectory: '/bucket-one/home-one',
    });
  });

  test('User Two Properties', () => {
    template.hasResourceProperties('AWS::Transfer::User', {
      UserName: 'user-two',
      HomeDirectory: '/bucket-two/home-two',
    });
  });
});
