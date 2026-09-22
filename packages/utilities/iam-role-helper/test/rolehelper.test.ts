/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaDefaultResourceNaming, IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper, MdaaRoleRef } from '../lib';

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
});
