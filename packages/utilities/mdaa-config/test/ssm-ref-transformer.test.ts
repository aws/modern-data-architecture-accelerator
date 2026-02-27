/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConfigSSMValueTransformer } from '../lib';

describe('MdaaConfigSSMValueTransformer', () => {
  let transformer: MdaaConfigSSMValueTransformer;

  beforeEach(() => {
    transformer = new MdaaConfigSSMValueTransformer();
  });

  test('transforms ssm: prefix to resolve:ssm format', () => {
    const result = transformer.transformValue('ssm:/my/param/name', 'some/path');
    expect(result).toBe('{{resolve:ssm:/my/param/name}}');
  });

  test('handles whitespace after ssm: prefix', () => {
    const result = transformer.transformValue('ssm:  /my/param/name', 'some/path');
    expect(result).toBe('{{resolve:ssm:/my/param/name}}');
  });

  test('returns unchanged value without ssm: prefix', () => {
    const result = transformer.transformValue('plain-value', 'some/path');
    expect(result).toBe('plain-value');
  });

  test('returns unchanged value for empty string', () => {
    const result = transformer.transformValue('', 'some/path');
    expect(result).toBe('');
  });

  test('ignores ssm: values in policyDocument/Statement/Action path', () => {
    const result = transformer.transformValue('ssm:GetParameter', 'policyDocument/Statement/Action');
    expect(result).toBe('ssm:GetParameter');
  });

  test('ignores ssm: values in policyDocument/Statement/Action path (case insensitive)', () => {
    const result = transformer.transformValue('ssm:GetParameter', 'PolicyDocument/Statement/ACTION');
    expect(result).toBe('ssm:GetParameter');
  });

  test('ignores ssm: values when path ends with policyDocument/Statement/Action', () => {
    const result = transformer.transformValue('ssm:PutParameter', 'some/nested/policyDocument/Statement/Action');
    expect(result).toBe('ssm:PutParameter');
  });

  test('transforms ssm: values when path contains but does not end with ignored path', () => {
    const result = transformer.transformValue('ssm:/my/param', 'policyDocument/Statement/Action/something');
    expect(result).toBe('{{resolve:ssm:/my/param}}');
  });

  test('transforms ssm: values for non-ignored paths', () => {
    const result = transformer.transformValue('ssm:/config/database/host', 'resources/database/config');
    expect(result).toBe('{{resolve:ssm:/config/database/host}}');
  });

  test('handles ssm: prefix with no additional content', () => {
    const result = transformer.transformValue('ssm:', 'some/path');
    expect(result).toBe('{{resolve:ssm:}}');
  });

  test('does not transform values that contain ssm: but do not start with it', () => {
    const result = transformer.transformValue('prefix-ssm:/param', 'some/path');
    expect(result).toBe('prefix-ssm:/param');
  });

  test('handles complex SSM parameter paths', () => {
    const result = transformer.transformValue('ssm:/org/env/domain/module/param-name', 'config/settings');
    expect(result).toBe('{{resolve:ssm:/org/env/domain/module/param-name}}');
  });

  test('handles SSM parameter with special characters', () => {
    const result = transformer.transformValue('ssm:/my-param_name.v1', 'some/path');
    expect(result).toBe('{{resolve:ssm:/my-param_name.v1}}');
  });
});
