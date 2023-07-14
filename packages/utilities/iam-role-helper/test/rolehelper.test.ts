/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { CaefRoleHelper, CaefRoleRef } from "../lib";

describe( 'Test RoleHelper', () => {
    test( "Missing references", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        expect( () => {
            testRoleHelper.resolveRoleRef( {
                refId: "testRefId"
            } )
        } ).toThrowError()
    } )

    test( "By Id", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            id: "test-id"
        } )
        expect( resolved.id() ).toBe( "test-id" )
        expect( resolved.arn() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
        expect( resolved.name() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )

    test( "By Arn", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            arn: "test-arn"
        } )
        expect( resolved.id() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
        expect( resolved.arn() ).toBe( "test-arn" )
        expect( resolved.name() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
    test( "By Name", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            name: "test-name"
        } )
        expect( resolved.id() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
        expect( resolved.arn() ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
        expect( resolved.name() ).toBe( "test-name" )
    } )
    test( "Immutability Undefined is False", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            name: "test-name",
            arn: "test-arn",
            id: "test-id",
        } )
        expect( resolved.immutable() ).toBe( false )
    } )
    test( "Immutability False", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            name: "test-name",
            arn: "test-arn",
            id: "test-id",
            immutable: false
        } )
        expect( resolved.immutable() ).toBe( false )
    } )

    test( "Immutability True", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const resolved = testRoleHelper.resolveRoleRef( {
            refId: "testRefId",
            name: "test-name",
            arn: "test-arn",
            id: "test-id",
            immutable: true
        } )
        expect( resolved.immutable() ).toBe( true )
    } )

    test( "resolveRoleRefsWithOrdinals", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const roleRef: CaefRoleRef = {
            name: "test-name",
            arn: "test-arn",
            id: "test-id",
            immutable: true
        }
        const resolved = testRoleHelper.resolveRoleRefsWithOrdinals( [ roleRef ], "testing" )
        expect( resolved ).toHaveLength( 1 )
        expect( resolved[ 0 ].refId() ).toBe( "testing-0" )
        expect( resolved[ 0 ].immutable() ).toBe( true )
    } )

    test( "resolveRoleRefWithRefId", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const roleRef: CaefRoleRef = {
            name: "test-name",
            arn: "test-arn",
            id: "test-id"
        }
        const resolved = testRoleHelper.resolveRoleRefWithRefId( roleRef, "testing" )
        expect( resolved.refId() ).toBe( "testing" )
    } )

    test( "Multiple Resolution", () => {
        const testApp = new CaefTestApp()
        const testRoleHelper = new CaefRoleHelper( testApp.testStack, testApp.naming )
        const roleRefAll = {
            refId: "testingAll",
            name: "test-name",
            arn: "test-arn",
            id: "test-id"
        }
        testRoleHelper.resolveRoleRef( roleRefAll )

        const roleRefName: CaefRoleRef = {
            name: "test-name"
        }
        const resolvedByName = testRoleHelper.resolveRoleRefWithRefId( roleRefName, "testing2" )
        expect( resolvedByName.refId() ).toBe( "testingAll" )

        const roleRefArn: CaefRoleRef = {
            arn: "test-arn"
        }
        const resolvedByArn = testRoleHelper.resolveRoleRefWithRefId( roleRefArn, "testing2" )
        expect( resolvedByArn.refId() ).toBe( "testingAll" )

        const roleRefById: CaefRoleRef = {
            id: "test-id"
        }
        const resolvedById = testRoleHelper.resolveRoleRefWithRefId( roleRefById, "testing2" )
        expect( resolvedById.refId() ).toBe( "testingAll" )
    } )
} )


