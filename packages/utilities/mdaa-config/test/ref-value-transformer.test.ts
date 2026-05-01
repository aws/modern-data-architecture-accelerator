/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { MdaaConfigRefValueTransformer } from '../lib/ref-value-transformer';

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
      'Unable to resolve ssm-org:param ssm param outside of a naming context',
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

  test('transforms partition ref with awsEnvironment', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      awsEnvironment: { partition: 'aws-us-gov' },
    });
    expect(transformer.transformValue('{{partition}}')).toBe('aws-us-gov');
  });

  test('transforms region ref with awsEnvironment', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      awsEnvironment: { region: 'us-west-2' },
    });
    expect(transformer.transformValue('{{region}}')).toBe('us-west-2');
  });

  test('transforms account ref with awsEnvironment', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      awsEnvironment: { account: '123456789012' },
    });
    expect(transformer.transformValue('{{account}}')).toBe('123456789012');
  });

  test('returns undefined for missing env_var', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env_var:MISSING_VAR}}')).toBe('{{env_var:MISSING_VAR}}');
  });

  test('resolves env_var JSON array to actual array', () => {
    process.env.TEST_JSON_ARRAY = '["subnet-aaa","subnet-bbb"]';
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env_var:TEST_JSON_ARRAY}}')).toEqual(['subnet-aaa', 'subnet-bbb']);
    delete process.env.TEST_JSON_ARRAY;
  });

  test('resolves env_var JSON object to actual object', () => {
    process.env.TEST_JSON_OBJ = '{"key":"value"}';
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env_var:TEST_JSON_OBJ}}')).toEqual({ key: 'value' });
    delete process.env.TEST_JSON_OBJ;
  });

  test('falls through to string for invalid JSON starting with [', () => {
    process.env.TEST_BAD_JSON = '[not valid json';
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(transformer.transformValue('{{env_var:TEST_BAD_JSON}}')).toBe('[not valid json');
    delete process.env.TEST_BAD_JSON;
  });

  test('handles naked reference with object context', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_obj: { key: 'value' } },
    });
    const result = transformer.transformValue('{{context:test_obj}}');
    expect(result).toEqual({ key: 'value' });
  });

  test('handles naked reference with array context', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_array: ['item1', 'item2'] },
    });
    const result = transformer.transformValue('{{context:test_array}}');
    expect(result).toEqual(['item1', 'item2']);
  });

  test('throws when embedding object context in string', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_obj: { key: 'value' } },
    });
    expect(() => transformer.transformValue('prefix-{{context:test_obj}}-suffix')).toThrow(
      'Cannot embed array or object context value in string',
    );
  });

  test('throws when embedding array context in string', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_array: ['item1', 'item2'] },
    });
    expect(() => transformer.transformValue('prefix-{{context:test_array}}-suffix')).toThrow(
      'Cannot embed array or object context value in string',
    );
  });

  test('handles context with encoded object string', () => {
    const stack = new Stack();
    stack.node.setContext('test_key', '"obj:{"key":"value"}"');
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{context:test_key}}');
    expect(result).toEqual({ key: 'value' });
  });

  test('handles context with encoded list string', () => {
    const stack = new Stack();
    stack.node.setContext('test_key', '"list:["item1","item2"]"');
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{context:test_key}}');
    expect(result).toEqual(['item1', 'item2']);
  });

  test('converts number to string in substitution', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_num: 42 },
    });
    const result = transformer.transformValue('value-{{context:test_num}}');
    expect(result).toBe('value-42');
  });

  test('converts boolean to string in substitution', () => {
    const transformer = new MdaaConfigRefValueTransformer({
      ...baseProps,
      context: { test_bool: true },
    });
    const result = transformer.transformValue('value-{{context:test_bool}}');
    expect(result).toBe('value-true');
  });

  test('handles ref: with attribute', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    const result = transformer.transformValue('{{ref:MyResource:Arn}}');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('handles ref: without attribute', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    const result = transformer.transformValue('{{ref:MyResource}}');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('handles ref: with leading slash', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    const result = transformer.transformValue('{{ref:/MyResource}}');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('handles ref: with nested path', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    const result = transformer.transformValue('{{ref:Parent/Child}}');
    expect(result).toBeDefined();
  });

  test('handles ssm-domain ref with naming', () => {
    const mockNaming = {
      ssmDomainPath: jest.fn().mockReturnValue('/test/domain/path'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming: mockNaming as any });
    const result = transformer.transformValue('{{ssm-domain:param}}');
    expect(result).toBe('{{resolve:ssm:/test/domain/path}}');
    expect(mockNaming.ssmDomainPath).toHaveBeenCalledWith('param');
  });

  test('handles ssm-env ref with naming', () => {
    const mockNaming = {
      ssmEnvPath: jest.fn().mockReturnValue('/test/env/path'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming: mockNaming as any });
    const result = transformer.transformValue('{{ssm-env:param}}');
    expect(result).toBe('{{resolve:ssm:/test/env/path}}');
    expect(mockNaming.ssmEnvPath).toHaveBeenCalledWith('param');
  });

  test('handles ssm-org ref with leading slash', () => {
    const mockNaming = {
      ssmOrgPath: jest.fn().mockReturnValue('/test/org/path'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, naming: mockNaming as any });
    const result = transformer.transformValue('{{ssm-org:/param}}');
    expect(result).toBe('{{resolve:ssm:/test/org/path}}');
    expect(mockNaming.ssmOrgPath).toHaveBeenCalledWith('param');
  });

  test('handles resolve:ssm with ARN path', () => {
    const stack = new Stack();
    const transformer = new MdaaConfigRefValueTransformer({ ...baseProps, scope: stack });
    const result = transformer.transformValue('{{resolve:ssm:arn:aws:ssm:us-east-1:123456789012:parameter/test}}');
    expect(result).toBeDefined();
  });

  test('throws when getSsmValue called without scope', () => {
    const transformer = new MdaaConfigRefValueTransformer(baseProps);
    expect(() => transformer.transformValue('{{resolve:ssm:/test/param}}')).toThrow(
      'Unable to resolve ssm param outside of a Construct',
    );
  });
});
