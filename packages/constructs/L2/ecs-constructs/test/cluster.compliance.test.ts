/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { MdaaECSCluster, MdaaECSClusterProps } from '../lib';


describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, 'VPC', {
        vpcId: 'test-vpc-id',
        availabilityZones: [ 'az1', 'az2' ],
        privateSubnetIds: [ 'subnet1', 'subnet2' ],
    } );

    const testKmsKey = MdaaKmsKey.fromKeyArn( testApp.testStack, 'test-key', "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const logGroup = LogGroup.fromLogGroupName( testApp.testStack, "test-loggroup", "test-loggroup" )

    const testContstructProps: MdaaECSClusterProps = {
        naming: testApp.naming,
        vpc: testVpc,
        kmsKey: testKmsKey,
        logGroup: logGroup
    }

    new MdaaECSCluster( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'ClusterName', () => {
        template.hasResourceProperties( "AWS::ECS::Cluster", {
            "ClusterName": "test-org-test-env-test-domain-test-module",
        } )
    } )

    test( 'ClusterSettings', () => {
        template.hasResourceProperties( "AWS::ECS::Cluster", {
            "ClusterSettings": [
                {
                    "Name": "containerInsights",
                    "Value": "enabled"
                }
            ],
        } )
    } )

    test( 'ExecuteCommandConfiguration', () => {
        template.hasResourceProperties( "AWS::ECS::Cluster", {
            "Configuration": {
                "ExecuteCommandConfiguration": {
                    "KmsKeyId": "arn:test-partition:kms:test-region:test-account:key/test-key",
                    "LogConfiguration": {
                        "CloudWatchEncryptionEnabled": true,
                        "CloudWatchLogGroupName": "test-loggroup"
                    },
                    "Logging": "OVERRIDE"
                }
            }
        } )
    } )

} )