/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { Template } from 'aws-cdk-lib/assertions';
import { DataOpsDataQualityL3Construct, DataOpsDataQualityL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: DataOpsDataQualityL3ConstructProps = {
    projectName: 'test-project',
    rulesetConfigs: {
      'test-quality-rules': {
        description: 'Test data quality ruleset',
        targetTable: {
          databaseName: 'test_database',
          tableName: 'test_table',
        },
        ruleset: [
          {
            ruleType: 'IsComplete',
            column: 'id',
          },
          {
            ruleType: 'RowCount',
            comparisonOperator: '>',
            value: 0,
          },
        ],
      },
      'test-dqdl-rules': {
        targetTable: {
          databaseName: 'test_database',
          tableName: 'test_table2',
        },
        ruleset: 'Rules = [\n    IsComplete "id",\n    RowCount > 0\n]',
      },
    },
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new DataOpsDataQualityL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::Glue::DataQualityRuleset', 2);
    template.resourceCountIs('AWS::SSM::Parameter', 4); // 2 params per ruleset
  });

  test('Structured rules', () => {
    template.hasResourceProperties('AWS::Glue::DataQualityRuleset', {
      Name: 'test-quality-rules',
      Description: 'Test data quality ruleset',
      TargetTable: {
        DatabaseName: 'test_database',
        TableName: 'test_table',
      },
      Ruleset: 'Rules = [\n    IsComplete "id",\n    RowCount > 0\n]',
    });
  });

  test('DQDL string', () => {
    template.hasResourceProperties('AWS::Glue::DataQualityRuleset', {
      Name: 'test-dqdl-rules',
      TargetTable: {
        DatabaseName: 'test_database',
        TableName: 'test_table2',
      },
      Ruleset: 'Rules = [\n    IsComplete "id",\n    RowCount > 0\n]',
    });
  });

  test('SSM parameters created', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'Glue Data Quality Ruleset name for test-quality-rules',
      Value: 'test-quality-rules',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'Target table for ruleset test-quality-rules',
      Value: 'test_database.test_table',
    });
  });

  test('Cross-account catalog support', () => {
    const testApp2 = new MdaaTestApp();
    const propsWithCatalogId: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'cross-account-rules': {
          targetTable: {
            databaseName: 'test_database',
            tableName: 'test_table',
            catalogId: '123456789012',
          },
          ruleset: [{ ruleType: 'RowCount', comparisonOperator: '>', value: 0 }],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp2.testStack, testApp2.naming),
      naming: testApp2.naming,
    };

    new DataOpsDataQualityL3Construct(testApp2.testStack, 'cross-account-test', propsWithCatalogId);
    const template2 = Template.fromStack(testApp2.testStack);

    template2.hasResourceProperties('AWS::Glue::DataQualityRuleset', {
      TargetTable: {
        DatabaseName: 'test_database',
        TableName: 'test_table',
        CatalogId: '123456789012',
      },
    });
  });
});
