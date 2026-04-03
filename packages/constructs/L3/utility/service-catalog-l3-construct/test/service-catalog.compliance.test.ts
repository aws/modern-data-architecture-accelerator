/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { PortfolioPropsWithAccess, ServiceCatalogL3Construct, ServiceCatalogL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const portfolio: PortfolioPropsWithAccess = {
    displayName: 'testing',
    providerName: 'testProvider',
    access: [{ refId: 'testingRef', arn: 'testing' }],
  };

  const constructProps: ServiceCatalogL3ConstructProps = {
    portfolios: [portfolio],
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new ServiceCatalogL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
  test('Portfolio', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::Portfolio', {
      DisplayName: 'testing',
      ProviderName: 'testProvider',
    });
  });

  test('Principal Association', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::PortfolioPrincipalAssociation', {
      PortfolioId: {
        Ref: 'teststacktestingportfolio85BB8A72',
      },
      PrincipalARN: 'testing',
      PrincipalType: 'IAM',
    });
  });
});

describe('Multiple Portfolios Tests', () => {
  const testApp = new MdaaTestApp();

  const portfolio1: PortfolioPropsWithAccess = {
    displayName: 'portfolio-one',
    providerName: 'providerOne',
    access: [{ refId: 'ref1', arn: 'arn:test-partition:iam::test-account:role/role1' }],
  };

  const portfolio2: PortfolioPropsWithAccess = {
    displayName: 'portfolio-two',
    providerName: 'providerTwo',
    access: [
      { refId: 'ref2', arn: 'arn:test-partition:iam::test-account:role/role2' },
      { refId: 'ref3', arn: 'arn:test-partition:iam::test-account:role/role3' },
    ],
  };

  const constructProps: ServiceCatalogL3ConstructProps = {
    portfolios: [portfolio1, portfolio2],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new ServiceCatalogL3Construct(testApp.testStack, 'multi-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Portfolio Resource Count', () => {
    template.resourceCountIs('AWS::ServiceCatalog::Portfolio', 2);
  });

  test('Multiple Principal Associations', () => {
    // portfolio1 has 1 access, portfolio2 has 2 accesses = 3 total
    template.resourceCountIs('AWS::ServiceCatalog::PortfolioPrincipalAssociation', 3);
  });

  test('Portfolio One Properties', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::Portfolio', {
      DisplayName: 'portfolio-one',
      ProviderName: 'providerOne',
    });
  });

  test('Portfolio Two Properties', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::Portfolio', {
      DisplayName: 'portfolio-two',
      ProviderName: 'providerTwo',
    });
  });
});
