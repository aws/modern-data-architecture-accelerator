/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { NifiL3Construct, NifiL3ConstructProps } from "../lib";
import { NifiClusterOptions } from "../lib/nifi-cluster-options";


describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const clusterOptions: NifiClusterOptions = {
    nodeCount: 1,
    nodeSize: "SMALL",
    initialAdminIdentity: "testing",
    nifiSecurityGroupIngressIPv4s: [
      "10.10.10.0/24"
    ],
    nifiSecurityGroupIngressSGs: [
      "sg-1231242141"
    ],
    additionalEfsIngressSecurityGroupIds: [
      "sg-123124214211"
    ],
    clusterRoleAwsManagedPolicies: [ {
      policyName: "test-aws-policy",
      suppressionReason: "testing1234"
    } ],
    clusterRoleManagedPolicies: [
      "test-managed-policy"
    ]
  }

  const constructProps: NifiL3ConstructProps = {
    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    kmsArn: "arn:test-partition:kms:test-region:test-acct:key/test-key-id",
    nifi: {
      vpcId: "test-vpc-id",
      subnetIds: {
        "test-subnet-1": "test-subnet-id"
      },
      adminRoles: [ {
        id: "testing"
      } ],
      clusters: {
        "test-cluster1": clusterOptions,
        "test-cluster2": {
          ...clusterOptions,
          peerClusters: [ "test-cluster1" ],
          saml: {
            idpMetadataUrl: "testing-url"
          }
        }
      },
      privateCaArn: "private-ca-arn",
      caCertDuration: "12h0m0s",
      caCertRenewBefore: "1h0m0s",
      nodeCertDuration: "12h0m0s",
      nodeCertRenewBefore: "1h0m0s",
      nifiSecurityGroupEgressRules: {
        sg: [ {
          sgId: "sg-123124214",
          protocol: "tcp",
          port: 50
        } ],
        ipv4: [ {
          cidr: "10.10.10.10/32",
          protocol: "tcp",
          port: 50
        } ],
      },
      nifiSecurityGroupIngressIPv4s: [
        "10.10.10.0/24"
      ],
      nifiSecurityGroupIngressSGs: [
        "sg-123124214"
      ],
      eksSecurityGroupIngressRules: {
        sg: [ {
          sgId: "sg-123124214",
          protocol: "tcp",
          port: 50
        } ],
        ipv4: [ {
          cidr: "10.10.10.10/23",
          protocol: "tcp",
          port: 50
        } ],
      },
      additionalEfsIngressSecurityGroupIds: [
        "sg-12312421421"
      ]
    }
  }

  new NifiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )


  console.log( JSON.stringify( template, undefined, 2 ) )

  // test( 'Validate resource counts', () => {
  //   template.resourceCountIs( "AWS::Glue::Job", 1 );
  // } );

} )