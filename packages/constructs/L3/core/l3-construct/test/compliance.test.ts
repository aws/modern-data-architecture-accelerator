/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Construct } from "constructs";
import { CaefL3Construct, CaefL3ConstructProps } from "../lib";
// nosemgrep
import path = require( "path" );
import { Stack } from "aws-cdk-lib";

interface TestL3ConstructProps extends CaefL3ConstructProps {

}

class TestL3Construct extends CaefL3Construct {
    constructor( scope: Construct, id: string, props: TestL3ConstructProps ) {
        super( scope, id, props )
        this.getCrossAccountStack( '1231241242' )
    }
}

describe( 'CAEF Compliance Stack Tests', () => {
    const testApp = new CaefTestApp()

    const constructProps: TestL3ConstructProps = {
        naming: testApp.naming,

        roleHelper: new CaefRoleHelper( testApp.testStack, testApp.naming, path.dirname( require.resolve( "@aws-caef/iam-role-helper/package.json" ) ) ),
        crossAccountStacks: { '1231241242': new Stack( testApp, 'testing-cross-account' ) }
    }

    new TestL3Construct( testApp.testStack, 'test-stack', constructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    Template.fromStack( testApp.testStack )

} )
