/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { MdaaConfigBlueprintRefValueTransformer } from '../lib';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

describe('MdaaConfigBlueprintRefValueTransformer', () => {
  let mockNaming: IMdaaResourceNaming;
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
    mockNaming = {
      props: {
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        moduleName: 'test-module',
      },
      withModuleName: jest.fn().mockReturnThis(),
      withDomain: jest.fn().mockReturnThis(),
      withOrg: jest.fn().mockReturnThis(),
      withEnv: jest.fn().mockReturnThis(),
      withSuffix: jest.fn().mockReturnThis(),
      ssmDomainPath: jest.fn().mockReturnValue('/test/domain/path'),
      ssmEnvPath: jest.fn().mockReturnValue('/test/env/path'),
      ssmOrgPath: jest.fn().mockReturnValue('/test-org/'),
      resourceName: jest
        .fn()
        .mockImplementation((suffix?: string) => (suffix ? `test-resource-${suffix}` : 'test-resource')),
      ssmPath: jest.fn().mockImplementation((path: string) => `/test/${path}`),
      stackName: jest.fn().mockImplementation((name?: string) => (name ? `test-stack-${name}` : 'test-stack')),
      exportName: jest.fn().mockImplementation((path: string) => `test-export-${path}`),
    } as unknown as IMdaaResourceNaming;
  });

  test('returns unchanged value without refs', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    expect(transformer.transformValue('plain-value')).toBe('plain-value');
  });

  test('returns unchanged value with empty string', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    expect(transformer.transformValue('')).toBe('');
  });

  test('transforms blueprint ref', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    const result = transformer.transformValue('{{blueprint:/some/path}}');
    expect(result).toContain('{{resolve:ssm:/test-org/');
    expect(result).toContain('/some/path}}');
    expect(mockNaming.ssmOrgPath).toHaveBeenCalledWith('', false);
  });

  test('transforms blueprint ref with prefix and suffix', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    const result = transformer.transformValue('prefix-{{blueprint:/path}}-suffix');
    expect(result).toContain('prefix-');
    expect(result).toContain('-suffix');
    expect(result).toContain('{{resolve:ssm:');
  });

  test('handles multiple blueprint refs', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    const result = transformer.transformValue('{{blueprint:/path1}}-{{blueprint:/path2}}');
    expect(result).toContain('/path1}}');
    expect(result).toContain('/path2}}');
  });

  test('reuses existing CfnParameter for datazoneEnvironmentProjectId', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });

    // First call creates the parameter
    transformer.transformValue('{{blueprint:/path1}}');

    // Second call should reuse the same parameter
    transformer.transformValue('{{blueprint:/path2}}');

    // Should only have one datazoneEnvironmentProjectId parameter
    const params = stack.node.children.filter(child => child.node.id === 'datazoneEnvironmentProjectId');
    expect(params.length).toBe(1);
  });

  test('ignores non-blueprint refs', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    const result = transformer.transformValue('{{other:value}}');
    // Non-blueprint refs should remain unchanged
    expect(result).toBe('{{other:value}}');
  });

  test('handles nested refs in blueprint path', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    // Nested refs should be processed recursively
    const result = transformer.transformValue('{{blueprint:/{{other}}/path}}');
    // The inner ref is not a blueprint ref, so it stays as-is in the path
    expect(result).toContain('{{resolve:ssm:');
  });

  test('handles unbalanced braces gracefully', () => {
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });
    // Unbalanced braces should be skipped
    expect(transformer.transformValue('{{blueprint:/path')).toBe('{{blueprint:/path');
    expect(transformer.transformValue('blueprint:/path}}')).toBe('blueprint:/path}}');
  });

  test('logs resolved blueprint path', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const transformer = new MdaaConfigBlueprintRefValueTransformer({
      naming: mockNaming,
      scope: stack,
    });

    transformer.transformValue('{{blueprint:/test/path}}');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Resolving blueprint path:'));
    consoleSpy.mockRestore();
  });
});
