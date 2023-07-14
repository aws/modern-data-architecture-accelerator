/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefCfnJob, CaefCfnJobProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const testContstructProps: CaefCfnJobProps = {
        naming: testApp.naming,
        securityConfiguration: "test-security-config",
        name: "test-job",
        command: {},
        role: "test-role",
        createOutputs: false,
        createParams: false
    }

    new CaefCfnJob( testApp.testStack, "test-construct", testContstructProps )


    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'Name', () => {
        template.hasResourceProperties( "AWS::Glue::Job", {
            "Name": testApp.naming.resourceName( "test-job" )
        } )
    } )

    test( 'Role', () => {
        template.hasResourceProperties( "AWS::Glue::Job", {
            "Role": "test-role"
        } )
    } );

    test( 'SecurityConfiguration', () => {
        template.hasResourceProperties( "AWS::Glue::Job", {
            "SecurityConfiguration": "test-security-config"
        } )
    } );
} )