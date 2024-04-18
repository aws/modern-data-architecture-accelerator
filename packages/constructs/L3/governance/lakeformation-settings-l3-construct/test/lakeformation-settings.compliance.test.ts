/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefRoleHelper, CaefRoleRef } from "@aws-caef/iam-role-helper";

import { LakeFormationSettingsL3ConstructProps, LakeFormationSettingsL3Construct } from "../lib";

describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const lakeFormationAccessControlConfigParser: CaefRoleRef = {
    id: "test-role-access-control",
    arn: "arn:test-partition:iam::test-account:role/TestAccess"
  }

  const constructProps: LakeFormationSettingsL3ConstructProps = {
    lakeFormationAdminRoleRefs: [ lakeFormationAccessControlConfigParser ],


    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    iamAllowedPrincipalsDefault: true
  };

  new LakeFormationSettingsL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test( 'LakeFormationSettings', () => {
    template.hasResourceProperties( "Custom::lakeformation-settings", {
      "account": "test-account",
      "dataLakeSettings": {
        "DataLakeAdmins": [
          {
            "DataLakePrincipalIdentifier": "arn:test-partition:iam::test-account:role/TestAccess"
          }
        ],
        "CreateDatabaseDefaultPermissions": [
          {
            "Principal": {
              "DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"
            },
            "Permissions": [
              "ALL"
            ]
          }
        ],
        "CreateTableDefaultPermissions": [
          {
            "Principal": {
              "DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"
            },
            "Permissions": [
              "ALL"
            ]
          }
        ],
        "Parameters": {
          "CROSS_ACCOUNT_VERSION": "3"
        }
      }
    } )
  } )
} )
