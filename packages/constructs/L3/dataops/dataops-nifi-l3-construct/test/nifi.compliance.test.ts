/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { NifiL3Construct, NifiL3ConstructProps } from "../lib";
import { NifiClusterOptions } from "../lib/nifi-options";


describe( 'Nifi Mandatory Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const clusterOptions: NifiClusterOptions = {
    saml: {
      idpMetadataUrl: "testing-url"
    },
    adminIdentities: ["testing"],
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
      },
    }
  }

  new NifiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  // test( 'Validate resource counts', () => {
  //   template.resourceCountIs( "AWS::Glue::Job", 1 );
  // } );

} )

describe( 'Nifi Optional Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const clusterOptions: NifiClusterOptions = {
    saml: {
      idpMetadataUrl: "testing-url"
    },
    nodeCount: 1,
    nodeSize: "SMALL",
    adminIdentities: [
      "testing",
      "testin2"
    ],
    externalNodeIdentities: [
      "test-external-node"
    ],
    identities: [
      "test-user"
    ],
    groups: {"test-group":["test-user"]},
    policies: [{
      resource: "/test",
      action: "READ"
    }],
    authorizations: [{
      policyResourcePattern: ".*",
      actions: ["READ"],
      identities: ["test-user","test-non-user"],
      groups: ["test-group","test-non-group"]  }],
    securityGroupIngressIPv4s: [
      "10.10.10.0/24"
    ],
    securityGroupIngressSGs: [
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
      mgmtInstance: {
        subnetId: "test-subnet-id",
        availabilityZone: "test-az"
      },
      vpcId: "test-vpc-id",
      subnetIds: {
        "test-subnet-1": "test-subnet-id"
      },
      adminRoles: [ {
        id: "testing"
      } ],
      existingPrivateCaArn: "private-ca-arn",
      clusters: {
        "test-cluster1": clusterOptions,
        "test-cluster2": {
          ...clusterOptions,
          nodeCount: undefined,
          clusterPort: undefined,
          remotePort: undefined,
          httpsPort: undefined,
          additionalEfsIngressSecurityGroupIds: undefined,
          peerClusters: [ "test-cluster1" ],

        }
      },
      caCertDuration: "12h0m0s",
      caCertRenewBefore: "1h0m0s",
      nodeCertDuration: "12h0m0s",
      nodeCertRenewBefore: "1h0m0s",
      securityGroupEgressRules: {
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
      securityGroupIngressIPv4s: [
        "10.10.10.0/24"
      ],
      securityGroupIngressSGs: [
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
      ],
    }
  }

  new NifiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  Template.fromStack( testApp.testStack )


  // console.log( JSON.stringify( template, undefined, 2 ) )

  // test( 'Validate resource counts', () => {
  //   template.resourceCountIs( "AWS::Glue::Job", 1 );
  // } );

} )

describe( 'Registry Mandatory Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack



  const constructProps: NifiL3ConstructProps = {
    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    kmsArn: "arn:test-partition:kms:test-region:test-acct:key/test-key-id",
    nifi: {
      registry: {
        adminIdentities: ["tesing-admin"],
      },
      vpcId: "test-vpc-id",
      subnetIds: {
        "test-subnet-1": "test-subnet-id"
      },
      adminRoles: [ {
        id: "testing"
      } ],

    }
  }

  new NifiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  Template.fromStack( testApp.testStack )


  // console.log( JSON.stringify( template, undefined, 2 ) )

  // test( 'Validate resource counts', () => {
  //   template.resourceCountIs( "AWS::Glue::Job", 1 );
  // } );

} )

describe( 'Registry Optional Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack


  const constructProps: NifiL3ConstructProps = {
    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    kmsArn: "arn:test-partition:kms:test-region:test-acct:key/test-key-id",
    nifi: {
      registry: {
        adminIdentities: [
          "tesing-admin",
          "testin2"
        ],
        externalNodeIdentities: [
          "test-external-node"
        ],
        identities: [
          "test-user"
        ],
        groups: {
          "test-group": [ "test-user" ]
        },
        authorizations: [
          {
            policyResourcePattern: ".*",
            actions: [ "READ", "WRITE" ],
            groups: [ "test-group" ],
            identities: [ "test-user" ]
          }
        ],
      },
      vpcId: "test-vpc-id",
      subnetIds: {
        "test-subnet-1": "test-subnet-id"
      },
      adminRoles: [ {
        id: "testing"
      } ],


      existingPrivateCaArn: "private-ca-arn",
      caCertDuration: "12h0m0s",
      caCertRenewBefore: "1h0m0s",
      nodeCertDuration: "12h0m0s",
      nodeCertRenewBefore: "1h0m0s",
      securityGroupEgressRules: {
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
      securityGroupIngressIPv4s: [
        "10.10.10.0/24"
      ],
      securityGroupIngressSGs: [
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
      ],
    }
  }

  new NifiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  Template.fromStack( testApp.testStack )


  // console.log( JSON.stringify( template, undefined, 2 ) )

  // test( 'Validate resource counts', () => {
  //   template.resourceCountIs( "AWS::Glue::Job", 1 );
  // } );

} )