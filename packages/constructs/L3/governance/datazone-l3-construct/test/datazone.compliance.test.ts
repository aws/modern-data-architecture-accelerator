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
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: DataZoneL3ConstructProps = {
    glueCatalogKmsKeyArn: 'test-key-arn',
    crossAccountStacks: {
      '12312421': new Stack(testApp, 'testextrastack'),
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
        additionalAdminUsers: {
          test1: {
            role: {
              name: 'test1',
            },
            userType: 'IAM_ROLE',
          },
          test2: {
            role: {
              name: 'test2',
            },
            userType: 'SSO_USER',
          },
        },
        associatedAccounts: {
          test1: {
            account: '12312421',
            glueCatalogKmsKeyArn: 'test-associated-key-arn',
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
