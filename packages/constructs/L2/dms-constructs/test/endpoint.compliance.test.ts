/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Key } from "aws-cdk-lib/aws-kms";
import { MdaaEndpoint, MdaaEndpointProps } from "../lib";


describe( 'Endpoint Compliance Tests', () => {


    describe( 'S3 Endpoint Compliance Tests', () => {
        const testApp = new MdaaTestApp()

        const testKey = Key.fromKeyArn( testApp.testStack, "testKey", "arn:test-partition:kms:test-region:test-account:key/test-key" )
        const endpointProps: MdaaEndpointProps = {
            endpointIdentifier: "test-endpoint",
            endpointType: "target",
            engineName: 's3',
            kmsKey: testKey,
            naming: testApp.naming
        }
        new MdaaEndpoint( testApp.testStack, 'test-endpoint', endpointProps )

        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'Endpoint ID', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "EndpointIdentifier": "test-org-test-env-test-domain-test-module-test-endpoint"
            } )
        } )

        test( 'KMS Key ID', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "KmsKeyId": "test-key"
            } )
        } )

        test( 'Encryption Mode', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "S3Settings": {
                    "EncryptionMode": "SSE_KMS"
                }
            } )
        } )
    } )

    describe( 'Redshift Endpoint Compliance Tests', () => {
        const testApp = new MdaaTestApp()

        const testKey = Key.fromKeyArn( testApp.testStack, "testKey", "arn:test-partition:kms:test-region:test-account:key/test-key" )
        const endpointProps: MdaaEndpointProps = {
            endpointIdentifier: "test-endpoint",
            endpointType: "target",
            engineName: 'redshift',
            kmsKey: testKey,
            naming: testApp.naming
        }
        new MdaaEndpoint( testApp.testStack, 'test-endpoint', endpointProps )

        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'KMS Key ID', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "KmsKeyId": "test-key"
            } )
        } )

        test( 'Encryption Mode', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "RedshiftSettings": {
                    "EncryptionMode": "SSE_KMS"
                }
            } )
        } )
    } )

    describe( 'Neptune Endpoint Compliance Tests', () => {
        const testApp = new MdaaTestApp()

        const testKey = Key.fromKeyArn( testApp.testStack, "testKey", "arn:test-partition:kms:test-region:test-account:key/test-key" )
        const endpointProps: MdaaEndpointProps = {
            endpointIdentifier: "test-endpoint",
            endpointType: "target",
            engineName: 'neptune',
            kmsKey: testKey,
            naming: testApp.naming
        }
        new MdaaEndpoint( testApp.testStack, 'test-endpoint', endpointProps )

        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'IAM Auth ID', () => {
            template.hasResourceProperties( "AWS::DMS::Endpoint", {
                "NeptuneSettings": { "IamAuthEnabled": true }
            } )
        } )


    } )
} )

