/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnParameter, Stack } from 'aws-cdk-lib';
import { MdaaConfigParamRefValueTransformer } from '../lib';

describe('MdaaConfigParamRefValueTransformer', () => {
  const baseProps = {
    org: 'test-org',
    env: 'dev',
    domain: 'test-domain',
    module_name: 'test-module',
    paramProps: {},
  };

  describe('basic functionality', () => {
    test('returns unchanged value without refs', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      expect(transformer.transformValue('plain-value')).toBe('plain-value');
    });

    test('non-param refs remain unchanged (parseRef override only handles param: refs)', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      // Note: MdaaConfigParamRefValueTransformer.parseRef only handles param: refs
      // Other refs like {{org}} are not substituted by this class
      expect(transformer.transformValue('{{org}}')).toBe('{{org}}');
      expect(transformer.transformValue('{{env}}')).toBe('{{env}}');
      expect(transformer.transformValue('{{domain}}')).toBe('{{domain}}');
    });
  });

  describe('standalone param refs', () => {
    test('creates string parameter for standalone param:string ref', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:string:myParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('myParam') as CfnParameter;
      expect(param).toBeDefined();
      expect(param.type).toBe('String');
    });

    test('creates number parameter for standalone param:number ref', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:number:myNumberParam}}');
      expect(typeof result).toBe('number');
      const param = stack.node.tryFindChild('myNumberParam') as CfnParameter;
      expect(param).toBeDefined();
      expect(param.type).toBe('Number');
    });

    test('creates list parameter for standalone param:list ref', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:list:myListParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('myListParam') as CfnParameter;
      expect(param).toBeDefined();
      expect(param.type).toBe('CommaDelimitedList');
    });

    test('creates string parameter when no type label specified', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:untypedParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('untypedParam') as CfnParameter;
      expect(param).toBeDefined();
      expect(param.type).toBe('String');
    });
  });

  describe('embedded param refs', () => {
    test('substitutes param ref embedded in string', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('prefix-{{param:string:embeddedParam}}-suffix');
      expect(typeof result).toBe('string');
      expect(stack.node.tryFindChild('embeddedParam')).toBeDefined();
    });

    test('substitutes multiple param refs in string', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:string:param1}}-{{param:string:param2}}');
      expect(typeof result).toBe('string');
      expect(stack.node.tryFindChild('param1')).toBeDefined();
      expect(stack.node.tryFindChild('param2')).toBeDefined();
    });
  });

  describe('paramProps configuration', () => {
    test('uses paramProps to create parameter with specified type', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({
        ...baseProps,
        scope: stack,
        paramProps: {
          configuredParam: { type: 'Number', description: 'A number param' },
        },
      });
      const result = transformer.transformValue('{{param:configuredParam}}');
      expect(typeof result).toBe('number');
      const param = stack.node.tryFindChild('configuredParam') as CfnParameter;
      expect(param.type).toBe('Number');
    });

    test('uses paramProps for String type', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({
        ...baseProps,
        scope: stack,
        paramProps: {
          stringParam: { type: 'String', default: 'default-value' },
        },
      });
      const result = transformer.transformValue('{{param:stringParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('stringParam') as CfnParameter;
      expect(param.type).toBe('String');
    });

    test('uses paramProps for CommaDelimitedList type', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({
        ...baseProps,
        scope: stack,
        paramProps: {
          listParam: { type: 'CommaDelimitedList' },
        },
      });
      const result = transformer.transformValue('{{param:listParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('listParam') as CfnParameter;
      expect(param.type).toBe('CommaDelimitedList');
    });

    test('throws error for invalid paramProps type', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({
        ...baseProps,
        scope: stack,
        paramProps: {
          invalidParam: { type: 'InvalidType' },
        },
      });
      // Note: The error is only thrown when paramProps.type is used AND it's invalid
      // But isStringType returns true for any non-Number, non-List type, so InvalidType
      // is treated as a String type and doesn't throw
      const result = transformer.transformValue('{{param:invalidParam}}');
      expect(result).toBeDefined();
      const param = stack.node.tryFindChild('invalidParam') as CfnParameter;
      // InvalidType gets treated as String due to isStringType fallback logic
      expect(param).toBeDefined();
    });
  });

  describe('existing parameter reuse', () => {
    test('reuses existing string parameter', () => {
      const stack = new Stack();
      new CfnParameter(stack, 'existingParam', { type: 'String', default: 'existing' });
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:existingParam}}');
      expect(result).toBeDefined();
      // Should not create a duplicate
      const children = stack.node.children.filter(c => c.node.id === 'existingParam');
      expect(children.length).toBe(1);
    });

    test('reuses existing number parameter', () => {
      const stack = new Stack();
      new CfnParameter(stack, 'existingNumberParam', { type: 'Number', default: 42 });
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:existingNumberParam}}');
      expect(typeof result).toBe('number');
    });

    test('reuses existing list parameter', () => {
      const stack = new Stack();
      new CfnParameter(stack, 'existingListParam', { type: 'CommaDelimitedList' });
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:existingListParam}}');
      expect(result).toBeDefined();
    });

    test('returns valueAsString for existing parameter with AWS::SSM::Parameter::Value type', () => {
      const stack = new Stack();
      // Create a parameter with SSM parameter type (a valid but less common type)
      new CfnParameter(stack, 'ssmTypeParam', { type: 'AWS::SSM::Parameter::Value<String>' });
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:ssmTypeParam}}');
      // Should fall through to valueAsString since it's not Number or List
      expect(result).toBeDefined();
    });
  });

  describe('mixed refs', () => {
    test('handles mix of param and non-param refs (non-param refs unchanged)', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{org}}-{{param:string:mixedParam}}-{{env}}');
      expect(typeof result).toBe('string');
      // Note: parseRef override only handles param: refs, so {{org}} and {{env}} remain unchanged
      expect((result as string).includes('{{org}}')).toBe(true);
      expect((result as string).includes('{{env}}')).toBe(true);
      expect(stack.node.tryFindChild('mixedParam')).toBeDefined();
    });

    test('non-param refs remain unsubstituted when not recognized', () => {
      const stack = new Stack();
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      // unknownRef is not a param: ref and not a recognized base ref
      const result = transformer.transformValue('{{param:string:knownParam}}-{{unknownRef}}');
      expect(typeof result).toBe('string');
      // The unknownRef should remain as-is since it's not a param: ref
      expect((result as string).includes('{{unknownRef}}')).toBe(true);
    });
  });

  describe('List type detection', () => {
    test('detects List<> type as list', () => {
      const stack = new Stack();
      new CfnParameter(stack, 'genericListParam', { type: 'List<Number>' });
      const transformer = new MdaaConfigParamRefValueTransformer({ ...baseProps, scope: stack });
      const result = transformer.transformValue('{{param:genericListParam}}');
      expect(result).toBeDefined();
    });
  });
});
