/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { MdaaDataBrewRuleset, MdaaDataBrewRulesetProps } from "../lib";
import { Template } from "aws-cdk-lib/assertions";

describe( 'MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp()


  const testContstructProps: MdaaDataBrewRulesetProps = {
    naming: testApp.naming,
    name: "test-rules",
    rules: [ {
      checkExpression: 'checkExpression',
      name: 'name',

      // the properties below are optional
      columnSelectors: [ {
        name: 'name',
        regex: 'regex',
      } ],
      disabled: false,
      substitutionMap: [ {
        value: 'value',
        valueReference: 'valueReference',
      } ],
      threshold: {
        value: 123,

        // the properties below are optional
        type: 'type',
        unit: 'unit',
      },
    } ],
    targetArn: 'test-data-set-arn',

    // the properties below are optional
    description: 'description',
  }

  new MdaaDataBrewRuleset( testApp.testStack, "test-construct", testContstructProps )
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  test( 'TestRulesetName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Ruleset", {
      "Name": testApp.naming.resourceName( "test-rules" )
    } )
  } )

  test( 'TestTargetDataSetArn', () => {
    template.hasResourceProperties( "AWS::DataBrew::Ruleset", {
      "TargetArn": "test-data-set-arn"
    } )
  } )

  test( 'TestRules', () => {
    template.hasResourceProperties( "AWS::DataBrew::Ruleset", {
      "Rules": [
        {
          "CheckExpression": "checkExpression",
          "ColumnSelectors": [
            {
              "Name": "name",
              "Regex": "regex"
            }
          ],
          "Disabled": false,
          "Name": "name",
          "SubstitutionMap": [
            {
              "Value": "value",
              "ValueReference": "valueReference"
            }
          ],
          "Threshold": {
            "Type": "type",
            "Unit": "unit",
            "Value": 123
          }
        }
      ],
      "Description": "description"
    } )
  } )
} )