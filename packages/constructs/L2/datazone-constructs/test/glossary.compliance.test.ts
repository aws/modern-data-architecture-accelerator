/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { MdaaDatazoneGlossary } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('MdaaDatazoneGlossary', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new MdaaDatazoneGlossary(stack, 'test-glossary', {
      naming: testApp.naming,
      domainIdentifier: 'dzd_testdomain',
      owningProjectIdentifier: 'prjtest123',
      glossaryName: 'CustomerGlossary',
      description: 'Standard business terms',
      terms: {
        CustomerLifetimeValue: { description: 'CLV' },
        ChurnRisk: { readme: 'Likelihood a customer churns', status: 'DISABLED' },
      },
      // A same-account role reference (not Role.fromRoleArn with a foreign account) is required
      // so grantHandlerLogs' addToPrincipalPolicy actually synthesizes the inline logs policy;
      // a cross-account reference returns an ImmutableRole, making the grant a no-op and leaving
      // the CDK Nag suppressions on that policy unvalidated.
      handlerRole: Role.fromRoleName(stack, 'cr-role', 'cr-role'),
    });

    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    console.log(JSON.stringify(template.toJSON(), null, '\t'));
  });
});
