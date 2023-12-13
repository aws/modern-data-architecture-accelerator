/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefBoto3LayerVersion, CaefBoto3LayerVersionProps } from "../lib/boto3-layer";


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testContstructProps: CaefBoto3LayerVersionProps = {
        naming: testApp.naming,
        boto3Version: "1.33.13"
    }

    new CaefBoto3LayerVersion( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
    test( 'LayerName', () => {
        template.hasResourceProperties( "AWS::Lambda::LayerVersion", {
            "LayerName": testApp.naming.resourceName( `boto3-1_33_13` )
        } )
    } )

} )