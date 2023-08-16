/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRole } from "@aws-caef/iam-constructs";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Compatibility, ContainerImage, PropagatedTagSource, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { CaefECSCluster, CaefECSContainerDefinition } from '../lib';
import { CaefECSFargateService, CaefECSFargateServiceProps } from '../lib/fargate-service';

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()
    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, 'VPC', {
        vpcId: 'test-vpc-id',
        availabilityZones: [ 'az1', 'az2' ],
        privateSubnetIds: [ 'subnet1', 'subnet2' ],
    } );
    const testCluster = CaefECSCluster.fromClusterAttributes( testApp.testStack, "test-cluster", {
        clusterName: 'test-cluster',
        vpc: testVpc
    } )
    const testSubnet = Subnet.fromSubnetId( testApp.testStack, 'subnet', "test-subnet-id" )
    const testSG = SecurityGroup.fromSecurityGroupId( testApp.testStack, 'sg', "test-sg-id" )

    const logGroup = LogGroup.fromLogGroupName( testApp.testStack, "test-loggroup", "test-loggroup" )

    const testExRole = CaefRole.fromRoleArn( testApp.testStack, "test-role", "arn:test-partition:iam:test-region:test-account:role/test-role" )

    const testTaskDef: TaskDefinition = new TaskDefinition( testApp.testStack, 'testdef', {
        compatibility: Compatibility.EC2_AND_FARGATE,
        cpu: "256",
        memoryMiB: "512",
        executionRole: testExRole
    } )

    new CaefECSContainerDefinition( testApp.testStack, "test-container", {
        naming: testApp.naming,
        logGroup: logGroup,
        streamPrefix: 'test-prefix',
        taskDefinition: testTaskDef,
        image: ContainerImage.fromRegistry( 'public.ecr.aws/amazonlinux/amazonlinux:latest' ),
        memoryLimitMiB: 512
    } )


    const testContstructProps: CaefECSFargateServiceProps = {
        naming: testApp.naming,
        taskDefinition: testTaskDef,
        subnets: [ testSubnet ],
        securityGroups: [ testSG ],
        cluster: testCluster,
        propagateTags: PropagatedTagSource.SERVICE
    }

    new CaefECSFargateService( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'ServiceName', () => {
        template.hasResourceProperties( "AWS::ECS::Service", {
            "ServiceName": "test-org-test-env-test-domain-test-module",
        } )
    } )
    test( 'PlatformVersion', () => {
        template.hasResourceProperties( "AWS::ECS::Service", {
            "PlatformVersion": "LATEST",
        } )
    } )
    test( 'NetworkConfiguration', () => {
        template.hasResourceProperties( "AWS::ECS::Service", {
            "NetworkConfiguration": {
                "AwsvpcConfiguration": {
                    "AssignPublicIp": "DISABLED",
                    "SecurityGroups": [
                        "test-sg-id"
                    ],
                    "Subnets": [
                        "test-subnet-id"
                    ]
                }
            }
        } )
    } )
} )