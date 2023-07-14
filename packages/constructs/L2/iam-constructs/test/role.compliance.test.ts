/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CaefRole, CaefRoleProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const testContstructProps: CaefRoleProps = {
        naming: testApp.naming,
        roleName: "test-role",
        assumedBy: new ServicePrincipal( "s3.amazonaws.com" ),
        createOutputs: false,
        createParams: false
    }

    new CaefRole( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'RoleName', () => {
        template.hasResourceProperties( "AWS::IAM::Role", {
            "RoleName": testApp.naming.resourceName( "test-role" )
        } )
    } )

    test( 'AssumeRoleTrust', () => {
        template.hasResourceProperties( "AWS::IAM::Role", {
            "AssumeRolePolicyDocument": {
                "Statement": [
                    {
                        "Action": "sts:AssumeRole",
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "s3.amazonaws.com"
                        }
                    }
                ]
            }
        } )
    } );
} )