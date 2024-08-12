/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConfigTransformer, MdaaCustomAspect, MdaaCustomNaming, ConfigConfigPathValueTransformer } from '@aws-mdaa/config';
import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import * as fs from 'fs';
// nosemgrep
import path = require( 'path' );
import * as yaml from 'yaml';
import * as configSchema from './config-schema.json';
import { DevOpsConfigContents } from '@aws-mdaa/devops';
const avj = new Ajv()

export interface MdaaModuleConfig {
    /**
     * The MDAA CDK Module/App to be deployed
     */
    readonly cdk_app: string
    /**
     * Additional CDK Context key/value pairs
     */
    readonly additional_context?: { [ key: string ]: string }

    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: any }

    /**
     * A list of paths to tag configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly tag_configs?: string[]
    /**
     * A list of paths to MDAA app configuration files. 
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
     * Override the MDAA version
     */
    readonly mdaa_version?: string
    /**
     * If true (default), will use the MDAA bootstrap env
     */
    readonly use_bootstrap?: boolean
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: MdaaCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: MdaaCustomNaming
    /**
     * A list of additional accounts into which the module may deploy resources.
     */
    readonly additional_accounts?: string[]
}

export interface MdaaEnvironmentConfig {
    /**
     * If specified, the referenced environment template will be used as the basis for this environment config.
     * Template values can be overridden with specific values in this config.
     */
    readonly template?: string
    /**
     * Target account for deployment
     */
    readonly account?: string
    /**
     * Arn or SSM Import (prefix with ssm:) of the environment provider
     */
    readonly modules?: { [ moduleName: string ]: MdaaModuleConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: any }
    /**
     * Override the MDAA version
     */
    readonly mdaa_version?: string
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
     * A list of paths to MDAA app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * If true (default), will use the MDAA bootstrap env
     */
    readonly use_bootstrap?: boolean
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: MdaaCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: MdaaCustomNaming

}

export interface MdaaDomainConfig {

    /**
     * Arn or SSM Import (prefix with ssm:) of the environment provider
     */
    readonly environments: { [ name: string ]: MdaaEnvironmentConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: any }
    /**
     * Override the MDAA version
     */
    readonly mdaa_version?: string
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
     * A list of paths to MDAA app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: MdaaCustomAspect[]
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_naming?: MdaaCustomNaming
    /**
     * Templates for environments which can be referenced throughout the config.
     */
    readonly env_templates?: { [ name: string ]: MdaaEnvironmentConfig }
}

export interface MdaaConfigContents {
    /**
     * The MDAA Naming Module to be utilized
     */
    readonly naming_module?: string
    /**
      * The MDAA Naming Class to be utilized from the Naming Module
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
     * A list of paths to MDAA app configuration files. 
     * Configurations will be compiled together in the order they appear, 
     * with later configuration files taking precendence over earlier configurations.
     */
    readonly app_configs?: string[]
    /**
     * Objects representing domains to create
     */
    readonly domains: { [ name: string ]: MdaaDomainConfig }
    /**
     * Additional CDK Context key/value pairs
     */
    readonly context?: { [ key: string ]: any }
    /**
     * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
     */
    readonly custom_aspects?: MdaaCustomAspect[]
    /**
     * Override the MDAA version
     */
    readonly mdaa_version?: string
    /**
     * Config data which will be passed directly to apps
     */
    readonly app_config_data?: { [ key: string ]: any }
    /**
     * Tagging data which will be passed directly to apps
     */
    readonly tag_config_data?: { [ key: string ]: string }

    /**
     * Configurations used when deploying MDAA DevOps resources
     */
    readonly devops?: DevOpsConfigContents

    /**
     * Templates for environments which can be referenced throughout the config.
     */
    readonly env_templates?: {[name:string]:MdaaEnvironmentConfig}
}

export interface MdaaParserConfig {
    readonly filename?: string
    readonly configContents?: object
}

export class MdaaCliConfig {


    public readonly contents: MdaaConfigContents

    private props: MdaaParserConfig

    private configSchema: JSONSchemaType<MdaaConfigContents> = configSchema as any

    private static readonly VALIDATE_NAME_REGEXP = "^[a-z0-9\\-]+$"

    constructor( props: MdaaParserConfig ) {
        this.props = props

        if ( !this.props.filename && !this.props.configContents ) {
            throw new Error( "ConfigParser class requires either 'filename' or 'configContents' to be specified" )
        }

        const configShapeValidator: ValidateFunction = avj.compile( this.configSchema )
        if ( this.props.filename ) {
            // nosemgrep
            const configFileContentsString = fs.readFileSync( this.props.filename, { encoding: 'utf8' } )
            try {
                const parsedContents = yaml.parse( configFileContentsString )
                //Resolve relative paths in parsedYaml
                const baseDir = path.dirname( this.props.filename.trim() )
                const relativePathTransformedContents = new MdaaConfigTransformer( new ConfigConfigPathValueTransformer( baseDir ) ).transformConfig( parsedContents )
                // Confirm our provided file matches our Schema (verification of Data shape)
                if ( !configShapeValidator( relativePathTransformedContents ) ) {
                    throw new Error( `${ this.props.filename }' contains shape errors\n: ${ JSON.stringify( configShapeValidator.errors, null, 2 ) }` )
                } else {
                    // Config file is shaped correctly and contains required values!
                    this.contents = relativePathTransformedContents as MdaaConfigContents
                }
            } catch ( err ) {
                throw Error( `${ this.props.filename }: Structural problem found in the YAML file: ${err} ` )
            }
        } else {
            if ( !configShapeValidator( this.props.configContents ) ) {
                throw new Error( `Config contents contains shape errors\n: ${ JSON.stringify( configShapeValidator.errors, null, 2 ) }` )
            } else {
                // Config file is shaped correctly and contains required values!
                this.contents = this.props.configContents as MdaaConfigContents
            }
        }
        this.validateConfig()
    }
    private validateConfig () {
        const namePattern = new RegExp(MdaaCliConfig.VALIDATE_NAME_REGEXP)
        if ( !namePattern.test( this.contents.organization ) ){
            throw new Error( `Org name ${ this.contents.organization } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP}`)
        }
        Object.entries(this.contents.domains).forEach(domainEntry => {
            if(!namePattern.test(domainEntry[0])){
                throw new Error( `Domain name ${ domainEntry[ 0 ] } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP }` )
            }
            Object.entries( domainEntry[1].environments ).forEach( envEntry => {
                if ( !namePattern.test( envEntry[ 0 ] ) ) {
                    throw new Error( `Env name ${ envEntry[ 0 ] } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP }` )
                }
                Object.entries( envEntry[ 1 ].modules || {} ).forEach( moduleEntry => {
                    if ( !namePattern.test( moduleEntry[ 0 ] ) ) {
                        throw new Error( `Module name ${ moduleEntry[ 0 ] } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP }` )
                    }
                } )
            } )
            Object.entries( domainEntry[ 1 ].env_templates || {} ).forEach( envTemplateEntry => {
                Object.entries( envTemplateEntry[ 1 ].modules || {} ).forEach( moduleEntry => {
                    if ( !namePattern.test( moduleEntry[ 0 ] ) ) {
                        throw new Error( `Module name ${ moduleEntry[ 0 ] } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP }` )
                    }
                } )
            } )
        })
        Object.entries( this.contents.env_templates || {} ).forEach( envTemplateEntry => {
            Object.entries( envTemplateEntry[ 1 ].modules || {} ).forEach( moduleEntry => {
                if ( !namePattern.test( moduleEntry[ 0 ] ) ) {
                    throw new Error( `Module name ${ moduleEntry[ 0 ] } must match pattern ${ MdaaCliConfig.VALIDATE_NAME_REGEXP }` )
                }
            } )
        } )
    }
}
