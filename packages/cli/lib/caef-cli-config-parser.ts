/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConfigTransformer, CaefCustomAspect, CaefCustomNaming, ConfigConfigPathValueTransformer } from '@aws-caef/config';
import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import * as fs from 'fs';
// nosemgrep
import path = require( 'path' );
import * as yaml from 'yaml';
import * as configSchema from './config-schema.json';
const avj = new Ajv()

export interface CaefModuleConfig {
    /**
     * The CAEF CDK Module/App to be deployed
     */
    readonly cdk_app: string
    /**
     * Additional CDK Context key/value pairs
     */
    readonly additional_context?: { [ key: string ]: string }

    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: string }

    /**
     * A list of paths to tag configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly tag_configs?: string[]
    /**
     * A list of paths to CAEF app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * Config data which will be passed directly to apps
     */
    readonly app_config_data?: { [ key: string ]: any }
    /**
     * Tagging data which will be passed directly to apps
     */
    readonly tag_config_data?: { [ key: string ]: string }
    /**
     * Override the CAEF version
     */
    readonly caef_version?: string
    /**
     * If true (default), will use the CAEF bootstrap env
     */
    readonly use_bootstrap?: boolean
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: CaefCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: CaefCustomNaming
    /**
     * A list of additional accounts into which the module may deploy resources.
     */
    readonly additional_accounts?: string[]
}

export interface CaefEnvironmentConfig {
    /**
     * Target account for deployment
     */
    readonly account?: string
    /**
     * Arn or SSM Import (prefix with ssm:) of the environment provider
     */
    readonly modules: { [ moduleName: string ]: CaefModuleConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: string }
    /**
     * Override the CAEF version
     */
    readonly caef_version?: string
    /**
     * Config data which will be passed directly to apps
     */
    readonly app_config_data?: { [ key: string ]: any }
    /**
     * Tagging data which will be passed directly to apps
     */
    readonly tag_config_data?: { [ key: string ]: string }
    /**
     * A list of paths to tag configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly tag_configs?: string[]
    /**
     * A list of paths to CAEF app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * If true (default), will use the CAEF bootstrap env
     */
    readonly use_bootstrap?: boolean
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: CaefCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: CaefCustomNaming

}

export interface CaefDomainConfig {

    /**
     * Arn or SSM Import (prefix with ssm:) of the environment provider
     */
    readonly environments: { [ name: string ]: CaefEnvironmentConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: string }
    /**
     * Override the CAEF version
     */
    readonly caef_version?: string
    /**
     * Config data which will be passed directly to apps
     */
    readonly app_config_data?: { [ key: string ]: any }
    /**
     * Tagging data which will be passed directly to apps
     */
    readonly tag_config_data?: { [ key: string ]: string }
    /**
     * A list of paths to tag configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly tag_configs?: string[]
    /**
     * A list of paths to CAEF app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: CaefCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: CaefCustomNaming
}

export interface CaefConfigContents {
    /**
     * The CAEF Naming Module to be utilized
     */
    readonly naming_module?: string
    /**
      * The CAEF Naming Class to be utilized from the Naming Module
      */
    readonly naming_class?: string
    /**
     * Props to be passed to the custom naming class
     */
    readonly naming_props?: { [ key: string ]: any }
    /**
     * A string representing the target region
     */
    readonly organization: string,
    /**
     * A string representing the target region
     */
    readonly region?: string,
    /**
     * A string representing the target region
     */
    readonly log_suppressions?: boolean,
    /**
     * A list of paths to tag configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly tag_configs?: string[]
    /**
     * A list of paths to CAEF app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * Objects representing environments to create
     */
    readonly domains: { [ name: string ]: CaefDomainConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: any }
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: CaefCustomAspect[]
    /**
     * Override the CAEF version
     */
    readonly caef_version?: string
    /**
     * Config data which will be passed directly to apps
     */
    readonly app_config_data?: { [ key: string ]: any }
    /**
     * Tagging data which will be passed directly to apps
     */
    readonly tag_config_data?: { [ key: string ]: string }
}

export interface CaefParserConfig {
    readonly filename?: string
    readonly configContents?: object
}

export class CaefCliConfig {


    public readonly contents: CaefConfigContents

    private props: CaefParserConfig

    private configSchema: JSONSchemaType<CaefConfigContents> = configSchema as any


    constructor( props: CaefParserConfig ) {
        this.props = props

        if ( !this.props.filename && !this.props.configContents ) {
            throw new Error( "ConfigParser class requires either 'filename' or 'configContents' to be specified" )
        }

        const configValidator: ValidateFunction = avj.compile( this.configSchema )
        if ( this.props.filename ) {
            // nosemgrep
            const configFileContentsString = fs.readFileSync( this.props.filename, { encoding: 'utf8' } )
            try {
                const parsedContents = yaml.parse( configFileContentsString )
                //Resolve relative paths in parsedYaml
                const baseDir = path.dirname( this.props.filename.trim() )
                const relativePathTransformedContents = new CaefConfigTransformer( new ConfigConfigPathValueTransformer( baseDir ) ).transformConfig( parsedContents )
                // Confirm our provided file matches our Schema (verification of Data shape)
                if ( !configValidator( relativePathTransformedContents ) ) {
                    throw new Error( `${ this.props.filename }' contains shape errors\n: ${ JSON.stringify( configValidator.errors, null, 2 ) }` )
                } else {
                    // Config file is shaped correctly and contains required values!
                    this.contents = relativePathTransformedContents as CaefConfigContents
                }
            } catch ( err ) {
                throw Error( `${ this.props.filename }: Structural problem found in the YAML file. ` )
            }
        } else {
            if ( !configValidator( this.props.configContents ) ) {
                throw new Error( `Config contents contains shape errors\n: ${ JSON.stringify( configValidator.errors, null, 2 ) }` )
            } else {
                // Config file is shaped correctly and contains required values!
                this.contents = this.props.configContents as CaefConfigContents
            }
        }





    }
}
