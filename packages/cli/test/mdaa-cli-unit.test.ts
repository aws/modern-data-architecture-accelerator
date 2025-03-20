/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectiveConfig } from '../lib/config-types';
import { generateContextCdkParams } from '../lib/utils';

describe('generateContextCdkParams', () => {
  it('should handle empty context object', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {},
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toEqual([]);
  });

  it('should handle string values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        region: 'us-east-1',
        environment: 'prod',
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'region=us-east-1'`);
    expect(result).toContain(`-c 'environment=prod'`);
    expect(result.length).toBe(2);
  });

  it('should handle boolean values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        debug: true,
        verbose: false,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'debug=true'`);
    expect(result).toContain(`-c 'verbose=false'`);
    expect(result.length).toBe(2);
  });

  it('should handle array values', () => {
    const array = ['a', 'b', 'c'];
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        items: array,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'items="list:${JSON.stringify(JSON.stringify(array)).substring(
      1,
      JSON.stringify(JSON.stringify(array)).length - 1,
    )}"'`;
    expect(result).toContain(expectedValue);
    expect(result.length).toBe(1);
  });

  it('should handle object values', () => {
    const obj = { key1: 'value1', key2: 'value2' };
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        config: obj,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'config="obj:${JSON.stringify(JSON.stringify(obj)).substring(
      1,
      JSON.stringify(JSON.stringify(obj)).length - 1,
    )}"'`;
    expect(result).toContain(expectedValue);
    expect(result.length).toBe(1);
  });

  it('should handle mixed types', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        name: 'test',
        enabled: true,
        tags: ['tag1', 'tag2'],
        settings: { timeout: 30 },
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'name=test'`);
    expect(result).toContain(`-c 'enabled=true'`);
    expect(result.length).toBe(4);
  });

  it('should throw error for unsupported types', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        value: 123, // Number type is not handled
      },
    } as unknown as EffectiveConfig;

    expect(() => generateContextCdkParams(moduleConfig)).toThrow(/Don't know how to handle type/);
  });

  it('should handle special characters in string values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        path: '/usr/local/bin',
        query: 'name=value&other=123',
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'path=/usr/local/bin'`);
    expect(result).toContain(`-c 'query=name=value&other=123'`);
  });

  it('should handle nested objects and arrays', () => {
    const complexObj = {
      nested: {
        array: [1, 2, 3],
        obj: { a: 'b' },
      },
    };

    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        complex: complexObj,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'complex="obj:${JSON.stringify(JSON.stringify(complexObj)).substring(
      1,
      JSON.stringify(JSON.stringify(complexObj)).length - 1,
    )}"'`;
    expect(result).toContain(expectedValue);
  });
});
