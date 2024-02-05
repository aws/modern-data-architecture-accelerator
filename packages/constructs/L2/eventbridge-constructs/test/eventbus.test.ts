/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { ArnPrincipal } from "aws-cdk-lib/aws-iam";
import { CaefEventBus, CaefEventBusProps } from "../lib";


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testContstructProps: CaefEventBusProps = {
        naming: testApp.naming,
        eventBusName: "test-bus",
        archiveRetention: 100,
        principals: [ new ArnPrincipal( "arn:test-partition:iam::test-account:role/test-role" ) ]
    }

    new CaefEventBus( testApp.testStack, "test-construct", testContstructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    test( 'Event Bus Name', () => {
        template.hasResourceProperties( "AWS::Events::EventBus", {
            "Name": "test-org-test-env-test-domain-test-modu--3459ff0"
        } )
    } )

    test( 'Event Bus Policy', () => {
        template.hasResourceProperties( "AWS::Events::EventBusPolicy", {

            "EventBusName": {
                "Ref": "testconstruct281AED50"
            },
            "Statement": {
                "Action": "events:PutEvents",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:test-partition:iam::test-account:role/test-role"
                },
                "Resource": {
                    "Fn::GetAtt": [
                        "testconstruct281AED50",
                        "Arn"
                    ]
                },

            }
        } )
    } )

    test( 'Archive', () => {
        template.hasResourceProperties( "AWS::Events::Archive", {
            "SourceArn": {
                "Fn::GetAtt": [
                    "testconstruct281AED50",
                    "Arn"
                ]
            },
            "ArchiveName": "test-org-test-env-test-domain-test-mod--5960ebfb",
            "Description": {
                "Fn::Join": [
                    "",
                    [
                        "Archive for ",
                        {
                            "Ref": "testconstruct281AED50"
                        }
                    ]
                ]
            },
            "EventPattern": {
                "account": [
                    "test-account"
                ]
            },
            "RetentionDays": 100
        } )
    } )

} )

