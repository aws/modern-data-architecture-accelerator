/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildColumnValuesRule,
  buildCompletenessRule,
  buildIsCompleteRule,
  buildRowCountRule,
  buildRulesetString,
  buildRuleString,
  buildUniquenessRule,
  DataQualityRule,
} from '../lib/dqdl-builder';

describe('DQDL Builder', () => {
  describe('buildRulesetString', () => {
    test('passes through raw DQDL string', () => {
      const dqdl = 'Rules = [\n    IsComplete "id",\n    RowCount > 0\n]';
      expect(buildRulesetString(dqdl)).toBe(dqdl);
    });

    test('builds DQDL from array of rule objects', () => {
      const rules: DataQualityRule[] = [
        { ruleType: 'IsComplete', column: 'id' },
        { ruleType: 'RowCount', comparisonOperator: '>', value: 0 },
      ];
      const result = buildRulesetString(rules);
      expect(result).toContain('Rules = [');
      expect(result).toContain('IsComplete "id"');
      expect(result).toContain('RowCount > 0');
    });

    test('throws error for invalid input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentionally passing invalid type to test error handling
      expect(() => buildRulesetString(123 as any)).toThrow('ruleset must be a string or an array of rule objects');
    });
  });

  describe('buildRuleString', () => {
    test('routes to correct rule builder', () => {
      expect(buildRuleString({ ruleType: 'IsComplete', column: 'id' })).toBe('IsComplete "id"');
      expect(buildRuleString({ ruleType: 'RowCount', comparisonOperator: '>', value: 100 })).toBe('RowCount > 100');
    });

    test('throws error for unsupported rule type', () => {
      expect(() => buildRuleString({ ruleType: 'InvalidRule' })).toThrow('Unsupported ruleType: InvalidRule');
    });
  });

  describe('buildIsCompleteRule', () => {
    test('builds basic IsComplete rule', () => {
      const rule: DataQualityRule = { ruleType: 'IsComplete', column: 'customer_id' };
      expect(buildIsCompleteRule(rule)).toBe('IsComplete "customer_id"');
    });

    test('builds IsComplete rule with where clause', () => {
      const rule: DataQualityRule = { ruleType: 'IsComplete', column: 'email', where: 'status = "active"' };
      expect(buildIsCompleteRule(rule)).toBe('IsComplete "email" where "status = \\"active\\""');
    });

    test('throws error when column is missing', () => {
      const rule: DataQualityRule = { ruleType: 'IsComplete' };
      expect(() => buildIsCompleteRule(rule)).toThrow('column is required for IsComplete rule');
    });
  });

  describe('buildColumnValuesRule', () => {
    test('builds rule with array of values', () => {
      const rule: DataQualityRule = {
        ruleType: 'ColumnValues',
        column: 'status',
        values: ['active', 'inactive', 'pending'],
      };
      expect(buildColumnValuesRule(rule)).toBe('ColumnValues "status" in ["active","inactive","pending"]');
    });

    test('builds rule with custom operator', () => {
      const rule: DataQualityRule = {
        ruleType: 'ColumnValues',
        column: 'age',
        comparisonOperator: '>',
        values: [18],
      };
      expect(buildColumnValuesRule(rule)).toBe('ColumnValues "age" > [18]');
    });

    test('throws error when column is missing', () => {
      const rule: DataQualityRule = { ruleType: 'ColumnValues', values: ['test'] };
      expect(() => buildColumnValuesRule(rule)).toThrow('column is required for ColumnValues rule');
    });

    test('throws error when values is missing', () => {
      const rule: DataQualityRule = { ruleType: 'ColumnValues', column: 'status' };
      expect(() => buildColumnValuesRule(rule)).toThrow('values is required for ColumnValues rule');
    });
  });

  describe('buildRowCountRule', () => {
    test('builds rule with default operator and value', () => {
      const rule: DataQualityRule = { ruleType: 'RowCount' };
      expect(buildRowCountRule(rule)).toBe('RowCount > 0');
    });

    test('builds rule with custom operator and value', () => {
      const rule: DataQualityRule = { ruleType: 'RowCount', comparisonOperator: '>=', value: 1000 };
      expect(buildRowCountRule(rule)).toBe('RowCount >= 1000');
    });
  });

  describe('buildCompletenessRule', () => {
    test('builds rule with default threshold', () => {
      const rule: DataQualityRule = { ruleType: 'Completeness', column: 'email' };
      expect(buildCompletenessRule(rule)).toBe('Completeness "email" > 0.95');
    });

    test('builds rule with custom threshold and operator', () => {
      const rule: DataQualityRule = {
        ruleType: 'Completeness',
        column: 'phone',
        comparisonOperator: '>=',
        threshold: 0.8,
      };
      expect(buildCompletenessRule(rule)).toBe('Completeness "phone" >= 0.8');
    });

    test('throws error when column is missing', () => {
      const rule: DataQualityRule = { ruleType: 'Completeness' };
      expect(() => buildCompletenessRule(rule)).toThrow('column is required for Completeness rule');
    });
  });

  describe('buildUniquenessRule', () => {
    test('builds rule with default threshold', () => {
      const rule: DataQualityRule = { ruleType: 'Uniqueness', column: 'email' };
      expect(buildUniquenessRule(rule)).toBe('Uniqueness "email" > 0.95');
    });

    test('builds rule with custom threshold', () => {
      const rule: DataQualityRule = {
        ruleType: 'Uniqueness',
        column: 'username',
        threshold: 1.0,
      };
      expect(buildUniquenessRule(rule)).toBe('Uniqueness "username" > 1');
    });

    test('throws error when column is missing', () => {
      const rule: DataQualityRule = { ruleType: 'Uniqueness' };
      expect(() => buildUniquenessRule(rule)).toThrow('column is required for Uniqueness rule');
    });
  });
});
