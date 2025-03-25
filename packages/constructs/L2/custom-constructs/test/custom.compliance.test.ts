/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { MdaaCustomResource, MdaaCustomResourceProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const policyStatement = new PolicyStatement({
    actions: ['s3:GetObject'],
    resources: ['some-bucket-arn'],
    effect: Effect.ALLOW,
  });

  const testContstructProps: MdaaCustomResourceProps = {
    naming: testApp.naming,
    resourceType: 'testing',
    handlerRolePolicyStatements: [policyStatement],
    code: Code.fromAsset('./test/src/lambda/test'),
    runtime: Runtime.PYTHON_3_13,
    handler: 'test.lambda_handler',
    handlerProps: {
      testProp: 'testValue',
    },
  };

  new MdaaCustomResource(testApp.testStack, 'test-construct', testContstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::IAM::Role', 2);
  });

  test('Handler Function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Role: {
        'Fn::GetAtt': ['customtestinghandlerroleC6F8F93F', 'Arn'],
      },
      FunctionName: 'test-org-test-env-test-domain-test-module-testing-handler',
      Handler: 'test.lambda_handler',
      Runtime: 'python3.13',
    });
  });

  test('Handler Role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test-org-test-env-test-domain-test-module-testing-provider',
    });
  });

  test('Handler Policy', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: 'some-bucket-arn',
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'testing-handler',
      Roles: [
        {
          Ref: 'customtestinghandlerroleC6F8F93F',
        },
      ],
    });
  });
  test('Provider Function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Role: {
        'Fn::GetAtt': ['customtestingproviderrole8B20AC4E', 'Arn'],
      },
      FunctionName: 'test-org-test-env-test-domain-test-module-testing-provider',
    });
  });
  test('Provider Role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test-org-test-env-test-domain-test-module-testing-provider',
    });
  });
  describe('PropsToParams Tests', () => {
    const testProps = {
      testing: 'test',
      testingNum: 1,
      testingObj: {
        testObjMember1: 'test',
        testObjMember2: 'test',
        testNestedArray: ['test', 'test'],
        testNestedArrayWithObj: [{ test: 'test' }],
        testNestedArrayWithArray: [['test']],
        testNestedArrayWithNum: [1],
      },
      testingArr: ['test', 'test'],
    };
    const params = MdaaCustomResource.pascalCase(testProps);
    console.log(params);
    test('MdaaCustomResource.propsToParams', () => {
      expect(params).toStrictEqual({
        Testing: 'test',
        TestingNum: 1,
        TestingObj: {
          TestObjMember1: 'test',
          TestObjMember2: 'test',
          TestNestedArray: ['test', 'test'],
          TestNestedArrayWithObj: [{ Test: 'test' }],
          TestNestedArrayWithArray: [['test']],
          TestNestedArrayWithNum: [1],
        },
        TestingArr: ['test', 'test'],
      });
    });
  });
});
