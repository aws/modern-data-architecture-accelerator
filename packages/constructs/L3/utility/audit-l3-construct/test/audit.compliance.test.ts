/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { AuditL3Construct, AuditL3ConstructProps } from "../lib";



describe( 'CAEF Compliance Stack Tests', () => {

    const testApp = new CaefTestApp()
    const stack = testApp.testStack


    const constructProps: AuditL3ConstructProps = {
        roleHelper: new CaefRoleHelper( stack, testApp.naming ),
        naming: testApp.naming,
        sourceAccounts: [],
        sourceRegions: [],
        readRoleRefs: [],
        inventoryPrefix: "inventory"
    }

    new AuditL3Construct( stack, "teststack", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )


    console.log( JSON.stringify( template, undefined, 2 ) )




} )
