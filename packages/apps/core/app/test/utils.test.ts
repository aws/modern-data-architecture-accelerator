/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import { Node } from 'constructs/lib/construct';
import { cleanContextStringValue, coerceConfigTypes, getNodeValue, readYamlFile } from '../lib/utils';

jest.mock('fs');
jest.mock('yaml');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;

describe('Utils', () => {
  describe('cleanContextStringValue', () => {
    test('removes leading and trailing quotes', () => {
      expect(cleanContextStringValue('"test"')).toBe('test');
    });

    test('removes only leading quote', () => {
      expect(cleanContextStringValue('"test')).toBe('test');
    });

    test('removes only trailing quote', () => {
      expect(cleanContextStringValue('test"')).toBe('test');
    });

    test('returns unchanged if no quotes', () => {
      expect(cleanContextStringValue('test')).toBe('test');
    });
  });

  describe('readYamlFile', () => {
    test('reads and parses yaml file', () => {
      const mockContent = 'key: value';
      const mockParsed = { key: 'value' };

      mockedFs.readFileSync.mockReturnValue(mockContent);
      mockedYaml.parse.mockReturnValue(mockParsed);

      const result = readYamlFile('test.yaml');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith('test.yaml', 'utf8');
      expect(mockedYaml.parse).toHaveBeenCalledWith(mockContent);
      expect(result).toBe(mockParsed);
    });
  });

  describe('getNodeValue', () => {
    let mockNode: jest.Mocked<Node>;

    beforeEach(() => {
      mockNode = {
        tryGetContext: jest.fn(),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    test('returns parsed value when context exists', () => {
      mockNode.tryGetContext.mockReturnValue('{"test": "value"}');

      const result = getNodeValue(mockNode, 'testKey', { default: 'value' });

      expect(mockNode.tryGetContext).toHaveBeenCalledWith('testKey');
      expect(result).toEqual({ test: 'value' });
    });

    test('returns default value when context is null', () => {
      mockNode.tryGetContext.mockReturnValue(null);

      const result = getNodeValue(mockNode, 'testKey', { default: 'value' });

      expect(result).toEqual({ default: 'value' });
    });

    test('returns default value when context is undefined', () => {
      mockNode.tryGetContext.mockReturnValue(undefined);

      const result = getNodeValue(mockNode, 'testKey', 'defaultString');

      expect(result).toBe('defaultString');
    });
  });

  describe('coerceConfigTypes', () => {
    test('coerces string to number', () => {
      const config = { numberOfNodes: '5' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/numberOfNodes',
          schemaPath: '#/properties/numberOfNodes/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.numberOfNodes).toBe(5);
    });

    test('coerces string to boolean true', () => {
      const config = { enabled: 'true' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/enabled',
          schemaPath: '#/properties/enabled/type',
          params: { type: 'boolean' },
          message: 'must be boolean',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.enabled).toBe(true);
    });

    test('coerces string to boolean false', () => {
      const config = { enabled: 'false' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/enabled',
          schemaPath: '#/properties/enabled/type',
          params: { type: 'boolean' },
          message: 'must be boolean',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.enabled).toBe(false);
    });

    test('coerces nested property', () => {
      const config = { cluster: { nodeCount: '10' } };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/cluster/nodeCount',
          schemaPath: '#/properties/cluster/properties/nodeCount/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.cluster.nodeCount).toBe(10);
    });

    test('handles multiple errors', () => {
      const config = { port: '8080', enabled: 'true', timeout: '30' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/port',
          schemaPath: '#/properties/port/type',
          params: { type: 'number' },
          message: 'must be number',
        },
        {
          keyword: 'type',
          instancePath: '/enabled',
          schemaPath: '#/properties/enabled/type',
          params: { type: 'boolean' },
          message: 'must be boolean',
        },
        {
          keyword: 'type',
          instancePath: '/timeout',
          schemaPath: '#/properties/timeout/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.port).toBe(8080);
      expect(config.enabled).toBe(true);
      expect(config.timeout).toBe(30);
    });

    test('returns false when no errors', () => {
      const config = { numberOfNodes: '5' };
      const original = { ...config };
      coerceConfigTypes(config, []);
      expect(config).toEqual(original);
    });

    test('returns false when empty errors array', () => {
      const config = { numberOfNodes: '5' };
      const original = { ...config };
      coerceConfigTypes(config, []);
      expect(config).toEqual(original);
    });

    test('ignores non-type errors', () => {
      const config = { numberOfNodes: '5' };
      const errors = [
        {
          keyword: 'required',
          instancePath: '',
          schemaPath: '#/required',
          params: { missingProperty: 'name' },
          message: "must have required property 'name'",
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.numberOfNodes).toBe('5'); // unchanged
    });

    test('handles invalid number string gracefully', () => {
      const config = { numberOfNodes: 'invalid' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/numberOfNodes',
          schemaPath: '#/properties/numberOfNodes/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.numberOfNodes).toBe('invalid'); // unchanged
    });

    test('handles invalid boolean string gracefully', () => {
      const config = { enabled: 'yes' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/enabled',
          schemaPath: '#/properties/enabled/type',
          params: { type: 'boolean' },
          message: 'must be boolean',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.enabled).toBe('yes'); // unchanged
    });

    test('handles missing path gracefully', () => {
      const config = { other: 'value' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/nonexistent/path',
          schemaPath: '#/properties/nonexistent/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config).toEqual({ other: 'value' }); // unchanged
    });

    test('does not coerce if already correct type', () => {
      const config = { numberOfNodes: 5 };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/numberOfNodes',
          schemaPath: '#/properties/numberOfNodes/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.numberOfNodes).toBe(5);
    });

    test('skips coercion when value type matches expected type', () => {
      // This tests the runtime guard: typeof value === expectedType
      // Even though Ajv reported a type error, if the value is already the correct type at runtime, skip coercion
      const config = { port: 8080 }; // already a number
      const errors = [
        {
          keyword: 'type',
          instancePath: '/port',
          schemaPath: '#/properties/port/type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.port).toBe(8080); // unchanged
    });

    test('coerces string to integer', () => {
      const config = { count: '42' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/count',
          schemaPath: '#/properties/count/type',
          params: { type: 'integer' },
          message: 'must be integer',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.count).toBe(42);
    });

    test('does not coerce decimal string to integer', () => {
      const config = { count: '1.2' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/count',
          schemaPath: '#/properties/count/type',
          params: { type: 'integer' },
          message: 'must be integer',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.count).toBe('1.2'); // unchanged, not truncated
    });

    test('does not coerce for unsupported types', () => {
      const config = { data: '123' };
      const errors = [
        {
          keyword: 'type',
          instancePath: '/data',
          schemaPath: '#/properties/data/type',
          params: { type: 'array' },
          message: 'must be array',
        },
      ];

      coerceConfigTypes(config, errors);

      expect(config.data).toBe('123'); // unchanged, array coercion not supported
    });
  });
});
