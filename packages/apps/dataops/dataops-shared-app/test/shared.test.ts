/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from "@aws-caef/app";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";
import { CaefDataOpsConfigContents, CaefDataOpsConfigParser } from "../lib"
import { CaefTestApp } from "@aws-caef/testing";


describe( 'Dataops Shared Config Parser Testing', () => {
    interface TestConfigContents extends CaefDataOpsConfigContents {
        testing: string
    }

    class TestDataOpsConfigParser extends CaefDataOpsConfigParser<TestConfigContents> {

        constructor( stack: Stack, props: CaefAppConfigParserProps, configSchema: Schema ) {
            super( stack, props, configSchema )
        }
    }
    const testApp = new CaefTestApp()
    const testStack = new Stack( testApp, "testStack" )
    const parserProps: CaefAppConfigParserProps = {
        org: "test-org",
        domain: "test-domain",
        environment: "test-env",
        module_name: "test-module",
        rawConfig: {
            testing_ssm: "ssm:some-ssm-path",
            testing: "some-value"
        },
        naming: testApp.naming
    }
    test( 'Constructor', () => {
        expect( () => {
            new TestDataOpsConfigParser( testStack, parserProps, {} )
        } ).not.toThrow()
    } )

} );

