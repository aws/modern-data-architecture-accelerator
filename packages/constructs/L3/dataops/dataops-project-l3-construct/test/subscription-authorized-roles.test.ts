/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DomainConfig } from '@aws-mdaa/datazone-constructs';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps, SubscriptionAuthorizedRoleGroup } from '../lib';
import * as path from 'node:path';

const roleArn = (name: string, account = 'test-account') => `arn:test-partition:iam::${account}:role/${name}`;

const ETL_ROLE: MdaaRoleRef = { arn: roleArn('etl-role') };
const ENGINEER_ROLE: MdaaRoleRef = { arn: roleArn('engineer-role') };
const ADMIN_ROLE: MdaaRoleRef = { arn: roleArn('admin-role') };

interface RoleGroups {
  readonly projectExecutionRoleRefs?: MdaaRoleRef[];
  readonly dataEngineerRoleRefs?: MdaaRoleRef[];
  readonly dataAdminRoleRefs?: MdaaRoleRef[];
}

describe('subscriptionAuthorizedRoleGroups', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  const baseProps = (roles: RoleGroups): DataOpsProjectL3ConstructProps => ({
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(
      testApp.testStack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    ),
    projectExecutionRoleRefs: roles.projectExecutionRoleRefs ?? [ETL_ROLE],
    dataEngineerRoleRefs: roles.dataEngineerRoleRefs ?? [ENGINEER_ROLE],
    dataAdminRoleRefs: roles.dataAdminRoleRefs ?? [ADMIN_ROLE],
  });

  const sagemakerProject = (groups?: SubscriptionAuthorizedRoleGroup[], roles: RoleGroups = {}) =>
    new DataOpsProjectL3Construct(testApp.testStack, 'test-construct', {
      ...baseProps(roles),
      sagemaker: {
        domainConfigSSMParam: '/test/sagemaker/config',
        project: { profileName: 'test-profile' },
        subscriptionAuthorizedRoleGroups: groups,
      },
    });

  const datazoneProject = (groups?: SubscriptionAuthorizedRoleGroup[], roles: RoleGroups = {}) =>
    new DataOpsProjectL3Construct(testApp.testStack, 'test-construct', {
      ...baseProps(roles),
      datazone: {
        project: { domainConfigSSMParam: '/test/datazone/config' },
        subscriptionAuthorizedRoleGroups: groups,
      },
    });

  const template = () => Template.fromStack(testApp.testStack);

  const taggedRoleArns = (): string[] => {
    const taggers = Object.values(template().findResources('Custom::DataZoneProjectRoleTagger'));
    expect(taggers).toHaveLength(1);
    return taggers[0].Properties.roleArns;
  };

  const catalogKeyPolicy = () =>
    Object.fromEntries(
      Object.entries(template().findResources('AWS::IAM::ManagedPolicy')).filter(([logicalId]) =>
        logicalId.startsWith('subscriptioncatalogkeyaccesspolicy'),
      ),
    );

  const catalogKeyPolicyRoles = (): string[] => {
    const policies = Object.values(catalogKeyPolicy());
    expect(policies).toHaveLength(1);
    return policies[0].Properties.Roles;
  };

  const authorizedPrincipals = (): unknown[] =>
    Object.values(template().findResources('AWS::DataZone::SubscriptionTarget'))[0].Properties.AuthorizedPrincipals;

  const expectWarning = (pattern: string) =>
    Annotations.fromStack(testApp.testStack).hasWarning('*', Match.stringLikeRegexp(pattern));

  describe('sagemaker path', () => {
    test('tags exactly the listed groups roles and grants them the domain catalog keys', () => {
      sagemakerProject(['projectExecutionRoles', 'dataEngineerRoles']);

      expect(taggedRoleArns()).toEqual([roleArn('etl-role'), roleArn('engineer-role')]);
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role', 'engineer-role']);
      const catalogKeys = { Ref: expect.stringMatching(/gluecatalogkmsarns/) };
      expect(Object.values(catalogKeyPolicy())[0].Properties.PolicyDocument.Statement).toEqual([
        { Effect: 'Allow', Action: 'kms:DescribeKey', Resource: catalogKeys },
        {
          Effect: 'Allow',
          Action: 'kms:Decrypt',
          Resource: catalogKeys,
          Condition: { StringEquals: { 'kms:ViaService': 'glue.test-region.amazonaws.com' } },
        },
      ]);
    });

    test('tags the SMUS project ID', () => {
      sagemakerProject(['dataAdminRoles']);

      const tagger = Object.values(template().findResources('Custom::DataZoneProjectRoleTagger'))[0].Properties;
      const projectIds = Object.keys(template().findResources('AWS::DataZone::Project'));
      expect(projectIds).toHaveLength(1);
      expect(tagger.projectId).toEqual({ 'Fn::GetAtt': [projectIds[0], 'Id'] });
      expect(tagger.roleArns).toEqual([roleArn('admin-role')]);
    });

    test('lists a role referenced by two groups once', () => {
      sagemakerProject(['projectExecutionRoles', 'dataAdminRoles'], { dataAdminRoleRefs: [ETL_ROLE, ADMIN_ROLE] });

      expect(taggedRoleArns()).toEqual([roleArn('etl-role'), roleArn('admin-role')]);
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role', 'admin-role']);
    });

    test('lists a role referenced by name in one group and by ARN in another once', () => {
      sagemakerProject(['projectExecutionRoles', 'dataAdminRoles'], {
        projectExecutionRoleRefs: [{ name: 'etl-role' }],
        dataAdminRoleRefs: [ETL_ROLE, ADMIN_ROLE],
      });

      expect(taggedRoleArns()).toEqual([
        { 'Fn::GetAtt': [expect.stringMatching(/^RoleRes/), 'arn'] },
        roleArn('admin-role'),
      ]);
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role', 'admin-role']);
    });

    test('names a role referenced by a literal ARN with a path by its role name in the policy', () => {
      sagemakerProject(['projectExecutionRoles'], { projectExecutionRoleRefs: [{ arn: roleArn('service-role/etl') }] });

      expect(taggedRoleArns()).toEqual([roleArn('service-role/etl')]);
      expect(catalogKeyPolicyRoles()).toEqual(['etl']);
    });

    test('leaves out sso, immutable, and Identity Center ARN or name roles with a warning', () => {
      sagemakerProject(['dataEngineerRoles', 'dataAdminRoles'], {
        dataEngineerRoleRefs: [{ name: 'sso-engineer', sso: true }, ENGINEER_ROLE],
        dataAdminRoleRefs: [
          { arn: roleArn('managed-admin'), immutable: true },
          { arn: roleArn('aws-reserved/sso.amazonaws.com/test-region/AWSReservedSSO_Admin_abc123') },
          { name: 'AWSReservedSSO_Analyst_def456' },
        ],
      });

      expect(taggedRoleArns()).toEqual([roleArn('engineer-role')]);
      expect(catalogKeyPolicyRoles()).toEqual(['engineer-role']);
      expectWarning("Role reference 'DataEngineer-0' is immutable or an IAM Identity Center role");
      expectWarning("Role reference 'DataAdmin-0' is immutable or an IAM Identity Center role");
      expectWarning(
        "Role reference 'DataAdmin-1' is immutable or an IAM Identity Center role, which MDAA does not modify, " +
          "so it is not authorized into the project's subscribed assets.",
      );
      expectWarning("Role reference 'DataAdmin-2' is immutable or an IAM Identity Center role");
    });

    test('creates nothing when every listed role is unmodifiable', () => {
      sagemakerProject(['dataEngineerRoles'], { dataEngineerRoleRefs: [{ name: 'sso-engineer', sso: true }] });

      template().resourceCountIs('Custom::DataZoneProjectRoleTagger', 0);
      expect(catalogKeyPolicy()).toEqual({});
    });

    test('tags a role whose ARN resolves only at deploy time', () => {
      sagemakerProject(['projectExecutionRoles'], { projectExecutionRoleRefs: [{ name: 'deploy-time-role' }] });

      expect(taggedRoleArns()).toEqual([{ 'Fn::GetAtt': [expect.stringMatching(/^RoleRes/), 'arn'] }]);
      expect(catalogKeyPolicyRoles()).toEqual(['deploy-time-role']);
    });

    test('leaves out a role in another account with a warning', () => {
      sagemakerProject(['projectExecutionRoles'], {
        projectExecutionRoleRefs: [ETL_ROLE, { arn: roleArn('remote-etl', '222222222222') }],
      });

      expect(taggedRoleArns()).toEqual([roleArn('etl-role')]);
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role']);
      expectWarning("Role reference 'ProjectExRoles-1' is in another account");
    });

    test('warns about a role in another account that shares a local role name', () => {
      sagemakerProject(['projectExecutionRoles'], {
        projectExecutionRoleRefs: [ETL_ROLE, { arn: roleArn('etl-role', '222222222222') }],
      });

      expect(taggedRoleArns()).toEqual([roleArn('etl-role')]);
      expectWarning("Role reference 'ProjectExRoles-1' is in another account");
    });

    test.each([
      ['unset', undefined],
      ['empty', []],
    ])('creates no tagger or catalog key policy when the option is %s', (_, groups) => {
      sagemakerProject(groups);

      template().resourceCountIs('Custom::DataZoneProjectRoleTagger', 0);
      expect(catalogKeyPolicy()).toEqual({});
    });

    test('rejects an unknown group name', () => {
      expect(() => sagemakerProject(['bogusRoles' as SubscriptionAuthorizedRoleGroup])).toThrow(
        "Unknown subscriptionAuthorizedRoleGroups entry 'bogusRoles'; expected one of projectExecutionRoles, " +
          'dataEngineerRoles, dataAdminRoles',
      );
    });
  });

  describe('datazone path', () => {
    const envUserRole = { 'Fn::GetAtt': [Match.stringLikeRegexp('dzuserrole'), 'Arn'] };

    test('authorizes the env role followed by each listed role once, and creates no tagger', () => {
      datazoneProject(['projectExecutionRoles', 'dataAdminRoles'], { dataAdminRoleRefs: [ETL_ROLE, ADMIN_ROLE] });

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole, roleArn('etl-role'), roleArn('admin-role')],
      });
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role', 'admin-role']);
      template().resourceCountIs('Custom::DataZoneProjectRoleTagger', 0);
    });

    test('authorizes immutable roles whose dynamic-reference ARNs end the same way as distinct roles', () => {
      const teamA = '{{resolve:ssm:/test/team-a/etl/arn}}';
      const teamB = '{{resolve:ssm:/test/team-b/etl/arn}}';
      datazoneProject(['dataAdminRoles'], {
        dataAdminRoleRefs: [
          { arn: teamA, immutable: true },
          { arn: teamB, immutable: true },
        ],
      });

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole, teamA, teamB],
      });
    });

    test('authorizes an immutable role but attaches no catalog key policy to it', () => {
      datazoneProject(['dataEngineerRoles'], {
        dataEngineerRoleRefs: [{ arn: roleArn('managed-engineer'), immutable: true }, ENGINEER_ROLE],
      });

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole, roleArn('managed-engineer'), roleArn('engineer-role')],
      });
      expect(catalogKeyPolicyRoles()).toEqual(['engineer-role']);
      expectWarning(
        "Role reference 'DataEngineer-0' is immutable or an IAM Identity Center role, which MDAA does not modify, " +
          "so it gets no decrypt access to the domain's Glue catalog keys",
      );
    });

    test('leaves out a role in another account with a warning', () => {
      datazoneProject(['projectExecutionRoles'], {
        projectExecutionRoleRefs: [{ arn: roleArn('remote-etl', '222222222222') }, ETL_ROLE],
      });

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole, roleArn('etl-role')],
      });
      expect(catalogKeyPolicyRoles()).toEqual(['etl-role']);
      expectWarning("Role reference 'ProjectExRoles-0' is in another account");
    });

    test.each([
      ['unset', undefined],
      ['empty', []],
    ])('authorizes only the env role when the option is %s', (_, groups) => {
      datazoneProject(groups);

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole],
      });
      expect(catalogKeyPolicy()).toEqual({});
    });

    test('authorizes the roles but creates no catalog key policy when the domain has no catalog keys', () => {
      new DataOpsProjectL3Construct(testApp.testStack, 'test-construct', {
        ...baseProps({}),
        datazone: {
          project: {
            domainConfig: new DomainConfig(testApp.testStack, 'test-domain-config', {
              naming: testApp.naming,
              ssmParamBase: '/test/datazone/config',
              glueCatalogKmsKeyArns: [],
            }),
          },
          subscriptionAuthorizedRoleGroups: ['projectExecutionRoles'],
        },
      });

      template().hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
        AuthorizedPrincipals: [envUserRole, roleArn('etl-role')],
      });
      expect(catalogKeyPolicy()).toEqual({});
    });

    test('rejects more roles than a subscription target can authorize', () => {
      const engineers = Array.from({ length: 10 }, (_, i) => ({ arn: roleArn(`engineer-${i}`) }));

      expect(() => datazoneProject(['dataEngineerRoles'], { dataEngineerRoleRefs: engineers })).toThrow(
        'datazone.subscriptionAuthorizedRoleGroups lists 10 distinct role references, but a DataZone subscription target ' +
          'authorizes at most 9 besides the environment user role.',
      );
    });

    test('does not count duplicate or cross-account roles toward the cap', () => {
      const engineers = Array.from({ length: 9 }, (_, i) => ({ arn: roleArn(`engineer-${i}`) }));

      datazoneProject(['dataEngineerRoles', 'dataAdminRoles'], {
        dataEngineerRoleRefs: engineers,
        dataAdminRoleRefs: [{ name: 'engineer-0' }, { arn: roleArn('remote-admin', '222222222222') }],
      });

      expect(authorizedPrincipals()).toHaveLength(10);
    });

    test('accepts nine roles', () => {
      const engineers = Array.from({ length: 9 }, (_, i) => ({ arn: roleArn(`engineer-${i}`) }));

      datazoneProject(['dataEngineerRoles'], { dataEngineerRoleRefs: engineers });

      expect(authorizedPrincipals()).toHaveLength(10);
    });
  });
});
