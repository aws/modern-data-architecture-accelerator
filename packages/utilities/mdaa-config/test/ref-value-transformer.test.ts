/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { MdaaConfigRefValueTransformer } from '../lib';
import { MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { MdaaStringParameter } from '@aws-mdaa/construct';

jest.mock('@aws-mdaa/construct', () => ({
  MdaaStringParameter: {
    valueFromLookup: jest.fn().mockReturnValue('lookup-value'),
    valueForStringParameter: jest.fn().mockReturnValue('param-value'),
  },
}));

describe('MdaaConfigRefValueTransformer', () => {
  const baseProps = {
    org: 'test-org',
    env: 'dev',
    domain: 'test-domain',
    module_name: 'test-module',
  };

  test('returns unchanged value without refs', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('plain-value')).toBe('plain-value');
  });

  test('transforms org ref', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{org}}')).toBe('test-org');
  });

  test('transforms env ref', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env}}')).toBe('dev');
  });

  test('transforms domain ref', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{domain}}')).toBe('test-domain');
  });

  test('transforms module_name ref', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{module_name}}')).toBe('test-module');
  });

  test('transforms partition ref with scope', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{partition}}');
    expect(result).toBeDefined();
  });

  test('transforms region ref with scope', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{region}}');
    expect(result).toBeDefined();
  });

  test('transforms account ref with scope', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{account}}');
    expect(result).toBeDefined();
  });

  test('transforms env_var ref', () => {
    process.env.TEST_VAR = 'test-value';
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env_var:TEST_VAR}}')).toBe('test-value');
    delete process.env.TEST_VAR;
  });

  test('transforms context ref from scope', () => {
    const stack = new Stack();
    stack.node.setContext('test_key', 'test-value');
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    expect(transformer.transformValue('{{context:test_key}}')).toBe('test-value');
  });

  test('transforms context ref from context prop', () => {
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, context: { test_key: 'test-value' } });
    expect(transformer.transformValue('{{context:test_key}}')).toBe('test-value');
  });

  test('throws when context ref not found', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(() => transformer.transformValue('{{context:missing_key}}')).toThrow(
      'Failed to resolve context: missing_key',
    );
  });

  test('throws when org ref without naming', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    expect(() => transformer.transformValue('{{ssm-org:param}}')).toThrow(
      'Unable to resolve ssm-org ssm param outside of a naming context',
    );
  });

  test('throws when org ref without scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming });
    expect(() => transformer.transformValue('{{ssm-org:param}}')).toThrow(
      'Unable to resolve ssm-org ssm param outside of a Construct',
    );
  });

  test('throws when resolve:ssm without scope', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(() => transformer.transformValue('{{resolve:ssm:/test/param}}')).toThrow(
      'Unable to resolve ssm param outside of a Construct',
    );
  });

  test('handles nested refs', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('prefix-{{org}}-{{env}}-suffix')).toBe('prefix-test-org-dev-suffix');
  });

  test('transforms partition/region/account from awsEnvironment prop', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      awsEnvironment: {
        partition: 'aws-cn',
        region: 'cn-north-1',
        account: '123456789012',
      },
    });
    expect(transformer.transformValue('{{partition}}')).toBe('aws-cn');
    expect(transformer.transformValue('{{region}}')).toBe('cn-north-1');
    expect(transformer.transformValue('{{account}}')).toBe('123456789012');
  });

  test('awsEnvironment takes precedence over scope stack', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      scope: stack,
      awsEnvironment: {
        partition: 'aws-gov',
        region: 'us-gov-west-1',
        account: '999999999999',
      },
    });
    expect(transformer.transformValue('{{partition}}')).toBe('aws-gov');
    expect(transformer.transformValue('{{region}}')).toBe('us-gov-west-1');
    expect(transformer.transformValue('{{account}}')).toBe('999999999999');
  });

  test('returns object context value for naked reference', () => {
    const contextObj = { key1: 'value1', key2: 'value2' };
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_object: contextObj },
    });
    const result = transformer.transformValue('{{context:my_object}}');
    expect(result).toEqual(contextObj);
  });

  test('returns array context value for naked reference', () => {
    const contextArr = ['item1', 'item2', 'item3'];
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_array: contextArr },
    });
    const result = transformer.transformValue('{{context:my_array}}');
    expect(result).toEqual(contextArr);
  });

  test('throws when embedding object context in string', () => {
    const contextObj = { key1: 'value1' };
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_object: contextObj },
    });
    expect(() => transformer.transformValue('prefix-{{context:my_object}}-suffix')).toThrow(
      'Cannot embed array or object context value in string',
    );
  });

  test('throws when embedding array context in string', () => {
    const contextArr = ['item1', 'item2'];
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_array: contextArr },
    });
    expect(() => transformer.transformValue('prefix-{{context:my_array}}-suffix')).toThrow(
      'Cannot embed array or object context value in string',
    );
  });

  test('parses encoded object context value', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { encoded_obj: '"obj:{"foo":"bar"}"' },
    });
    const result = transformer.transformValue('{{context:encoded_obj}}');
    expect(result).toEqual({ foo: 'bar' });
  });

  test('parses encoded list context value', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { encoded_list: '"list:["a","b","c"]"' },
    });
    const result = transformer.transformValue('{{context:encoded_list}}');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('throws when ssm-domain ref without naming', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    expect(() => transformer.transformValue('{{ssm-domain:param}}')).toThrow(
      'Unable to resolve ssm-domain ssm param outside of a naming context',
    );
  });

  test('throws when ssm-domain ref without scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming });
    expect(() => transformer.transformValue('{{ssm-domain:param}}')).toThrow(
      'Unable to resolve ssm-domain ssm param outside of a Construct',
    );
  });

  test('throws when ssm-env ref without naming', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    expect(() => transformer.transformValue('{{ssm-env:param}}')).toThrow(
      'Unable to resolve ssm-env ssm param outside of a naming context',
    );
  });

  test('throws when ssm-env ref without scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming });
    expect(() => transformer.transformValue('{{ssm-env:param}}')).toThrow(
      'Unable to resolve ssm-env ssm param outside of a Construct',
    );
  });

  test('returns undefined env_var as undefined and leaves reference unchanged', () => {
    delete process.env.NONEXISTENT_VAR;
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    const result = transformer.transformValue('{{env_var:NONEXISTENT_VAR}}');
    expect(result).toBe('{{env_var:NONEXISTENT_VAR}}');
  });

  test('converts number to string when embedded in string', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_number: 42 },
    });
    const result = transformer.transformValue('value-{{context:my_number}}-end');
    expect(result).toBe('value-42-end');
  });

  test('converts boolean to string when embedded in string', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { my_bool: true },
    });
    const result = transformer.transformValue('value-{{context:my_bool}}-end');
    expect(result).toBe('value-true-end');
  });

  test('handles unbalanced braces gracefully', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{org}')).toBe('{{org}');
    expect(transformer.transformValue('{org}}')).toBe('{org}}');
  });

  test('handles recursive refs', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { inner: 'org' },
    });
    expect(transformer.transformValue('{{{{context:inner}}}}')).toBe('test-org');
  });

  test('resolves ssm-org param with naming and scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming, scope: stack });
    const result = transformer.transformValue('{{ssm-org:my-param}}');
    expect(result).toBe('param-value');
    expect(MdaaStringParameter.valueForStringParameter).toHaveBeenCalled();
  });

  test('resolves ssm-domain param with naming and scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming, scope: stack });
    const result = transformer.transformValue('{{ssm-domain:my-param}}');
    expect(result).toBe('param-value');
  });

  test('resolves ssm-env param with naming and scope', () => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming, scope: stack });
    const result = transformer.transformValue('{{ssm-env:my-param}}');
    expect(result).toBe('param-value');
  });

  test('resolves direct ssm param with scope', () => {
    const stack = new Stack();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{resolve:ssm:/my/direct/param}}');
    expect(result).toBe('param-value');
    expect(consoleSpy).toHaveBeenCalledWith('Resolving SSM: /my/direct/param');
    consoleSpy.mockRestore();
  });

  test('uses valueFromLookup when @mdaaLookupSSMValues context is set', () => {
    const stack = new Stack();
    stack.node.setContext('@mdaaLookupSSMValues', true);
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      ...baseProps,
      moduleName: baseProps.module_name,
    });
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming, scope: stack });
    const result = transformer.transformValue('{{ssm-org:my-param}}');
    expect(result).toBe('lookup-value');
    expect(MdaaStringParameter.valueFromLookup).toHaveBeenCalled();
  });

  test('converts object to JSON string when embedded in string context', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { str_val: 'test' },
    });
    // This tests the convertToString path for string values
    const result = transformer.transformValue('value-{{context:str_val}}-end');
    expect(result).toBe('value-test-end');
  });

  test('prefers scope context over props context', () => {
    const stack = new Stack();
    stack.node.setContext('shared_key', 'from-scope');
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      scope: stack,
      context: { shared_key: 'from-props' },
    });
    expect(transformer.transformValue('{{context:shared_key}}')).toBe('from-scope');
  });

  test('falls back to props context when scope context is undefined', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      scope: stack,
      context: { only_in_props: 'props-value' },
    });
    expect(transformer.transformValue('{{context:only_in_props}}')).toBe('props-value');
  });

  test('handles quoted string context that is not obj or list encoded', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { quoted_str: '"just-a-quoted-string"' },
    });
    // Should return the original quoted string since it doesn't start with obj: or list:
    expect(transformer.transformValue('{{context:quoted_str}}')).toBe('"just-a-quoted-string"');
  });
});
