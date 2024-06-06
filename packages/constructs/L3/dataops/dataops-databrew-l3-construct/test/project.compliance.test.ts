/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaDataBrewProject, MdaaDataBrewProjectProps } from "../lib";

describe( 'MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp()


  const testContstructProps: MdaaDataBrewProjectProps = {
    naming: testApp.naming,
    datasetName: 'test-dataset',
    name: 'test-project',
    recipeName: 'test-recipe',
    roleArn: 'test-role'
  }

  new MdaaDataBrewProject( testApp.testStack, "test-construct", testContstructProps )
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  test( 'TestProjectName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Project", {
      "Name": testApp.naming.resourceName( "test-project" )
    } )
  } )

  test( 'TestDatasetName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Project", {
      "DatasetName": "test-dataset"
    } )
  } )

  test( 'TestRecipeName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Project", {
      "RecipeName": "test-recipe"
    } )
  } )

  test( 'TestRoleArn', () => {
    template.hasResourceProperties( "AWS::DataBrew::Project", {
      "RoleArn": "test-role"
    } )
  } )
} )