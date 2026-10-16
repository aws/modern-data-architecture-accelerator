/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaDatazoneProjectRoleTagger } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('MdaaDatazoneProjectRoleTagger', () => {
    const testApp = new MdaaTestApp();

    new MdaaDatazoneProjectRoleTagger(testApp.testStack, 'test-role-tagger', {
      naming: testApp.naming,
      projectId: 'prjtest123',
      roleArns: ['arn:test-partition:iam::test-account:role/etl-role'],
    });

    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    test('creates the tagging custom resource', () => {
      template.resourceCountIs('Custom::DataZoneProjectRoleTagger', 1);
    });
  });
});
