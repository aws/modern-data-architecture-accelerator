/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaEKSCluster, MdaaEKSClusterProps, KubernetesCmd } from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Role } from 'aws-cdk-lib/aws-iam';
import { CompliantKubectlProvider } from '../lib/mdaa-kubectl-provider';
import * as cdk8s from 'cdk8s';

describe( 'MDAA Construct Compliance Tests', () => {
    const testApp = new MdaaTestApp()

    const testAdminRole = Role.fromRoleName( testApp.testStack, `admin-role`, "test-admin-role" )

    const testVpc = Vpc.fromVpcAttributes( testApp.testStack, 'VPC', {
        vpcId: 'test-vpc-id',
        availabilityZones: [ 'az1', 'az2' ],
        privateSubnetIds: [ 'subnet1', 'subnet2' ],
    } );

    const testKmsKey = MdaaKmsKey.fromKeyArn( testApp.testStack, 'test-key', "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const testSubnet = Subnet.fromSubnetId( testApp.testStack, 'subnet', "test-subnet-id" )
    const testSG = SecurityGroup.fromSecurityGroupId( testApp.testStack, 'sg', "test-sg-id" )

    const testContstructProps: MdaaEKSClusterProps = {
        adminRoles: [ testAdminRole ],
        naming: testApp.naming,
        vpc: testVpc,
        subnets: [ testSubnet ],
        kmsKey: testKmsKey,
        version: KubernetesVersion.V1_26,
        mgmtInstance: {
            subnetId: "test-subnet-id",
            availabilityZone: "test-az"
        },
    }

    const eksCluster = new MdaaEKSCluster( testApp.testStack, "test-construct", testContstructProps )

    eksCluster.addNamespace( new cdk8s.App(), 'test-namespace', 'test-namespace', testSG )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test( 'ClusterName', () => {
        template.hasResourceProperties( "Custom::AWSCDK-EKS-Cluster", {
            Config: Match.objectLike( {
                "name": "test-org-test-env-test-domain-test-module",
            } )
        } )
    } )
    test( 'encryptionConfig', () => {
        template.hasResourceProperties( "Custom::AWSCDK-EKS-Cluster", {
            Config: Match.objectLike( {
                "encryptionConfig": [
                    {
                        "provider": {
                            "keyArn": "arn:test-partition:kms:test-region:test-account:key/test-key"
                        },
                        "resources": [
                            "secrets"
                        ]
                    }
                ]
            } )
        } )
    } )
    test( 'endpointPublicAccess', () => {
        template.hasResourceProperties( "Custom::AWSCDK-EKS-Cluster", {
            Config: Match.objectLike( {
                "resourcesVpcConfig": Match.objectLike( {
                    "endpointPublicAccess": false,
                    "endpointPrivateAccess": true
                } )
            } )
        } )
    } )
    test( 'logging', () => {
        template.hasResourceProperties( "Custom::AWSCDK-EKS-Cluster", {
            Config: Match.objectLike( {
                "logging": {
                    "clusterLogging": [
                        {
                            "enabled": true,
                            "types": [
                                "api",
                                "audit",
                                "authenticator",
                                "controllerManager",
                                "scheduler"
                            ]
                        }
                    ]
                }
            } )
        } )
    } )
    describe( 'MDAA KubeCtlProvider Tests', () => {
        const importedEksCluster = MdaaEKSCluster.fromClusterAttributes( testApp.testStack, "imported=cluster", {
            clusterName: "imported-cluster",
            kubectlRoleArn: "arn:test-partition:iam::test-account:role/test-role"
        } )
        test( 'KubeCtlProvider Methods', () => {
            expect( () => CompliantKubectlProvider.getOrCreate( testApp.testStack, eksCluster ) ).not.toThrow()
            expect( () => CompliantKubectlProvider.getOrCreate( testApp.testStack, importedEksCluster ) ).not.toThrow()
            expect( () => CompliantKubectlProvider.fromKubectlProviderAttributes( testApp.testStack, 'test-kubectl-from-attrs', {
                functionArn: "test-function-arn",
                kubectlRoleArn: "arn:test-partition:iam::test-account:role/test-role",
                handlerRole: Role.fromRoleName( testApp.testStack, "test-handler-role", "test-handler-role" )
            } ) ).not.toThrow()
        } )
        test( 'KubeCmd', () => {
            new KubernetesCmd( testApp.testStack, 'kube-cmd', {
                cluster: eksCluster,
                cmd: [ 'get', 'pods' ]
            } )
        } )
    } )

} )