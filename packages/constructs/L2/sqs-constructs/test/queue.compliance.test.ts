/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { MdaaSqsDeadLetterQueue, MdaaSqsQueue, MdaaSqsQueueProps } from "../lib";


describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testKey = MdaaKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const dlq = new MdaaSqsDeadLetterQueue( testApp.testStack, "test-dlq", {
        naming: testApp.naming,
        queueName: "test-dlq",
        encryptionMasterKey: testKey
    } )
    const testContstructProps: MdaaSqsQueueProps = {
        naming: testApp.naming,
        queueName: "test-queue",
        encryptionMasterKey: testKey,
        deadLetterQueue: {
            queue: dlq,
            maxReceiveCount: 10
        }
    }

    new MdaaSqsQueue( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'QueueName', () => {
        template.hasResourceProperties( "AWS::SQS::Queue", {
            "QueueName": testApp.naming.resourceName( "test-queue" )
        } )
    } )

    test( 'KmsMasterKeyId', () => {
        template.hasResourceProperties( "AWS::SQS::Queue", {
            "KmsMasterKeyId": testKey.keyArn
        } )
    } )

    test( 'EnforceHTTPS', () => {
        template.hasResourceProperties( "AWS::SQS::QueuePolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "sqs:*",
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