import { fixAndValidate } from '../lib/utils';

describe('fixAndValidate', () => {
  it('should accept valid strings', () => {
    expect(fixAndValidate('a_b_c')).toBe('a_b_c');
    expect(fixAndValidate('a-b-c')).toBe('a-b-c');
    expect(fixAndValidate('abc123')).toBe('abc123');
    expect(fixAndValidate('a-b-c-1')).toBe('a-b-c-1');
  });

  it('should reject invalid patterns', () => {
    // Test invalid start characters
    expect(() => fixAndValidate('-abc')).toThrow();

    // Test invalid end characters
    expect(() => fixAndValidate('abc-')).toThrow();

    // Test invalid characters
    expect(() => fixAndValidate('ab c')).toThrow();

    // Test empty string
    expect(() => fixAndValidate('')).toThrow();
  });

  it('should handle edge cases', () => {
    expect(fixAndValidate('a')).toBe('a');
    expect(() => fixAndValidate('a-')).toThrow();
    expect(fixAndValidate('a1-2b')).toBe('a1-2b');
  });
});
