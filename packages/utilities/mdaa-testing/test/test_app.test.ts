/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "../lib"

describe( 'Test App', () => {
    const testApp = new MdaaTestApp()
    test( "testStack", () => {
        expect( testApp.testStack ).toBeDefined
    } )
    describe( "CDK Nag", () => {
        expect( () => { testApp.checkCdkNagCompliance( testApp.testStack ) } ).not.toThrow()
    } )
} )