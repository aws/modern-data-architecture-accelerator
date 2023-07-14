/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefStudioDomain } from "../lib";


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testContstructProps = {
        naming: testApp.naming,
        vpcId: "test-vpc-id",
        subnetIds: [ "test-subnet-id" ],
        kmsKeyId: "arn:test-partition:kms:test-region:test-account:key/test-key",

        securityGroupId: "test-security-group",
        authMode: "SSO",
        defaultUserSettings: {
            executionRole: "arn:test-partition:iam:test-region:test-account:role/test-role",
            kernelGatewayAppSettings: {
                customImages: [ {
                    appImageConfigName: 'appImageConfigName',
                    imageName: 'imageName',
                    imageVersionNumber: 123,
                } ]
            }
        },
        domainName: "test-domain"
    }

    new CaefStudioDomain( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'DomainName', () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "DomainName": testApp.naming.resourceName( "test-domain" )
        } )
    } )

    test( 'AppNetworkAccessType', () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "AppNetworkAccessType": "VpcOnly"
        } )
    } )

    test( 'AuthMode', () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "AuthMode": "SSO"
        } )
    } )

    test( "KmsKeyId", () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "KmsKeyId": "arn:test-partition:kms:test-region:test-account:key/test-key"
        } )
    } )

    test( "SubnetIds", () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "SubnetIds": [ "test-subnet-id" ]
        } )
    } )

    test( "VpcId", () => {
        template.hasResourceProperties( "AWS::SageMaker::Domain", {
            "VpcId": "test-vpc-id"
        } )
    } )

    test( "DomainUpdate", () => {
        template.hasResourceProperties( "Custom::StudioDomainUpdate", {
            "ServiceToken": {
                "Fn::GetAtt": [
                    "customStudioDomainUpdateproviderframeworkonEvent65473DC6",
                    "Arn"
                ]
            },
            "DomainId": {
                "Fn::GetAtt": [
                    "testconstruct",
                    "DomainId"
                ]
            },
            "DefaultUserSettings": {
                "JupyterServerAppSettings": {
                    "DefaultResourceSpec": {
                        "InstanceType": "system"
                    }
                },
                "KernelGatewayAppSettings": {
                    "CustomImages": [
                        {
                            "AppImageConfigName": "appImageConfigName",
                            "ImageName": "imageName",
                            "ImageVersionNumber": 123
                        }
                    ]
                },
                "ExecutionRole": "arn:test-partition:iam:test-region:test-account:role/test-role",
                "SecurityGroups": [
                    "test-security-group"
                ]
            },
            "DomainSettingsForUpdate": {
                "ExecutionRoleIdentityConfig": "USER_PROFILE_NAME"
            }
        } )
    } )
} )