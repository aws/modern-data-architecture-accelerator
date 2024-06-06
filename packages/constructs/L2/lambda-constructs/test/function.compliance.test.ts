/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { NagSuppressions } from "cdk-nag";
import { MdaaLambdaFunction, MdaaLambdaRole, MdaaLambdaFunctionProps } from "../lib";


describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testLambdaRole = MdaaLambdaRole.fromRoleArn( testApp.testStack, "test-role", "arn:test-partition:iam:test-region:test-account:role/test-role" )

    const testContstructProps: MdaaLambdaFunctionProps = {
        naming: testApp.naming,
        functionName: "test-function",
        role: testLambdaRole,
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromInline( 'exports.handler = function(event, ctx, cb) { return cb(null, "hi"); }' ),
        handler: "index.handler"
    }

    const testConstruct = new MdaaLambdaFunction( testApp.testStack, "test-construct", testContstructProps )
    NagSuppressions.addResourceSuppressions(
        testConstruct,
        [
            { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Compliance not enforced in construct' },
            { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Compliance not enforced in construct' },
            { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Compliance not enforced in construct' },
            { id: 'HIPAA.Security-LambdaDLQ', reason: 'Compliance not enforced in construct' },
            { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Compliance not enforced in construct' },
            { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Compliance not enforced in construct' }
        ],
        true
    );

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'FunctionName', () => {
        template.hasResourceProperties( "AWS::Lambda::Function", {
            "FunctionName": testApp.naming.resourceName( 'test-function' )
        } )
    } )

    test( 'Role', () => {
        template.hasResourceProperties( "AWS::Lambda::Function", {
            "Role": testLambdaRole.roleArn
        } )
    } )
} )