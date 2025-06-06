/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Match } from 'aws-cdk-lib/assertions';
import { MdaaLambdaRole, MdaaLambdaRoleProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaLambdaRoleProps = {
    naming: testApp.naming,
    roleName: 'test-lambda-role',
    logGroupNames: ['test-log-group'],
    createOutputs: false,
    createParams: false,
  };

  new MdaaLambdaRole(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('RoleName', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: testApp.naming.resourceName('test-lambda-role'),
    });
  });

  test('AssumeRoleTrust', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
      },
    });
  });

  test('LogGroupCreateStatement', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: 'logs:CreateLogGroup',
            Effect: 'Allow',
            Resource: 'arn:test-partition:logs:*:*:log-group:/aws/lambda/test-log-group*',
          },
        ]),
      },
    });
  });
  test('LogGroupWriteStatement', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: ['logs:PutLogEvents', 'logs:CreateLogStream'],
            Effect: 'Allow',
            Resource: 'arn:test-partition:logs:*:*:log-group:/aws/lambda/test-log-group*',
          },
        ]),
      },
    });
  });
});
