/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
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
    createCdkLFAdmin: true,
    createDataZoneAdminRole: true,
    s3TablesIntegration: {
      enabled: true,
    },
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  console.log(JSON.stringify(template, undefined, 2));

  test('LakeFormationSettings', () => {
    template.hasResourceProperties('Custom::lakeformation-settings', {
      account: 'test-account',
      dataLakeSettings: {
        DataLakeAdmins: [
          {
            DataLakePrincipalIdentifier: 'arn:test-partition:iam::test-account:role/TestAccess',
          },
          {
            DataLakePrincipalIdentifier:
              'arn:test-partition:iam::test-account:role/cdk-hnb659fds-cfn-exec-role-test-account-test-region',
          },
          { DataLakePrincipalIdentifier: { 'Fn::GetAtt': ['teststackdatazonemanageaccessroleF842C73A', 'Arn'] } },
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
          CROSS_ACCOUNT_VERSION: '4',
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

  // Regression guard for the cross-account IdC fix:
  // sso application resource ARN must use a wildcard ('*') in the account segment,
  // otherwise CreateLakeFormationIdentityCenterConfiguration is denied when the
  // IdC instance lives in a different account than the data platform account.
  test('IdcIntegration: SSO application resource ARN uses wildcard account segment', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith([
              'sso:PutApplicationAssignmentConfiguration',
              'sso:CreateApplication',
              'sso:DeleteApplication',
              'sso:DescribeApplication',
            ]),
            Resource: Match.arrayWith([
              'arn:test-partition:sso:::instance/test-sso-instance',
              'arn:test-partition:sso::*:application/test-sso-instance/*',
              'arn:aws:sso::aws:applicationProvider/*',
            ]),
          }),
        ]),
      },
    });
  });
  test('S3TablesIntegration', () => {
    template.hasResourceProperties('Custom::lakeformation-s3tables-integration', {
      catalogName: 's3tablescatalog',
      federatedCatalogIdentifier: 'arn:test-partition:s3tables:test-region:test-account:bucket/*',
      connectionName: 'aws:s3tables',
      removeOnDelete: false,
    });
  });
  // Catalog actions are scoped to the account catalog + the exact s3tablescatalog catalog + its
  // child-path wildcard, NOT a bare catalog* or catalog/s3tablescatalog* prefix glob (which would match
  // unrelated or same-prefix catalogs and is risky for glue:DeleteCatalog). glue:DeleteCatalog is only
  // granted when removeOnDelete is set, so this default (removeOnDelete unset) case is CreateCatalog only
  // — asserted as an exact scalar action so a stray glue:* would fail. Pinned to the stable handler
  // policy name so the assertion cannot pass against a different policy in the template.
  test('S3TablesIntegration: handler role grants only glue:CreateCatalog by default, scoped to the s3tablescatalog hierarchy', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'lakeformation-s3tables-integration-handler',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'glue:CreateCatalog',
            Resource: [
              'arn:test-partition:glue:test-region:test-account:catalog',
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog',
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog/*',
            ],
          }),
        ]),
      },
    });
  });
  // glue:PassConnection acts on the connection resource, not the catalog, so it must be scoped to
  // the service-managed aws:s3tables connection ARN (regression guard for the deploy-time
  // AccessDenied on glue:PassConnection).
  test('S3TablesIntegration: handler role grants glue:PassConnection on the aws:s3tables connection', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'lakeformation-s3tables-integration-handler',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'glue:PassConnection',
            Resource: 'arn:test-partition:glue:test-region:test-account:connection/aws:s3tables',
          }),
        ]),
      },
    });
  });
  // The strict-governance mismatch warning must NOT fire here: iamAllowedPrincipalsDefault is true.
  test('S3TablesIntegration: no IAM-access warning when iamAllowedPrincipalsDefault is true', () => {
    const annotations = Annotations.fromStack(testApp.testStack);
    annotations.hasNoWarning(
      '*',
      Match.stringLikeRegexp('.*s3TablesIntegration is enabled while iamAllowedPrincipalsDefault is false.*'),
    );
  });
  test('DZ Management Role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'aws:SourceAccount': 'test-account',
              },
            },
            Effect: 'Allow',
            Principal: {
              Service: 'datazone.amazonaws.com',
            },
          },
        ],
        Version: '2012-10-17',
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':iam::aws:policy/service-role/AmazonDataZoneGlueManageAccessRolePolicy',
            ],
          ],
        },
      ],
      RoleName: 'test-org-test-env-test-domain-test-module-datazone-man--6d477660',
    });
  });
});

// Exercises the alternate branches: S3 Tables integration disabled (no custom
// resource emitted), IAM Identity Center omitted (no IdC config), and
// dataZoneAdminTrustAccounts populated (extra AssumeRole trust statements).
describe('MDAA Compliance Stack Tests - Alternate Configuration', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const lakeFormationAccessControlConfigParser: MdaaRoleRef = {
    id: 'test-role-access-control',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [lakeFormationAccessControlConfigParser],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: true,
    createCdkLFAdmin: true,
    createDataZoneAdminRole: true,
    dataZoneAdminTrustAccounts: ['test-account', 'other-trust-account'],
    s3TablesIntegration: {
      enabled: false,
    },
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('S3TablesIntegration disabled: no custom resource emitted', () => {
    template.resourceCountIs('Custom::lakeformation-s3tables-integration', 0);
  });

  test('IdcIntegration omitted: no IdC config emitted', () => {
    template.resourceCountIs('Custom::lakeformation-idc-configs', 0);
  });

  // dataZoneAdminTrustAccounts adds an AssumeRole statement per account that is
  // not the current account; the current account ('test-account') is filtered out.
  test('DZ Management Role: trust statement added for external trust account', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'aws:SourceAccount': 'other-trust-account',
              },
            },
            Effect: 'Allow',
            Principal: {
              Service: 'datazone.amazonaws.com',
            },
          }),
        ]),
      },
    });
  });
});

// Pins the destructive opt-in path: removeOnDelete=true must resolve to true on
// the custom resource so the shared s3tablescatalog Glue catalog is torn down
// (DeleteCatalog) on stack delete.
describe('MDAA Compliance Stack Tests - S3 Tables removeOnDelete enabled', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const lakeFormationAccessControlConfigParser: MdaaRoleRef = {
    id: 'test-role-access-control',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [lakeFormationAccessControlConfigParser],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: true,
    createCdkLFAdmin: true,
    s3TablesIntegration: {
      enabled: true,
      removeOnDelete: true,
    },
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('S3TablesIntegration: removeOnDelete resolves to true on the custom resource', () => {
    template.hasResourceProperties('Custom::lakeformation-s3tables-integration', {
      catalogName: 's3tablescatalog',
      removeOnDelete: true,
    });
  });

  // glue:CreateCatalog stays scoped to all three ARNs (it needs the account-root catalog to create a
  // top-level catalog), asserted as an exact scalar action so a stray glue:* would fail.
  test('S3TablesIntegration: glue:CreateCatalog scoped to all three catalog ARNs when removeOnDelete is enabled', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'lakeformation-s3tables-integration-handler',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'glue:CreateCatalog',
            Resource: [
              'arn:test-partition:glue:test-region:test-account:catalog',
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog',
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog/*',
            ],
          }),
        ]),
      },
    });
  });

  // The destructive glue:DeleteCatalog is a SEPARATE statement scoped to only the s3tablescatalog catalog
  // and its child path — deliberately NOT the account-root catalog ARN — so the exact two-entry Resource
  // array is the regression guard against re-widening the destructive blast radius.
  test('S3TablesIntegration: glue:DeleteCatalog is a separate statement scoped off the account-root catalog', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'lakeformation-s3tables-integration-handler',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'glue:DeleteCatalog',
            Resource: [
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog',
              'arn:test-partition:glue:test-region:test-account:catalog/s3tablescatalog/*',
            ],
          }),
        ]),
      },
    });
  });
});

// Exercises the optional-chaining short-circuit of the enabled guard
// (!this.props.s3TablesIntegration?.enabled) when the config object is omitted
// entirely rather than set to { enabled: false }.
describe('MDAA Compliance Stack Tests - S3 Tables config omitted', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const lakeFormationAccessControlConfigParser: MdaaRoleRef = {
    id: 'test-role-access-control',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [lakeFormationAccessControlConfigParser],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: true,
    createCdkLFAdmin: true,
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('S3TablesIntegration omitted: no custom resource emitted', () => {
    template.resourceCountIs('Custom::lakeformation-s3tables-integration', 0);
  });
});

// Enabling the integration under strict Lake-Formation-only governance
// (iamAllowedPrincipalsDefault: false) is a legitimate but contradictory posture: the
// s3tablescatalog catalog is still created with IAM_ALLOWED_PRINCIPALS defaults. The
// construct must surface that at synth as a warning rather than throwing or staying silent.
describe('MDAA Compliance Stack Tests - S3 Tables enabled with strict governance', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const lakeFormationAccessControlConfigParser: MdaaRoleRef = {
    id: 'test-role-access-control',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [lakeFormationAccessControlConfigParser],
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: false,
    createCdkLFAdmin: true,
    s3TablesIntegration: {
      enabled: true,
    },
  };

  new LakeFormationSettingsL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('S3TablesIntegration: warns when enabled while iamAllowedPrincipalsDefault is false', () => {
    const annotations = Annotations.fromStack(testApp.testStack);
    annotations.hasWarning(
      '*',
      Match.stringLikeRegexp('.*s3TablesIntegration is enabled while iamAllowedPrincipalsDefault is false.*'),
    );
  });

  // Still emits the custom resource: the mismatch is a warning, not a hard block.
  test('S3TablesIntegration: still emitted under strict governance', () => {
    template.resourceCountIs('Custom::lakeformation-s3tables-integration', 1);
  });
});
