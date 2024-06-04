/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConfigParamRefValueTransformer, CaefConfigRefValueTransformer, CaefConfigSSMValueTransformer, CaefConfigTransformer, CaefNagSuppressions, CaefServiceCatalogProductConfig, ICaefConfigTransformer, ICaefConfigValueTransformer } from "@aws-caef/config";
import { ICaefResourceNaming } from "@aws-caef/naming";
import Ajv, { Schema } from "ajv";
import { Stack } from "aws-cdk-lib"
import * as yaml from 'yaml';

export interface CaefBaseConfigContents {
    /**
     * Service Catalog Config
     * If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment
     */
    readonly service_catalog_product_config?: CaefServiceCatalogProductConfig
    /**
     * Nag suppressions
     */
    readonly nag_suppressions?: CaefNagSuppressions
}

/**
 * Standard set of props for use with CaefConfigs.
 */
export interface CaefAppConfigParserProps {
    readonly org: string,
    readonly domain: string,
    readonly environment: string,
    readonly module_name: string,
    readonly rawConfig: { [ key: string ]: any },
    readonly naming: ICaefResourceNaming
}

/**
 * Base class for all CAEF Configurations. Facilitates common config behaviours
 * such as SSM parameter references and IAM role resolution.
 */
export class CaefAppConfigParser<T extends CaefBaseConfigContents> {
    /** The config on which all transformations have been applied */
    protected readonly configContents: T

    private readonly props: CaefAppConfigParserProps
    private readonly stack: Stack

    public readonly serviceCatalogConfig?: CaefServiceCatalogProductConfig
    public readonly nagSuppressions?: CaefNagSuppressions
    /**
     * Initializes IAM Role Resolver and performs standard config transformations.
     * @param stack 
     * @param props 
     * @param configTransformers 
     */
    constructor( stack: Stack, props: CaefAppConfigParserProps, configSchema: Schema, configTransformers?: ICaefConfigTransformer[],suppressOutputConfigContents?:boolean ) {
        this.stack = stack
        this.props = props

        let transformedConfig = props.rawConfig
        configTransformers?.forEach( transformer => {
            transformedConfig = transformer.transformConfig( transformedConfig )
        } )

        const generatedRoleResolvedConfig = new CaefConfigTransformer( new CaefGeneratedRoleConfigValueTransformer( this.props.naming ) ).transformConfig( transformedConfig )
        const ssmToRefResolvedConfigContents = new CaefConfigTransformer( new CaefConfigSSMValueTransformer() ).transformConfig( generatedRoleResolvedConfig )
        const configRefValueTranformer = new CaefConfigRefValueTransformer( this.stack )
        const resolvedRefsConfigContents = new CaefConfigTransformer( configRefValueTranformer, configRefValueTranformer ).transformConfig( ssmToRefResolvedConfigContents )

        const baseConfigContents = ( resolvedRefsConfigContents as CaefBaseConfigContents )
        this.serviceCatalogConfig = baseConfigContents.service_catalog_product_config
        this.nagSuppressions = baseConfigContents.nag_suppressions

        const paramTransformer = new CaefConfigParamRefValueTransformer( this.stack, this.serviceCatalogConfig )
        const resolvedParamsConfigContents = new CaefConfigTransformer( paramTransformer, paramTransformer ).transformConfig( resolvedRefsConfigContents )
        this.configContents = resolvedParamsConfigContents as T

        // Confirm our provided config matches our Schema (verification of Data shape)
        const avj = new Ajv()
        const configValidator = avj.compile( configSchema )
        if ( !suppressOutputConfigContents ){
            console.log( `Effective App Config:\n============\n${ yaml.stringify( this.configContents ) }\n============\nEnd Effective App Config` )
        }
        if ( !configValidator( this.configContents ) ) {
            throw new Error( `Config contains shape errors\n: ${ JSON.stringify( configValidator.errors, null, 2 ) }` )
        }
    }
}

class CaefGeneratedRoleConfigValueTransformer implements ICaefConfigValueTransformer {
    naming: ICaefResourceNaming;
    constructor( naming: ICaefResourceNaming ) {
        this.naming = naming
    }
    public transformValue ( value: string ): string {
        if ( value.startsWith( "generated-role-id:" ) ) {
            return `ssm:${ this.naming.ssmPath( "generated-role/" + value.replace( /^generated-role-id:\s*/, "" ) + "/id", false ) }`
        } else if ( value.startsWith( "generated-role-arn:" ) ) {
            return `ssm:${ this.naming.ssmPath( "generated-role/" + value.replace( /^generated-role-arn:\s*/, "" ) + "/arn", false ) }`
        } else {
            return value
        }
    }

}