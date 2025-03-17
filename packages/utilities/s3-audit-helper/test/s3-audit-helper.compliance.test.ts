/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Key } from "aws-cdk-lib/aws-kms";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import { AuditHelper } from "../lib";

describe( 'MDAA Compliance Stack Tests', () => {

    const testApp = new MdaaTestApp()
    const stack = testApp.testStack

    const testKey = Key.fromKeyArn( stack, 'test-key', "arn:test-partition:kms:test-region:test-account:key/some-key-id" )
    const testBucket = Bucket.fromBucketName( stack, 'test-bucket', 'some-bucket-name' )
    const trail1 = AuditHelper.createCloudTrail( stack, testBucket, testKey, testApp.naming, "testing1", true )
    NagSuppressions.addResourceSuppressions(
        trail1,
        [
            { id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
            { id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
            { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' }
        ],
        true
    );
    const testEventSelectorBucket = Bucket.fromBucketName( stack, 'test-bucket2', 'some-bucket-name' )
    const eventSelector = {
        bucket: testEventSelectorBucket,
        objectPrefix: "testing"
    }
    const trail2 = AuditHelper.createCloudTrail( stack, testBucket, testKey, testApp.naming, "testing2", true, [ eventSelector ] )
    NagSuppressions.addResourceSuppressions(
        trail2,
        [
            { id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
            { id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
            { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' }
        ],
        true
    );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'Resource Count', () => {
        template.resourceCountIs( "AWS::CloudTrail::Trail", 2 )
    } );

    test( 'Trail Name', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "TrailName": "test-org-test-env-test-domain-test-module-testing1"
        } )
    } );

    test( 'S3BucketName', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "S3BucketName": "some-bucket-name",
        } )
    } );

    test( 'KMS', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "KMSKeyId": "arn:test-partition:kms:test-region:test-account:key/some-key-id",
        } )
    } );

    test( 'IncludeManagementEvents', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "EventSelectors": Match.arrayWith( [
                Match.objectLike( {
                    "IncludeManagementEvents": true,
                } )
            ] )
        } )
    } );

    test( 'ReadWriteType', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "EventSelectors": Match.arrayWith( [
                Match.objectLike( {
                    "ReadWriteType": "All",
                } )
            ] )
        } )
    } );

    test( 'S3 Data Event Selectors', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "EventSelectors": Match.arrayWith( [
                Match.objectLike( {
                    "DataResources": [
                        {
                            "Type": "AWS::S3::Object",
                            "Values": [
                                "arn:test-partition:s3:::"
                            ]
                        }
                    ]
                } )
            ] )
        } )
    } );
} )
