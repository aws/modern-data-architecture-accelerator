/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { MdaaAthenaWorkgroup, MdaaAthenaWorkgroupProps, MdaaAthenaWorkgroupConfigurationProps } from "../lib";



describe( 'MDAA Construct Compliance Tests', () => {

    const testApp = new MdaaTestApp()

    const testKey = MdaaKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const testBucket = MdaaBucket.fromBucketName( testApp.testStack, "test-bucket", "test-bucket-name" )
    const testPrefix = "athena-results"

    const MdaaAthenaWorkgroupConfigurationProps: MdaaAthenaWorkgroupConfigurationProps =
    {
        bytesScannedCutoffPerQuery: 987654321
    }

    const testContstructProps: MdaaAthenaWorkgroupProps = {
        naming: testApp.naming,
        kmsKey: testKey,
        bucket: testBucket,
        resultsPrefix: testPrefix,
        name: "test-workgroup",
        createOutputs: false,
        createParams: false,
        workGroupConfiguration: MdaaAthenaWorkgroupConfigurationProps
    }


    new MdaaAthenaWorkgroup( testApp.testStack, "test-construct", testContstructProps )

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