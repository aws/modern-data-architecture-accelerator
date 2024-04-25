/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { SecurityGroup,  Vpc } from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { CaefRdsServerlessCluster, CaefRdsServerlessClusterProps } from "../lib";
import {CaefRole} from "@aws-caef/iam-constructs";
import {ServicePrincipal} from "aws-cdk-lib/aws-iam";

describe( 'Aurora MySql: CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testEngine = "aurora-mysql"
    const testEngineVersion= rds.AuroraMysqlEngineVersion.VER_3_04_0
    const testKey = CaefKmsKey.fromKeyArn( testApp.testStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, "test-vpc", {
        vpcId: "test-vpc-id",
        availabilityZones: [ "test-az" ],
        privateSubnetIds: [ "test-subnet-id" ]
    } )
    
    const testSecurityGroup = new SecurityGroup( testApp.testStack, "test-security-group", { vpc: testVpc } )
    const monitoringRole = new CaefRole(testApp.testStack, `aurora-mysql-enhanced-monitoring-role`, {
        naming: testApp.naming,
        roleName: `test-cluster-enhanced-monitoring-role`,
        assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com')
    })

    const testContstructProps: CaefRdsServerlessClusterProps = {
        naming: testApp.naming,
        engine: testEngine,
        monitoringRole,
        engineVersion: testEngineVersion,
        backupRetention: 10,
        clusterIdentifier: "test-cluster",
        masterUsername: "admin",
        encryptionKey: testKey,
        vpc: testVpc,
        securityGroups: [ testSecurityGroup ],
        port: 33060,
    }

    new CaefRdsServerlessCluster( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'DBClusterIdentifier', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "DBClusterIdentifier": testApp.naming.resourceName( 'test-cluster' )
        } )
    } )
    test( 'Is EngineMode serverless', () => {
        template.hasResourceProperties( "AWS::RDS::DBInstance", {
            "DBInstanceClass": "db.serverless"
        } )
    } )

    test( 'Is EngineMode serverless', () => {
        template.hasResourceProperties( "AWS::RDS::DBInstance", {
            "Engine": "aurora-mysql"
        } )
    } )

    test( 'StorageEncrypted', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "StorageEncrypted": true
        } )
    } )

    test( 'KmsKeyId', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "KmsKeyId": testKey.keyArn
        } )
    } )

    test( 'DeletionProtection', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "DeletionProtection": true      
        } )
    } )

    test( 'UpdateReplacePolicy', () => {
        template.hasResource( "AWS::RDS::DBCluster", {
            "UpdateReplacePolicy": "Retain"
        } )
    } );

    test( 'DeletionPolicy', () => {
        template.hasResource( "AWS::RDS::DBCluster", {
            "DeletionPolicy": "Retain"
        } )
    } );
    test( 'SecretRotationSchedule', () => {
        template.hasResourceProperties( "AWS::SecretsManager::RotationSchedule", {
            "RotationLambdaARN": {
                "Fn::GetAtt": [
                  "testconstructRotationSingleUserE1EA2235",
                  "Outputs.RotationLambdaARN"
                ]
              },
            "RotationRules": {
                "ScheduleExpression": "rate(30 days)"
            },
        } )
    } );
    test( 'Port', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "Port": 33060
        } )
    } );
    test( 'EnableCloudwatchLogsExports', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "EnableCloudwatchLogsExports": [ "audit", "error", "general", "slowquery" ]
        } )
    } );
    test( 'BacktrackWindow for Aurora MySql', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "BacktrackWindow": 86400
        } )
    } );
    test( 'BackupRetentionPeriod', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "BackupRetentionPeriod": 10
        } )
    } );
    test( 'Master credentials', () => {
        template.hasResourceProperties( "AWS::RDS::DBCluster", {
            "MasterUsername": {
                "Fn::Join": [
                  "",
                  [
                    "{{resolve:secretsmanager:",
                    {
                      "Ref": "testconstructSecret19491A73"
                    },
                    ":SecretString:username::}}"
                  ]
                ]
              },
              "MasterUserPassword": {
                "Fn::Join": [
                  "",
                  [
                    "{{resolve:secretsmanager:",
                    {
                      "Ref": "testconstructSecret19491A73"
                    },
                    ":SecretString:password::}}"
                  ]
                ]
              }
        } )
    } );
} )