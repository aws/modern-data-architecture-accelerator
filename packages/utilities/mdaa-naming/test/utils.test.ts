import { validateResourceName } from '../lib/utils';

describe('validateResourceName', () => {
  it('should accept valid strings', () => {
    expect(validateResourceName('a_b_c')).toBe('a_b_c');
    expect(validateResourceName('a-b-c')).toBe('a-b-c');
    expect(validateResourceName('abc123')).toBe('abc123');
    expect(validateResourceName('a-b-c-1')).toBe('a-b-c-1');
  });

  it('should reject invalid patterns', () => {
    // Test invalid start characters
    expect(() => validateResourceName('-abc')).toThrow();

    // Test invalid end characters
    expect(() => validateResourceName('abc-')).toThrow();

    // Test invalid characters
    expect(() => validateResourceName('ab c')).toThrow();

    // Test empty string
    expect(() => validateResourceName('')).toThrow();
  });

  it('should handle edge cases', () => {
    expect(validateResourceName('a')).toBe('a');
    expect(() => validateResourceName('a-')).toThrow();
    expect(validateResourceName('a1-2b')).toBe('a1-2b');
  });
});
