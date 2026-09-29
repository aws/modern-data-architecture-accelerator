/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import {
  ADMIN_ACTIONS,
  CROSS_ACCOUNT_ADMIN_ACTIONS,
  CROSS_ACCOUNT_USER_ACTIONS,
  MdaaKmsKey,
  MdaaKmsKeyProps,
  USER_ACTIONS,
} from '../lib';
import { MdaaRoleHelper, MdaaResolvableRole } from '@aws-mdaa/iam-role-helper';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const userRole1 = testRoleHelper.resolveRoleRef({ refId: 'user1', id: 'test-user-id1' });
  const userRole2 = testRoleHelper.resolveRoleRef({ refId: 'user2', id: 'test-user-id2' });
  const adminRole1 = testRoleHelper.resolveRoleRef({ refId: 'admin1', id: 'test-admin-id1' });
  const adminRole2 = testRoleHelper.resolveRoleRef({ refId: 'admin2', id: 'test-admin-id2' });

  const testContstructProps: MdaaKmsKeyProps = {
    naming: testApp.naming,
    alias: 'test-key',
    keyUserRoles: [userRole1, userRole2],
    keyAdminRoles: [adminRole1, adminRole2],
    createOutputs: false,
    createParams: false,
  };

  new MdaaKmsKey(testApp.testStack, 'test-construct', testContstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('AliasName', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/' + testApp.naming.resourceName('test-key'),
    });
  });

  test('KeyAdminPolicyStatement', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Action: [
              'kms:Create*',
              'kms:Describe*',
              'kms:Enable*',
              'kms:List*',
              'kms:Put*',
              'kms:Update*',
              'kms:Revoke*',
              'kms:Disable*',
              'kms:Get*',
              'kms:Delete*',
              'kms:TagResource',
              'kms:UntagResource',
              'kms:ScheduleKeyDeletion',
              'kms:CancelKeyDeletion',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-admin-id1:*', 'test-admin-id2:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
        ]),
      },
    });
  });

  test('KeyUserPolicyStatement', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-user-id1:*', 'test-user-id2:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
        ]),
      },
    });
  });

  test('EnableKeyRotation', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('UpdateReplacePolicy', () => {
    template.hasResource('AWS::KMS::Key', {
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('DeletionPolicy', () => {
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
    });
  });
});

describe('Parameter tier', () => {
  // tier only takes effect where the construct publishes parameters, so createParams must be on.
  function templateFor(tier?: ParameterTier): Template {
    const app = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(app.testStack, app.naming);
    new MdaaKmsKey(app.testStack, 'tier-key', {
      naming: app.naming,
      alias: 'tier-key',
      keyUserRoles: [roleHelper.resolveRoleRef({ refId: 'tier-user', id: 'test-user-id1' })],
      createParams: true,
      createOutputs: false,
      tier: tier,
    });
    // checkCdkNagCompliance declares its own describe/test, so it runs at describe scope.
    app.checkCdkNagCompliance(app.testStack);
    return Template.fromStack(app.testStack);
  }

  const advancedTemplate = templateFor(ParameterTier.ADVANCED);
  const defaultTemplate = templateFor();

  test('tier is threaded through to the published arn and id parameters', () => {
    const params = Object.values(advancedTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toEqual('Advanced'));
  });

  test('no Tier emitted when unset, leaving SSM to apply Standard', () => {
    const params = Object.values(defaultTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toBeUndefined());
  });
});

describe('MDAA KMS Cross-Account Role Tests', () => {
  const testApp = new MdaaTestApp();
  const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  // Same-account role with direct ID
  const sameAccountRole = testRoleHelper.resolveRoleRef({
    refId: 'same-account',
    id: 'AROA_SAME_ACCOUNT_ID',
  });

  // Cross-account role (different account)
  const crossAccountRole = testRoleHelper.resolveRoleRef({
    refId: 'cross-account',
    arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
  });

  new MdaaKmsKey(testApp.testStack, 'cross-account-key', {
    naming: testApp.naming,
    alias: 'cross-account-test',
    keyUserRoles: [sameAccountRole, crossAccountRole],
    keyAdminRoles: [sameAccountRole, crossAccountRole],
    createOutputs: false,
    createParams: false,
  });

  // The cross-account ARN-principal statements are new access-control policy, so they are validated
  // against the Nag rulesets here rather than only asserted against the template.
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: any[] = Object.values(template.findResources('AWS::KMS::Key'))[0].Properties.KeyPolicy.Statement;
  const statementBySid = (sidFragment: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statements.filter((x: any) => typeof x.Sid === 'string' && x.Sid.includes(sidFragment));

  test('Cross-account user role uses ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: CROSS_ACCOUNT_USER_ACTIONS,
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:aws:iam::999999999999:role/CrossAccountRole',
            },
            Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
          }),
        ]),
      },
    });
  });

  test('Cross-account user statement grants DescribeKey, which an external principal has no other source for', () => {
    const [usage] = statementBySid('xacct-usage-stmt');
    expect(usage.Action).toContain('kms:DescribeKey');
  });

  test('Cross-account admin role uses ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: CROSS_ACCOUNT_ADMIN_ACTIONS,
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:aws:iam::999999999999:role/CrossAccountRole',
            },
            Sid: Match.stringLikeRegexp('xacct-admin-stmt'),
          }),
        ]),
      },
    });
  });

  test('Cross-account admin statement omits key management actions KMS cannot delegate', () => {
    const [admin] = statementBySid('xacct-admin-stmt');
    expect(admin.Action).toStrictEqual(CROSS_ACCOUNT_ADMIN_ACTIONS);
    [
      'kms:PutKeyPolicy',
      'kms:ScheduleKeyDeletion',
      'kms:CancelKeyDeletion',
      'kms:TagResource',
      'kms:UntagResource',
      'kms:Put*',
      'kms:Update*',
      'kms:Enable*',
      'kms:Disable*',
      'kms:Delete*',
      'kms:Create*',
    ].forEach(action => expect(admin.Action).not.toContain(action));
  });

  test('Same-account statements keep the full action sets', () => {
    // The same-account user and admin statements share the 'usage-stmt' sid, so they are told apart
    // by their action sets. Both must be untouched by the cross-account narrowing.
    const sameAccount = statementBySid('usage-stmt').filter((x: { Sid: string }) => !x.Sid.includes('xacct'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionSets = sameAccount.map((x: any) => x.Action);
    expect(actionSets).toContainEqual(USER_ACTIONS);
    expect(actionSets).toContainEqual(ADMIN_ACTIONS);
  });

  test('Same-account role still uses aws:userId condition', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: {
              StringLike: {
                'aws:userId': ['AROA_SAME_ACCOUNT_ID:*'],
              },
            },
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Sid: Match.stringLikeRegexp('usage-stmt'),
          }),
        ]),
      },
    });
  });
});

describe('MDAA KMS fromRole Tests', () => {
  const testApp = new MdaaTestApp();

  const infraRole = new Role(testApp.testStack, 'infra-role', {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName: 'test-infra-role',
  });

  const wrappedRole = MdaaResolvableRole.fromRole(testApp.testStack, 'infra', infraRole);

  new MdaaKmsKey(testApp.testStack, 'fromrole-key', {
    naming: testApp.naming,
    alias: 'fromrole-test',
    keyUserRoles: [wrappedRole],
    createOutputs: false,
    createParams: false,
  });

  // The token-based userId statement is still an access control, so it is Nag-validated too.
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('fromRole produces aws:userId condition with roleId token', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: {
              StringLike: {
                'aws:userId': Match.arrayWith([Match.objectLike({ 'Fn::Join': Match.anyValue() })]),
              },
            },
            Effect: 'Allow',
            Principal: { AWS: '*' },
          }),
        ]),
      },
    });
  });

  test('fromRole is not cross-account', () => {
    expect(wrappedRole.isCrossAccount()).toBe(false);
  });
});
