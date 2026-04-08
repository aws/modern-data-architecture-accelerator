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

  test('Source metadata SSM parameter created', () => {
    const testApp3 = new MdaaTestApp();
    const propsWithSource: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'source-rules': {
          targetTable: { databaseName: 'test_db', tableName: 'test_tbl' },
          source: { sourceType: 'redshift', connectionName: 'my-conn', redshiftTable: 'public.orders' },
          ruleset: [{ ruleType: 'RowCount', comparisonOperator: '>', value: 0 }],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp3.testStack, testApp3.naming),
      naming: testApp3.naming,
    };
    new DataOpsDataQualityL3Construct(testApp3.testStack, 'source-test', propsWithSource);
    const template3 = Template.fromStack(testApp3.testStack);
    template3.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'Source configuration for ruleset source-rules',
    });
  });

  test('SMUS publishing SSM parameter created', () => {
    const testApp4 = new MdaaTestApp();
    const propsWithSmus: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      smusPublishing: {
        domainId: 'dzd_test',
        accountId: '123456789012',
        region: 'us-west-2',
        domainKmsKeyArn: 'arn:aws:kms:us-west-2:123456789012:key/abc',
      },
      rulesetConfigs: {
        'smus-rules': {
          targetTable: { databaseName: 'test_db', tableName: 'test_tbl' },
          smusAssetId: 'asset-123',
          ruleset: [{ ruleType: 'RowCount', comparisonOperator: '>', value: 0 }],
        },
      },
      roleHelper: new MdaaRoleHelper(testApp4.testStack, testApp4.naming),
      naming: testApp4.naming,
    };
    new DataOpsDataQualityL3Construct(testApp4.testStack, 'smus-test', propsWithSmus);
    const template4 = Template.fromStack(testApp4.testStack);
    template4.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'SMUS publishing configuration for data quality',
    });
  });

  test('Recommendation ruleset without explicit rules', () => {
    const testApp5 = new MdaaTestApp();
    const propsWithRecommendation: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      rulesetConfigs: {
        'recommendation-rules': {
          targetTable: { databaseName: 'test_db', tableName: 'test_tbl' },
          recommendationRunId: 'run-abc-123',
        },
      },
      roleHelper: new MdaaRoleHelper(testApp5.testStack, testApp5.naming),
      naming: testApp5.naming,
    };
    new DataOpsDataQualityL3Construct(testApp5.testStack, 'recommendation-test', propsWithRecommendation);
    const template5 = Template.fromStack(testApp5.testStack);
    template5.resourceCountIs('AWS::Glue::DataQualityRuleset', 0);
    template5.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'Recommendation configuration for ruleset recommendation-rules',
    });
  });

  test('Dynamic target SSM parameter created', () => {
    const testApp6 = new MdaaTestApp();
    const propsWithDynamic: DataOpsDataQualityL3ConstructProps = {
      projectName: 'test-project',
      dynamicTargets: [
        { name: 's3-parquet', s3DirUri: 's3://my-bucket/data/', source: { sourceType: 's3', s3Format: 'parquet' } },
      ],
      roleHelper: new MdaaRoleHelper(testApp6.testStack, testApp6.naming),
      naming: testApp6.naming,
    };
    new DataOpsDataQualityL3Construct(testApp6.testStack, 'dynamic-test', propsWithDynamic);
    const template6 = Template.fromStack(testApp6.testStack);
    template6.resourceCountIs('AWS::Glue::DataQualityRuleset', 0);
    template6.hasResourceProperties('AWS::SSM::Parameter', {
      Description: 'Dynamic discovery target configuration for s3-parquet',
    });
  });
});
