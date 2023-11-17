/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from "aws-cdk-lib"
// nosemgrep
import path = require( "path" )
import { CaefConfigRefValueTransformer, CaefConfigSSMValueTransformer, CaefConfigTransformer, ConfigConfigPathValueTransformer, CaefServiceCatalogProductConfig, ICaefConfigValueTransformer, CaefConfigParamRefValueTransformer } from "../lib"

class TestKeyTransformer implements ICaefConfigValueTransformer {
    public transformValue ( value: string, contextPath?: string | undefined ): string {
        console.log( `Transforming ${ contextPath }:${ value } -> "transformedValue"` )
        return "transformedKey"
    }
}

class TestValueTransformer implements ICaefConfigValueTransformer {
    public transformValue ( value: string, contextPath?: string | undefined ): string {
        console.log( `Transforming ${ contextPath }:${ value } -> "transformedValue"` )
        return "transformedValue"
    }
}
describe( 'Test CaefConfigKeyTransformer', () => {

    describe( 'Test transformConfigObject', () => {
        const testConfigObj = {
            testString: "testing"
        }
        const transformedConfig = new CaefConfigTransformer( new TestValueTransformer(), new TestKeyTransformer() ).transformConfig( testConfigObj )

        test( 'String Transformation', () => {
            expect( transformedConfig[ "transformedKey" ] ).toBe( "transformedValue" )
        } )
    } )
} )
describe( 'Test CaefConfigValueTransformer', () => {

    describe( 'Test transformConfigObject', () => {
        const testConfigObj = {
            testString: "testing",
            testNumber: 123,
            testObj: {
                testObjString: "testing",
            },
            testArray: [
                "testing1",
                "testing2"
            ]
        }
        const transformedConfig = new CaefConfigTransformer( new TestValueTransformer() ).transformConfig( testConfigObj )

        test( 'String Transformation', () => {
            expect( transformedConfig[ "testString" ] ).toBe( "transformedValue" )
        } )
        test( 'Number Transformation', () => {
            expect( transformedConfig[ "testNumber" ] ).toBe( 123 )
        } )
        test( 'Child Object String Transformation', () => {
            expect( transformedConfig[ "testObj" ][ "testObjString" ] ).toBe( "transformedValue" )
        } )
        test( 'Child Array String Transformation', () => {
            expect( transformedConfig[ "testArray" ][ 0 ] ).toBe( "transformedValue" )
            expect( transformedConfig[ "testArray" ][ 1 ] ).toBe( "transformedValue" )
        } )
    } )

    describe( 'Test transformConfigArray', () => {
        const testArray = [
            "testing1",
            "testing2",
            {
                testingobj: "testingobjvalue"
            },
            [
                "testingchild1",
                "testingchild2"
            ],
            123
        ]
        const transformedConfig = new CaefConfigTransformer( new TestValueTransformer() ).transformConfigArray( "/", testArray, )
        describe( 'Array String Transformation', () => {
            test( 'Array String values', () => {
                expect( transformedConfig[ 0 ] ).toBe( "transformedValue" )
                expect( transformedConfig[ 1 ] ).toBe( "transformedValue" )
            } )
            test( 'Array child object values', () => {
                expect( transformedConfig[ 2 ][ 'testingobj' ] ).toBe( "transformedValue" )
            } )
            test( 'Array child array values', () => {
                expect( transformedConfig[ 3 ][ 0 ] ).toBe( "transformedValue" )
                expect( transformedConfig[ 3 ][ 1 ] ).toBe( "transformedValue" )
            } )
            test( 'Array number values', () => {
                expect( transformedConfig[ 4 ] ).toBe( 123 )
            } )
        } )
    } )
} )
describe( 'Test CaefConfigRefValueTransformer', () => {
    const testContextObj = {
        "testingkey": "testingobjval"
    }
    const testContextList = [ "val1", "val2", "val3" ]
    const context = {
        org: "testorg",
        domain: "testdomain",
        env: "testenv",
        module_name: "testmodule",
        test_context_obj: `obj:${ JSON.stringify( JSON.stringify( testContextObj ) ) }`,
        test_context_name: "test_context_value",
        test_context_list: `list:${ JSON.stringify( JSON.stringify( testContextList ) ) }`
    }
    const testApp = new App( { context: context } )
    const testStack = new Stack( testApp, "testStack" )

    const serviceCatalogConfig: CaefServiceCatalogProductConfig = {
        portfolio_arn: "dummy-portfolio-arn",
        owner: "owner",
        name: "test product name",
        launch_role_name: "dummy-launch-role",
        parameters: {
            number_param: {
                props: {
                    "type": "Number",
                    "description": "Sample number parameter",
                    "default": 10
                }
            },
            string_param: {
                props: {
                    "type": "String",
                    "description": "Sample string parameter",
                    "default": "default_string"
                }
            },
            list_param: {
                props: {
                    "type": "CommaDelimitedList",
                    "description": "Sample list parameter",
                    "default": "sample,list,of,strings"
                }
            }
        }
    }
    test( 'Nested', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "testing{{resolve:ssm:/{{org}}/{{domain}}/{{env}}/{{module_name}}}}testing" )
        expect( transformedValue ).toMatch( /testing\${Token\[TOKEN.\d+\]}testing/ )
    } )
    test( 'MultiRef', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "multi-{{org}}-{{domain}}-{{env}}" )
        expect( transformedValue ).toBe( "multi-testorg-testdomain-testenv" )
    } )
    test( 'No Ref', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "noref" )
        expect( transformedValue ).toBe( "noref" )
    } )

    test( 'Env Var', () => {
        process.env[ 'TEST_VAR' ] = "testval"
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{env_var:TEST_VAR}}" )
        expect( transformedValue ).toBe( "testval" )
    } )

    test( 'MissingContext', () => {
        expect( () => new CaefConfigRefValueTransformer( testStack ).transformValue( "{{context:missing}}" ) ).toThrow()
    } )

    test( 'Context Obj', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{context:test_context_obj}}" )
        console.log( transformedValue )
    } )

    test( 'Context List', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{context:test_context_list}}" )
        console.log( transformedValue )
    } )

    test( 'Resolve ssm ref', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "testing{{resolve:ssm:/test/param/path}}testing" )
        expect( transformedValue ).toMatch( /testing\${Token\[TOKEN.\d+\]}testing/ )
    } )
    test( 'Resolve ssm non ref', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "testing{{resolve:nonssm}}testing" )
        expect( transformedValue ).toBe( "testing{{resolve:nonssm}}testing" )
    } )
    test( 'Context', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "testing{{context:test_context_name}}testing" )
        expect( transformedValue ).toBe( "testingtest_context_valuetesting" )
    } )
    test( 'ContextOrg', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "testing{{context:org}}testing" )
        expect( transformedValue ).toBe( "testingtestorgtesting" )
    } )
    test( 'OrgRef', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{org}}" )
        expect( transformedValue ).toBe( "testorg" )
    } )
    test( 'Param', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "{{param:paramname}}" )
        expect( transformedValue ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
    test( 'ParamNotInServiceCatalogConfig', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack, serviceCatalogConfig ).transformValue( "{{param:parameter_not_in_sc_config}}" )
        expect( transformedValue ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
    test( 'StringParamInServiceCatalogConfig', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack, serviceCatalogConfig ).transformValue( "{{param:string_param}}" )
        expect( transformedValue ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
    test( 'NumberParamInServiceCatalogConfig', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack, serviceCatalogConfig ).transformValue( "{{param:number_param}}" )
        expect( typeof transformedValue ).toBe( 'number' )
    } )
    test( 'ListParamInServiceCatalogConfig', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack, serviceCatalogConfig ).transformValue( "{{param:list_param}}" )
        expect( transformedValue ).toMatch( /\#{Token\[TOKEN.\d+\]}/ )
    } )
    test( 'StringParamAnnotation', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "{{param:string:string_param}}" )
        expect( transformedValue ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
    test( 'NumberParamAnnotation', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "{{param:number:number_param}}" )
        expect( typeof transformedValue ).toBe( 'number' )
    } )
    test( 'ListParamAnnotation', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "{{param:list:list_param}}" )
        expect( transformedValue ).toMatch( /\#{Token\[TOKEN.\d+\]}/ )
    } )
    test( 'PrefixedNumberParam', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "testing{{param:number:number_param}}" )
        expect( transformedValue ).toMatch( /^testing-\d+(\.\d+)?(e\+\d+)?$/ )
    } )
    test( 'PrefixedListParam', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "testing{{param:list:list_param}}" )
        expect( transformedValue ).toMatch( /testing\#{Token\[TOKEN.\d+\]}/ )
    } )
    test( 'NestedResolutionWithinNumberParam', () => {
        const transformedValue = new CaefConfigParamRefValueTransformer( testStack ).transformValue( "{{param:number:{{org}}_param}}" )
        expect( typeof transformedValue ).toBe( 'number' )
    } )

    test( 'Partition', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{partition}}" )
        expect( transformedValue ).toMatch( /\${Token\[AWS.Partition.\d+\]}/ )
    } )
    test( 'Region', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{region}}" )
        expect( transformedValue ).toMatch( /\${Token\[AWS.Region.\d+\]}/ )
    } )

    test( 'Account', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{account}}" )
        expect( transformedValue ).toMatch( /\${Token\[AWS.AccountId.\d+\]}/ )
    } )
    test( 'Module Name', () => {
        const transformedValue = new CaefConfigRefValueTransformer( testStack ).transformValue( "{{module_name}}" )
        expect( transformedValue ).toBe( "testmodule" )
    } )

} )

describe( 'Test CaefConfigSSMValueTransformer', () => {
    test( 'Non ssm:', () => {
        const transformedValue = new CaefConfigSSMValueTransformer().transformValue( "testvalue", "testPath" )
        expect( transformedValue ).toBe( "testvalue" )
    } )
    test( 'Naked ssm:', () => {
        const transformedValue = new CaefConfigSSMValueTransformer().transformValue( "ssm:testSSMParamPath", "testPath" )
        expect( transformedValue ).toBe( "{{resolve:ssm:testSSMParamPath}}" )
    } )
    test( 'Ignored SSM: Action', () => {
        const transformedValue = new CaefConfigSSMValueTransformer().transformValue( "ssm:GetParameter", "policyDocument/Statement/Action" )
        expect( transformedValue ).toBe( "ssm:GetParameter" )
    } )
} )
describe( 'Test ConfigConfigPathValueTransformer', () => {
    test( 'Non relative', () => {
        const transformedValue = new ConfigConfigPathValueTransformer( "testBaseDir" ).transformValue( "testNonRelative" )
        expect( transformedValue ).toBe( "testNonRelative" )
    } )
    test( 'Relative', () => {
        const transformedValue = new ConfigConfigPathValueTransformer( "testBaseDir" ).transformValue( "./relative" )
        expect( transformedValue ).toBe( path.resolve( "./relative".replace( /^\./, "testBaseDir" ) ) )
    } )
} )


