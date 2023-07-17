/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefDataSyncAgent, CaefDataSyncAgentProps } from "../lib";

describe( 'Agent Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const test1ContstructProps: CaefDataSyncAgentProps = {
        naming: testApp.naming,
        activationKey: "ABCD-1234-EFGH-5678-IJKL", //gitleaks:allow
        securityGroupArns: [ "arn:test-partition:ec2:test-region:test-account:security-group/sg-012345abcd6789efg" ],
        subnetArns: [ "arn:test-partition:ec2:test-region:test-account:subnet/subnet-1234abcd" ],
        vpcEndpointId: "vpce-0abcd1234e567890f"
    }
    new CaefDataSyncAgent( testApp.testStack, "test1-construct", test1ContstructProps )

    const test2ContstructProps: CaefDataSyncAgentProps = {
        naming: testApp.naming,
        activationKey: "AAAA-1234-EFGH-5678-IJKL", //gitleaks:allow
        securityGroupArns: [ "arn:test-partition:ec2:test-region:test-account:security-group/sg-012345abcd6789efg" ],
        subnetArns: [ "arn:test-partition:ec2:test-region:test-account:subnet/subnet-1234abcd" ],
        vpcEndpointId: "vpce-0abcd1234e567890f"
    }
    new CaefDataSyncAgent( testApp.testStack, "test2-construct", test2ContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );
    //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    test( 'ActivationKey', () => {
        template.hasResourceProperties( "AWS::DataSync::Agent", {
            "ActivationKey": "ABCD-1234-EFGH-5678-IJKL" //gitleaks:allow
        } )
    } )
    test( 'ActivationKey', () => {
        template.hasResourceProperties( "AWS::DataSync::Agent", {
            "ActivationKey": "AAAA-1234-EFGH-5678-IJKL" //gitleaks:allow
        } )
    } )

    test( 'SecurityGroupArns', () => {
        template.hasResourceProperties( "AWS::DataSync::Agent", {
            "SecurityGroupArns": [ "arn:test-partition:ec2:test-region:test-account:security-group/sg-012345abcd6789efg" ]
        } )
    } )
    test( 'SubnetArns', () => {
        template.hasResourceProperties( "AWS::DataSync::Agent", {
            "SubnetArns": [ "arn:test-partition:ec2:test-region:test-account:subnet/subnet-1234abcd" ]
        } )
    } )
    test( 'VpcEndpointId', () => {
        template.hasResourceProperties( "AWS::DataSync::Agent", {
            "VpcEndpointId": "vpce-0abcd1234e567890f"
        } )
    } )
} )
