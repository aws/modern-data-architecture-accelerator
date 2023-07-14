/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '../lib/sm-studio-domain-l3-construct';



describe( 'Studio Domain Mandatory Props', () => {
    const testApp = new CaefTestApp()
    const stack = testApp.testStack

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
        domain: {
            authMode: "IAM",
            vpcId: "test-vpc-id",
            subnetIds: [ "test-sub-id" ],
            dataAdminRoles: [ {
                name: "test"
            } ]
        },
        naming: testApp.naming,

        roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    }

    new SagemakerStudioDomainL3Construct( stack, "domain", constructProps );
    const template = Template.fromStack( stack );

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    testApp.checkCdkNagCompliance( stack )

    test( 'Validate if Domain is created', () => {
        template.resourceCountIs( "AWS::SageMaker::Domain", 1 );
    } );

    test( 'Execution Role Policy', () => {
        template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
            "PolicyDocument": {
                "Statement": [
                    {
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
                        "Resource": {
                            "Fn::GetAtt": [
                                "domainefskeyF34BE10B",
                                "Arn"
                            ]
                        }
                    },
                    {
                        "Action": [
                            "sagemaker:CreateApp",
                            "sagemaker:DeleteApp",
                            "sagemaker:DescribeApp"
                        ],
                        "Effect": "Allow",
                        "Resource": {
                            "Fn::Join": [
                                "",
                                [
                                    "arn:test-partition:sagemaker:test-region:test-account:app/",
                                    {
                                        "Fn::GetAtt": [
                                            "domainCA282C9B",
                                            "DomainId"
                                        ]
                                    },
                                    "/*"
                                ]
                            ]
                        }
                    },
                    {
                        "Action": "sagemaker:DescribeDomain",
                        "Effect": "Allow",
                        "Resource": {
                            "Fn::Join": [
                                "",
                                [
                                    "arn:test-partition:sagemaker:test-region:test-account:domain/",
                                    {
                                        "Fn::GetAtt": [
                                            "domainCA282C9B",
                                            "DomainId"
                                        ]
                                    }
                                ]
                            ]
                        }
                    },
                    {
                        "Action": "sagemaker:ListStudioLifecycleConfigs",
                        "Effect": "Allow",
                        "Resource": "*"
                    },
                    {
                        "Action": "sagemaker:DescribeStudioLifecycleConfig",
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:sagemaker:test-region:test-account:studio-lifecycle-config/*"
                    },
                    {
                        "Action": [
                            "logs:CreateLogGroup",
                            "logs:DescribeLogGroups",
                            "logs:DescribeLogStreams"
                        ],
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:logs:test-region:test-account:log-group:/aws/sagemaker/studio"
                    },
                    {
                        "Action": [
                            "logs:CreateLogStream",
                            "logs:PutLogEvents"
                        ],
                        "Effect": "Allow",
                        "Resource": "arn:test-partition:logs:test-region:test-account:log-group:/aws/sagemaker/studio:log-stream:*"
                    }
                ],
                "Version": "2012-10-17"
            },
            "Description": "",
            "ManagedPolicyName": "test-org-test-env-test-domain-test-module-basic-execution",
            "Path": "/",
            "Roles": [
                {
                    "Ref": "domaindefaultexecutionrole3CFE4307"
                }
            ]
        } )
    } );

    test( 'SecurityGroup VPC ID Testing', () => {
        template.hasResourceProperties( "AWS::EC2::SecurityGroup", {
            "VpcId": "test-vpc-id"
        } )
    } );
} )
