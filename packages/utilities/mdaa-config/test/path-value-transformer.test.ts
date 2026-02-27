/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { ConfigConfigPathValueTransformer } from '../lib';

describe('ConfigConfigPathValueTransformer', () => {
  const baseDir = '/home/user/project/configs';

  test('returns unchanged value for non-relative paths', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    expect(transformer.transformValue('some-value')).toBe('some-value');
  });

  test('returns unchanged value for absolute paths', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    expect(transformer.transformValue('/absolute/path/to/file')).toBe('/absolute/path/to/file');
  });

  test('resolves parent relative path (../) to baseDir parent', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    const result = transformer.transformValue('../sibling/file.yaml');
    expect(result).toBe(path.resolve(baseDir, '../sibling/file.yaml'));
  });

  test('resolves current relative path (./) relative to baseDir', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    const result = transformer.transformValue('./subdir/file.yaml');
    expect(result).toBe(path.resolve(baseDir + '/subdir/file.yaml'));
  });

  test('handles multiple parent traversals', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    const result = transformer.transformValue('../../other/file.yaml');
    expect(result).toBe(path.resolve(baseDir, '../../other/file.yaml'));
  });

  test('handles nested current directory paths', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    const result = transformer.transformValue('./a/b/c/file.yaml');
    expect(result).toBe(path.resolve(baseDir + '/a/b/c/file.yaml'));
  });

  test('handles empty baseDir', () => {
    const transformer = new ConfigConfigPathValueTransformer('');
    const result = transformer.transformValue('../file.yaml');
    expect(result).toBe(path.resolve('', '../file.yaml'));
  });

  test('returns empty string unchanged', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    expect(transformer.transformValue('')).toBe('');
  });

  test('handles baseDir with trailing slash', () => {
    const transformer = new ConfigConfigPathValueTransformer('/home/user/project/');
    const result = transformer.transformValue('../file.yaml');
    expect(result).toBe(path.resolve('/home/user/project/', '../file.yaml'));
  });

  test('handles Windows-style paths in value', () => {
    const transformer = new ConfigConfigPathValueTransformer(baseDir);
    // Non-relative path should be returned unchanged
    expect(transformer.transformValue('C:\\Windows\\file.txt')).toBe('C:\\Windows\\file.txt');
  });
});
