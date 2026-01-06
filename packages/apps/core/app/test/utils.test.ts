/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import { Node } from 'constructs/lib/construct';
import { cleanContextStringValue, readYamlFile, getNodeValue } from '../lib/utils';

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
});
