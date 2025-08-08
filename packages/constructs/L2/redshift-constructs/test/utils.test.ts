/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeClusterName } from '../lib/utils';

describe('utils', () => {
  describe('sanitizeScheduledActionName', () => {
    test('removes consecutive dashes', () => {
      expect(sanitizeClusterName('test--action')).toBe('test-action');
    });

    test('removes multiple consecutive dashes', () => {
      expect(sanitizeClusterName('test---action')).toBe('test-action');
    });

    test('preserves single dashes', () => {
      expect(sanitizeClusterName('test-action')).toBe('test-action');
    });

    test('handles empty string', () => {
      expect(sanitizeClusterName('')).toBe('');
    });

    test('handles string without dashes', () => {
      expect(sanitizeClusterName('testaction')).toBe('testaction');
    });
  });
});
