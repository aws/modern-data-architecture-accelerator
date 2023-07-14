/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template } from "aws-cdk-lib/assertions";
import { CaefTestApp } from "@aws-caef/testing";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { GlueCatalogL3Construct, GlueCatalogL3ConstructProps, CatalogAccessPolicyProps } from '../lib/glue-catalog-l3-construct';

describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()

  const catalogAccessPolicyProps: CatalogAccessPolicyProps = {
    resources: [ 'test-resource-1' ],
    readPrincipalArns: [ 'arn:test-partition:iam::test-account:testread' ],
    writePrincipalArns: [ 'arn:test-partition:iam::test-account:testwrite' ]
  }

  const constructProps: GlueCatalogL3ConstructProps = {


    roleHelper: new CaefRoleHelper( testApp.testStack, testApp.naming ),
    naming: testApp.naming,
    accessPolicies: { [ 'test-access-policy' ]: catalogAccessPolicyProps },
    consumerAccounts: { 'id': 'test1' },
    producerAccounts: { 'id': 'test2' }
  };

  new GlueCatalogL3Construct( testApp.testStack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )


  //console.log(JSON.stringify(template,undefined,2))

  test( 'GlueCatalogSettings', () => {
    template.hasResourceProperties( "AWS::Glue::DataCatalogEncryptionSettings", {
      "CatalogId": "test-account",
      "DataCatalogEncryptionSettings": {
        "ConnectionPasswordEncryption": {
          "KmsKeyId": {
            "Fn::GetAtt": [
              "kmscmkF9184590",
              "Arn"
            ]
          },
          "ReturnConnectionPasswordEncrypted": true
        },
        "EncryptionAtRest": {
          "CatalogEncryptionMode": "SSE-KMS",
          "SseAwsKmsKeyId": {
            "Fn::GetAtt": [
              "kmscmkF9184590",
              "Arn"
            ]
          }
        }
      }
    } )
  } );

} )
