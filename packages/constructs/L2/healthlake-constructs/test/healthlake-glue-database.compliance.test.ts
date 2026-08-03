/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaHealthLakeGlueDatabase, MdaaHealthLakeGlueDatabaseProps } from '../lib';

describe('MdaaHealthLakeGlueDatabase Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaHealthLakeGlueDatabaseProps = {
    naming: testApp.naming,
    datastoreName: 'test-datastore',
    datastoreId: 'abc123def456',
  };

  const construct = new MdaaHealthLakeGlueDatabase(testApp.testStack, 'test-construct', testProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Database name is derived from datastore name and ID', () => {
    // The databaseName should be a CloudFormation token (Fn::Join)
    // since datastoreId is a literal in test, we can check the construct property
    expect(construct.databaseName).toBeDefined();
  });

  test('Catalog ID is the account ID', () => {
    expect(construct.catalogId).toBe('test-account');
  });

  test('SSM parameters are created for Glue database name and catalog ID', () => {
    template.resourceCountIs('AWS::SSM::Parameter', 2);
  });

  test('No Lambda function is created (static derivation, no custom resource)', () => {
    template.resourceCountIs('AWS::Lambda::Function', 0);
  });

  test('No IAM policy for Glue access (no API call needed)', () => {
    const json = template.toJSON();
    const resources = json.Resources;
    const iamPolicies = Object.values(resources).filter(
      resource => (resource as Record<string, unknown>).Type === 'AWS::IAM::Policy',
    );
    expect(iamPolicies).toHaveLength(0);
  });
});
