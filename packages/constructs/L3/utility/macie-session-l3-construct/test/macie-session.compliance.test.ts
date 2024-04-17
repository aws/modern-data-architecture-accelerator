/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MacieSessionL3Construct, MacieSessionL3ConstructProps, SessionFindingPublishingFrequencyEnum } from "../lib";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";


describe( 'CAEF Compliance Stack Tests', () => {

    const testApp = new CaefTestApp()
    const stack = testApp.testStack
    const constructProps: MacieSessionL3ConstructProps = {
        roleHelper: new CaefRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        session: {
            findingPublishingFrequency: SessionFindingPublishingFrequencyEnum.SIX_HOURS
        }
    }

    new MacieSessionL3Construct(stack, "teststack", constructProps)
    testApp.checkCdkNagCompliance(testApp.testStack)
    const template = Template.fromStack(testApp.testStack)

    test('FindingPublishingFrequency', () => {
        template.hasResourceProperties("AWS::Macie::Session", {
            "FindingPublishingFrequency": "SIX_HOURS"
        })
    })

    test('Status', () => {
        template.hasResourceProperties("AWS::Macie::Session", {
            "Status": "ENABLED"
        })
    })
} )
