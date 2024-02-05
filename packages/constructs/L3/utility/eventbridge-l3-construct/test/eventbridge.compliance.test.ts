/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { EventBridgeL3Construct, EventBridgeL3ConstructProps } from "../lib";


describe( 'CAEF Compliance Stack Tests', () => {

    const testApp = new CaefTestApp()
    const stack = testApp.testStack

    const constructProps: EventBridgeL3ConstructProps = {

        roleHelper: new CaefRoleHelper( stack, testApp.naming ),
        naming: testApp.naming,
        eventBuses: {
            "test-bus": {
                archiveRetention: 100,
                principals: [ {
                    arn: "arn:test-partition:iam::test-account:role/test-role"
                },
                {
                    service: "s3.amazonaws.com"
                } ]
            }
        }
    }

    new EventBridgeL3Construct( stack, "teststack", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'EventBus Resource Count', () => {
        template.resourceCountIs( "AWS::Events::EventBus", 1 )
    } );

    test( 'Archive Retention', () => {
        template.hasResourceProperties( "AWS::Events::Archive", {
            "RetentionDays": 100
        } )
    } );
    test( 'EventBus Policy', () => {
        template.hasResourceProperties( "AWS::Events::EventBusPolicy", {
            "EventBusName": {
                "Ref": "teststacktestbusbusA97F5FB2"
            },
            "Statement": {
                "Action": "events:PutEvents",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:test-partition:iam::test-account:role/test-role",
                    "Service": "s3.amazonaws.com"
                },
                "Resource": {
                    "Fn::GetAtt": [
                        "teststacktestbusbusA97F5FB2",
                        "Arn"
                    ]
                }
            }
        } )
    } );
} )
