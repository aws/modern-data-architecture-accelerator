/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Match } from "aws-cdk-lib/assertions";
import { NagSuppressions } from "cdk-nag";
import { MdaaBucket, MdaaBucketProps } from "../lib";
import { Arn } from "aws-cdk-lib";

describe( 'MDAA Construct Mandatory Prop Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testKey = MdaaKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: MdaaBucketProps = {
        naming: testApp.naming,
        bucketName: "test-bucket",
        encryptionKey: testKey
    }

    const testConstruct = new MdaaBucket( testApp.testStack, "test-construct", testContstructProps )
    NagSuppressions.addResourceSuppressions(
        testConstruct,
        [
            { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' },
            { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' },
            { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' }
        ],
        true
    );

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'BucketName', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketName": testApp.naming.resourceName( "test-bucket" )
        } )
    } )

    test( 'DefaultEncryption', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketEncryption": {
                "ServerSideEncryptionConfiguration": [
                    {
                        "BucketKeyEnabled": true,
                        "ServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "aws:kms",
                            "KMSMasterKeyID": testKey.keyArn
                        }
                    }
                ]
            }
        } )
    } )

    test( 'PublicAccessBlockConfiguration', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": true,
                "BlockPublicPolicy": true,
                "IgnorePublicAcls": true,
                "RestrictPublicBuckets": true
            }
        } )
    } )

    test( 'Versioning', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "VersioningConfiguration": {
                "Status": "Enabled"
            }
        } )
    } )

    test( 'EnforceHttps', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:*",
                        "Condition": {
                            "Bool": {
                                "aws:SecureTransport": "false"
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

    test( 'BlockAES256', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:PutObject",
                        "Condition": {
                            "StringEquals": {
                                "s3:x-amz-server-side-encryption": "AES256"
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

    test( 'EnforceExclusiveKms', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:PutObject",
                        "Condition": {
                            "StringNotLikeIfExists": {
                                "s3:x-amz-server-side-encryption-aws-kms-key-id": testKey.keyArn
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

    test( 'UpdateReplacePolicy', () => {
        template.hasResource( "AWS::S3::Bucket", {
            "UpdateReplacePolicy": "Retain"
        } )
    } );

    test( 'Bucket DeletionPolicy', () => {
        template.hasResource( "AWS::S3::Bucket", {
            "DeletionPolicy": "Retain"
        } )
    } );

    test( 'BucketPolicy DeletionPolicy', () => {
        template.hasResource( "AWS::S3::BucketPolicy", {
            "DeletionPolicy": "Retain"
        } )
    } );
} )

describe( 'MDAA Construct Optional Prop Compliance Tests', () => {
    const testApp = new MdaaTestApp( {
        "@aws-mdaa/enableUniqueBucketNames": "true"
    } )

    const testKey = MdaaKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const additionalKmsKeyArn = Arn.format( {
        service: "kms",
        resource: "test-key-id"
    }, testApp.testStack )

    const testContstructProps: MdaaBucketProps = {
        naming: testApp.naming,
        bucketName: "test-bucket",
        encryptionKey: testKey,
        additionalKmsKeyArns: [
            additionalKmsKeyArn
        ]

    }

    const testConstruct = new MdaaBucket( testApp.testStack, "test-construct", testContstructProps )
    NagSuppressions.addResourceSuppressions(
        testConstruct,
        [
            { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' },
            { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' },
            { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' }
        ],
        true
    );

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    // console.log( JSON.stringify( template, undefined, 2 ) )
    test( 'BucketName', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketName": {
                "Fn::Join": [
                    "",
                    [
                        {
                            "Fn::Select": [
                                0,
                                {
                                    "Fn::Split": [
                                        "-",
                                        {
                                            "Fn::Select": [
                                                2,
                                                {
                                                    "Fn::Split": [
                                                        "/",
                                                        {
                                                            "Ref": "AWS::StackId"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        "-test-org-test-env-test-domain-test--3cab3e5a"
                    ]
                ]
            }
        } )
    } )

    test( 'DefaultEncryption', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketEncryption": {
                "ServerSideEncryptionConfiguration": [
                    {
                        "BucketKeyEnabled": true,
                        "ServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "aws:kms",
                            "KMSMasterKeyID": testKey.keyArn
                        }
                    }
                ]
            }
        } )
    } )

    test( 'PublicAccessBlockConfiguration', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": true,
                "BlockPublicPolicy": true,
                "IgnorePublicAcls": true,
                "RestrictPublicBuckets": true
            }
        } )
    } )

    test( 'Versioning', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "VersioningConfiguration": {
                "Status": "Enabled"
            }
        } )
    } )

    test( 'EnforceHttps', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:*",
                        "Condition": {
                            "Bool": {
                                "aws:SecureTransport": "false"
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

    test( 'BlockAES256', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:PutObject",
                        "Condition": {
                            "StringEquals": {
                                "s3:x-amz-server-side-encryption": "AES256"
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

    test( 'EnforceExclusiveKms', () => {
        template.hasResourceProperties( "AWS::S3::BucketPolicy", {
            "PolicyDocument": {
                "Statement": Match.arrayWith( [
                    Match.objectLike( {
                        "Action": "s3:PutObject",
                        "Condition": {
                            "ForAllValues:StringNotLikeIfExists": {
                                "s3:x-amz-server-side-encryption-aws-kms-key-id": [
                                    "arn:test-partition:kms:test-region:test-account:key/test-key",
                                    "arn:test-partition:kms:test-region:test-account:test-key-id"
                                ]
                            }
                        },
                        "Effect": "Deny"
                    } )
                ] )
            }
        } )
    } );

} )

describe( 'Public Methods', () => {
    test( 'formatS3Prefix defaults', () => {
        expect( MdaaBucket.formatS3Prefix( undefined ) ).toBe( undefined )
        expect( MdaaBucket.formatS3Prefix( "/test/" ) ).toBe( "test" )
        expect( MdaaBucket.formatS3Prefix( "test/" ) ).toBe( "test" )
        expect( MdaaBucket.formatS3Prefix( "test" ) ).toBe( "test" )
    } )
    test( 'formatS3Prefix optional params', () => {
        expect( MdaaBucket.formatS3Prefix( "test", true, true ) ).toBe( "/test/" )
        expect( MdaaBucket.formatS3Prefix( "test/", true, true ) ).toBe( "/test/" )
        expect( MdaaBucket.formatS3Prefix( "/test", true, true ) ).toBe( "/test/" )
    } )
} )