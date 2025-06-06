/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';

import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '../lib';

import { Stack } from 'aws-cdk-lib';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

type TestL3ConstructProps = MdaaL3ConstructProps;

class TestL3Construct extends MdaaL3Construct {
  constructor(scope: Construct, id: string, props: TestL3ConstructProps) {
    super(scope, id, props);
    this.getCrossAccountStack('1231241242');
  }
}

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const constructProps: TestL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    crossAccountStacks: { '1231241242': new Stack(testApp, 'testing-cross-account') },
  };

  new TestL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  Template.fromStack(testApp.testStack);
});
