/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefSFTPServer, CaefSFTPServerProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {

    const testApp = new CaefTestApp()

    const testRole = CaefRole.fromRoleArn( testApp.testStack, "test-role", 'arn:test-partition:iam::test-account:role/test-role' )

    const testContstructProps: CaefSFTPServerProps = {
        naming: testApp.naming,
        vpcId: "test-vpc-id",
        subnetIds: [ "test-subnet-id1", "test-subnet-id2" ],
        securityGroupId: "test-sg1",
        loggingRole: testRole
    }

    new CaefSFTPServer( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'EndpointType', () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            EndpointType: "VPC"
        } )
    } );
    test( 'SecurityPolicyName', () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            SecurityPolicyName: "TransferSecurityPolicy-FIPS-2020-06"
        } )
    } );
    test( "Protocols", () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            Protocols: [ "SFTP" ]
        } )
    } );
    test( "LoggingRole", () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            LoggingRole: 'arn:test-partition:iam::test-account:role/test-role'
        } )
    } );
    test( "EndpointDetails.SecurityGroupIds", () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            EndpointDetails: {
                SecurityGroupIds: [ "test-sg1" ]
            }
        } )
    } );
    test( "EndpointDetails.SubnetIds", () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            EndpointDetails: {
                SubnetIds: [ "test-subnet-id1", "test-subnet-id2" ]
            }
        } )
    } );
    test( "EndpointDetails.VpcId", () => {
        template.hasResourceProperties( "AWS::Transfer::Server", {
            EndpointDetails: {
                VpcId: "test-vpc-id"
            }
        } )
    } );
} )