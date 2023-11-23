/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefReplicationInstance, CaefReplicationInstanceProps } from "../lib";
import { CfnReplicationSubnetGroup } from "aws-cdk-lib/aws-dms";
import { Key } from "aws-cdk-lib/aws-kms";


describe( 'Replication Instance Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const subnetGroup = new CfnReplicationSubnetGroup(testApp.testStack,'test-subnet-group', {
        replicationSubnetGroupIdentifier: "testing",
        replicationSubnetGroupDescription: "testing",
        subnetIds: [
            "test-subnet1"
        ]
    })
    const testKey = Key.fromKeyArn( testApp.testStack, "testKey", "arn:test-partition:kms:test-region:test-account:key/test-key" )
    const replicationInstanceProps: CaefReplicationInstanceProps = {
        kmsKey: testKey,
        replicationInstanceClass: "dms.t2.micro",
        naming: testApp.naming,
        replicationSubnetGroupIdentifier: subnetGroup.attrId
    }

    new CaefReplicationInstance(testApp.testStack,'test-rep-isntance',replicationInstanceProps)
   
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );
    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )


    test( 'Replication Instance ID', () => {
        template.hasResourceProperties( "AWS::DMS::ReplicationInstance", {
            "ReplicationInstanceIdentifier": "test-org-test-env-test-domain-test-module"
        } )
    } )

    test( 'Kms Key Id', () => {
        template.hasResourceProperties( "AWS::DMS::ReplicationInstance", {
            "KmsKeyId": "test-key"
        } )
    } )
    
    test( 'Non-Publicly Accessible', () => {
        template.hasResourceProperties( "AWS::DMS::ReplicationInstance", {
            "PubliclyAccessible": false
        } )
    } )
} )

