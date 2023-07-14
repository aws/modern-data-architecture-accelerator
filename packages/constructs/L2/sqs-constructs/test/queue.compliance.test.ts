/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { CaefSqsDeadLetterQueue, CaefSqsQueue, CaefSqsQueueProps } from "../lib";


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const dlq = new CaefSqsDeadLetterQueue( testApp.testStack, "test-dlq", {
        naming: testApp.naming,
        queueName: "test-dlq",
        encryptionMasterKey: testKey
    } )
    const testContstructProps: CaefSqsQueueProps = {
        naming: testApp.naming,
        queueName: "test-queue",
        encryptionMasterKey: testKey,
        deadLetterQueue: {
            queue: dlq,
            maxReceiveCount: 10
        }
    }

    new CaefSqsQueue( testApp.testStack, "test-construct", testContstructProps )

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