/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateRulesetName } from '../lib/validators';

describe('Validators', () => {
  describe('validateRulesetName', () => {
    test('accepts valid ruleset names', () => {
      const validNames = [
        'my-ruleset',
        'MyRuleset123',
        'ruleset_name',
        'ruleset.name',
        'a',
        'A-B_C.D123',
        'customer-data-quality',
      ];

      validNames.forEach(name => {
        expect(() => validateRulesetName(name)).not.toThrow();
      });
    });

    test('rejects names with spaces', () => {
      expect(() => validateRulesetName('my ruleset')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
      expect(() => validateRulesetName('Customer Data Quality')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
    });

    test('rejects names with special characters', () => {
      const invalidNames = ['ruleset@name', 'ruleset#name', 'ruleset!', 'ruleset$', 'ruleset%', 'ruleset&'];

      invalidNames.forEach(name => {
        expect(() => validateRulesetName(name)).toThrow(
          'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
        );
      });
    });

    test('rejects empty names', () => {
      expect(() => validateRulesetName('')).toThrow('must be between 1 and 255 characters (current length: 0)');
    });

    test('rejects names longer than 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => validateRulesetName(longName)).toThrow('must be between 1 and 255 characters (current length: 256)');
    });

    test('accepts names at boundary lengths', () => {
      const name1Char = 'a';
      const name255Chars = 'a'.repeat(255);

      expect(() => validateRulesetName(name1Char)).not.toThrow();
      expect(() => validateRulesetName(name255Chars)).not.toThrow();
    });

    test('rejects names with unicode characters', () => {
      expect(() => validateRulesetName('ruleset-名前')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
      expect(() => validateRulesetName('ruleset-émoji')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
    });

    test('rejects names with newlines or tabs', () => {
      expect(() => validateRulesetName('ruleset\nname')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
      expect(() => validateRulesetName('ruleset\tname')).toThrow(
        'must contain only alphanumeric characters, hyphens, periods, and underscores (no spaces)',
      );
    });
  });
});
