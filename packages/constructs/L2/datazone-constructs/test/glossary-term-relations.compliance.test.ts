/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { MdaaDatazoneGlossaryTermRelations } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('MdaaDatazoneGlossaryTermRelations', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new MdaaDatazoneGlossaryTermRelations(stack, 'test-relations', {
      naming: testApp.naming,
      domainIdentifier: 'dzd_testdomain',
      termId: 'trm-source',
      relatedTermIds: ['trm-a', 'trm-b'],
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
