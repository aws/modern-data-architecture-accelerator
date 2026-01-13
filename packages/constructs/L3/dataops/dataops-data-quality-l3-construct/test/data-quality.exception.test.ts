/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { DataOpsDataQualityL3Construct, DataOpsDataQualityL3ConstructProps } from '../lib';

describe('DataOpsDataQualityL3Construct Exception Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  test('should throw error when no rulesets are provided', () => {
    const testApp0 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {}, // Empty rulesets
      roleHelper: new MdaaRoleHelper(testApp0.testStack, testApp0.naming),
      naming: testApp0.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp0.testStack, 'test-empty-rulesets', constructProps);
    }).toThrow();
  });

  test('should throw error for invalid ruleset name with spaces', () => {
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'invalid ruleset name': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: 'Rules = [IsComplete "id"]',
        },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(stack, 'test-invalid-name-spaces', constructProps);
    }).toThrow(); // Validation error causes construct creation to fail
  });

  test('should throw error for invalid ruleset name with special characters', () => {
    const testApp2 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'invalid@ruleset': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: 'Rules = [IsComplete "id"]',
        },
      },
      roleHelper: new MdaaRoleHelper(testApp2.testStack, testApp2.naming),
      naming: testApp2.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp2.testStack, 'test-invalid-name-special', constructProps);
    }).toThrow(); // Validation error causes construct creation to fail
  });

  test('should throw error for ruleset name longer than 255 characters', () => {
    const testApp3 = new MdaaTestApp();
    const longName = 'a'.repeat(256);
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        [longName]: {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: 'Rules = [IsComplete "id"]',
        },
      },
      roleHelper: new MdaaRoleHelper(testApp3.testStack, testApp3.naming),
      naming: testApp3.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp3.testStack, 'test-invalid-name-length', constructProps);
    }).toThrow(); // Validation error causes construct creation to fail
  });

  test('should throw error for invalid ruleset type', () => {
    const testApp4 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'invalid-ruleset': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentionally passing invalid type to test error handling
          ruleset: 123 as any, // Invalid type
        },
      },
      roleHelper: new MdaaRoleHelper(testApp4.testStack, testApp4.naming),
      naming: testApp4.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp4.testStack, 'test-invalid-ruleset', constructProps);
    }).toThrow('ruleset must be a string or an array of rule objects');
  });

  test('should throw error for unsupported rule type', () => {
    const testApp5 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'unsupported-rule': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: [
            {
              ruleType: 'InvalidRuleType',
            },
          ],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp5.testStack, testApp5.naming),
      naming: testApp5.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp5.testStack, 'test-unsupported-rule', constructProps);
    }).toThrow('Unsupported ruleType: InvalidRuleType');
  });

  test('should throw error when column is missing for IsComplete rule', () => {
    const testApp6 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'missing-column': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: [
            {
              ruleType: 'IsComplete',
              // column is missing
            },
          ],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp6.testStack, testApp6.naming),
      naming: testApp6.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp6.testStack, 'test-missing-column', constructProps);
    }).toThrow('column is required for IsComplete rule');
  });

  test('should throw error when values is missing for ColumnValues rule', () => {
    const testApp7 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'missing-values': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: [
            {
              ruleType: 'ColumnValues',
              column: 'status',
              // values is missing
            },
          ],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp7.testStack, testApp7.naming),
      naming: testApp7.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp7.testStack, 'test-missing-values', constructProps);
    }).toThrow('values is required for ColumnValues rule');
  });

  test('should throw error when value is missing for Mean rule', () => {
    const testApp8 = new MdaaTestApp();
    const constructProps: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'missing-value': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
          },
          ruleset: [
            {
              ruleType: 'Mean',
              column: 'price',
              // value is missing
            },
          ],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp8.testStack, testApp8.naming),
      naming: testApp8.naming,
    };

    expect(() => {
      new DataOpsDataQualityL3Construct(testApp8.testStack, 'test-missing-value', constructProps);
    }).toThrow('value is required for Mean rule');
  });
});
