/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaDatazoneProject, MdaaDatazoneProjectProps } from "../lib";

describe( 'MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp()


  const testContstructProps: MdaaDatazoneProjectProps = {
    naming: testApp.naming,
    name: "test-project",
    domainConfigSSMParam: "testing"
  
  }

  new MdaaDatazoneProject( testApp.testStack, "test-construct", testContstructProps )

  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  console.log(template)

  
} )
