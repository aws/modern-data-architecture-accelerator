/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockDeviceProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper, MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { EbsDeviceVolumeType } from "aws-cdk-lib/aws-ec2";
import { Ec2L3Construct, Ec2L3ConstructProps, InitProps, InstanceProps, SecurityGroupProps } from '../lib/ec2-l3-construct';

describe( 'MDAA Compliance Stack Tests', () => {

    const testApp = new MdaaTestApp()
    const stack = testApp.testStack

    const testRoleRef: MdaaRoleRef = {
        arn: "arn:test-partition:iam::test-account:role/test-role",
        id: "test-id",
        name: "test-role"
    }

    const ingress: MdaaSecurityGroupRuleProps = {
        ipv4: [ {
            cidr: "10.0.0.0/28",
            port: 443,
            protocol: "tcp"
        } ]
    }

    const egress: MdaaSecurityGroupRuleProps = {
        ipv4: [ {
            cidr: "10.0.0.0/28",
            port: 443,
            protocol: "TCP"
        } ]
    }

    const securityGroupProps: SecurityGroupProps = {
        ingressRules: ingress,
        egressRules: egress,
        vpcId: "test-vpc-id"
    }

    const testBlockDeviceProps: BlockDeviceProps = {
        deviceName: '/dev/sda1',
        volumeSizeInGb: 32,
        ebsType: EbsDeviceVolumeType.GP3
    }

    const testBlockDevicesProps: BlockDeviceProps[] = [ testBlockDeviceProps ]

    const initProps: InitProps = {
        configSets: {
            default: {configs:['awscli', 'Preinstall']},
            reverseset: {configs: ['Preinstall', 'awscli']}
        },
        configs: {
            awscli: 
            {packages:
                {
                    awsPackage:{
                        packageManager:'msi',
                        packageLocation: "https://s3.amazonaws.com/aws-cli/AWSCLI64.msi"
                    },
                    anotherPackage:{
                        packageManager: 'msi',
                        packageLocation: "https://s3.amazonaws.com/thisisanotherpackage.msi"                        
                    }
                }
            },
            Preinstall: 
            {packages:
                {
                    somePackage:{
                        packageManager: 'msi',
                        packageLocation: "https://s3.amazonaws.com/somepackagefromconfig.msi"
                    }
                },
             commands:
                {
                    '01testCommand':{
                        shellCommand: 'echo "this is a command"'
                    },
                    '02anotherTestCommand':{
                        shellCommand: 'echo "this TOO is a command"',
                        testCommand: 'echo "this is test command"',
                        workingDir: '/some/dir/',
                        waitAfterCompletion: 4,
                    }
                },
            files:
               {
                'testfile.txt': {
                    filePath: './test/somefile.txt'
                }
               },
            services:
               {
                'cfn-hup': {
                    enabled: true,
                    ensureRunning: true 
                }
               }
            },

        }
    }

    const instance1: InstanceProps = {
        securityGroup: "testing",
        instanceType: "m5.large",
        amiId: "/golden-ami/al2",
        vpcId: "test-vpc-id",
        subnetId: "test-sub-id",
        blockDevices: testBlockDevicesProps,
        instanceRole: testRoleRef,
        availabilityZone: "test-region",
        osType: "windows",
        initName: 'init1',
        userDataScriptPath: "./test/userdata.sh",
        existingKeyPairName: "existing-rsa-key"
    }

    const instance2: InstanceProps = {
        securityGroupId: "sg-testing",
        instanceType: "m5.large",
        amiId: "/golden-ami/al2",
        vpcId: "test-vpc-id",
        subnetId: "test-sub-id",
        blockDevices: testBlockDevicesProps,
        instanceRole: testRoleRef,
        availabilityZone: "test-region",
        osType: "windows",
        initName: 'init1',
        signalCount: 1,
        creationTimeOut: 'PT15M',        
        keyPairName: "test-key-pair"
    }

    const constructProps: Ec2L3ConstructProps = {
        adminRoles: [ {
            id: "admin-role-id"
        } ],
        keyPairs: {
            "test-key-pair": {}
        },
        securityGroups: {
            'testing': securityGroupProps
        },
        instances: {
            'test-instance': instance1,
            'test-instance2': instance2
        },
        cfnInit: {
            'init1': initProps,
        },

        naming: testApp.naming,

        roleHelper: new MdaaRoleHelper( stack, testApp.naming )
    }

    new Ec2L3Construct( stack, "instances", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'Validate if ec2 instance is created', () => {
        template.resourceCountIs( "AWS::EC2::Instance", 2 );
    } );

    test( 'Validate SG ', () => {
        template.hasResourceProperties( "AWS::EC2::Instance", {
            "SecurityGroupIds": [
                {
                    "Fn::GetAtt": [
                        "instancestesting3D7F8701",
                        "GroupId"
                    ]
                }
            ]
        } );
    } );

    test( 'Validate KMS ', () => {
        template.hasResourceProperties( "AWS::EC2::Instance", {
            "BlockDeviceMappings": [
                {
                    "DeviceName": "/dev/sda1",
                    "Ebs": {
                        "DeleteOnTermination": false,
                        "Encrypted": true,
                        "KmsKeyId": {
                            "Fn::GetAtt": [
                                "instanceskmskey7952A58F",
                                "Arn"
                            ]
                        },
                        "VolumeSize": 32,
                        "VolumeType": "gp3"
                    }
                }
            ]
        } );
    } );

    test( 'KMSUsageAccess', () => {
        template.hasResourceProperties( "AWS::KMS::Key", {
            "KeyPolicy": {
                "Statement": [
                    {
                        "Action": "kms:*",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:test-partition:iam::test-account:root"
                        },
                        "Resource": "*"
                    },
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
                                    "admin-role-id:*"
                                ]
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "*"
                        },
                        "Resource": "*",
                        "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
                    },
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
                                    "admin-role-id:*"
                                ]
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "*"
                        },
                        "Resource": "*",
                        "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
                    },
                    {
                        "Action": [
                            "kms:Decrypt",
                            "kms:Encrypt",
                            "kms:ReEncrypt*",
                            "kms:GenerateDataKey*"
                        ],
                        "Condition": {
                            "StringEquals": {
                                "kms:ViaService": "secretsmanager.test-region.amazonaws.com"
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:test-partition:iam::test-account:root"
                        },
                        "Resource": "*"
                    },
                    {
                        "Action": [
                            "kms:CreateGrant",
                            "kms:DescribeKey"
                        ],
                        "Condition": {
                            "StringEquals": {
                                "kms:ViaService": "secretsmanager.test-region.amazonaws.com"
                            }
                        },
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:test-partition:iam::test-account:root"
                        },
                        "Resource": "*"
                    },
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
                        "Principal": {
                            "AWS": "arn:test-partition:iam::test-account:role/test-role"
                        },
                        "Resource": "*"
                    }
                ],
                "Version": "2012-10-17"
            }
        } )
    } );

    test( 'SecurityGroup Egress Testing', () => {
        template.resourceCountIs( "AWS::EC2::SecurityGroupEgress", 1 )
        template.hasResourceProperties( "AWS::EC2::SecurityGroupEgress", {
            "CidrIp": "10.0.0.0/28",
            "Description": "to 10.0.0.0/28:tcp PORT 443",
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
    test( 'SecurityGroup VPC Testing', () => {
        template.hasResourceProperties( "AWS::EC2::SecurityGroup", {
            "VpcId": "test-vpc-id"
        } )
    } );
    test( 'CfnInit testing', () => {
        template.templateMatches( {
            Resources: {
                instancestestinstance2instance3050F03C: {
                  Type: 'AWS::EC2::Instance',
                  "Metadata": {
                    "AWS::CloudFormation::Init": {
                      "configSets": {
                        "default": [
                          "awscli",
                          "Preinstall"
                        ],
                        "reverseset": [
                          "Preinstall",
                          "awscli"
                        ]
                      },
                      "awscli": {
                        "packages": {
                          "msi": {
                            "000": "https://s3.amazonaws.com/aws-cli/AWSCLI64.msi",
                            "001": "https://s3.amazonaws.com/thisisanotherpackage.msi"
                          }
                        }
                      },
                      "Preinstall": {
                        "packages": {
                          "msi": {
                            "000": "https://s3.amazonaws.com/somepackagefromconfig.msi"
                          }
                        },
                        "files": {
                            "testfile.txt": {
                            //   "source": {
                            //     "Fn::Sub": "https://s3.test-region.${AWS::URLSuffix}/cdk-hnb659fds-assets-test-account-test-region/48bdc3ffa2efd61be3c7282ed133f9c32eb4e155f022d36854ff9e5e425fc46c.txt"
                            //   }
                            }
                          },
                        "commands": {
                            "01testCommand": {
                              "command": "echo \"this is a command\""
                            },
                            "02anotherTestCommand": {
                              "command": "echo \"this TOO is a command\"",
                              "cwd": "/some/dir/",
                              "test": "echo \"this is test command\"",
                              "waitAfterCompletion": 240
                            }
                        },
                        "services": {
                            "windows": {
                              "cfn-hup": {
                                "enabled": true,
                                "ensureRunning": true
                              }
                            }
                        }
                      }
                    },
                },
              },

        } })
    } );
    test( 'Creation Policy testing', () => {
        template.templateMatches( {
            Resources: {
                instancestestinstance2instance3050F03C: {
                  Type: 'AWS::EC2::Instance',
                  "CreationPolicy": {
                    "ResourceSignal": {
                      "Count": 1,
                      "Timeout": "PT15M"
                    }
                  },
              },

        } })
    } );
} )


