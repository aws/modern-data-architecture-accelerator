/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

import { LakeFormationTagsL3ConstructProps, LakeFormationTagsL3Construct } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: LakeFormationTagsL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    lfTags: [
      {
        tagKey: 'data_tier',
        tagValues: ['bronze', 'silver', 'gold'],
      },
      {
        tagKey: 'environment',
        tagValues: ['dev', 'test', 'prod'],
      },
      {
        tagKey: 'sensitivity',
        tagValues: ['public', 'internal', 'confidential', 'restricted'],
      },
      {
        tagKey: 'data_classification',
        tagValues: ['pii', 'phi', 'pci', 'public'],
        catalogId: 'test-account',
      },
    ],
  };

  new LakeFormationTagsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  console.log(JSON.stringify(template, undefined, 2));

  test('LakeFormation Tag - data_tier', () => {
    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'data_tier',
      TagValues: ['bronze', 'silver', 'gold'],
    });
  });

  test('LakeFormation Tag - environment', () => {
    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'environment',
      TagValues: ['dev', 'test', 'prod'],
    });
  });

  test('LakeFormation Tag - sensitivity', () => {
    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'sensitivity',
      TagValues: ['public', 'internal', 'confidential', 'restricted'],
    });
  });

  test('LakeFormation Tag - data_classification with custom catalogId', () => {
    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'data_classification',
      TagValues: ['pii', 'phi', 'pci', 'public'],
    });
  });

  test('Tags Count Output', () => {
    template.hasOutput('*', {
      Value: '4',
    });
  });
});
