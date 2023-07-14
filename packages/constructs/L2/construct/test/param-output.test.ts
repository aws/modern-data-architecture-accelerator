/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefParamAndOutput, CaefParamAndOutputProps } from "../lib";



describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testContstructProps1: CaefParamAndOutputProps = {
        name: "test-name",
        resourceType: "test-type",
        value: "test-val",
        naming: testApp.naming
    }

    new CaefParamAndOutput( testApp.testStack, testContstructProps1 )

    const testContstructProps2: CaefParamAndOutputProps = {
        name: "test-name2",
        resourceType: "test-type2",
        value: "test-val2",
        resourceId: "test-id2",
        naming: testApp.naming
    }

    new CaefParamAndOutput( testApp.testStack, testContstructProps2 )

    const testContstructProps3: CaefParamAndOutputProps = {
        name: "test-name3",
        resourceType: "test-type3",
        value: "test-val3",
        resourceId: "test-id3",
        naming: testApp.naming,
        createOutputs: false,
        createParams: false
    }

    new CaefParamAndOutput( testApp.testStack, testContstructProps3 )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    test( 'SSM Param Properties', () => {
        template.hasResourceProperties( "AWS::SSM::Parameter", {
            "Type": "String",
            "Value": "test-val",
            "Name": "/test-org/test-domain/test-module/test-type/test-name"
        } )
    } )

    test( 'Output', () => {
        template.hasOutput( "testtypetestnameout206EF960", {
            "Value": "test-val",
            "Export": {
                "Name": "test-org:test-domain:test-module:test-type:test-name"
            }
        } )
    } )

} )