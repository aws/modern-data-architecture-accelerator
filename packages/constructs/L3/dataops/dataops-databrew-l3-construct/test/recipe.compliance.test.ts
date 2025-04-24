/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaDataBrewRecipe, MdaaDataBrewRecipeProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaDataBrewRecipeProps = {
    naming: testApp.naming,
    name: 'test-recipe',
    steps: [
      {
        action: {
          operation: 'operation',

          // the properties below are optional
          parameters: {
            parametersKey: 'parameters',
          },
        },

        // the properties below are optional
        conditionExpressions: [
          {
            condition: 'condition',
            targetColumn: 'targetColumn',

            // the properties below are optional
            value: 'value',
          },
        ],
      },
    ],

    // the properties below are optional
    description: 'description',
  };

  new MdaaDataBrewRecipe(testApp.testStack, 'test-construct', testContstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('TestRecipeName', () => {
    template.hasResourceProperties('AWS::DataBrew::Recipe', {
      Name: testApp.naming.resourceName('test-recipe'),
    });
  });

  test('TestInput', () => {
    template.hasResourceProperties('AWS::DataBrew::Recipe', {
      Steps: [
        {
          Action: {
            Operation: 'operation',
            Parameters: {
              parametersKey: 'parameters',
            },
          },
          ConditionExpressions: [
            {
              Condition: 'condition',
              TargetColumn: 'targetColumn',
              Value: 'value',
            },
          ],
        },
      ],
      Description: 'description',
    });
  });
});
