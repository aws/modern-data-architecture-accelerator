/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { ClusterSubnetGroup } from "@aws-cdk/aws-redshift-alpha";
import { SecurityGroup, Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { MdaaRedshiftCluster, MdaaRedshiftClusterParameterGroup, MdaaRedshiftClusterProps } from "../lib";

describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()


    const testKey = MdaaKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, "test-vpc", {
        vpcId: "test-vpc-id",
        availabilityZones: [ "test-az" ],
        privateSubnetIds: [ "test-subnet-id" ]
    } )
    const testSubnetGroup = new ClusterSubnetGroup( testApp.testStack, "test-subnet-group", {
        vpc: testVpc, description: "test-vpc-description", vpcSubnets: {
            subnets: [ Subnet.fromSubnetId( testApp.testStack, "test-subnet-id", "test-subnet-id" ) ]
        }
    } )
    const testSecurityGroup = new SecurityGroup( testApp.testStack, "test-security-group", { vpc: testVpc } )

    const testParameterGroup = new MdaaRedshiftClusterParameterGroup( testApp.testStack, "test-param-group", {
        naming: testApp.naming,
        parameters: {

        }
    } )
    const testLoggingBucket = Bucket.fromBucketName( testApp.testStack, "test-logging-bucket", "test-logging-bucket" )

    const testContstructProps: MdaaRedshiftClusterProps = {
        naming: testApp.naming,
        clusterName: "test-cluster",
        masterUsername: "admin",
        encryptionKey: testKey,
        port: 54390,
        vpc: testVpc,
        preferredMaintenanceWindow: "Sun:23:45-Mon:00:15",
        subnetGroup: testSubnetGroup,
        securityGroup: testSecurityGroup,
        parameterGroup: testParameterGroup,
        adminPasswordRotationDays: 30,
        loggingProperties: {
            loggingBucket: testLoggingBucket,
            loggingKeyPrefix: "/testing"
        }
    }

    new MdaaRedshiftCluster( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    //console.log( JSON.stringify( template, undefined, 2 ) )
    test( 'ClusterIdentifier', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "ClusterIdentifier": testApp.naming.resourceName( 'test-cluster' )
        } )
    } )

    test( 'Encrypted', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "Encrypted": true
        } )
    } )

    test( 'KmsKeyId', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "KmsKeyId": testKey.keyId
        } )
    } )

    test( 'EnhancedVpcRouting', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "EnhancedVpcRouting": true
        } )
    } )

    test( 'Port', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "Port": 54390
        } )
    } )

    test( 'PreferredMaintenanceWindow', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "PreferredMaintenanceWindow": "Sun:23:45-Mon:00:15"
        } )
    } )

    test( 'PubliclyAccessible', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "PubliclyAccessible": false
        } )
    } )

    test( 'UpdateReplacePolicy', () => {
        template.hasResource( "AWS::Redshift::Cluster", {
            "UpdateReplacePolicy": "Retain"
        } )
    } );

    test( 'DeletionPolicy', () => {
        template.hasResource( "AWS::Redshift::Cluster", {
            "DeletionPolicy": "Retain"
        } )
    } );

    test( 'LoggingProperties', () => {
        template.hasResourceProperties( "AWS::Redshift::Cluster", {
            "LoggingProperties": {
                "BucketName": "test-logging-bucket",
                "S3KeyPrefix": "/testing"
            }
        } )
    } );
} )