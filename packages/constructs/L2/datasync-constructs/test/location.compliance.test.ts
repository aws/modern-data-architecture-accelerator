/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefDataSyncObjectStorageLocation, CaefDataSyncObjectStorageLocationProps, CaefDataSyncS3Location, CaefDataSyncS3LocationProps, CaefDataSyncSmbLocation, CaefDataSyncSmbLocationProps } from "../lib";


describe( 'CAEF Construct Compliance Tests', () => {



    describe( 'Smb Location Compliance Tests', () => {
        const testApp = new CaefTestApp()
        const testContstructProps: CaefDataSyncSmbLocationProps = {
            naming: testApp.naming,
            locationName: "smb_loc1",
            agentArns: [ "arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd" ],
            secretName: "/test/caef/secret",
            serverHostname: "hostname",
            subdirectory: "subdir"
        }

        new CaefDataSyncSmbLocation( testApp.testStack, "test-construct-smb", testContstructProps )
        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'AgentArns', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationSMB", {
                "AgentArns": [ "arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd" ]
            } )
        } )
        const userProp = "{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/caef/secret:SecretString:user::}}"

        test( 'User', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationSMB", {
                "User": userProp
            } )
        } )

        const passwordProp = "{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/caef/secret:SecretString:password::}}"
        test( 'Password', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationSMB", {
                "Password": passwordProp
            } )
        } )

        test( 'ServerHostname', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationSMB", {
                "ServerHostname": "hostname"
            } )
        } )
        test( 'Subdirectory', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationSMB", {
                "Subdirectory": "subdir"
            } )
        } )
    } )

    describe( 'S3 Location Compliance Tests', () => {
        const testApp = new CaefTestApp()
        const testContstructProps: CaefDataSyncS3LocationProps = {
            naming: testApp.naming,
            locationName: "s3_loc1",
            s3BucketArn: "arn:test-partition:s3:::test-bucket-name",
            s3Config: {
                "bucketAccessRoleArn": "arn:test-partition:iam::test-account:role/test-role"
            }
        }

        new CaefDataSyncS3Location( testApp.testStack, "test-construct-s3", testContstructProps )
        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'S3BucketArn', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationS3", {
                "S3BucketArn": "arn:test-partition:s3:::test-bucket-name"
            } )
        } )

        const s3ConfigProp = {
            "BucketAccessRoleArn": "arn:test-partition:iam::test-account:role/test-role"
        }

        test( 'S3Config', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationS3", {
                "S3Config": s3ConfigProp
            } )
        } )
    } )

    describe( 'Object Storage Location Compliance Tests', () => {
        const testApp = new CaefTestApp()
        const testContstructProps: CaefDataSyncObjectStorageLocationProps = {
            naming: testApp.naming,
            locationName: "objstorage_loc1",
            agentArns: [ "arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd" ],
            secretName: "/test/caef/secret2",
            bucketName: "test-bucket",
            serverHostname: "object-storage-hostname",
            subdirectory: "subdir"
        }

        new CaefDataSyncObjectStorageLocation( testApp.testStack, "test-construct-object-storage", testContstructProps )
        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack );
        //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'AgentArns', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationObjectStorage", {
                "AgentArns": [ "arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd" ]
            } )
        } )
        test( 'BucketName', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationObjectStorage", {
                "BucketName": "test-bucket"
            } )
        } )
        test( 'ServerHostname', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationObjectStorage", {
                "ServerHostname": "object-storage-hostname"
            } )
        } )
        const accessKeyProp = "{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/caef/secret2:SecretString:accessKey::}}"
        test( 'AccessKey', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationObjectStorage", {
                "AccessKey": accessKeyProp
            } )
        } )
        const secretKeyProp = "{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/caef/secret2:SecretString:secretKey::}}"
        test( 'SecretKey', () => {
            template.hasResourceProperties( "AWS::DataSync::LocationObjectStorage", {
                "SecretKey": secretKeyProp
            } )
        } )
    } )
} )