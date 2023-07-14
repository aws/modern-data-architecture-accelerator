/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps } from "@aws-caef/construct";
import { CaefLambdaFunction, CaefLambdaRole } from "@aws-caef/lambda-constructs";
import { CustomResource, CustomResourceProps, Duration, Stack } from "aws-cdk-lib";
import { Policy, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Code, ILayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";
import { NagPackSuppression, NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
const _ = require( 'lodash' );

export interface CaefCustomResourceProps extends CaefConstructProps {
    readonly resourceType: string
    readonly code: Code
    readonly runtime: Runtime
    readonly handler: string
    readonly handlerRolePolicyStatements: PolicyStatement[],
    readonly handlerPolicySuppressions?: NagPackSuppression[]
    readonly handlerProps: { [ key: string ]: any }
    readonly handlerLayers?: ILayerVersion[]
    readonly pascalCaseProperties?: boolean
    readonly handlerTimeout?: Duration
}

export class CaefCustomResource extends CustomResource {


    private static setProps ( scope: Construct, props: CaefCustomResourceProps ) {
        const stack = Stack.of( scope );

        const handlerFunctionName = props.naming.resourceName( `${ props.resourceType }-handler`, 64 )
        const handlerRoleResourceId = `custom-${ props.resourceType }-handler-role`
        const existingHandlerRole = stack.node.tryFindChild( handlerRoleResourceId ) as Role;
        const handlerRole = existingHandlerRole ? existingHandlerRole : new CaefLambdaRole( stack, handlerRoleResourceId, {
            roleName: `${ props.resourceType }-handler`,
            naming: props.naming,
            logGroupNames: [
                handlerFunctionName
            ],
            createParams: false,
            createOutputs: false
        } )

        const handlerPolicyResourceId = `custom-${ props.resourceType }-handler-policy`
        const existingPolicy = stack.node.tryFindChild( handlerPolicyResourceId ) as Policy;
        const handlerPolicy = existingPolicy ? existingPolicy : new Policy( stack, handlerPolicyResourceId, {
            policyName: `${ props.resourceType }-handler`,
            document: new PolicyDocument( { statements: props.handlerRolePolicyStatements } )
        } )

        if ( existingPolicy ) {
            handlerPolicy.addStatements( ...props.handlerRolePolicyStatements )
        } else {
            handlerRole.attachInlinePolicy( handlerPolicy )
            NagSuppressions.addResourceSuppressions(
                handlerPolicy,
                [
                    { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Function is for custom resource; inline policy use appropriate' },
                    { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Function is for custom resource; inline policy use appropriate' },
                    ...props.handlerPolicySuppressions || []
                ],
                true
            );
        }

        const handlerFunctionResourceId = `custom-${ props.resourceType }-handler-function`
        const existingHandlerFunction = stack.node.tryFindChild( handlerFunctionResourceId ) as CaefLambdaFunction;
        const handlerFunction = existingHandlerFunction ? existingHandlerFunction : new CaefLambdaFunction( stack, handlerFunctionResourceId, {
            naming: props.naming,
            runtime: props.runtime,
            code: props.code,
            handler: props.handler,
            role: handlerRole,
            functionName: `${ props.resourceType }-handler`,
            layers: props.handlerLayers,
            timeout: props.handlerTimeout ? props.handlerTimeout : Duration.seconds( 60 )
        } )

        handlerFunction.node.addDependency( handlerPolicy )

        NagSuppressions.addResourceSuppressions(
            handlerFunction,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );


        const providerFunctionName = props.naming.resourceName(
            `${ props.resourceType }-provider`,
            64
        );
        const providerRoleResourceId = `custom-${ props.resourceType }-provider-role`
        const existingProviderRole = stack.node.tryFindChild( providerRoleResourceId ) as Role;
        const providerRole = existingProviderRole ? existingProviderRole : new CaefLambdaRole(
            stack,
            providerRoleResourceId,
            {
                description: "CR Role",
                roleName: `${ props.resourceType }-provider`,
                naming: props.naming,
                logGroupNames: [ providerFunctionName ],
                createParams: false,
                createOutputs: false
            }
        );

        NagSuppressions.addResourceSuppressions(
            providerRole,
            [
                {
                    id: "NIST.800.53.R5-IAMNoInlinePolicy",
                    reason:
                        "Role is for Custom Resource Provider. Inline policy automatically added.",
                },
                {
                    id: "HIPAA.Security-IAMNoInlinePolicy",
                    reason:
                        "Role is for Custom Resource Provider. Inline policy automatically added.",
                },
            ],
            true
        );
        const providerResourceId = `custom-${ props.resourceType }-provider`
        const existingProvider = stack.node.tryFindChild( providerResourceId ) as Provider;
        const provider = existingProvider ? existingProvider : new Provider( stack, providerResourceId, {
            onEventHandler: handlerFunction,
            role: providerRole,
            providerFunctionName: providerFunctionName
        } );

        NagSuppressions.addResourceSuppressions(
            provider,
            [
                {
                    id: "AwsSolutions-L1",
                    reason: "Lambda function Runtime set by CDK Provider Framework",
                },
                {
                    id: "NIST.800.53.R5-LambdaDLQ",
                    reason:
                        "Function is for custom resource and error handling will be handled by CloudFormation.",
                },
                {
                    id: "NIST.800.53.R5-LambdaInsideVPC",
                    reason:
                        "Function is for custom resource and will interact only with QuickSight APIs.",
                },
                {
                    id: "NIST.800.53.R5-LambdaConcurrency",
                    reason:
                        "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
                },
                {
                    id: "HIPAA.Security-LambdaDLQ",
                    reason:
                        "Function is for custom resource and error handling will be handled by CloudFormation.",
                },
                {
                    id: "HIPAA.Security-LambdaInsideVPC",
                    reason:
                        "Function is for custom resource and will interact only with QuickSight APIs.",
                },
                {
                    id: "HIPAA.Security-LambdaConcurrency",
                    reason:
                        "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
                },
            ],
            true
        );

        const crProps: CustomResourceProps = {
            resourceType: `Custom::${ props.resourceType }`,
            serviceToken: provider.serviceToken,
            properties: props.pascalCaseProperties ? CaefCustomResource.pascalCase( props.handlerProps ) : props.handlerProps
        }
        return crProps
    }

    constructor( scope: Construct, id: string, props: CaefCustomResourceProps ) {
        super( scope, id, CaefCustomResource.setProps( scope, props ) )

    }

    public static pascalCase ( props: any ): any {
        return _.transform( props, CaefCustomResource.transformUpperCaseObj, {} );
    }

    private static upcaseFirst ( str: string ): string {
        if ( str === '' ) { return str; }
        return `${ str[ 0 ].toLocaleUpperCase() }${ str.slice( 1 ) }`;
    }

    private static transformUpperCaseObj ( result: { [ key: string ]: any }, value: any, key: string ) {
        const newKey = CaefCustomResource.upcaseFirst( key );
        if ( typeof value === 'string' || value instanceof String )
            result[ newKey ] = value
        else if ( value instanceof Array )
            result[ newKey ] = CaefCustomResource.transformUpperCaseObjArray( value )
        else if ( value instanceof Object ) {
            result[ newKey ] = _.transform( value, CaefCustomResource.transformUpperCaseObj, {} )
        }
        else
            result[ newKey ] = value
    }

    private static transformUpperCaseObjArray ( values: any[] ): any {
        return values.map( value => {
            if ( typeof value === 'string' || value instanceof String )
                return value
            else if ( value instanceof Array )
                return this.transformUpperCaseObjArray( value )
            else if ( value instanceof Object )
                return _.transform( value, CaefCustomResource.transformUpperCaseObj, {} )
            else
                return value
        } )
    }


}


