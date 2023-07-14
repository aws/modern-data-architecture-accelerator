/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefDataBrewProject, CaefDataBrewProjectProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
  const testApp = new CaefTestApp()


  const testContstructProps: CaefDataBrewProjectProps = {
    naming: testApp.naming,
    datasetName: 'test-dataset',
    name: 'test-project',
    recipeName: 'test-recipe',
    roleArn: 'test-role'
  }

  new CaefDataBrewProject( testApp.testStack, "test-construct", testContstructProps )
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