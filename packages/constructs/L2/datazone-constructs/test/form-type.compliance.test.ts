/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { MdaaDatazoneFormType } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('MdaaDatazoneFormType', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new MdaaDatazoneFormType(stack, 'test-form-type', {
      naming: testApp.naming,
      domainIdentifier: 'dzd_testdomain',
      owningProjectIdentifier: 'prjtest123',
      formName: 'CustomerForm',
      description: 'Customer governance metadata',
      fields: {
        customerName: { type: 'String', required: true, searchable: ['TECHNICAL'] },
        tier: { type: 'String', searchable: ['LEXICAL'], glossaryId: 'gloss-1' },
        activeFlag: { type: 'Boolean' },
      },
      handlerRole: Role.fromRoleArn(stack, 'cr-role', 'arn:aws:iam::123456789012:role/cr-role'),
    });

    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    console.log(JSON.stringify(template.toJSON(), null, '\t'));
  });
});
