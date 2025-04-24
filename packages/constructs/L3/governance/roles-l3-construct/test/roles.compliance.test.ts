/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Match } from 'aws-cdk-lib/assertions';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import {
  FederationProps,
  GenerateManagedPolicyWithNameProps,
  GenerateRoleWithNameProps,
  RolesL3Construct,
  RolesL3ConstructProps,
  BasePersona,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const policyDocument = {
    Statement: [
      {
        Sid: 'test-statement',
        Action: 's3:GetObject',
        Resource: 'arn:test-partition:s3:::test-bucket/*',
        Effect: 'Allow',
      },
    ],
  };

  const generatePolicies: GenerateManagedPolicyWithNameProps[] = [
    {
      name: 'test-policy1',
      policyDocument: PolicyDocument.fromJson(policyDocument),
      suppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'unit testing',
        },
      ],
    },
    {
      name: 'test-policy2',
      verbatimPolicyName: true,
      policyDocument: PolicyDocument.fromJson(policyDocument),
      suppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'unit testing',
        },
      ],
    },
  ];

  const generateRoles: GenerateRoleWithNameProps[] = [
    {
      name: 'test-role1',
      trustedPrincipal: 'this_account',
      generatedPolicies: ['test-policy1'],
      customerManagedPolicies: ['test-managed-policy'],
      awsManagedPolicies: ['test-aws-managed-policy'],
      suppressions: [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'unit testing',
        },
      ],
    },
    {
      name: 'test-role2',
      trustedPrincipal: 'service:glue.amazonaws.com',
      additionalTrustedPrincipals: [{ trustedPrincipal: 'service:lakeformation.amazonaws.com' }],
    },
    {
      name: 'test-role3',
      trustedPrincipal: 'federation:federation1',
    },
    {
      name: 'test-role4',
      trustedPrincipal: 'account:123456789',
    },
    {
      name: 'test-role5',
      trustedPrincipal: 'arn:test-partition:iam::test-account:role/test-assuming-role',
    },
    {
      name: 'test-role6',
      trustedPrincipal: 'account:123456789',
      assumeRoleTrustConditions: {
        StringEquals: {
          'aws:PrincipalArn': 'arn:test-partition:iam::test-account:role/test-assuming-role',
        },
      },
    },
    {
      name: 'test-usage-profile',
      trustedPrincipal: 'account:123456789',
      basePersona: BasePersona.DATA_ADMIN,
    },
    {
      name: 'test-usage-profile-2',
      trustedPrincipal: 'account:123456789',
      basePersona: BasePersona.DATA_SCIENTIST,
      awsManagedPolicies: ['test-aws-managed-policy'],
      suppressions: [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'unit testing',
        },
      ],
    },
  ];

  const federation1: FederationProps = {
    providerArn: 'test-arn',
  };

  const federation2: FederationProps = {
    samlDoc: './test/test-saml.xml',
  };

  const federations = {
    federation1: federation1,
    federation2: federation2,
  };

  const constructProps: RolesL3ConstructProps = {
    federations: federations,
    generateRoles: generateRoles,
    generatePolicies: generatePolicies,
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new RolesL3Construct(testApp.testStack, 'test-stack', constructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  test('Federation Provider from SAML Doc', () => {
    template.hasResourceProperties('AWS::IAM::SAMLProvider', {
      SamlMetadataDocument: '<xml></xml>',
      Name: 'test-org-test-env-test-domain-test-module-federation2',
    });
  });
  test('Generate MDAA Managed Usage Policy', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-data-scientis--aa316df',
        Roles: [
          {
            Ref: 'testusageprofile26942D4A0',
          },
        ],
      }),
    );
  });
  test('Generate Managed Policy', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-test-policy1',
        Path: '/',
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'arn:test-partition:s3:::test-bucket/*',
              Sid: 'test-statement',
            },
          ],
          Version: '2012-10-17',
        },
        Roles: [
          {
            Ref: 'testrole1F884210D',
          },
        ],
      }),
    );
  });

  test('Generate Managed Policy Verbatim Name', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        ManagedPolicyName: 'test-policy2',
      }),
    );
  });

  test('Role Account Trust', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:root',
              },
            },
          ],
        },
      }),
    );
  });

  test('Role Federated SAML Trust', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRoleWithSAML',
              Effect: 'Allow',
              Principal: {
                Federated: 'test-arn',
              },
            },
          ],
          Version: '2012-10-17',
        },
      }),
    );
  });

  test('Role Multi Service Trust', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'glue.amazonaws.com',
              },
            },
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lakeformation.amazonaws.com',
              },
            },
          ],
        },
      }),
    );
  });
  test('Role Role Trust', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:role/test-assuming-role',
              },
            },
          ],
        },
      }),
    );
  });
  test('Role Trust Conditions', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Condition: {
                StringEquals: {
                  'aws:PrincipalArn': 'arn:test-partition:iam::test-account:role/test-assuming-role',
                },
              },
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::123456789:root',
              },
            },
          ],
          Version: '2012-10-17',
        },
      }),
    );
  });
  test('Role Managed Policies', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        ManagedPolicyArns: [
          'arn:test-partition:iam::aws:policy/test-aws-managed-policy',
          'arn:test-partition:iam::test-account:policy/test-managed-policy',
        ],
      }),
    );
  });
  test('Role Based on MDAA Usage Profile', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-data-admin-ba-69e17cd8',
        Roles: [
          {
            Ref: 'testusageprofile1A5918BD',
          },
        ],
      }),
    );
  });
  test('Role Based on MDAA Usage Profile, Additional Policies and Suppressions ', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        ManagedPolicyArns: ['arn:test-partition:iam::aws:policy/test-aws-managed-policy'],
        RoleName: 'test-org-test-env-test-domain-test-module-test-usage-profile-2',
      }),
    );
  });
});
