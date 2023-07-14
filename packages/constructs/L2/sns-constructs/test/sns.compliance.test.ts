/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { CaefSnsTopic, CaefSnsTopicProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: CaefSnsTopicProps = {
        naming: testApp.naming,
        topicName: "test-sns-topic",
        masterKey: testKey
    }

    new CaefSnsTopic( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'TopicName', () => {
        template.hasResourceProperties( "AWS::SNS::Topic", {
            "TopicName": testApp.naming.resourceName( "test-sns-topic" )
        } )
    } )

    test( 'KmsMasterKeyId', () => {
        template.hasResourceProperties( "AWS::SNS::Topic", {
            "KmsMasterKeyId": testKey.keyArn
        } )
    } )

    test( 'EnforceHTTPS', () => {
        template.hasResourceProperties( "AWS::SNS::TopicPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": [
                            "sns:Publish",
                            "sns:RemovePermission",
                            "sns:SetTopicAttributes",
                            "sns:DeleteTopic",
                            "sns:ListSubscriptionsByTopic",
                            "sns:GetTopicAttributes",
                            "sns:Receive",
                            "sns:AddPermission",
                            "sns:Subscribe"
                        ],
                        "Condition": {
                            "Bool": {
                                "aws:SecureTransport": "false"
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } )
} )