/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefDataBrewSchedule, CaefDataBrewScheduleProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const testContstructProps: CaefDataBrewScheduleProps = {
        naming: testApp.naming,
        name: "test-schedule",
        cronExpression: 'test-cron-expression',
        jobNames: [ 'jobName1', 'jobName2' ]
    }

    new CaefDataBrewSchedule( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'TestScheduleName', () => {
        template.hasResourceProperties( "AWS::DataBrew::Schedule", {
            "Name": testApp.naming.resourceName( "test-schedule" )
        } )
    } )

    test( 'TestScheduleInput', () => {
        template.hasResourceProperties( "AWS::DataBrew::Schedule", {
            "Name": "test-org-test-env-test-domain-test-module-test-schedule",
            "CronExpression": "test-cron-expression",
            "JobNames": [ 'jobName1', 'jobName2' ]
        } )
    } )
} )