/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaStudioLifecycleConfig, MdaaStudioLifecycleConfigProps } from "../lib";


describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testContstructProps: MdaaStudioLifecycleConfigProps = {
        naming: testApp.naming,
        lifecycleConfigContent: "testing",
        lifecycleConfigAppType: "JupyterServer"
    }

    new MdaaStudioLifecycleConfig( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )
    test( 'Create', () => {
        template.hasResourceProperties( "Custom::StudioLifecycleConfig", {
            "ServiceToken": {
                "Fn::GetAtt": [
                    "customStudioLifecycleConfigproviderframeworkonEventDB56E9A5",
                    "Arn"
                ]
            },
            "lifecycleConfigName": "test-org-test-env-test-domain-test-module",
            "lifecycleConfigContent": "testing",
            "lifecycleConfigAppType": "JupyterServer"
        } )
    } )

    test( 'Policy', () => {
        template.hasResourceProperties( "AWS::IAM::Policy", {
            "PolicyDocument": {
                "Statement": [
                    {
                        "Action": [
                            "sagemaker:CreateStudioLifecycleConfig",
                            "sagemaker:DeleteStudioLifecycleConfig"
                        ],
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:sagemaker:test-region:test-account:studio-lifecycle-config/*"
                    }
                ],
                "Version": "2012-10-17"
            },
            "PolicyName": "StudioLifecycleConfig-handler",
            "Roles": [
                {
                    "Ref": "customStudioLifecycleConfighandlerrole095F64BB"
                }
            ]

        } )
    } )

} )