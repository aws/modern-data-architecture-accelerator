/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CaefECSContainerDefinition, CaefECSContainerDefinitionProps } from '../lib/container-definition';
import { TaskDefinition, Compatibility, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { CaefRole } from "@aws-caef/iam-constructs";

describe( 'CAEF Container Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const logGroup = LogGroup.fromLogGroupName( testApp.testStack, "test-loggroup", "test-loggroup" )

    const testExRole = CaefRole.fromRoleArn( testApp.testStack, "test-role", "arn:test-partition:iam:test-region:test-account:role/test-role" )

    const testTaskDef: TaskDefinition = new TaskDefinition( testApp.testStack, 'testdef', {
        compatibility: Compatibility.EC2_AND_FARGATE,
        cpu: "256",
        memoryMiB: "512",
        executionRole: testExRole
    } )

    const testContstructProps: CaefECSContainerDefinitionProps = {
        naming: testApp.naming,
        logGroup: logGroup,
        streamPrefix: 'test-prefix',
        taskDefinition: testTaskDef,
        image: ContainerImage.fromRegistry( 'public.ecr.aws/amazonlinux/amazonlinux:latest' ),
        memoryLimitMiB: 512
    }

    new CaefECSContainerDefinition( testApp.testStack, "test-construct", testContstructProps )

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