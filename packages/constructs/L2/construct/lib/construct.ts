/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICaefResourceNaming } from '@aws-caef/naming';
import { Construct } from 'constructs'
import { CfnOutput, Token } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

/** Common properties for CAEF Constructs */
export interface CaefConstructProps {
    /** The CAEF naming class to be used for resource naming */
    readonly naming: ICaefResourceNaming
    /** If true (default), creates SSM Params for each construct */
    readonly createParams?: boolean
    /** If true (default), creates Cfn outputs and stack exports for each construct */
    readonly createOutputs?: boolean
}

/** Props for creating CAEF SSM params and Cfn outputs */
export interface CaefParamAndOutputProps extends CaefConstructProps {
    /** Used to form part of the SSM Param and Cfn Output names. Will be passed to the CAEF naming implementation to generate the full name */
    readonly name: string,
    /** Used to form part of the SSM Param and Cfn Output names. Will be passed to the CAEF naming implementation to generate the full name */
    readonly resourceType: string,
    /** Used to form part of the SSM Param and Cfn Output names. Will be passed to the CAEF naming implementation to generate the full name */
    readonly resourceId?: string,
    /** Set the construct resource ID, without impacting SSM Param and Cfn Output names */
    readonly overrideResourceId?: string,
    /** Will be the value of the SSM Param and Cfn Output */
    readonly value: string
}

/** A construct which creates SSM Params and Cfn Outputs/Exports in a standard fashion. */
export class CaefParamAndOutput extends Construct {

    public static readonly LEGACY_PARAM_SCOPE_CONTEXT_KEY = "@aws-caef/legacyParamScope"
    public static readonly SKIP_CREATE_PARAMS = "@aws-caef/skipCreateParams"

    private static createId ( props: CaefParamAndOutputProps ): string {
        if ( props.overrideResourceId ) {
            return `${ props.resourceType }-${ props.overrideResourceId }`
        }

        const id = props.resourceId ? `${ props.resourceType }-${ props.resourceId }-${ props.name }` : `${ props.resourceType }-${ props.name }`
        return id
    }

    private static determineScope ( thisScope: Construct, legacyScope?:Construct):Construct {
        const contextValue = thisScope.node.tryGetContext( CaefParamAndOutput.LEGACY_PARAM_SCOPE_CONTEXT_KEY )?.valueOf()
        const useLegacyParamScope = contextValue ? ( /true/i ).test( contextValue):false
        return useLegacyParamScope ? legacyScope || thisScope : thisScope 
    }

    constructor( scope: Construct, props: CaefParamAndOutputProps, legacyScope?: Construct ) {
        super( CaefParamAndOutput.determineScope( scope, legacyScope ), CaefParamAndOutput.createId( props ) )
        const ssmPath = props.resourceId ? `${ props.resourceType }/${ props.resourceId }/${ props.name }` : `${ props.resourceType }/${ props.name }`
        const ssmFullPath = props.naming.ssmPath( ssmPath )

        const skipCreateParamsContextString = this.node.tryGetContext( CaefParamAndOutput.SKIP_CREATE_PARAMS )
        const skipCreateParamsContext = skipCreateParamsContextString != undefined ? 
            ( /true/i ).test( skipCreateParamsContextString ) : undefined
        const createParamsProps = props.createParams == undefined || props.createParams != undefined && props.createParams.valueOf()
        const createParams = skipCreateParamsContext == undefined || !skipCreateParamsContext ? createParamsProps : false
        
        if ( createParams ) {
            console.log( `Creating SSM Param: ${ ssmFullPath }` )
            new StringParameter( this, `ssm`, {
                parameterName: ssmFullPath,
                stringValue: props.value,
                simpleName: Token.isUnresolved( ssmFullPath )
            } )
        } 

        if ( props.createOutputs == undefined || props.createOutputs != undefined && props.createOutputs.valueOf() ) {
            const exportName = props.resourceId ?
                `${ props.resourceType }:${ props.resourceId.replace( /\W/g, '' ).replace( /_/g, '-' ) }:${ props.name }`
                : `${ props.resourceType }:${ props.name }`
            new CfnOutput( this, `out`, { value: props.value, exportName: props.naming.exportName( exportName ) } )
        }
    }
}