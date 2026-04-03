/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template } from 'aws-cdk-lib/assertions';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import {
  GlueCatalogL3Construct,
  GlueCatalogL3ConstructProps,
  CatalogAccessPolicyProps,
} from '../lib/glue-catalog-l3-construct';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const catalogAccessPolicyProps: CatalogAccessPolicyProps = {
    resources: ['test-resource-1'],
    readPrincipalArns: ['arn:test-partition:iam::test-account:testread'],
    writePrincipalArns: ['arn:test-partition:iam::test-account:testwrite'],
  };

  const constructProps: GlueCatalogL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    accessPolicies: { ['test-access-policy']: catalogAccessPolicyProps },
    consumerAccounts: { id: 'test1' },
    kmsKeyConsumerAccounts: { id: 'test3' },
    producerAccounts: { id: 'test2' },
  };

  new GlueCatalogL3Construct(testApp.testStack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  //console.log(JSON.stringify(template,undefined,2))

  test('GlueCatalogSettings', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      CatalogId: 'test-account',
      DataCatalogEncryptionSettings: {
        ConnectionPasswordEncryption: {
          KmsKeyId: {
            'Fn::GetAtt': ['kmscmkF9184590', 'Arn'],
          },
          ReturnConnectionPasswordEncrypted: true,
        },
        EncryptionAtRest: {
          CatalogEncryptionMode: 'SSE-KMS',
          SseAwsKmsKeyId: {
            'Fn::GetAtt': ['kmscmkF9184590', 'Arn'],
          },
        },
      },
    });
  });
});

describe('Multiple Access Policies and Accounts Tests', () => {
  const testApp = new MdaaTestApp();

  const accessPolicy1: CatalogAccessPolicyProps = {
    resources: ['database/db-one'],
    readPrincipalArns: ['arn:test-partition:iam::test-account:role/reader-one'],
  };

  const accessPolicy2: CatalogAccessPolicyProps = {
    resources: ['database/db-two'],
    readPrincipalArns: ['arn:test-partition:iam::test-account:role/reader-two'],
    writePrincipalArns: ['arn:test-partition:iam::test-account:role/writer-two'],
  };

  const constructProps: GlueCatalogL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    accessPolicies: {
      'policy-one': accessPolicy1,
      'policy-two': accessPolicy2,
    },
    consumerAccounts: {
      consumer1: '111111111111',
      consumer2: '222222222222',
    },
    producerAccounts: {
      producer1: '333333333333',
      producer2: '444444444444',
    },
  };

  new GlueCatalogL3Construct(testApp.testStack, 'multistack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Athena Data Catalogs for Producer Accounts', () => {
    template.resourceCountIs('AWS::Athena::DataCatalog', 2);
  });

  test('Producer One Athena Catalog', () => {
    template.hasResourceProperties('AWS::Athena::DataCatalog', {
      Name: 'producer1',
      Type: 'GLUE',
      Parameters: {
        'catalog-id': '333333333333',
      },
    });
  });

  test('Producer Two Athena Catalog', () => {
    template.hasResourceProperties('AWS::Athena::DataCatalog', {
      Name: 'producer2',
      Type: 'GLUE',
      Parameters: {
        'catalog-id': '444444444444',
      },
    });
  });

  test('GlueCatalogSettings Created', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      CatalogId: 'test-account',
    });
  });
});
