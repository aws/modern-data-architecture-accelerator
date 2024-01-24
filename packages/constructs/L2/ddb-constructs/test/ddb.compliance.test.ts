/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { AttributeType, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { CaefDDBTable, CaefDDBTableProps } from "../lib";
import { Stream } from 'aws-cdk-lib/aws-kinesis';

describe( 'CAEF Construct Mandatory Prop Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: CaefDDBTableProps = {
        naming: testApp.naming,
        tableName: "test-table",
        encryptionKey: testKey,
        partitionKey: {
            name: 'id',
            type: AttributeType.STRING,
        },
        kinesisStream: Stream.fromStreamArn( testApp.testStack, 'test-stream', "arn:test-partition:kinesis:test-region:test-account:stream/test-stream" ),
        stream: StreamViewType.KEYS_ONLY
    }

    new CaefDDBTable( testApp.testStack, "test-construct", testContstructProps )


    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'TableName', () => {
        template.hasResourceProperties( "AWS::DynamoDB::Table", {
            "TableName": testApp.naming.resourceName( "test-table" )
        } )
    } )
})
 