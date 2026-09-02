/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeBedrockAgentcoreName } from '../lib';

describe('sanitizeBedrockAgentcoreName', () => {
  it('should replace hyphens with underscores', () => {
    expect(sanitizeBedrockAgentcoreName('my-runtime-name')).toBe('my_runtime_name');
  });

  it('should add default prefix if name starts with number', () => {
    expect(sanitizeBedrockAgentcoreName('123runtime')).toBe('r_123runtime');
  });

  it('should add custom prefix if name starts with number', () => {
    expect(sanitizeBedrockAgentcoreName('123endpoint', 'endpoint_')).toBe('endpoint_123endpoint');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeBedrockAgentcoreName('my@runtime#name')).toBe('my_runtime_name');
  });

  it('should handle valid names without changes', () => {
    expect(sanitizeBedrockAgentcoreName('myRuntime123')).toBe('myRuntime123');
  });

  it('should not truncate long names', () => {
    const longName = 'a'.repeat(60);
    const result = sanitizeBedrockAgentcoreName(longName);
    expect(result.length).toBe(60);
    expect(result).toBe(longName);
  });

  it('should handle names with multiple special characters', () => {
    expect(sanitizeBedrockAgentcoreName('my-runtime@2024#v1')).toBe('my_runtime_2024_v1');
  });

  it('should handle names starting with underscore', () => {
    expect(sanitizeBedrockAgentcoreName('_runtime')).toBe('r__runtime');
  });

  it('should handle names starting with underscore with custom prefix', () => {
    expect(sanitizeBedrockAgentcoreName('_endpoint', 'endpoint_')).toBe('endpoint__endpoint');
  });

  it('should preserve underscores in the middle of names', () => {
    expect(sanitizeBedrockAgentcoreName('my_runtime_name')).toBe('my_runtime_name');
  });

  it('should not truncate when the result fits within maxLength', () => {
    // A name at exactly the limit, needing no prefix, is returned unchanged.
    const name = 'a'.repeat(40);
    expect(sanitizeBedrockAgentcoreName(name, 'r_', 40)).toBe(name);
  });

  it('should truncate to maxLength after prepending the prefix', () => {
    // A digit-leading name already at the limit overflows once `r_` is prepended; the tail is
    // trimmed back to the limit and the result still starts with the prefix's leading letter.
    const name = `9${'a'.repeat(39)}`; // 40 chars, starts with a digit
    const result = sanitizeBedrockAgentcoreName(name, 'r_', 40);
    expect(result.length).toBe(40);
    expect(result).toBe(`r_9${'a'.repeat(37)}`);
    expect(result).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/);
  });

  it('should truncate to maxLength with a custom prefix', () => {
    const name = `9${'a'.repeat(47)}`; // 48 chars, starts with a digit
    const result = sanitizeBedrockAgentcoreName(name, 'endpoint_', 48);
    expect(result.length).toBe(48);
    expect(result.startsWith('endpoint_9')).toBe(true);
    expect(result).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/);
  });

  it('should not truncate when maxLength is omitted even after prefixing', () => {
    // Backward compatible: with no maxLength the function stays a pure character sanitizer.
    const name = `9${'a'.repeat(47)}`;
    expect(sanitizeBedrockAgentcoreName(name)).toBe(`r_9${'a'.repeat(47)}`);
  });
});
