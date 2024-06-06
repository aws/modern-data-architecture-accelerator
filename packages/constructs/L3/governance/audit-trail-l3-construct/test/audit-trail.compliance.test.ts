/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AuditTrailL3Construct, AuditTrailL3ConstructProps } from "../lib";


describe( 'MDAA Compliance Stack Tests', () => {

    const testApp = new MdaaTestApp()
    const stack = testApp.testStack


    const constructProps: AuditTrailL3ConstructProps = {
        trail: {
            cloudTrailAuditBucketName: "some-bucket-name",
            cloudTrailAuditKmsKeyArn: "arn:test-partition:kms:test-region:test-account:key/some-key-id",
            includeManagementEvents: true
        },

        roleHelper: new MdaaRoleHelper( stack, testApp.naming ),
        naming: testApp.naming,
    }

    new AuditTrailL3Construct( stack, "teststack", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )


    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'Resource Count', () => {
        template.resourceCountIs( "AWS::CloudTrail::Trail", 1 )
    } );

    test( 'Trail Name', () => {
        template.hasResourceProperties( "AWS::CloudTrail::Trail", {
            "TrailName": "test-org-test-env-test-domain-test-module-s3-audit"
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

} )
