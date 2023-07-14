/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { CaefAthenaWorkgroup, CaefAthenaWorkgroupProps, CaefAthenaWorkgroupConfigurationProps } from "../lib";



describe( 'CAEF Construct Compliance Tests', () => {

    const testApp = new CaefTestApp()

    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const testBucket = CaefBucket.fromBucketName( testApp.testStack, "test-bucket", "test-bucket-name" )
    const testPrefix = "athena-results"

    const CaefAthenaWorkgroupConfigurationProps: CaefAthenaWorkgroupConfigurationProps =
    {
        bytesScannedCutoffPerQuery: 987654321
    }

    const testContstructProps: CaefAthenaWorkgroupProps = {
        naming: testApp.naming,
        kmsKey: testKey,
        bucket: testBucket,
        resultsPrefix: testPrefix,
        name: "test-workgroup",
        createOutputs: false,
        createParams: false,
        workGroupConfiguration: CaefAthenaWorkgroupConfigurationProps
    }


    new CaefAthenaWorkgroup( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'Name', () => {
        template.hasResourceProperties( "AWS::Athena::WorkGroup", {
            "Name": testApp.naming.resourceName( "test-workgroup" )
        } )
    } )

    test( 'EnforceWorkGroupConfiguration', () => {
        template.hasResourceProperties( "AWS::Athena::WorkGroup", {
            WorkGroupConfiguration: {
                EnforceWorkGroupConfiguration: true
            }
        } )
    } );
    test( 'ResultConfiguration.EncryptionConfiguration', () => {
        template.hasResourceProperties( "AWS::Athena::WorkGroup", {
            WorkGroupConfiguration: {
                ResultConfiguration: {
                    EncryptionConfiguration: {
                        EncryptionOption: "SSE_KMS",
                        KmsKey: Match.exact( testKey.keyArn )
                    }
                }
            }
        } )
    } );

    test( 'ResultConfiguration.OutputLocation', () => {
        template.hasResourceProperties( "AWS::Athena::WorkGroup", {
            WorkGroupConfiguration: {
                ResultConfiguration: {
                    OutputLocation: `s3://${ testBucket.bucketName }/${ testPrefix }`
                }
            }
        } )
    } );
} )