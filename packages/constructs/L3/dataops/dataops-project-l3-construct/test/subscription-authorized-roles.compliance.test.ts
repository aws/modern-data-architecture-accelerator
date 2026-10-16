/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps } from '../lib';
import * as path from 'node:path';

const roleProps = (testApp: MdaaTestApp): DataOpsProjectL3ConstructProps => ({
  naming: testApp.naming,
  roleHelper: new MdaaRoleHelper(
    testApp.testStack,
    testApp.naming,
    path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
  ),
  projectExecutionRoleRefs: [{ arn: 'arn:test-partition:iam::test-account:role/etl-role' }],
  dataEngineerRoleRefs: [{ name: 'engineer-role' }],
  dataAdminRoleRefs: [{ arn: 'arn:test-partition:iam::test-account:role/admin-role' }],
});

describe('MDAA Compliance Stack Tests', () => {
  describe('subscriptionAuthorizedRoleGroups on the sagemaker path', () => {
    const testApp = new MdaaTestApp();

    new DataOpsProjectL3Construct(testApp.testStack, 'test-construct', {
      ...roleProps(testApp),
      sagemaker: {
        domainConfigSSMParam: '/test/sagemaker/config',
        project: { profileName: 'test-profile' },
        subscriptionAuthorizedRoleGroups: ['projectExecutionRoles', 'dataEngineerRoles', 'dataAdminRoles'],
      },
    });

    testApp.checkCdkNagCompliance(testApp.testStack);

    test('creates the role tagger and the catalog key policy', () => {
      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('Custom::DataZoneProjectRoleTagger', 1);
      expect(
        Object.keys(template.findResources('AWS::IAM::ManagedPolicy')).filter(id =>
          id.startsWith('subscriptioncatalogkeyaccesspolicy'),
        ),
      ).toHaveLength(1);
    });
  });

  describe('subscriptionAuthorizedRoleGroups on the datazone path', () => {
    const testApp = new MdaaTestApp();

    new DataOpsProjectL3Construct(testApp.testStack, 'test-construct', {
      ...roleProps(testApp),
      datazone: {
        project: { domainConfigSSMParam: '/test/datazone/config' },
        subscriptionAuthorizedRoleGroups: ['projectExecutionRoles', 'dataEngineerRoles', 'dataAdminRoles'],
      },
    });

    testApp.checkCdkNagCompliance(testApp.testStack);

    test('creates the catalog key policy', () => {
      const template = Template.fromStack(testApp.testStack);
      expect(
        Object.keys(template.findResources('AWS::IAM::ManagedPolicy')).filter(id =>
          id.startsWith('subscriptioncatalogkeyaccesspolicy'),
        ),
      ).toHaveLength(1);
    });
  });
});
