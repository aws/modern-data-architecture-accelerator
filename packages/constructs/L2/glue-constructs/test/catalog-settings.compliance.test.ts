/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefCatalogSettings, CaefCatalogSettingsProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: CaefCatalogSettingsProps = {
        naming: testApp.naming,
        catalogId: "test-catalog-id",
        catalogKmsKey: testKey
    }

    new CaefCatalogSettings( testApp.testStack, "test-construct", testContstructProps )


    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'DataCatalogEncryptionSettings.ConnectionPasswordEncryption.ReturnConnectionPasswordEncrypted', () => {
        template.hasResourceProperties( "AWS::Glue::DataCatalogEncryptionSettings", {
            DataCatalogEncryptionSettings: {
                ConnectionPasswordEncryption: {
                    ReturnConnectionPasswordEncrypted: true
                }
            }
        } )
    } );

    test( 'DataCatalogEncryptionSettings.ConnectionPasswordEncryption.KmsKeyId', () => {
        template.hasResourceProperties( "AWS::Glue::DataCatalogEncryptionSettings", {
            DataCatalogEncryptionSettings: {
                ConnectionPasswordEncryption: {
                    KmsKeyId: testKey.keyArn
                }
            }
        } )
    } );

    test( 'DataCatalogEncryptionSettings.EncryptionAtRest.CatalogEncryptionMode', () => {
        template.hasResourceProperties( "AWS::Glue::DataCatalogEncryptionSettings", {
            DataCatalogEncryptionSettings: {
                EncryptionAtRest: {
                    CatalogEncryptionMode: "SSE-KMS"
                }
            }
        } )
    } );

    test( 'DataCatalogEncryptionSettings.EncryptionAtRest.SseAwsKmsKeyId', () => {
        template.hasResourceProperties( "AWS::Glue::DataCatalogEncryptionSettings", {
            DataCatalogEncryptionSettings: {
                EncryptionAtRest: {
                    SseAwsKmsKeyId: testKey.keyArn
                }
            }
        } )
    } );

} )