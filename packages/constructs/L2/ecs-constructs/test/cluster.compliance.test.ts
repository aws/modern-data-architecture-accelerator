/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CaefECSCluster, CaefECSClusterProps } from '../lib';


describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, 'VPC', {
        vpcId: 'test-vpc-id',
        availabilityZones: [ 'az1', 'az2' ],
        privateSubnetIds: [ 'subnet1', 'subnet2' ],
    } );

    const testKmsKey = CaefKmsKey.fromKeyArn( testApp.testStack, 'key for root volume', "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const logGroup = LogGroup.fromLogGroupName( testApp.testStack, "test-loggroup", "test-loggroup" )

    const testContstructProps: CaefECSClusterProps = {
        naming: testApp.naming,
        vpc: testVpc,
        kmsKey: testKmsKey,
        logGroup: logGroup
    }

    new CaefECSCluster( testApp.testStack, "test-construct", testContstructProps )

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