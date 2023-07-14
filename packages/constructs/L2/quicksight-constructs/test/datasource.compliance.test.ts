/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefQuickSightDataSource, CaefQuickSightDataSourceProps } from "../lib";


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()
    const readerPermissionsDef = {
        actions: [ "quicksight:DescribeDataSource", "quicksight:DescribeDataSourcePermissions", "quicksight:PassDataSource" ],
        principal: "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testReaderOnlyQSGroup"
    }
    const authorPermissionsDef = {
        actions: [ "quicksight:DescribeDataSource", "quicksight:DescribeDataSourcePermissions", "quicksight:PassDataSource", "quicksight:UpdateDataSource", "quicksight:DeleteDataSource", "quicksight:UpdateDataSourcePermissions" ],
        principal: "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testAuthorOnlyQSGroup"
    }
    const testRedshiftContstructProps: CaefQuickSightDataSourceProps = {
        naming: testApp.naming,
        awsAccountId: "test-account",
        alternateDataSourceParameters: [ { redshiftParameters: { database: "test", clusterId: "testCluster" } } ],
        dataSourceId: "sampleRedshift",
        dataSourceParameters: { redshiftParameters: { database: "test", clusterId: "testCluster" } },
        name: "sampleRedshift",
        permissions: [ readerPermissionsDef ],
        type: "REDSHIFT",
        credentials: { credentialPair: { password: "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:password}}", username: "{{resolve:secretsmanager:/test/redshift/admin/user:SecretString:username}}" } },
        vpcConnectionProperties: { vpcConnectionArn: "arn:test-partition:quicksight:test-region:test-account:vpcConnection/test" }
    };
    const testAthenaContstructProps: CaefQuickSightDataSourceProps = {
        naming: testApp.naming,
        awsAccountId: "test-account",
        alternateDataSourceParameters: [ { athenaParameters: { workGroup: "primary" } } ],
        dataSourceId: "sampleAthena",
        dataSourceParameters: { athenaParameters: { workGroup: "primary" } },
        name: "sampleAthena",
        permissions: [ authorPermissionsDef ],
        type: "ATHENA"
    };
    new CaefQuickSightDataSource( testApp.testStack, "test-construct1", testRedshiftContstructProps )
    new CaefQuickSightDataSource( testApp.testStack, "test-construct2", testAthenaContstructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );

    // test( 'Validate if SSL is Enabled for Data Source', () => {
    //     template.hasResourceProperties( "AWS::QuickSight::DataSource", {
    //         "SslProperties": {
    //             "DisableSsl": false
    //           }
    //     });
    // });
    test( 'Data Source Name', () => {
        template.hasResourceProperties( "AWS::QuickSight::DataSource", {
            "Name": testApp.naming.resourceName( testRedshiftContstructProps.name )
        } )
    } )
    test( 'Data Source Reader Permissions', () => {
        template.hasResourceProperties( "AWS::QuickSight::DataSource", {
            "Permissions": [
                {
                    "Actions": [
                        "quicksight:DescribeDataSource",
                        "quicksight:DescribeDataSourcePermissions",
                        "quicksight:PassDataSource"
                    ],
                    "Principal": "arn:test-partition:quicksight:test-region:test-account:group/testNamespace/testReaderOnlyQSGroup"
                }
            ]
        } )
    } );
    test( 'Data Source Author Permissions', () => {
        template.hasResourceProperties( "AWS::QuickSight::DataSource", {
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
            ]
        } )
    } )
} );