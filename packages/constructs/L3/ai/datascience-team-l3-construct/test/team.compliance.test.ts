/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { DomainProps } from "@aws-mdaa/sm-studio-domain-l3-construct";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { InventoryDefinition } from '../../../datalake/datalake-l3-construct/lib/datalake-bucket-l3-construct';
import { DataScienceTeamL3Construct, DataScienceTeamL3ConstructProps } from "../lib";


describe( 'MDAA Compliance Stack Tests', () => {

    const testApp = new MdaaTestApp()

    const teamExecutionRoleRef: MdaaRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/team-execution-role",
        name: "team-execution-role"
    }

    const dataAdminRoleRef: MdaaRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/test-role",
        name: "test-role"
    }

    const dataScientistRoleRef: MdaaRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/test-role",
        name: "test-role"
    }

    const immutableDataScientistRoleRef: MdaaRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/test-role2",
        name: "test-role2",
        immutable: true
    }

    const inventoryDefinition: InventoryDefinition = {
        prefix: "test-prefix",
        destinationBucket: "test-bucket",
        destinationAccount: "test-account",
        destinationPrefix: "test-destination-prefix",
    }
    const roleHelper = new MdaaRoleHelper( testApp.testStack, testApp.naming )
    const studioDomainProps: DomainProps = {
        authMode: "SSO",
        vpcId: "test-vpc",
        subnetIds: [ "test-subnet" ],
        defaultUserSettings: {},
        notebookSharingPrefix: "",
        defaultExecutionRole: {
            name: "test-role"
        },
        assetDeploymentMemoryLimitMB: 256
    }

    const constructProps: DataScienceTeamL3ConstructProps = {
        team: {
            teamExecutionRole: teamExecutionRoleRef,
            dataAdminRoles: [ dataAdminRoleRef ],
            teamUserRoles: [ dataScientistRoleRef, immutableDataScientistRoleRef ],
            inventories: { "key1": inventoryDefinition },
            studioDomainConfig: studioDomainProps
        },

        roleHelper: roleHelper,
        naming: testApp.naming,
    };

    new DataScienceTeamL3Construct( testApp.testStack, "teststack", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );

    // console.log( JSON.stringify( template, undefined, 2 ) )

    describe( 'READ Policy Test', () => {
        test( 'Test SageMakerSearch', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:Search",
                                "Effect": "Allow",
                                "Resource": "*",
                                "Sid": "SageMakerSearch"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test SageMakerList', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:List*",
                                "Effect": "Allow",
                                "Resource": "*",
                                "Sid": "SageMakerList"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test SageMakerDescribeGet', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:Describe*",
                                    "sagemaker:BatchDescribe*",
                                    "sagemaker:Get*",
                                    "sagemaker:BatchGet*"
                                ],
                                "Effect": "Allow",
                                "Resource": "*",
                                "Sid": "SageMakerDescribeGet"
                            }
                        )
                    ] )
                }
            } )
        } );
    } )
    describe( 'SM Write Policy Test', () => {
        test( 'Test CreateandManageJobs', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:Create*Job",
                                    "sagemaker:Create*JobDefinition",
                                    "sagemaker:Delete*JobDefinition",
                                    "sagemaker:Update*Job",
                                    "sagemaker:Stop*Job"
                                ],
                                "Effect": "Allow",
                                "Resource": [ "arn:test-partition:sagemaker:test-region:test-account:*job/*", "arn:test-partition:sagemaker:test-region:test-account:*job-definition/*",
                                ],
                                "Sid": "CreateandManageJobs"
                            }
                        )
                    ]
                    )
                }
            } )
        } )
        test( 'Test CreateandManageModelMonitoring', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:DeleteMonitoringSchedule"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:monitoring-schedule/*",
                                "Sid": "CreateandManageModelMonitoring"
                            }
                        )
                    ]
                    )
                }
            } )
        } )
        test( 'Test CreateandManageModelCards', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateModelCard",
                                    "sagemaker:DeleteModelCard",
                                    "sagemaker:UpdateModelCard"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:model-card/*",
                                "Sid": "CreateandManageModelCards"
                            }
                        )
                    ]
                    )
                }
            } )
        } )
        test( 'Test CreateandManagePipelines', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreatePipeline",
                                    "sagemaker:DeletePipeline",
                                    "sagemaker:RetryPipelineExecution",
                                    "sagemaker:StartPipelineExecution",
                                    "sagemaker:StopPipelineExecution",
                                    "sagemaker:SendPipelineExecutionStepSuccess",
                                    "sagemaker:SendPipelineExecutionStepFailure",
                                    "sagemaker:UpdatePipeline",
                                    "sagemaker:UpdatePipelineExecution"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:pipeline/*",
                                "Sid": "CreateandManagePipelines"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateAndManageModels', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateModel",
                                    "sagemaker:DeleteModel"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:model/*",
                                "Sid": "CreateAndManageModels"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateAndManageEndpoints', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike( {
                            "Sid": "CreateAndManageEndpoints",
                            "Effect": "Allow",
                            "Resource": [ "arn:test-partition:sagemaker:test-region:test-account:endpoint/*", "arn:test-partition:sagemaker:test-region:test-account:endpoint-config/*"
                            ],
                            "Action": [
                                "sagemaker:CreateEndpoint",
                                "sagemaker:DeleteEndpoint",
                                "sagemaker:UpdateEndpoint",
                                "sagemaker:UpdateEndpointWeightsAndCapacities",
                                "sagemaker:CreateEndpointConfig",
                                "sagemaker:DeleteEndpointConfig",
                                "sagemaker:InvokeEndpoint",
                                "sagemaker:InvokeEndpointAsync"
                            ]
                        }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateAndManageTrials', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateTrial",
                                    "sagemaker:CreateTrialComponent",
                                    "sagemaker:AssociateTrialComponent",
                                    "sagemaker:DisassociateTrialComponent",
                                    "sagemaker:DeleteTrial",
                                    "sagemaker:DeleteTrialComponent",
                                    "sagemaker:UpdateTrial",
                                    "sagemaker:UpdateTrialComponent"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:experiment*",
                                "Sid": "CreateAndManageTrials"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateAndManageProjects', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateProject",
                                    "sagemaker:DeleteProject",
                                    "sagemaker:UpdateProject"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:project/*",
                                "Sid": "CreateAndManageProjects"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test PutRecordFeatureGroups', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:PutRecord",
                                    "sagemaker:DeleteRecord"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:feature-group/*",
                                "Sid": "PutRecordFeatureGroups"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test AddDeleteTagsSageMaker', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:AddTags",
                                    "sagemaker:DeleteTags"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:*",
                                "Sid": "AddDeleteTagsSageMaker"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test SM CreateOnlineFeatureGroups', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:CreateFeatureGroup",
                                "Condition": {
                                    "StringEquals": {
                                        "sagemaker:FeatureGroupOnlineStoreKmsKey": {
                                            "Fn::GetAtt": [
                                                "teststackcmk3D411286",
                                                "Arn"
                                            ]
                                        }
                                    }
                                },
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:feature-group/*",
                                "Sid": "CreateOnlineFeatureGroups"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test SM CreateOfflineFeatureGroups', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:CreateFeatureGroup",
                                "Condition": {
                                    "StringEquals": {
                                        "sagemaker:FeatureGroupOfflineStoreKmsKey": {
                                            "Fn::GetAtt": [
                                                "teststackcmk3D411286",
                                                "Arn"
                                            ]
                                        }
                                    },
                                    "StringLike": {
                                        "sagemaker:FeatureGroupOfflineStoreS3Uri": {
                                            "Fn::Join": [
                                                "",
                                                [
                                                    {
                                                        "Fn::GetAtt": [
                                                            "teststackbucketprojectsB0C02250",
                                                            "Arn"
                                                        ]
                                                    },
                                                    "/*"
                                                ]
                                            ]
                                        }
                                    }
                                },
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:feature-group/*",
                                "Sid": "CreateOfflineFeatureGroups"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test ManageFeatureGroups', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:DeleteFeatureGroup",
                                    "sagemaker:UpdateFeatureGroup",
                                    "sagemaker:UpdateFeatureMetadata"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:feature-group/*",
                                "Sid": "ManageFeatureGroups"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateAndManageExperiments', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateExperiment",
                                    "sagemaker:DeleteExperiment",
                                    "sagemaker:UpdateExperiment"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:sagemaker:test-region:test-account:experiment/*",
                                "Sid": "CreateAndManageExperiments"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CreateEC2NetworkInterfaces', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "ec2:CreateNetworkInterface",
                                    "ec2:CreateNetworkInterfacePermission",
                                    "ec2:CreateVpcEndpoint",
                                    "ec2:DeleteNetworkInterface",
                                    "ec2:DeleteNetworkInterfacePermission",
                                    "ec2:DescribeNetworkInterfaces",
                                    "ec2:DescribeSecurityGroups",
                                    "ec2:DescribeSubnets",
                                    "ec2:DescribeVpcs",
                                    "ec2:DescribeDhcpOptions",
                                    "ec2:DescribeVpcEndpoints"
                                ],
                                "Effect": "Allow",
                                "Resource": "*",
                                "Sid": "CreateEC2NetworkInterfaces"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test SageMakerECRReadonly', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "ecr:ListImages",
                                    "ecr:DescribeImages",
                                    "ecr:DescribeRepositories",
                                    "ecr:GetDownloadUrlForLayer"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:ecr:test-region:341280168497:repository/sagemaker*",
                                "Sid": "SageMakerECRReadonly"
                            }
                        ) ]
                    )
                }
            } )
        } )
        test( 'Test CloudWatchSageMaker Read', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Sid": "CloudWatchSageMaker",
                                "Action": [
                                    "logs:GetLogEvents",
                                    "logs:DescribeLogGroups",
                                    "logs:DescribeLogStreams",
                                    "logs:FilterLogEvents"
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:logs:test-region:test-account:log-group:*sagemaker*"
                            }
                        )
                    ] )
                }
            } )
        } );
        test( 'Test CloudWatchSageMaker Write', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Sid": "CloudWatchSageMaker",
                                "Action": [
                                    "logs:CreateLogGroup",
                                    "logs:CreateLogStream",
                                    "logs:PutLogEvents",
                                ],
                                "Effect": "Allow",
                                "Resource": "arn:test-partition:logs:test-region:test-account:log-group:*sagemaker*"
                            }
                        )
                    ] )
                }
            } )
        } );
    } )

    describe( 'SM Guardrail Policy Test', () => {
        test( 'Test forceVolumeKmsKey', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateEndpointConfig",
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:CreateNotebookInstance",
                                    "sagemaker:Create*Job*"
                                ],
                                "Condition": {
                                    "StringNotEquals": {
                                        "sagemaker:VolumeKmsKey": {
                                            "Fn::GetAtt": [
                                                "teststackcmk3D411286",
                                                "Arn"
                                            ]
                                        }
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceVolumeKmsKey"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceOutputKmsKey', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:Create*Job*"
                                ],
                                "Condition": {
                                    "StringNotEquals": {
                                        "sagemaker:OutputKmsKey": {
                                            "Fn::GetAtt": [
                                                "teststackcmk3D411286",
                                                "Arn"
                                            ]
                                        }
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceOutputKmsKey"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceIntercontainerEncryptionNonNull', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:Create*Job*"
                                ],
                                "Condition": {
                                    "Null": {
                                        "sagemaker:InterContainerTrafficEncryption": "true"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceIntercontainerEncryptionNonNull"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceIntercontainerEncryptionTrue', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:Create*Job*"
                                ],
                                "Condition": {
                                    "Bool": {
                                        "sagemaker:InterContainerTrafficEncryption": "false"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceIntercontainerEncryptionTrue"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test CloudWatchSageMaker', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:Create*Job*",
                                    "sagemaker:CreateNotebookInstance",
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:CreateModel"
                                ],
                                "Condition": {
                                    "Null": {
                                        "sagemaker:VpcSubnets": "true"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceJobNotebookVpc"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceJobNotebookSecurityGroups', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": [
                                    "sagemaker:Create*Job*",
                                    "sagemaker:CreateNotebookInstance",
                                    "sagemaker:CreateMonitoringSchedule",
                                    "sagemaker:UpdateMonitoringSchedule",
                                    "sagemaker:CreateModel"
                                ],
                                "Condition": {
                                    "Null": {
                                        "sagemaker:VpcSecurityGroupIds": "true"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceJobNotebookSecurityGroups"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceNotebookNonPublicNonNull', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:CreateNotebookInstance",
                                "Condition": {
                                    "Null": {
                                        "sagemaker:DirectInternetAccess": "true"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceNotebookNonPublicNonNull"
                            } ) ]
                    )
                }
            } )
        } )
        test( 'Test forceNotebookNonPublicDisabled', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "PolicyDocument": {
                    "Statement": Match.arrayWith( [
                        Match.objectLike(
                            {
                                "Action": "sagemaker:CreateNotebookInstance",
                                "Condition": {
                                    "StringNotEquals": {
                                        "sagemaker:DirectInternetAccess": "Disabled"
                                    }
                                },
                                "Effect": "Deny",
                                "Resource": "*",
                                "Sid": "forceNotebookNonPublicDisabled"
                            } )
                    ] )
                }
            } )
        } )
        test( 'Test Policy Name', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "ManagedPolicyName": "test-org-test-env-test-domain-test-module-sm-guardrail",
            } )
        } )
        test( 'Test Role Assignment', () => {
            template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
                "Roles": [
                    "team-execution-role",
                    "test-role"
                ]
            }
            )
        } );
    } )
} )
