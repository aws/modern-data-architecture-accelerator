/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { SagemakerProjectL3Construct, SagemakerProjectL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('SagemakerProject', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: SagemakerProjectL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      domainConfigSSMParam: '/test-param',
    };

    new SagemakerProjectL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    console.log(JSON.stringify(template.toJSON(), null, '\t'));
  });
});
