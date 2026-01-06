/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { hashCodeHex, truncateResourceType, MAX_RESOURCE_TYPE_LENGTH } from '../lib/resource-type-utils';

describe('Resource Type Utils', () => {
  describe('hashCodeHex', () => {
    it('should return consistent hash for the same input', () => {
      const input = 'test-string';
      const hash1 = hashCodeHex(input);
      const hash2 = hashCodeHex(input);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashCodeHex('string-one');
      const hash2 = hashCodeHex('string-two');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a hexadecimal string', () => {
      const hash = hashCodeHex('test-input');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should handle empty string', () => {
      const hash = hashCodeHex('');
      expect(hash).toBe('0');
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(1000);
      const hash = hashCodeHex(longString);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('truncateResourceType', () => {
    it('should return the original string if within max length', () => {
      const shortString = 'short-resource-type';
      const result = truncateResourceType(shortString);
      expect(result).toBe(shortString);
    });

    it('should return the original string if exactly at max length', () => {
      const exactLengthString = 'a'.repeat(MAX_RESOURCE_TYPE_LENGTH);
      const result = truncateResourceType(exactLengthString);
      expect(result).toBe(exactLengthString);
    });

    it('should truncate and add hash if string exceeds max length', () => {
      const longString = 'create-index-test-kb-opensearch-embeddings_2dcaaa33_1024';
      const result = truncateResourceType(longString);

      expect(result.length).toBeLessThanOrEqual(MAX_RESOURCE_TYPE_LENGTH);
      expect(result).toContain('-');
      // Should end with a hash
      expect(result).toMatch(/-[0-9a-f]+$/);
    });

    it('should produce unique results for different long strings', () => {
      const longString1 = 'create-index-kb-one-very-long-name-embeddings_2dcaaa33_1024';
      const longString2 = 'create-index-kb-two-very-long-name-embeddings_2dcaaa33_1024';

      const result1 = truncateResourceType(longString1);
      const result2 = truncateResourceType(longString2);

      expect(result1).not.toBe(result2);
      expect(result1.length).toBeLessThanOrEqual(MAX_RESOURCE_TYPE_LENGTH);
      expect(result2.length).toBeLessThanOrEqual(MAX_RESOURCE_TYPE_LENGTH);
    });

    it('should respect custom max length parameter', () => {
      const customMaxLength = 30;
      const longString = 'this-is-a-string-that-exceeds-thirty-characters';
      const result = truncateResourceType(longString, customMaxLength);

      expect(result.length).toBeLessThanOrEqual(customMaxLength);
      expect(result).toMatch(/-[0-9a-f]+$/);
    });

    it('should preserve as much of the original string as possible', () => {
      const longString = 'create-index-test-kb-opensearch-embeddings_2dcaaa33_1024';
      const result = truncateResourceType(longString);

      // The result should start with the beginning of the original string
      expect(result.startsWith('create-index-test-kb-opensearch-embeddings_')).toBe(true);
    });

    it('should handle strings with special characters', () => {
      const specialString = 'create-index_test.kb-opensearch-embeddings_2dcaaa33_1024';
      const result = truncateResourceType(specialString);

      expect(result.length).toBeLessThanOrEqual(MAX_RESOURCE_TYPE_LENGTH);
    });
  });

  describe('MAX_RESOURCE_TYPE_LENGTH', () => {
    it('should be 52 (60 minus 8 for "Custom::" prefix)', () => {
      expect(MAX_RESOURCE_TYPE_LENGTH).toBe(52);
    });
  });
});
