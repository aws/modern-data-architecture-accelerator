/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { ModuleEffectiveConfig } from '../lib/config-types';
import { getMdaaConfig } from '../lib/module-service';

describe('getMdaaConfig', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  const isString = (value: unknown): value is string => typeof value === 'string';
  const isNumber = (value: unknown): value is number => typeof value === 'number';
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(item => typeof item === 'string');

  test('should return property value when package.json has mdaa config and property has correct type', () => {
    const config = { modulePath: path.join(fixturesDir, 'mock-module-with-mdaa') } as ModuleEffectiveConfig;
    const result = getMdaaConfig(config, 'testProperty', isString);
    expect(result).toBe('test value');
  });

  test('should return undefined when property does not exist in mdaa config', () => {
    const config = { modulePath: path.join(fixturesDir, 'mock-module-with-mdaa') } as ModuleEffectiveConfig;
    const result = getMdaaConfig(config, 'nonExistentProperty', isString);
    expect(result).toBeUndefined();
  });

  test('should return undefined when package.json has no mdaa section', () => {
    const config = { modulePath: path.join(fixturesDir, 'mock-module-no-mdaa') } as ModuleEffectiveConfig;
    const result = getMdaaConfig(config, 'testProperty', isString);
    expect(result).toBeUndefined();
  });

  test('should throw error when property exists but has wrong type', () => {
    const config = { modulePath: path.join(fixturesDir, 'mock-module-wrong-type') } as ModuleEffectiveConfig;
    expect(() => {
      getMdaaConfig(config, 'testProperty', isString);
    }).toThrow('Property testProperty is of the wrong type');
  });

  test('should work with different type guards', () => {
    const config = { modulePath: path.join(fixturesDir, 'mock-module-with-mdaa') } as ModuleEffectiveConfig;

    const numberResult = getMdaaConfig(config, 'numberProp', isNumber);
    expect(numberResult).toBe(42);

    const arrayResult = getMdaaConfig(config, 'stringArrayProp', isStringArray);
    expect(arrayResult).toEqual(['one', 'two', 'three']);
  });

  test('should return undefined when package.json does not exist', () => {
    const config = { modulePath: '/nonexistent/path' } as ModuleEffectiveConfig;
    const result = getMdaaConfig(config, 'testProperty', isString);
    expect(result).toBeUndefined();
  });
});
