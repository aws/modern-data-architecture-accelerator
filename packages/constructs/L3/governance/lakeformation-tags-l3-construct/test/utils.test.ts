/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeId } from '../lib/utils';

describe('Utils', () => {
  describe('sanitizeId', () => {
    test('removes special characters', () => {
      expect(sanitizeId('test-string_with@special#chars')).toBe('teststringwithspecialchars');
    });

    test('preserves alphanumeric characters', () => {
      expect(sanitizeId('test123ABC')).toBe('test123ABC');
    });

    test('handles empty string', () => {
      expect(sanitizeId('')).toBe('');
    });

    test('removes all non-alphanumeric characters', () => {
      expect(sanitizeId('!@#$%^&*()_+-=[]{}|;:,.<>?')).toBe('');
    });
  });
});
