/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Key } from "aws-cdk-lib/aws-kms";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { MdaaLogGroup, MdaaLogGroupProps } from "../lib";


describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testKey = Key.fromKeyArn( testApp.testStack, "testKey", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: MdaaLogGroupProps = {
        naming: testApp.naming,
        createOutputs: false,
        createParams: false,
        encryptionKey: testKey,
        retention: RetentionDays.INFINITE,
        logGroupNamePathPrefix: "/test/prefix/"
    }

    new MdaaLogGroup( testApp.testStack, "test-construct", testContstructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    test( 'LogGroupEncrypion', () => {
        template.hasResourceProperties( "AWS::Logs::LogGroup", {
            "KmsKeyId": "arn:test-partition:kms:test-region:test-account:key/test-key"
        } )
    } );

    test( 'LogGroupName', () => {
        template.hasResourceProperties( "AWS::Logs::LogGroup", {
            "LogGroupName": "/test/prefix/test-org-test-env-test-domain-test-module"
        } )
    } );

    test( 'RetentionDays', () => {
        template.resourcePropertiesCountIs( "AWS::Logs::LogGroup", "RetentionInDays", 0 )
    } );


} )

