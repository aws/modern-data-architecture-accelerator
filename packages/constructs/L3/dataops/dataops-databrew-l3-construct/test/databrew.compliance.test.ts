/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import {
  DataBrewL3ConstructProps,
  DataBrewL3Construct,
  ConfigOptions,
  DataBrewJobProps,
  RecipeProps,
  DatasetProps,
} from '../lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const role: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/test-role',
    id: 'test-id',
    name: 'test-role',
  };

  const testDataset: ConfigOptions = {
    existing: { name: 'test-data-set' },
  };

  const testRecipe: ConfigOptions = {
    existing: { name: 'test-recipe', version: '1.0' },
  };

  const job1: DataBrewJobProps = {
    type: 'RECIPE',
    projectName: 'test-databrew-project',
    dataset: testDataset,
    recipe: testRecipe,
    kmsKeyArn: 'test-kms-key-arn',
    executionRole: role,
  };

  const generatedRecipe: RecipeProps = {
    steps:
      '[ { "Action": { "Operation": "RENAME", "Parameters": { "sourceColumn": "id", "targetColumn": "employee_id" } } } ]',
  };
  const recipes = { 'generated-recipe': generatedRecipe };

  const generatedDataset: DatasetProps = {
    input: {
      s3InputDefinition: {
        bucket: 'ssm:/path_to_bucket_name',
        key: 'data/raw_data/input_data.csv.snappy',
      },
    },
  };
  const datasets = { 'generated-dataset': generatedDataset };

  const testDatasetGenerated: ConfigOptions = {
    generated: 'generated-dataset',
  };

  const testRecipeGenerated: ConfigOptions = {
    generated: 'generated-recipe',
  };

  const job2: DataBrewJobProps = {
    type: 'PROFILE',
    dataset: testDataset,
    kmsKeyArn: 'test-kms-key-arn',
    executionRole: role,
  };

  const job3: DataBrewJobProps = {
    type: 'RECIPE',
    dataset: testDatasetGenerated,
    recipe: testRecipeGenerated,
    kmsKeyArn: 'test-kms-key-arn',
    executionRole: role,
    schedule: {
      name: 'mdaa-test-profile-schedule',
      cronExpression: 'Cron(50 21 * * ? *)',
    },
  };

  const jobs = { 'test-job1': job1, 'test-job2': job2, 'test-job3': job3 };

  const constructProps: DataBrewL3ConstructProps = {
    ...{
      jobs: jobs,
    },
    datasets: datasets,
    recipes: recipes,
    projectName: 'test-glue-project',
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new DataBrewL3Construct(stack, 'databrew', constructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Validate if job is created', () => {
    template.resourceCountIs('AWS::DataBrew::Job', 3);
  });
});
