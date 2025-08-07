/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '../lib';
import { Stack } from 'aws-cdk-lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('DataZone', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: DataZoneL3ConstructProps = {
      glueCatalogKmsKeyArn: 'test-key-arn',
      lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
      crossAccountStacks: {
        '12312421': { 'test-region': new Stack(testApp, 'testextrastack') },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      domains: {
        'test-domain': {
          description: 'Description of DZ Test Domain',
          singleSignOnType: 'DISABLED',
          userAssignment: 'MANUAL',
          dataAdminRole: {
            name: 'test',
          },
          users: {
            test1: {
              iamRole: {
                name: 'test1',
              },
            },
            test2: {
              ssoId: 'test-sso',
            },
          },
          groups: {
            testgroup1: {
              ssoId: 'test-group-sso',
            },
          },
          ownerUsers: ['test1'],
          ownerGroups: ['testgroup1'],
          domainUnits: {
            'test-domain-unit': {
              ownerUsers: ['test1'],
              ownerGroups: ['testgroup1'],
              domainUnits: {
                'test-domain-unit2': {
                  ownerUsers: ['test2'],
                },
              },
            },
          },
          associatedAccounts: {
            test1: {
              account: '12312421',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
            },
          },
        },
      },
    };

    new DataZoneL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    // console.log(JSON.stringify(template.toJSON(), null, '\t'));

    test('Validate if Domain is created', () => {
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Validate if KMS is created and used for the domain', () => {
      template.hasResourceProperties('AWS::DataZone::Domain', {
        KmsKeyIdentifier: {
          'Fn::GetAtt': ['teststacktestdomaincmkF602D0BB', 'Arn'],
        },
      });
    });
  });

  describe('SageMaker', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: DataZoneL3ConstructProps = {
      lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
      glueCatalogKmsKeyArn: 'test-key-arn',
      crossAccountStacks: {
        '12312421': { 'test-region': new Stack(testApp, 'testextrastack') },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      domains: {
        'test-domain': {
          domainVersion: 'V2',
          description: 'Description of DZ Test Domain',
          singleSignOnType: 'DISABLED',
          userAssignment: 'MANUAL',
          dataAdminRole: {
            name: 'test',
          },
          users: {
            test1: {
              iamRole: {
                name: 'test1',
              },
            },
            test2: {
              ssoId: 'test-sso',
            },
          },
          groups: {
            testgroup1: {
              ssoId: 'test-group-sso',
            },
          },
          ownerUsers: ['test1'],
          ownerAccounts: ['test-account1'],
          ownerGroups: ['testgroup1'],
          domainUnits: {
            'test-domain-unit': {
              ownerUsers: ['test1'],
              ownerGroups: ['testgroup1'],
              domainUnits: {
                'test-domain-unit2': {
                  ownerAccounts: ['test-account2'],
                  ownerUsers: ['test2'],
                },
              },
            },
          },
          associatedAccounts: {
            'test-account1': {
              account: '12312421',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              createCdkUser: true,
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
            },
            'test-account2': {
              account: '1231241224',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              createCdkUser: true,
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
            },
          },
        },
      },
    };

    new DataZoneL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    // console.log(JSON.stringify(template.toJSON(), null, '\t'));

    test('Validate if Domain is created', () => {
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Validate if KMS is created and used for the domain', () => {
      template.hasResourceProperties('AWS::DataZone::Domain', {
        KmsKeyIdentifier: {
          'Fn::GetAtt': ['teststacktestdomaincmkF602D0BB', 'Arn'],
        },
      });
    });
  });
});
