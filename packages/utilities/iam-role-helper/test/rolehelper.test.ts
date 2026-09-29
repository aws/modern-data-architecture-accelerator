/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaDefaultResourceNaming, IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { App, Lazy, Stack, Token } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper, MdaaRoleRef, MdaaResolvableRole } from '../lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

describe('Test RoleHelper Provider naming', () => {
  const testApp = new MdaaTestApp();
  const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  // Force creation of the role-resolution CR provider and its supporting resources.
  testRoleHelper.createProviderServiceToken();
  const template = Template.fromStack(testApp.testStack);

  test('CR managed policy uses full MDAA resource naming', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: testApp.naming.resourceName('role-res-pol'),
    });
  });

  test('CR provider function uses full MDAA resource naming (64 char cap)', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: testApp.naming.resourceName('role-res-cr-prov', 64),
    });
  });

  test('provider service token is cached across calls', () => {
    const first = testRoleHelper.createProviderServiceToken();
    const second = testRoleHelper.createProviderServiceToken();
    expect(second).toBe(first);
  });
});

/**
 * A resource-type-aware naming stub. MdaaDefaultResourceNaming.withResourceType()
 * is a no-op (returns this), so the default-naming assertions above pass regardless
 * of which MdaaResourceType each site threads through — a wrong type at any site
 * would still pass. This stub folds the resource type into the name via withSuffix,
 * so the generated names diverge by type and the correct type is pinned per site.
 */
class ResourceTypeAwareNaming extends MdaaDefaultResourceNaming {
  public withResourceType(resourceType: MdaaResourceType): IMdaaResourceNaming {
    return this.withSuffix(resourceType);
  }
}

describe('Test RoleHelper Provider resource-type-aware naming', () => {
  const testApp = new MdaaTestApp();
  const naming = new ResourceTypeAwareNaming({
    cdkNode: testApp.testStack.node,
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    moduleName: 'test-module',
  });
  const testRoleHelper = new MdaaRoleHelper(testApp.testStack, naming);
  testRoleHelper.createProviderServiceToken();
  const template = Template.fromStack(testApp.testStack);

  test('CR managed policy and provider function names stay untyped', () => {
    // Deliberately not threaded through withResourceType. Doing so would rename
    // an existing ManagedPolicy and Lambda for every resource-type-aware naming
    // module, and both ManagedPolicyName and FunctionName require replacement —
    // an upgrade cost unrelated to inline policy naming. These assertions pin
    // that decision so the calls are not reintroduced silently.
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: naming.resourceName('role-res-pol'),
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: naming.resourceName('role-res-cr-prov', 64),
    });
  });

  test('CR Lambda log-write permission targets the function name (LAMBDA_FUNCTION), not a log-group-typed name', () => {
    // addLogGroups builds the permission ARN as /aws/lambda/${logGroupName}*.
    // The log group name must match the CR Lambda function name so the ARN
    // actually covers the function's log group. Under a resource-type-aware
    // module a CLOUDWATCH_LOG_GROUP-typed name would diverge and the permission
    // would never match, silently dropping logs:CreateLogStream/PutLogEvents.
    const expectedFunctionName = naming
      .withResourceType(MdaaResourceType.LAMBDA_FUNCTION)
      .resourceName('role-res-cr', 64);
    const logGroupTypedName = naming
      .withResourceType(MdaaResourceType.CLOUDWATCH_LOG_GROUP)
      .resourceName('role-res-cr');
    // Sanity: the two typed names really do diverge under this naming module.
    expect(expectedFunctionName).not.toEqual(logGroupTypedName);
    // addLogGroups emits the ARN as a plain string (single log group per role).
    // Assert the CR Lambda role's policy grants log-write on the function's own
    // log group (the /aws/lambda/<function-name> path), confirming the log group
    // name and the function name stay aligned under resource-type-aware naming.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Resource: `arn:test-partition:logs:*:*:log-group:/aws/lambda/${expectedFunctionName}*`,
          }),
        ]),
      },
    });
  });
});

describe('Test RoleHelper', () => {
  test('Missing references', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    expect(() => {
      testRoleHelper.resolveRoleRef({
        refId: 'testRefId',
      });
    }).toThrow();
  });

  test('By Id', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      id: 'test-id',
    });
    expect(resolved.id()).toBe('test-id');
    expect(resolved.arn()).toMatch(/\${Token\[TOKEN.\d+\]}/);
    expect(resolved.name()).toMatch(/\${Token\[TOKEN.\d+\]}/);
  });

  test('By Arn', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      arn: 'test-arn',
    });
    expect(resolved.id()).toMatch(/\${Token\[TOKEN.\d+\]}/);
    expect(resolved.arn()).toBe('test-arn');
    expect(resolved.name()).toMatch(/\${Token\[TOKEN.\d+\]}/);
  });
  test('By Name', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      name: 'test-name',
    });
    expect(resolved.id()).toMatch(/\${Token\[TOKEN.\d+\]}/);
    expect(resolved.arn()).toMatch(/\${Token\[TOKEN.\d+\]}/);
    expect(resolved.name()).toBe('test-name');
  });
  test('Immutability Undefined is False', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
    });
    expect(resolved.immutable()).toBe(false);
  });
  test('Immutability False', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
      immutable: false,
    });
    expect(resolved.immutable()).toBe(false);
  });

  test('Immutability True', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'testRefId',
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
      immutable: true,
    });
    expect(resolved.immutable()).toBe(true);
  });

  test('resolveRoleRefsWithOrdinals', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const roleRef: MdaaRoleRef = {
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
      immutable: true,
    };
    const resolved = testRoleHelper.resolveRoleRefsWithOrdinals([roleRef], 'testing');
    expect(resolved).toHaveLength(1);
    expect(resolved[0].refId()).toBe('testing-0');
    expect(resolved[0].immutable()).toBe(true);
  });

  test('resolveRoleRefWithRefId', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const roleRef: MdaaRoleRef = {
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
    };
    const resolved = testRoleHelper.resolveRoleRefWithRefId(roleRef, 'testing');
    expect(resolved.refId()).toBe('testing');
  });

  test('Multiple Resolution', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const roleRefAll = {
      refId: 'testingAll',
      name: 'test-name',
      arn: 'test-arn',
      id: 'test-id',
    };
    testRoleHelper.resolveRoleRef(roleRefAll);

    const roleRefName: MdaaRoleRef = {
      name: 'test-name',
    };
    const resolvedByName = testRoleHelper.resolveRoleRefWithRefId(roleRefName, 'testing2');
    expect(resolvedByName.refId()).toBe('testingAll');

    const roleRefArn: MdaaRoleRef = {
      arn: 'test-arn',
    };
    const resolvedByArn = testRoleHelper.resolveRoleRefWithRefId(roleRefArn, 'testing2');
    expect(resolvedByArn.refId()).toBe('testingAll');

    const roleRefById: MdaaRoleRef = {
      id: 'test-id',
    };
    const resolvedById = testRoleHelper.resolveRoleRefWithRefId(roleRefById, 'testing2');
    expect(resolvedById.refId()).toBe('testingAll');
  });

  test('isCrossAccount returns true for cross-account ARN', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'crossAccountRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    // test-account !== 999999999999
    expect(resolved.isCrossAccount()).toBe(true);
  });

  test('isCrossAccount returns false for same-account ARN', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'sameAccountRef',
      arn: 'arn:aws:iam::test-account:role/SameAccountRole',
    });
    expect(resolved.isCrossAccount()).toBe(false);
  });

  test('isCrossAccount returns false when no ARN provided', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'nameOnlyRef',
      name: 'some-role',
    });
    expect(resolved.isCrossAccount()).toBe(false);
  });

  test('isCrossAccount returns false for a value which is not an ARN', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    // A {{ssm-org:...}} role reference expands to this literal, whose colon-separated segments are a
    // parameter path rather than ARN fields, so there is no account to compare.
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'dynamicRefArn',
      arn: '{{resolve:ssm:/test-org/shared/roles/admin/arn}}',
    });
    expect(resolved.isCrossAccount()).toBe(false);
  });

  test('arnPrincipal returns ArnPrincipal with role ARN', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'arnPrincipalRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    const principal = resolved.arnPrincipal();
    expect(principal.arn).toBe('arn:aws:iam::999999999999:role/CrossAccountRole');
  });

  test('isCrossAccount caches result', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'cachedRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    // Call twice to exercise caching
    expect(resolved.isCrossAccount()).toBe(true);
    expect(resolved.isCrossAccount()).toBe(true);
  });

  test('a cross-account role ref warns that access is granted by ARN principal', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'warnedRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    // The warning is emitted by the detection itself, so it only appears once the ref is classified.
    expect(resolved.isCrossAccount()).toBe(true);
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp("Role reference 'warnedRef'.*is cross-account"),
    );
    expect(warnings).toHaveLength(1);
  });

  test('the cross-account warning is emitted once even when isCrossAccount is called repeatedly', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'onceRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    resolved.isCrossAccount();
    resolved.isCrossAccount();
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp("Role reference 'onceRef'.*is cross-account"),
    );
    expect(warnings).toHaveLength(1);
  });

  test('a same-account role ref does not warn about ARN principals', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    testRoleHelper
      .resolveRoleRef({ refId: 'quietRef', arn: 'arn:aws:iam::test-account:role/SameAccountRole' })
      .isCrossAccount();
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('is cross-account'),
    );
    expect(warnings).toHaveLength(0);
  });

  test('a tokenized ARN is not classified as cross-account and does not warn', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'tokenArnRef',
      // A tokenized ARN carries no readable account segment, so the account cannot be compared.
      arn: Lazy.string({ produce: () => 'arn:aws:iam::999999999999:role/FromToken' }),
    });
    expect(resolved.isCrossAccount()).toBe(false);
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp("Role reference 'tokenArnRef'.*is cross-account"),
    );
    expect(warnings).toHaveLength(0);
  });

  test('an env-agnostic stack account is not compared against the role ARN account', () => {
    // An env-agnostic stack resolves its account to a pseudo-parameter token at synth time. Comparing
    // a literal ARN account against that token would classify every role as cross-account, so
    // detection has to bail out instead.
    const envAgnosticStack = new Stack(new App(), 'env-agnostic-stack');
    const resolved = new MdaaResolvableRole(envAgnosticStack, {
      refId: 'envAgnosticRef',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });
    expect(resolved.isCrossAccount()).toBe(false);
  });

  test('fromRole wraps a concrete CDK Role', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'test-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'test-from-role',
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'wrapped', role);
    expect(wrapped.refId()).toBe('wrapped');
    expect(wrapped.isCrossAccount()).toBe(false);
    expect(wrapped.immutable()).toBe(false);
    expect(wrapped.sso()).toBe(false);
    // name() should return the role name
    expect(wrapped.name()).toBe(role.roleName);
  });

  test('fromRole arnPrincipal returns correct ARN', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'arn-test-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'test-arn-role',
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'arn-wrapped', role);
    expect(wrapped.arnPrincipal().arn).toBe(role.roleArn);
  });

  test('fromRole id() returns roleId token', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'id-test-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'test-id-role',
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'id-wrapped', role);
    expect(wrapped.id()).toBe(role.roleId);
  });

  test('fromRole arn() returns roleArn', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'arn-direct-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'test-arn-direct',
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'arn-direct', role);
    expect(wrapped.arn()).toBe(role.roleArn);
  });

  test('fromRole name() returns roleName', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'name-direct-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'test-name-direct',
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'name-direct', role);
    expect(wrapped.name()).toBe(role.roleName);
  });

  test('isCrossAccount returns false for a ref which supplies no ARN', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'tokenRef',
      name: 'some-role-name',
    });
    // A name-only ref has no account to compare, and its ARN only exists as a lookup attribute.
    expect(resolved.isCrossAccount()).toBe(false);
  });

  test('a cross-account role is immutable, so no module attaches a policy to it', () => {
    // A managed or inline policy can only be attached to a role from the role's own account, and
    // IAM resolves the attachment by role name in the deploying account. Modules gate attachment
    // on immutable(), so cross-account has to report immutable or the deployment fails with
    // 'The role with name <name> cannot be found' (or binds a local role of the same name).
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const crossAccount = testRoleHelper.resolveRoleRef({
      refId: 'crossAccountImmutableRef',
      arn: 'arn:test-partition:iam::999999999999:role/CrossAccountRole',
    });
    expect(crossAccount.immutable()).toBe(true);
  });

  test('a same-account role ref is not made immutable by cross-account detection', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const sameAccount = testRoleHelper.resolveRoleRef({
      refId: 'sameAccountMutableRef',
      arn: 'arn:test-partition:iam::test-account:role/LocalRole',
      id: 'AROALOCALEXAMPLE',
    });
    expect(sameAccount.immutable()).toBe(false);
  });

  test('unresolvable ARN warns that the role will be looked up in the deploying account', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const resolved = testRoleHelper.resolveRoleRef({
      refId: 'ssmSourcedRef',
      // Stands in for an ssm: lookup, whose account cannot be read at synth time.
      arn: Lazy.string({ produce: () => 'arn:aws:iam::222222222222:role/FromSsm' }),
    });
    // Resolving the id is what creates the account-scoped lookup.
    resolved.id();
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('ssmSourcedRef.*not resolvable at synth time'),
    );
    expect(warnings).toHaveLength(1);
  });

  test('a name-only role ref does not warn, since no ARN was supplied to verify', () => {
    const testApp = new MdaaTestApp();
    const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    testRoleHelper.resolveRoleRef({ refId: 'nameOnlyRef', name: 'some-role-name' }).id();
    const warnings = Annotations.fromStack(testApp.testStack).findWarning(
      '*',
      Match.stringLikeRegexp('not resolvable at synth time'),
    );
    expect(warnings).toHaveLength(0);
  });

  test('getCr throws when no roleHelper provided', () => {
    const testApp = new MdaaTestApp();
    const role = new Role(testApp.testStack, 'no-helper-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    const wrapped = MdaaResolvableRole.fromRole(testApp.testStack, 'no-helper', role);
    // fromRole populates every anchor, so id()/arn()/name() never reach getCr and the helper it needs.
    expect(wrapped.id()).toBe(role.roleId);
    // A ref with no anchor at all has nothing to resolve from, so it cannot avoid the lookup.
    const manualRole = new MdaaResolvableRole(testApp.testStack, { refId: 'manual' });
    expect(() => manualRole.id()).toThrow('Cannot create custom resource for role resolution without a role helper.');
  });

  describe('IAM ARN format validation', () => {
    // An IAM ARN with the empty region segment omitted shifts every later field left, so the
    // resource ends up where the account belongs. Left unvalidated it reads as a different
    // account, and the role is silently emitted into a resource policy as a bogus principal.
    const malformedArns = [
      'arn:aws:iam:123456789012:role/missing-region-segment',
      'arn:aws:iam:role/far-too-short',
      // IAM is global, so a populated region is never valid, even when every field is present.
      'arn:aws:iam:us-east-1:123456789012:role/regional',
      // The shifted form with one extra colon restores the component count, which is what lets it
      // past CDK's Arn.split with the account read as 'role/name'. The empty-region test catches it.
      'arn:aws:iam:123456789012:role/name:extra',
    ];
    malformedArns.forEach(arn => {
      test(`rejects malformed IAM ARN '${arn}'`, () => {
        const testApp = new MdaaTestApp();
        const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
        expect(() => testRoleHelper.resolveRoleRef({ refId: 'malformedRef', arn: arn })).toThrow(
          /has a malformed IAM ARN/,
        );
      });
    });

    // Anything other than a twelve-digit ID in the account slot would be read as some other account
    // and granted by ARN, which fails at deploy with an invalid principal. The check applies to a
    // stack deploying to a real account, whether that account is known at synth or only at deploy.
    const badAccountArns = [
      'arn:aws:iam:::role/empty-account',
      'arn:aws:iam::12345:role/short-account',
      'arn:aws:iam::12345678901a:role/non-numeric-account',
      // The account omitted outright, with an extra colon to keep the resource segment present.
      'arn:aws:iam::role/name:extra',
    ];
    const realAccountStacks: [string, () => Stack][] = [
      [
        'a resolved account',
        () => new Stack(new App(), 'real', { env: { account: '111111111111', region: 'us-east-1' } }),
      ],
      ['an account resolved at deploy', () => new Stack(new App(), 'env-agnostic')],
    ];
    realAccountStacks.forEach(([stackLabel, makeStack]) => {
      badAccountArns.forEach(arn => {
        test(`rejects an IAM ARN whose account is not an account ID on a stack with ${stackLabel} '${arn}'`, () => {
          const testApp = new MdaaTestApp();
          const stack = makeStack();
          const roleHelper = new MdaaRoleHelper(stack, testApp.naming);
          expect(() => roleHelper.resolveRoleRef({ refId: 'badAccountRef', arn: arn })).toThrow(
            /account is not a twelve-digit account ID/,
          );
        });
      });
    });

    test('does not judge the account when the stack itself deploys to a placeholder account', () => {
      // MdaaTestApp and the baseline harness synthesize against placeholder accounts such as
      // 'test-account' and 'test-account-2' throughout. A placeholder deployment account gives a
      // placeholder foreign account nothing real to be checked against, so the check stands down.
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const resolved = testRoleHelper.resolveRoleRef({
        refId: 'placeholderAccountRef',
        arn: 'arn:test-partition:iam::test-account-2:role/Foreign',
      });
      expect(resolved.isCrossAccount()).toBe(true);
    });

    test('malformed ARN is not silently classified as cross-account', () => {
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      // The shifted segments put 'role/foo' where the account belongs. That differs from the stack
      // account, so without the rejection the role would read as cross-account and be granted by ARN.
      expect(() =>
        testRoleHelper.resolveRoleRef({ refId: 'shiftedRef', arn: 'arn:aws:iam:123456789012:role/foo' }),
      ).toThrow(/arn:aws:iam:123456789012:role\/foo/);
    });

    test('accepts a well-formed IAM role ARN', () => {
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const resolved = testRoleHelper.resolveRoleRef({
        refId: 'wellFormed',
        arn: 'arn:aws:iam::123456789012:role/good',
      });
      expect(resolved.isCrossAccount()).toBe(true);
    });

    test('accepts an ARN whose resource segment contains colons', () => {
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      // SAML principals legitimately carry extra colons in the resource segment, so the segment
      // count is a lower bound rather than an exact match.
      const resolved = testRoleHelper.resolveRoleRef({
        refId: 'samlRef',
        arn: 'arn:aws:iam::123456789012:saml-provider/provider:group/group-name',
      });
      expect(resolved.isCrossAccount()).toBe(true);
    });

    // An ARN of another service cannot name a role. Left unrejected it reaches the deploy-time
    // lookup, which searches IAM for the text after the last '/', so it either fails opaquely or
    // binds an unrelated role in the deploying account which happens to carry that name.
    const nonIamArns = [
      'arn:aws:s3:::my-bucket/role/NotARole',
      'arn:aws:sts::123456789012:assumed-role/SomeRole/session',
    ];
    nonIamArns.forEach(arn => {
      test(`rejects non-IAM ARN '${arn}'`, () => {
        const testApp = new MdaaTestApp();
        const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
        expect(() => testRoleHelper.resolveRoleRef({ refId: 'nonIamRef', arn: arn })).toThrow(/is not an IAM ARN/);
      });
    });

    test('accepts a CloudFormation dynamic reference, which is not an ARN to validate', () => {
      // A {{ssm-org:...}} role reference expands to this literal rather than to a CDK token, so it
      // reaches validation with a parameter path where the ARN fields would be. Rejecting it would
      // fail synth for a supported way of storing a role ARN.
      const dynamicRef = '{{resolve:ssm:/test-org/shared/roles/admin/arn}}';
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const resolved = testRoleHelper.resolveRoleRef({ refId: 'dynamicRef', arn: dynamicRef });
      expect(resolved.arn()).toBe(dynamicRef);
    });

    test('accepts a tokenized ARN, whose account is not known until deploy', () => {
      // The documented `arn: ssm:/path` role reference resolves to a CDK token, so validation has
      // nothing to read and must not reject it.
      const testApp = new MdaaTestApp();
      const testRoleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const resolved = testRoleHelper.resolveRoleRef({
        refId: 'tokenArnValidationRef',
        arn: Lazy.string({ produce: () => 'arn:aws:iam::123456789012:role/FromSsm' }),
      });
      expect(Token.isUnresolved(resolved.arn())).toBe(true);
    });
  });
});
