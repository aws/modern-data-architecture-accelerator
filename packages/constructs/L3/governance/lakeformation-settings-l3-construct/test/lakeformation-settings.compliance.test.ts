/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

import { LakeFormationSettingsL3ConstructProps, LakeFormationSettingsL3Construct } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const lakeFormationAccessControlConfigParser: MdaaRoleRef = {
    id: 'test-role-access-control',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [lakeFormationAccessControlConfigParser],
    iamIdentityCenter: {
      instanceId: 'test-sso-instance',
      shares: ['test-account'],
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: true,
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('LakeFormationSettings', () => {
    template.hasResourceProperties('Custom::lakeformation-settings', {
      account: 'test-account',
      dataLakeSettings: {
        DataLakeAdmins: [
          {
            DataLakePrincipalIdentifier: 'arn:test-partition:iam::test-account:role/TestAccess',
          },
        ],
        CreateDatabaseDefaultPermissions: [
          {
            Principal: {
              DataLakePrincipalIdentifier: 'IAM_ALLOWED_PRINCIPALS',
            },
            Permissions: ['ALL'],
          },
        ],
        CreateTableDefaultPermissions: [
          {
            Principal: {
              DataLakePrincipalIdentifier: 'IAM_ALLOWED_PRINCIPALS',
            },
            Permissions: ['ALL'],
          },
        ],
        Parameters: {
          CROSS_ACCOUNT_VERSION: '3',
        },
      },
    });
  });
  test('IdcIntegration', () => {
    template.hasResourceProperties('Custom::lakeformation-idc-configs', {
      instanceArn: 'arn:test-partition:sso:::instance/test-sso-instance',
      shareRecipients: [
        {
          DataLakePrincipalIdentifier: 'test-account',
        },
      ],
    });
  });
});
