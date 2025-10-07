/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ensureNodeType, sanitizeScheduledActionName } from '../lib/utils';

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
  describe('ensureNodeType', () => {
    test('Convert CDK nodetype key to value', () => {
      const nodeType = 'DC2_LARGE';
      const nt = ensureNodeType(nodeType);
      expect(nt).toBe('dc2.large');
    });
    test('Convert already nodetype key to value', () => {
      const nodeType = 'dc2.large';
      const nt = ensureNodeType(nodeType);
      expect(nt).toBe('dc2.large');
    });
    test('throws exception if given invalid value', () => {
      const nodeType = 'fb2.teeny';
      expect(() => ensureNodeType(nodeType)).toThrowError('Invalid node type: fb2.teeny');
    });
    test('throws exception if given invalid CDK key', () => {
      const nodeType = 'BF2_HUGE';
      expect(() => ensureNodeType(nodeType)).toThrowError('Invalid node type: BF2_HUGE');
    });
  });
});
