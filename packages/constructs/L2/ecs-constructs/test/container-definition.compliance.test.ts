/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { MdaaECSContainerDefinition, MdaaECSContainerDefinitionProps } from '../lib/container-definition';
import { TaskDefinition, Compatibility, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { MdaaRole } from "@aws-mdaa/iam-constructs";

describe( 'MDAA Container Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const logGroup = LogGroup.fromLogGroupName( testApp.testStack, "test-loggroup", "test-loggroup" )

    const testExRole = MdaaRole.fromRoleArn( testApp.testStack, "test-role", "arn:test-partition:iam:test-region:test-account:role/test-role" )

    const testTaskDef: TaskDefinition = new TaskDefinition( testApp.testStack, 'testdef', {
        compatibility: Compatibility.EC2_AND_FARGATE,
        cpu: "256",
        memoryMiB: "512",
        executionRole: testExRole
    } )

    const testContstructProps: MdaaECSContainerDefinitionProps = {
        naming: testApp.naming,
        logGroup: logGroup,
        streamPrefix: 'test-prefix',
        taskDefinition: testTaskDef,
        image: ContainerImage.fromRegistry( 'public.ecr.aws/amazonlinux/amazonlinux:latest' ),
        memoryLimitMiB: 512
    }

    new MdaaECSContainerDefinition( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'Name', () => {
        template.hasResourceProperties( "AWS::ECS::TaskDefinition", {
            ContainerDefinitions: Match.arrayWith( [ Match.objectLike( {
                "Name": "test-org-test-env-test-domain-test-module"
            } ) ] )
        } )
    } )

    test( 'LogConfiguration', () => {
        template.hasResourceProperties( "AWS::ECS::TaskDefinition", {
            ContainerDefinitions: Match.arrayWith( [ Match.objectLike( {
                "LogConfiguration": {
                    "LogDriver": "awslogs",
                    "Options": {
                        "awslogs-group": "test-loggroup",
                        "awslogs-stream-prefix": "test-prefix",
                        "awslogs-region": "test-region"
                    }
                }
            } ) ] )
        } )
    } )
} )