/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModuleEffectiveConfig } from '../lib/config-types';
import { getMdaaConfig } from '../lib/module-service';

describe('getMdaaConfig', () => {
  // Setup
  const mockModuleConfig = {
    modulePath: '/path/to/module',
  } as ModuleEffectiveConfig;

  const mockMdaaConfigPath = '/path/to/module/mdaa.config.json';

  // Type guards for testing
  const isString = (value: unknown): value is string => typeof value === 'string';
  const isNumber = (value: unknown): value is number => typeof value === 'number';
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(item => typeof item === 'string');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('should return property value when config file exists and property has correct type', () => {
    // Mock require to return a config object
    jest.mock(
      mockMdaaConfigPath,
      () => ({
        testProperty: 'test value',
      }),
      { virtual: true },
    );

    // We need to use jest.requireActual to get the non-mocked version of the function
    const result = getMdaaConfig(mockModuleConfig, 'testProperty', isString);

    expect(result).toBe('test value');
  });

  test('should return undefined when property does not exist in config', () => {
    // Mock require to return a config object without the requested property
    jest.mock(
      mockMdaaConfigPath,
      () => ({
        otherProperty: 'some value',
      }),
      { virtual: true },
    );

    const result = getMdaaConfig(mockModuleConfig, 'testProperty', isString);

    expect(result).toBeUndefined();
  });

  test('should throw error when property exists but has wrong type', () => {
    // Mock require to return a config with property of wrong type
    jest.mock(
      mockMdaaConfigPath,
      () => ({
        testProperty: 123, // Number instead of string
      }),
      { virtual: true },
    );

    expect(() => {
      getMdaaConfig(mockModuleConfig, 'testProperty', isString);
    }).toThrow('Property testProperty is of the wrong type');
  });

  test('should work with different type guards', () => {
    // Mock require to return a config with different property types
    jest.mock(
      mockMdaaConfigPath,
      () => ({
        numberProp: 42,
        stringArrayProp: ['one', 'two', 'three'],
      }),
      { virtual: true },
    );

    const numberResult = getMdaaConfig(mockModuleConfig, 'numberProp', isNumber);
    expect(numberResult).toBe(42);

    const arrayResult = getMdaaConfig(mockModuleConfig, 'stringArrayProp', isStringArray);
    expect(arrayResult).toEqual(['one', 'two', 'three']);
  });
});
