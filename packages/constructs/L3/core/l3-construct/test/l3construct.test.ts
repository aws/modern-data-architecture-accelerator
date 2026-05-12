/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { MdaaL3Construct, MdaaL3ConstructProps } from '../lib/l3construct';
import { MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

class TestL3Construct extends MdaaL3Construct {
  constructor(scope: Stack, id: string, props: MdaaL3ConstructProps) {
    super(scope, id, props);
  }

  public testGetCrossAccountStack(account?: string, region?: string) {
    return this.getCrossAccountStack(account, region);
  }

  public testGetFirstCrossAccountRegion(account: string) {
    return this.getFirstCrossAccountRegion(account);
  }

  public testGetChildStack(id: string, stackName: string) {
    return this.getChildStack(id, stackName);
  }
}

describe('MdaaL3Construct', () => {
  let stack: Stack;
  let props: MdaaL3ConstructProps;

  beforeEach(() => {
    stack = new Stack(undefined, 'TestStack', { env: { account: '123456789012', region: 'us-east-1' } });
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      org: 'test',
      env: 'dev',
      domain: 'test',
      moduleName: 'test',
    });
    props = {
      naming,
      roleHelper: new MdaaRoleHelper(stack, naming),
    };
  });

  test('throws when no cross account stacks defined', () => {
    const construct = new TestL3Construct(stack, 'test', props);
    expect(() => construct.testGetCrossAccountStack('123456789012', 'us-west-2')).toThrow(
      'No cross account stacks defined',
    );
  });

  test('throws when neither account nor region specified', () => {
    const crossAccountStack = new Stack(undefined, 'CrossStack', {
      env: { account: '999999999999', region: 'us-west-2' },
    });
    const construct = new TestL3Construct(stack, 'test', {
      ...props,
      crossAccountStacks: { '999999999999': { 'us-west-2': crossAccountStack } },
    });
    expect(() => construct.testGetCrossAccountStack()).toThrow('Must specify either account or region');
  });

  test('returns undefined when account not found', () => {
    const crossAccountStack = new Stack(undefined, 'CrossStack', {
      env: { account: '999999999999', region: 'us-west-2' },
    });
    const construct = new TestL3Construct(stack, 'test', {
      ...props,
      crossAccountStacks: { '999999999999': { 'us-west-2': crossAccountStack } },
    });
    expect(construct.testGetCrossAccountStack('111111111111', 'us-west-2')).toBeUndefined();
  });

  test('returns undefined when region not found', () => {
    const crossAccountStack = new Stack(undefined, 'CrossStack', {
      env: { account: '999999999999', region: 'us-west-2' },
    });
    const construct = new TestL3Construct(stack, 'test', {
      ...props,
      crossAccountStacks: { '999999999999': { 'us-west-2': crossAccountStack } },
    });
    expect(construct.testGetCrossAccountStack('999999999999', 'eu-west-1')).toBeUndefined();
  });

  test('returns cross account stack when found', () => {
    const crossAccountStack = new Stack(undefined, 'CrossStack', {
      env: { account: '999999999999', region: 'us-west-2' },
    });
    const construct = new TestL3Construct(stack, 'test', {
      ...props,
      crossAccountStacks: { '999999999999': { 'us-west-2': crossAccountStack } },
    });
    expect(construct.testGetCrossAccountStack('999999999999', 'us-west-2')).toBe(crossAccountStack);
  });

  test('throws when no stacks for account in getFirstCrossAccountRegion', () => {
    const construct = new TestL3Construct(stack, 'test', { ...props, crossAccountStacks: {} });
    expect(() => construct.testGetFirstCrossAccountRegion('123456789012')).toThrow(
      'No cross account stacks defined for account 123456789012',
    );
  });

  test('throws when no regions in cross account stacks', () => {
    const construct = new TestL3Construct(stack, 'test', { ...props, crossAccountStacks: { '123456789012': {} } });
    expect(() => construct.testGetFirstCrossAccountRegion('123456789012')).toThrow(
      'No regions found in cross account stacks for account 123456789012',
    );
  });

  test('returns first region', () => {
    const crossAccountStack = new Stack(undefined, 'CrossStack', {
      env: { account: '123456789012', region: 'us-west-2' },
    });
    const construct = new TestL3Construct(stack, 'test', {
      ...props,
      crossAccountStacks: { '123456789012': { 'us-west-2': crossAccountStack } },
    });
    expect(construct.testGetFirstCrossAccountRegion('123456789012')).toBe('us-west-2');
  });

  test('getChildStack creates a new child stack with correct stackName and env', () => {
    const construct = new TestL3Construct(stack, 'test', props);
    const childStack = construct.testGetChildStack('child-1', 'my-child-stack');
    expect(childStack).toBeInstanceOf(Stack);
    expect(childStack.stackName).toBe('my-child-stack');
    expect(childStack.account).toBe('123456789012');
    expect(childStack.region).toBe('us-east-1');
  });

  test('getChildStack returns the same cached stack on subsequent calls with the same id', () => {
    const construct = new TestL3Construct(stack, 'test', props);
    const first = construct.testGetChildStack('child-1', 'my-child-stack');
    const second = construct.testGetChildStack('child-1', 'my-child-stack');
    expect(second).toBe(first);
  });

  test('getChildStack creates separate stacks for different ids', () => {
    const construct = new TestL3Construct(stack, 'test', props);
    const stack1 = construct.testGetChildStack('child-1', 'stack-one');
    const stack2 = construct.testGetChildStack('child-2', 'stack-two');
    expect(stack1).not.toBe(stack2);
    expect(stack1.stackName).toBe('stack-one');
    expect(stack2.stackName).toBe('stack-two');
  });
});
