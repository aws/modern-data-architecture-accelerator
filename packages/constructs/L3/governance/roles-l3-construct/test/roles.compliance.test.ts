/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import {
  BasePersona,
  FederationProps,
  GenerateManagedPolicyWithNameProps,
  GenerateRoleWithNameProps,
  RolesL3Construct,
  RolesL3ConstructProps,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const policyDocument = {
    Statement: [
      {
        Sid: 'testStatement',
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
    {
      name: 'test-role7',
      trustedPrincipal: 'this_account',
      verbatimRoleName: true,
    },
    {
      name: 'test-role-webidentity',
      trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
      assumeRoleTrustConditions: {
        StringLike: {
          'gitlab.example.com:sub': 'project_path:my-org/my-repo:ref_type:branch:ref:main',
        },
      },
    },
    {
      name: 'test-role8',
      trustedPrincipal: 'this_account',
      additionalTrustedActions: ['sts:TagSession'],
    },
    {
      name: 'test-role9',
      trustedPrincipal: 'service:glue.amazonaws.com',
      additionalTrustedActions: ['sts:TagSession'],
    },
    {
      name: 'test-role10',
      trustedPrincipal: 'account:123456789',
      additionalTrustedActions: ['sts:TagSession'],
    },
    {
      name: 'test-role11',
      trustedPrincipal: 'arn:test-partition:iam::test-account:role/test-assuming-role',
      additionalTrustedActions: ['sts:TagSession'],
    },
    {
      name: 'test-role12',
      trustedPrincipal: 'this_account',
      additionalTrustedActions: [],
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
              Sid: 'testStatement',
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
  test('Role Based on MDAA Usage Profile, Additional Policies and Suppressions', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        ManagedPolicyArns: ['arn:test-partition:iam::aws:policy/test-aws-managed-policy'],
        RoleName: 'test-org-test-env-test-domain-test-module-test-usage-profile-2',
      }),
    );
  });
  test('Role with expected verbatim name', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test-org-test-env-test-domain-test-module-test-role1',
    });
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test-role7',
    });
  });

  test('Role with additionalTrustedActions on primary principal', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        RoleName: 'test-org-test-env-test-domain-test-module-test-role8',
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:root',
              },
            },
            {
              Action: 'sts:TagSession',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:root',
              },
            },
          ]),
        },
      }),
    );
  });

  test('Role with additionalTrustedActions on service principal', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        RoleName: 'test-org-test-env-test-domain-test-module-test-role9',
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'glue.amazonaws.com',
              },
            },
            {
              Action: 'sts:TagSession',
              Effect: 'Allow',
              Principal: {
                Service: 'glue.amazonaws.com',
              },
            },
          ]),
        },
      }),
    );
  });

  test('Role with additionalTrustedActions on account principal', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        RoleName: 'test-org-test-env-test-domain-test-module-test-role10',
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::123456789:root',
              },
            },
            {
              Action: 'sts:TagSession',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::123456789:root',
              },
            },
          ]),
        },
      }),
    );
  });

  test('Role with additionalTrustedActions on arn principal', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        RoleName: 'test-org-test-env-test-domain-test-module-test-role11',
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:role/test-assuming-role',
              },
            },
            {
              Action: 'sts:TagSession',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:role/test-assuming-role',
              },
            },
          ]),
        },
      }),
    );
  });

  test('Role with empty additionalTrustedActions produces no extra statement', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        RoleName: 'test-org-test-env-test-domain-test-module-test-role12',
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

  test('Role Federated WebIdentity Trust', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: {
                StringLike: {
                  'gitlab.example.com:sub': 'project_path:my-org/my-repo:ref_type:branch:ref:main',
                },
              },
              Effect: 'Allow',
              Principal: {
                Federated: 'arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
              },
            },
          ],
          Version: '2012-10-17',
        },
      }),
    );
  });
});

describe('additionalTrustedActions validation', () => {
  const testApp = new MdaaTestApp();

  test('rejects invalid action on primary principal', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'invalid-primary', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'this_account',
            additionalTrustedActions: ['s3:GetObject'],
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/Invalid action 's3:GetObject'/);
  });

  test('rejects wildcard action', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'invalid-wildcard', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'this_account',
            additionalTrustedActions: ['sts:*'],
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/Invalid action 'sts:\*'/);
  });

  test('rejects invalid action on additional principal', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'invalid-additional', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'this_account',
            additionalTrustedPrincipals: [
              {
                trustedPrincipal: 'service:glue.amazonaws.com',
                additionalTrustedActions: ['iam:PassRole'],
              },
            ],
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/Invalid action 'iam:PassRole'/);
  });

  test('rejects unrecognized trusted principal prefix', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'invalid-prefix', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'bogus:foo',
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/must start with service:, account:, webidentity:, federation: or equal 'this_account'/);
  });

  test('rejects webidentity primary principal without trust conditions', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-unscoped', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/webidentity trusted principals require assumeRoleTrustConditions/);
  });

  test('rejects webidentity primary principal with empty trust conditions ({})', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-empty-conditions', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // Empty conditions renders a statement with no effective scoping.
            assumeRoleTrustConditions: {},
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/webidentity trusted principals require assumeRoleTrustConditions/);
  });

  test('rejects webidentity primary principal with an empty condition operator ({ StringLike: {} })', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-empty-operator', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // Operator present but empty -> emits a Condition key that constrains nothing.
            assumeRoleTrustConditions: { StringLike: {} },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/webidentity trusted principals require assumeRoleTrustConditions/);
  });

  test('rejects webidentity trust conditions that only constrain an unrelated key', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-unrelated-key', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // Non-empty condition, but on a key unrelated to the OIDC provider -> principal is unscoped.
            assumeRoleTrustConditions: { StringEquals: { 'aws:RequestTag/team': 'data' } },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/at least one condition key beginning with 'gitlab.example.com:'/);
  });

  test('rejects a webidentity provider claim matched against a bare * wildcard', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-wildcard-value', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // Provider-prefixed key present, but '*' matches any subject -> unscoped.
            assumeRoleTrustConditions: { StringLike: { 'gitlab.example.com:sub': '*' } },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/at least one condition key beginning with 'gitlab.example.com:'/);
  });

  test('rejects a webidentity provider claim whose array value contains a bare * (IAM OR semantics)', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-array-wildcard', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // Array values are OR'd by IAM, so the '*' entry matches any identity.
            assumeRoleTrustConditions: {
              StringLike: { 'gitlab.example.com:sub': ['project_path:my-org/my-repo:*', '*'] },
            },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/at least one condition key beginning with 'gitlab.example.com:'/);
  });

  test('rejects a webidentity provider claim behind a negation operator (StringNotLike)', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-negation', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // "any subject except X" -> does not pin which identity may assume the role.
            assumeRoleTrustConditions: { StringNotLike: { 'gitlab.example.com:sub': 'project_path:blocked/*' } },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/at least one condition key beginning with 'gitlab.example.com:'/);
  });

  test('rejects a webidentity provider claim behind a ForAllValues set operator', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-forallvalues', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
            // ForAllValues is vacuously true when the claim is absent from the request.
            assumeRoleTrustConditions: {
              'ForAllValues:StringLike': { 'gitlab.example.com:sub': 'project_path:my-org/my-repo:*' },
            },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/at least one condition key beginning with 'gitlab.example.com:'/);
  });

  test('accepts a webidentity trust scoped on the provider :aud claim (e.g. Cognito identity pool)', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-aud-scoped', {
        generateRoles: [
          {
            name: 'cognito-role',
            trustedPrincipal:
              'webidentity:arn:test-partition:iam::test-account:oidc-provider/cognito-identity.amazonaws.com',
            // Cognito uses :aud (the identity-pool id) as the tenant boundary, not :sub.
            assumeRoleTrustConditions: {
              StringEquals: { 'cognito-identity.amazonaws.com:aud': 'us-east-1:pool-id' },
            },
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).not.toThrow();
  });

  test('rejects webidentity as an additional trusted principal', () => {
    expect(() => {
      new RolesL3Construct(new MdaaTestApp().testStack, 'webidentity-additional', {
        generateRoles: [
          {
            name: 'bad-role',
            trustedPrincipal: 'this_account',
            additionalTrustedPrincipals: [
              {
                trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
              },
            ],
          },
        ],
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      });
    }).toThrow(/webidentity trusted principals are not supported as additionalTrustedPrincipals/);
  });
});

describe('WebIdentity additionalTrustedActions scoping', () => {
  const testApp = new MdaaTestApp();
  new RolesL3Construct(testApp.testStack, 'webidentity-addl-actions', {
    generateRoles: [
      {
        name: 'gitlab-deploy',
        trustedPrincipal: 'webidentity:arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
        assumeRoleTrustConditions: {
          StringLike: {
            'gitlab.example.com:sub': 'project_path:my-org/my-repo:ref_type:branch:ref:main',
          },
        },
        additionalTrustedActions: ['sts:TagSession'],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });
  const template = Template.fromStack(testApp.testStack);

  test('additionalTrustedActions statement carries the same trust conditions', () => {
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:TagSession',
              Condition: {
                StringLike: {
                  'gitlab.example.com:sub': 'project_path:my-org/my-repo:ref_type:branch:ref:main',
                },
              },
              Effect: 'Allow',
              Principal: {
                Federated: 'arn:test-partition:iam::test-account:oidc-provider/gitlab.example.com',
              },
            }),
          ]),
        },
      }),
    );
  });
});

// Sharing exists because a consumer in another account cannot reconstruct a role's ARN: MDAA
// truncates a name at or over 64 characters with a hash of the untruncated name.
describe('Generated Role Parameter Sharing', () => {
  const testApp = new MdaaTestApp();

  new RolesL3Construct(testApp.testStack, 'test-share-stack', {
    generateRoles: [
      {
        name: 'shared-role',
        trustedPrincipal: 'service:s3.amazonaws.com',
        shareParametersWithAccounts: ['222222222222'],
      },
      {
        name: 'private-role',
        trustedPrincipal: 'this_account',
      },
      // An empty array is the other half of the guard's short-circuit: configured, but naming
      // nobody, so it must behave exactly like the field being absent.
      {
        name: 'empty-share-role',
        trustedPrincipal: 'this_account',
        shareParametersWithAccounts: [],
      },
    ],
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('An empty account list shares nothing and leaves the tier alone', () => {
    // Still exactly one share - the empty-array role must not add a second.
    template.resourceCountIs('AWS::RAM::ResourceShare', 1);
    const params = Object.values(template.findResources('AWS::SSM::Parameter')).filter(param =>
      String(param.Properties?.Name ?? '').includes('empty-share-role'),
    );
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toBeUndefined());
  });

  test('Share is confined to this account AWS Organization', () => {
    // RAM defaults to allowing external principals, so the restriction has to be explicit.
    template.hasResourceProperties('AWS::RAM::ResourceShare', {
      AllowExternalPrincipals: false,
    });
  });

  test('A sharing role gets one share, naming only the configured accounts', () => {
    template.resourceCountIs('AWS::RAM::ResourceShare', 1);
    template.hasResourceProperties('AWS::RAM::ResourceShare', { Principals: ['222222222222'] });
    // Each ARN is a Join over the parameter's own Ref, which also makes the share depend on the
    // parameters rather than racing them, so resolve the Refs back to parameter names.
    const share = Object.values(template.findResources('AWS::RAM::ResourceShare'))[0];
    const params = template.findResources('AWS::SSM::Parameter');
    const sharedArns = share.Properties.ResourceArns as { 'Fn::Join': [string, [string, { Ref: string }]] }[];
    const sharedNames = sharedArns.map(arn => params[arn['Fn::Join'][1][1].Ref].Properties.Name);
    expect(sharedNames.sort()).toEqual([
      '/test-org/test-domain/generated-role/shared-role/arn',
      '/test-org/test-domain/generated-role/shared-role/id',
    ]);
  });

  // RAM refuses to share a Standard-tier parameter, and an Advanced-tier parameter is billed, so
  // only the shared role's parameters change tier.
  test('Only the shared role publishes in the Advanced tier', () => {
    const tierByName = Object.fromEntries(
      Object.values(template.findResources('AWS::SSM::Parameter')).map(param => [
        param.Properties?.Name,
        param.Properties?.Tier,
      ]),
    );
    expect(tierByName['/test-org/test-domain/generated-role/shared-role/arn']).toEqual('Advanced');
    expect(tierByName['/test-org/test-domain/generated-role/shared-role/id']).toEqual('Advanced');
    expect(tierByName['/test-org/test-domain/generated-role/private-role/arn']).toBeUndefined();
    expect(tierByName['/test-org/test-domain/generated-role/private-role/id']).toBeUndefined();
  });
});
