/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroupRuleProps } from "@aws-caef/ec2-constructs";
import { CaefRoleHelper, CaefRoleRef } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { NamedLifecycleConfigProps, NotebookProps, SagemakerNotebookL3Construct, SagemakerNotebookL3ConstructProps } from '../lib/sm-notebook-l3-construct';

describe( 'CAEF Notebook Tests', () => {

    const testRoleRef: CaefRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/test-role",
        id: "test-id",
        name: "test-role"
    }

    const ingress: CaefSecurityGroupRuleProps = {
        ipv4: [ {
            cidr: "10.0.0.0/28",
            port: 443,
            protocol: "tcp"
        } ]
    }
    const egress: CaefSecurityGroupRuleProps = {
        ipv4: [ {
            cidr: "10.1.1.1/28",
            port: 443,
            protocol: "tcp"
        } ]
    }
    const lifecycleConfigs: NamedLifecycleConfigProps = {
        "test_config": {

            onCreate: {
                assets: {
                    test_asset: {
                        sourcePath: "./test/test_assets"
                    }
                },
                cmds: [ "echo 'testing'" ]
            }
        }
    }
    const notebook: NotebookProps = {
        vpcId: "test-vpc-id",
        subnetId: "test-sub-id",
        instanceType: "test-instance",
        securityGroupIngress: ingress,
        securityGroupEgress: egress,
        acceleratorTypes: [ "test-type" ],
        additionalCodeRepositories: [ "test-repo-1" ],
        defaultCodeRepository: "default-repo",
        instanceMetadataServiceConfiguration: {
            minimumInstanceMetadataServiceVersion: "test"
        },
        platformIdentifier: "test",
        volumeSizeInGb: 5,
        notebookRole: testRoleRef,
        lifecycleConfigName: "test_config",
        rootAccess: true
    }

    describe( 'w/Auto Generated Key', () => {
        const testApp = new CaefTestApp()
        const stack = testApp.testStack
        const constructProps: SagemakerNotebookL3ConstructProps = {
            assetDeployment: {
                assetBucketName: "test-bucket",
                assetDeploymentRoleArn: "arn:test-partition:iam::test-account:role/test-role",
            },
            lifecycleConfigs: lifecycleConfigs,
            notebooks: { "test-notebook": notebook },
            naming: testApp.naming,
            roleHelper: new CaefRoleHelper( stack, testApp.naming )
        }

        new SagemakerNotebookL3Construct( stack, "notebooks", constructProps );
        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack )

        // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
        test( 'Validate if notebook instance is created', () => {
            template.resourceCountIs( "AWS::SageMaker::NotebookInstance", 1 );
        } );
        test( 'UsesGeneratedKMSKey', () => {
            template.hasResourceProperties( "AWS::SageMaker::NotebookInstance", {
                "KmsKeyId": {
                    "Fn::GetAtt": [
                        "notebookskmskeynotebooks39E79F2A",
                        "Arn"
                    ]
                }
            } )
        } )
        test( 'KMSUsageAccess', () => {
            template.hasResourceProperties( "AWS::KMS::Key", {
                "KeyPolicy": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike( {
                            "Action": [
                                "kms:Decrypt",
                                "kms:Encrypt",
                                "kms:ReEncrypt*",
                                "kms:GenerateDataKey*",
                                "kms:GenerateDataKeyWithoutPlaintext",
                                "kms:CreateGrant",
                                "kms:DescribeKey",
                                "kms:ListAliases"
                            ],
                            "Effect": "Allow",
                            "Principal": {
                                "AWS": "arn:test-partition:iam::test-account:role/test-role"
                            },
                            "Resource": "*"
                        } )
                    ] )
                }
            } )
        } );

        test( 'SecurityGroup Egress Testing', () => {
            template.resourceCountIs( "AWS::EC2::SecurityGroupEgress", 1 )
            template.hasResourceProperties( "AWS::EC2::SecurityGroupEgress", {
                "CidrIp": "10.1.1.1/28",
                "Description": "to 10.1.1.1/28:tcp PORT 443",
                "FromPort": 443,
                "IpProtocol": "tcp",
                "ToPort": 443
            } )
        } )
        test( 'SecurityGroup Ingress Testing', () => {
            template.resourceCountIs( "AWS::EC2::SecurityGroupIngress", 1 )
            template.hasResourceProperties( "AWS::EC2::SecurityGroupIngress", {
                "CidrIp": "10.0.0.0/28",
                "Description": "from 10.0.0.0/28:tcp PORT 443",
                "FromPort": 443,
                "IpProtocol": "tcp",
                "ToPort": 443
            } )
        } )
        test( 'Root Access', () => {
            template.hasResourceProperties( "AWS::SageMaker::NotebookInstance", {
                "RootAccess": "Enabled",
            } )
        } )

    } )
    describe( 'w/Existing Key and SG, no Lifecycle, no Root Access, no custom Egress', () => {
        const testApp = new CaefTestApp()
        const stack = testApp.testStack
        const notebook2 = {
            ...notebook,
            securityGroupId: 'sg-test-existing-sg',
            lifecycleConfig: undefined,
            rootAccess: false,
            securityGroupEgress: undefined
        }

        const constructProps: SagemakerNotebookL3ConstructProps = {
            assetDeployment: {
                assetBucketName: "test-bucket",
                assetDeploymentRoleArn: "arn:test-partition:iam::test-account:role/test-role",
            },
            lifecycleConfigs: lifecycleConfigs,
            kmsKeyArn: "arn:test-partition:kms::test-account:key/test-key-arn",
            notebooks: {
                "test-notebook": notebook2
            },
            naming: testApp.naming,
            roleHelper: new CaefRoleHelper( stack, testApp.naming )
        }
        new SagemakerNotebookL3Construct( stack, "notebooks", constructProps );
        testApp.checkCdkNagCompliance( testApp.testStack )
        const template = Template.fromStack( testApp.testStack )

        // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

        test( 'Validate if notebook instance is created', () => {
            template.resourceCountIs( "AWS::SageMaker::NotebookInstance", 1 );
        } );
        test( 'UsesExistingKMSKey', () => {
            template.hasResourceProperties( "AWS::SageMaker::NotebookInstance", {
                "KmsKeyId": "arn:test-partition:kms::test-account:key/test-key-arn"
            } )
        } )
        test( 'UsesExistingSG', () => {
            template.hasResourceProperties( "AWS::SageMaker::NotebookInstance", {
                "SecurityGroupIds": [
                    "sg-test-existing-sg"
                ],
            } )
        } )
        test( 'No Root Access', () => {
            template.hasResourceProperties( "AWS::SageMaker::NotebookInstance", {
                "RootAccess": "Disabled",
            } )
        } )
    } )
} )
