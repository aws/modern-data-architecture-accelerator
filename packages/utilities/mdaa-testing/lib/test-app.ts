/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDefaultResourceNaming } from "@aws-mdaa/naming"
import { App, Aspects, Stack } from "aws-cdk-lib"
import { Annotations, Match } from "aws-cdk-lib/assertions"
import { ManagedPolicy, PolicyDocument, PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Fact, FactName, IFact } from "aws-cdk-lib/region-info"
import { AwsSolutionsChecks, HIPAASecurityChecks, NIST80053R5Checks } from "cdk-nag"

export class MdaaTestApp extends App {

    public readonly naming: MdaaDefaultResourceNaming
    public readonly testStack: Stack

    private static createContext ( testContext: { [ key: string ]: string } ) {
        return {
            ...{
                '@aws-cdk/core:enablePartitionLiterals': true,
                org: "test-org",
                env: "test-env",
                domain: "test-domain",
                moduleName: "test-module"
            }, ...testContext
        }
    }

    constructor( testContext: { [ key: string ]: string } = {} ) {
        super( {
            context: MdaaTestApp.createContext( testContext )
        } )

        Aspects.of( this ).add( new AwsSolutionsChecks( { verbose: true, logIgnores: false } ) )
        Aspects.of( this ).add( new NIST80053R5Checks( { verbose: true, logIgnores: false } ) )
        Aspects.of( this ).add( new HIPAASecurityChecks( { verbose: true, logIgnores: false } ) )
        const namingProps = {
            ...{
                cdkNode: this.node
            }, ...MdaaTestApp.createContext( testContext )
        }
        this.naming = new MdaaDefaultResourceNaming( namingProps )
        Fact.register( new TestRegionFact(), true )
        this.testStack = new Stack( this, "testing", {
            env: {
                region: "test-region",
                account: "test-account"
            }
        } )
    }

    public checkCdkNagCompliance ( stack: Stack ) {
        describe( 'MDAA CDK Nag Compliance Tests', () => {

            test( `No unsuppressed CDK Nags`, () => {
                const annotations = Annotations.fromStack( stack )
                const errors = annotations.findError(
                    '*',
                    Match.stringLikeRegexp( 'AwsSolutions.*|HIPAA.*|NIST.*' )
                );
                //Expect our Managed Policy to trigger 6 errors
                if ( errors.length > 0 ) console.log( errors )
                expect( errors ).toHaveLength( 0 );
            } );

            test( `CDK Nag Active`, () => {
                // Add a resource which should trigger Nags. Ensures
                // CDK Nag is active.
                const testStack = new Stack( this, `testing-cdk-active-${ stack.node.id }` )
                new ManagedPolicy( testStack, "cdk-nag-test", {
                    document: new PolicyDocument( {
                        statements: [
                            new PolicyStatement( {
                                resources: [ "*" ],
                                actions: [ "*" ]
                            } )
                        ]
                    } )
                } )
                const annotations = Annotations.fromStack( testStack )
                const errors = annotations.findError(
                    '*',
                    Match.stringLikeRegexp( 'AwsSolutions.*|HIPAA.*|NIST.*' )
                );
                //Expect our Managed Policy to trigger 6 errors
                if ( errors.length != 6 ) console.log( errors )
                expect( errors ).toHaveLength( 6 );
            } );
        } )
    }
}

class TestRegionFact implements IFact {
    public readonly region = 'test-region';
    public readonly name = FactName.PARTITION;
    public readonly value = 'test-partition';
}