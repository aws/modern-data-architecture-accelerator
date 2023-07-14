/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefSecurityConfig, CaefSecurityConfigProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: CaefSecurityConfigProps = {
        naming: testApp.naming,
        securityConfigurationName: "test",
        cloudWatchKmsKey: testKey,
        jobBookMarkKmsKey: testKey,
        s3OutputKmsKey: testKey,
        createOutputs: false,
        createParams: false
    }

    new CaefSecurityConfig( testApp.testStack, "test-construct", testContstructProps )


    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'Name', () => {
        template.hasResourceProperties( "AWS::Glue::SecurityConfiguration", {
            "Name": testApp.naming.resourceName( "test" )
        } )
    } )

    test( 'EncryptionConfiguration.CloudWatchEncryption', () => {
        template.hasResourceProperties( "AWS::Glue::SecurityConfiguration", {
            "EncryptionConfiguration": {
                "CloudWatchEncryption": {
                    "CloudWatchEncryptionMode": "SSE-KMS",
                    "KmsKeyArn": testKey.keyArn
                }
            }
        } )
    } );

    test( 'EncryptionConfiguration.JobBookmarksEncryption', () => {
        template.hasResourceProperties( "AWS::Glue::SecurityConfiguration", {
            "EncryptionConfiguration": {
                "JobBookmarksEncryption": {
                    "JobBookmarksEncryptionMode": "CSE-KMS",
                    "KmsKeyArn": testKey.keyArn
                }
            }
        } )
    } );

    test( 'EncryptionConfiguration.S3Encryptions', () => {
        template.hasResourceProperties( "AWS::Glue::SecurityConfiguration", {
            "EncryptionConfiguration": {
                "S3Encryptions": [ {
                    "KmsKeyArn": testKey.keyArn,
                    "S3EncryptionMode": "SSE-KMS"
                } ]
            }
        } )
    } );
} )