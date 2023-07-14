/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "../lib"

describe( 'Test App', () => {
    const testApp = new CaefTestApp()
    test( "testStack", () => {
        expect( testApp.testStack ).toBeDefined
    } )
    describe( "CDK Nag", () => {
        expect( () => { testApp.checkCdkNagCompliance( testApp.testStack ) } ).not.toThrow()
    } )
} )