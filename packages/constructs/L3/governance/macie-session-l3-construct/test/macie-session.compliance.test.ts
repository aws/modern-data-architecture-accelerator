/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MacieSessionL3Construct, MacieSessionL3ConstructProps, SessionFindingPublishingFrequencyEnum } from '../lib';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const constructProps: MacieSessionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    session: {
      findingPublishingFrequency: SessionFindingPublishingFrequencyEnum.SIX_HOURS,
    },
  };

  new MacieSessionL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('FindingPublishingFrequency', () => {
    template.hasResourceProperties('AWS::Macie::Session', {
      FindingPublishingFrequency: 'SIX_HOURS',
    });
  });

  test('Status', () => {
    template.hasResourceProperties('AWS::Macie::Session', {
      Status: 'ENABLED',
    });
  });
});
