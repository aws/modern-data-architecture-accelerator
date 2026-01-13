/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

import { LakeFormationTagBasedPermissionsL3Construct, LakeFormationTagBasedPermissionsL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: LakeFormationTagBasedPermissionsL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    tagBasedGrants: {
      bronzeDataAccess: {
        principalArns: {
          dataAnalyst: 'arn:aws:iam::123456789012:role/DataAnalyst',
          dataEngineer: 'arn:aws:iam::123456789012:role/DataEngineer',
        },
        permissions: ['DESCRIBE', 'SELECT'],
        lfTagExpression: {
          data_tier: 'bronze',
          environment: ['dev', 'test'],
        },
        resourceType: 'TABLE',
      },
      silverDataAccess: {
        principalArns: {
          dataScientist: 'arn:aws:iam::123456789012:role/DataScientist',
        },
        permissions: ['DESCRIBE', 'SELECT', 'ALTER'],
        permissionsWithGrantOption: ['DESCRIBE', 'SELECT'],
        lfTagExpression: {
          data_tier: 'silver',
          environment: 'prod',
        },
        resourceType: 'TABLE',
      },
      databaseAccess: {
        principalArns: {
          databaseAdmin: 'arn:aws:iam::123456789012:role/DatabaseAdmin',
        },
        permissions: ['DESCRIBE', 'CREATE_TABLE'],
        lfTagExpression: {
          data_tier: ['bronze', 'silver', 'gold'],
          environment: 'prod',
        },
        resourceType: 'DATABASE',
      },
    },
  };

  new LakeFormationTagBasedPermissionsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  console.log(JSON.stringify(template, undefined, 2));

  test('LakeFormation Tag-Based Permissions - Bronze Data Access', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Principal: {
        DataLakePrincipalIdentifier: 'arn:aws:iam::123456789012:role/DataAnalyst',
      },
      Resource: {
        LFTagPolicy: {
          CatalogId: 'test-account',
          ResourceType: 'TABLE',
          Expression: [
            {
              TagKey: 'data_tier',
              TagValues: ['bronze'],
            },
            {
              TagKey: 'environment',
              TagValues: ['dev', 'test'],
            },
          ],
        },
      },
      Permissions: ['DESCRIBE', 'SELECT'],
      PermissionsWithGrantOption: [],
    });

    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Principal: {
        DataLakePrincipalIdentifier: 'arn:aws:iam::123456789012:role/DataEngineer',
      },
      Resource: {
        LFTagPolicy: {
          CatalogId: 'test-account',
          ResourceType: 'TABLE',
          Expression: [
            {
              TagKey: 'data_tier',
              TagValues: ['bronze'],
            },
            {
              TagKey: 'environment',
              TagValues: ['dev', 'test'],
            },
          ],
        },
      },
      Permissions: ['DESCRIBE', 'SELECT'],
      PermissionsWithGrantOption: [],
    });
  });

  test('LakeFormation Tag-Based Permissions - Silver Data Access with Grant Option', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Principal: {
        DataLakePrincipalIdentifier: 'arn:aws:iam::123456789012:role/DataScientist',
      },
      Resource: {
        LFTagPolicy: {
          CatalogId: 'test-account',
          ResourceType: 'TABLE',
          Expression: [
            {
              TagKey: 'data_tier',
              TagValues: ['silver'],
            },
            {
              TagKey: 'environment',
              TagValues: ['prod'],
            },
          ],
        },
      },
      Permissions: ['DESCRIBE', 'SELECT', 'ALTER'],
      PermissionsWithGrantOption: ['DESCRIBE', 'SELECT'],
    });
  });

  test('LakeFormation Tag-Based Permissions - Database Access', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Principal: {
        DataLakePrincipalIdentifier: 'arn:aws:iam::123456789012:role/DatabaseAdmin',
      },
      Resource: {
        LFTagPolicy: {
          CatalogId: 'test-account',
          ResourceType: 'DATABASE',
          Expression: [
            {
              TagKey: 'data_tier',
              TagValues: ['bronze', 'silver', 'gold'],
            },
            {
              TagKey: 'environment',
              TagValues: ['prod'],
            },
          ],
        },
      },
      Permissions: ['DESCRIBE', 'CREATE_TABLE'],
      PermissionsWithGrantOption: [],
    });
  });

  test('Permissions Count Output', () => {
    template.hasOutput('*', {
      Value: '4',
    });
  });
});
