/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { SharedFoldersPermissionsProps, SharedFoldersProps, DataSourcePermissionsProps, DataSourceWithIdAndTypeProps, QuickSightProjectL3ConstructProps, QuickSightProjectL3Construct } from "../lib";
import { Match, Template } from "aws-cdk-lib/assertions";


describe( 'MDAA Compliance Stack Tests', () => {
    const testApp = new MdaaTestApp()
    //Shared Folders Related Objects
    const testFolderReaderPermissions: SharedFoldersPermissionsProps =
    {
        principal: "READERS_GROUP",
        actions: "READER_FOLDER"
    };
    const testFolderAuthorPermissions: SharedFoldersPermissionsProps =
    {
        principal: "AUTHORS_GROUP",
        actions: "AUTHOR_FOLDER"
    };
    const testReaderSharedFolders: SharedFoldersProps = {
        permissions: [ testFolderReaderPermissions ],
        folders: {
            "testSubFolder1": {
                permissions: [ testFolderReaderPermissions ]
            },
            "testSubFolder2": {
                permissions: [ testFolderReaderPermissions ]
            }
        }
    };
    const testAuthorSharedFolders: SharedFoldersProps = {
        permissions: [ testFolderAuthorPermissions ],
        folders: {
            "testSubFolder1": {
                permissions: [ testFolderReaderPermissions ]
            },
            "testSubFolder2": {
                permissions: [ testFolderReaderPermissions ]
            }
        }
    };
    //DataSource Related Objects
    const testDataSourceReaderPermissions: DataSourcePermissionsProps =
    {
        principal: "READERS_GROUP",
        actions: "READER_DATA_SOURCE"
    };
    const testDataSourceAuthorPermissions: DataSourcePermissionsProps =
    {
        principal: "AUTHORS_GROUP",
        actions: "AUTHOR_DATA_SOURCE"
    };
    const testAthenaDataSource: DataSourceWithIdAndTypeProps = {
        dataSourceId: "sampleAthena",
        awsAccountId: "test-account",
        dataSourceSpecificParameters: { athenaParameters: { workGroup: "primary" } },
        displayName: "sampleAthena",
        permissions: [ testDataSourceReaderPermissions ],
        sslProperties: { disableSsl: false },
        type: "ATHENA"
    };
    const testRedshiftDataSource: DataSourceWithIdAndTypeProps = {
        awsAccountId: "test-account",
        dataSourceId: "sampleRedshift",
        dataSourceSpecificParameters: { redshiftParameters: { database: "test", clusterId: "testCluster" } },
        displayName: "sampleRedshift",
        permissions: [ testDataSourceAuthorPermissions ],
        sslProperties: { disableSsl: false },
        type: "REDSHIFT",
        //credentials: {"secretArn": "arn:test-partition:secretsmanager:test-region:accountID:secret:secretname"},
        credentials: {
            "credentialPair": {
                "password": "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:password}}",
                "username": "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:username}}"
            }
        },
        vpcConnectionProperties: { vpcConnectionArn: "arn:test-partition:quicksight:test-region:test-account:vpcConnection/test" }
    };
    const constructProps: QuickSightProjectL3ConstructProps = {
        principals: { "ALL_USERS_GROUP": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testAllUsersQSGroup", "READERS_GROUP": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testReaderOnlyQSGroup", "AUTHORS_GROUP": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testAuthorOnlyQSGroup" },
        sharedFolders: { "testReadFolder": testReaderSharedFolders, "testAuthorFolder": testAuthorSharedFolders },
        dataSources: [ testAthenaDataSource, testRedshiftDataSource ],
        naming: testApp.naming,

        roleHelper: new MdaaRoleHelper( testApp.testStack, testApp.naming )
    };

    new QuickSightProjectL3Construct( testApp.testStack, 'test-stack', constructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );
    test( 'Validate if the 2 Lambda functions[CR and QSFolder] are created', () => {
        template.resourceCountIs( "AWS::Lambda::Function", 2 );
    } );
    // Verify QS Permissions provided to qsFolders-cr-func Lambda Function
    test( 'QS Permissions to Lambda Function', () => {
        template.hasResourceProperties( "AWS::IAM::ManagedPolicy", Match.objectLike( {
            "PolicyDocument": {
                "Statement": [
                    {
                        "Action": [
                            "quicksight:CreateFolder",
                            "quicksight:DeleteFolder",
                            "quicksight:DescribeFolder",
                            "quicksight:DescribeFolderPermissions",
                            "quicksight:DescribeFolderResolvedPermissions",
                            "quicksight:ListFolderMembers",
                            "quicksight:ListFolders",
                            "quicksight:UpdateFolder",
                            "quicksight:UpdateFolderPermissions"
                        ],
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:quicksight:test-region:test-account:folder/*"
                    },
                    {
                        "Action": [
                            "quicksight:CreateFolderMembership",
                            "quicksight:DeleteFolderMembership"
                        ],
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:quicksight:test-region:test-account:folder/*"
                    }
                ]
            }
        } ) )
    } );
    // READER: Verify Properties for QS Folders like folderpermissions, folderName, etc.
    test( 'Test QS Folder Creation with READER Permissions', () => {
        template.hasResourceProperties( "AWS::CloudFormation::CustomResource", {
            "folderDetails": Match.objectLike( {
                "folderName": "testReadFolder",
                "folderPermissions": [
                    {
                        "Principal": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testReaderOnlyQSGroup",
                        "Actions": [
                            "quicksight:DescribeFolder"
                        ]
                    }
                ],
                "folderNameWithParentName": "testReadFolder"
            } ),
        } )
    } );
    // AUTHOR: Verify Properties for QS Folders like folderpermissions, folderName, etc.
    test( 'Test QS Folder Creation with AUTHOR Permissions', () => {
        template.hasResourceProperties( "AWS::CloudFormation::CustomResource", {
            "folderDetails": Match.objectLike( {
                "folderName": "testAuthorFolder",
                "folderPermissions": [
                    {
                        "Principal": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testAuthorOnlyQSGroup",
                        "Actions": [
                            "quicksight:CreateFolder",
                            "quicksight:DescribeFolder",
                            "quicksight:UpdateFolder",
                            "quicksight:DeleteFolder",
                            "quicksight:CreateFolder",
                            "quicksight:CreateFolderMembership",
                            "quicksight:DeleteFolderMembership",
                            "quicksight:DescribeFolderPermissions",
                            "quicksight:UpdateFolderPermissions"
                        ]
                    }
                ],
                "folderNameWithParentName": "testAuthorFolder",
            } ),
        } )
    } );
    // Test Athena Data Sources
    test( 'Test QS Athena DataSource', () => {
        template.hasResourceProperties( "AWS::QuickSight::DataSource", {
            "AlternateDataSourceParameters": [
                {
                    "AthenaParameters": {
                        "WorkGroup": "primary"
                    }
                }
            ],
            "AwsAccountId": "test-account",
            "DataSourceId": "test-org-test-env-test-domain-test-module-sampleathena",
            "DataSourceParameters": {
                "AthenaParameters": {
                    "WorkGroup": "primary"
                }
            },
            "Name": "test-org-test-env-test-domain-test-module-sampleathena",
            "Permissions": [
                {
                    "Actions": [
                        "quicksight:DescribeDataSource",
                        "quicksight:DescribeDataSourcePermissions",
                        "quicksight:PassDataSource"
                    ],
                    "Principal": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testReaderOnlyQSGroup"
                }
            ],
            "SslProperties": {
                "DisableSsl": false
            },
            "Type": "ATHENA"
        } )
    } );
    // Test Redshift Data Sources
    test( 'Test QS Redshift DataSource', () => {
        template.hasResourceProperties( "AWS::QuickSight::DataSource", {
            "AlternateDataSourceParameters": [
                {
                    "RedshiftParameters": {
                        "ClusterId": "testCluster",
                        "Database": "test"
                    }
                }
            ],
            "AwsAccountId": "test-account",
            "Credentials": {
                "CredentialPair": {
                    "Password": "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:password}}",
                    "Username": "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:username}}"
                }
            },
            "DataSourceId": "test-org-test-env-test-domain-test-module-sampleredshift",
            "DataSourceParameters": {
                "RedshiftParameters": {
                    "ClusterId": "testCluster",
                    "Database": "test"
                }
            },
            "Name": "test-org-test-env-test-domain-test-module-sampleredshift",
            "Permissions": [
                {
                    "Actions": [
                        "quicksight:DescribeDataSource",
                        "quicksight:DescribeDataSourcePermissions",
                        "quicksight:PassDataSource",
                        "quicksight:UpdateDataSource",
                        "quicksight:DeleteDataSource",
                        "quicksight:UpdateDataSourcePermissions"
                    ],
                    "Principal": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testAuthorOnlyQSGroup"
                }
            ],
            "SslProperties": {
                "DisableSsl": false
            },
            "Type": "REDSHIFT",
            "VpcConnectionProperties": {
                "VpcConnectionArn": "arn:test-partition:quicksight:test-region:test-account:vpcConnection/test"
            }
        } )
    } );
} );
