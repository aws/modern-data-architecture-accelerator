/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeScheduledActionName } from '../lib/utils';

describe('utils', () => {
  describe('sanitizeScheduledActionName', () => {
    test('removes consecutive dashes', () => {
      expect(sanitizeScheduledActionName('test--action')).toBe('test-action');
    });

    test('removes multiple consecutive dashes', () => {
      expect(sanitizeScheduledActionName('test---action')).toBe('test-action');
    });

    test('preserves single dashes', () => {
      expect(sanitizeScheduledActionName('test-action')).toBe('test-action');
    });

    test('handles empty string', () => {
      expect(sanitizeScheduledActionName('')).toBe('');
    });

    test('handles string without dashes', () => {
      expect(sanitizeScheduledActionName('testaction')).toBe('testaction');
    });
  });
});
