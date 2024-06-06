/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { MdaaKmsKey, MdaaKmsKeyProps } from "../lib";

describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testContstructProps: MdaaKmsKeyProps = {
        naming: testApp.naming,
        alias: 'test-key',
        keyUserRoleIds: [ 'test-user-id1', 'test-user-id2' ],
        keyAdminRoleIds: [ 'test-admin-id1', 'test-admin-id2' ],
        createOutputs: false,
        createParams: false
    }

    new MdaaKmsKey( testApp.testStack, "test-construct", testContstructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
    test( 'AliasName', () => {
        template.hasResourceProperties( "AWS::KMS::Alias", {
            "AliasName": "alias/" + testApp.naming.resourceName( 'test-key' )
        } )
    } )

    test( 'KeyAdminPolicyStatement', () => {
        template.hasResourceProperties( "AWS::KMS::Key", {
            "KeyPolicy": {
                "Statement": Match.arrayWith( [
                    {
                        "Action": [
                            "kms:Create*",
                            "kms:Describe*",
                            "kms:Enable*",
                            "kms:List*",
                            "kms:Put*",
                            "kms:Update*",
                            "kms:Revoke*",
                            "kms:Disable*",
                            "kms:Get*",
                            "kms:Delete*",
                            "kms:TagResource",
                            "kms:UntagResource",
                            "kms:ScheduleKeyDeletion",
                            "kms:CancelKeyDeletion"
                        ],
                        "Condition": {
                            "StringLike": {
                                "aws:userId": [
                                    "test-admin-id1:*",
                                    "test-admin-id2:*"
                                ]
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "*"
                        },
                        "Resource": "*",
                        "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
                    }
                ] )
            }
        } )
    } );

    test( 'KeyUserPolicyStatement', () => {
        template.hasResourceProperties( "AWS::KMS::Key", {
            "KeyPolicy": {
                "Statement": Match.arrayWith( [
                    {
                        "Action": [
                            "kms:Decrypt",
                            "kms:Encrypt",
                            "kms:ReEncrypt*",
                            "kms:GenerateDataKey*"
                        ],
                        "Condition": {
                            "StringLike": {
                                "aws:userId": [
                                    "test-user-id1:*",
                                    "test-user-id2:*"
                                ]
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "*"
                        },
                        "Resource": "*",
                        "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
                    }
                ] )
            }
        } )
    } );

    test( 'EnableKeyRotation', () => {
        template.hasResourceProperties( "AWS::KMS::Key", {
            "EnableKeyRotation": true
        } )
    } );

    test( 'UpdateReplacePolicy', () => {
        template.hasResource( "AWS::KMS::Key", {
            "UpdateReplacePolicy": "Retain"
        } )
    } );

    test( 'DeletionPolicy', () => {
        template.hasResource( "AWS::KMS::Key", {
            "DeletionPolicy": "Retain"
        } )
    } );
} )