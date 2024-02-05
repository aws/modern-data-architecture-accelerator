/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConfigTransformer, CaefCustomAspect, ConfigConfigPathValueTransformer } from "@aws-caef/config";
import { CaefL3ConstructProps } from "@aws-caef/l3-construct";
import { CaefLambdaFunction, CaefLambdaFunctionProps, CaefLambdaRole } from "@aws-caef/lambda-constructs";
import { CaefDefaultResourceNaming, ICaefResourceNaming } from "@aws-caef/naming";
import { App, AppProps, Aspects, CfnMacro, Stack, Tags } from "aws-cdk-lib";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { CfnLaunchRoleConstraint, CfnLaunchRoleConstraintProps, CloudFormationProduct, CloudFormationProductProps, CloudFormationTemplate, Portfolio } from "aws-cdk-lib/aws-servicecatalog";
import { AwsSolutionsChecks, HIPAASecurityChecks, NagSuppressions, NIST80053R5Checks } from "cdk-nag";
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "./app_config";
import * as configSchema from './config-schema.json';
import { CaefProductStack, CaefProductStackProps, CaefStack } from "./stack";
// nosemgrep
import assert = require( "assert" )


export interface CaefAppProps extends AppProps {
    readonly appConfigRaw?: { [ key: string ]: any }
    readonly useBootstrap?: boolean
}

/**
 * Base class for CAEF CDK Apps. Provides consistent app behaviours in 
 * configuration parsing, stack generation, resource naming, 
 * and CDK Nag compliance configurations.
 * Reads all required inputs as CDK Context.
 */
export abstract class CaefCdkApp extends App {
    private readonly naming: ICaefResourceNaming
    protected readonly moduleName: string
    private readonly appConfigRaw: { [ key: string ]: any }
    private readonly tags: { [ name: string ]: string }
    private readonly org: string;
    private readonly env: string;
    private readonly domain: string;
    protected readonly deployRegion?: string
    protected readonly deployAccount?: string
    private readonly useBootstrap: boolean;
    private readonly stack: CaefStack
    private readonly baseConfigParser: CaefAppConfigParser<CaefBaseConfigContents>;
    private readonly additionalAccounts?: string[]
    private readonly additionalAccountStacks: { [ AccountRecovery: string ]: Stack; };
    private readonly outputEffectiveConfig: boolean
    /**
     * Constructor does most of the app initialization, reading inputs from CDK context, parsing App config files, configuring resource naming, and configuring CDK Nag.
     * @param app_name - Name of the application
     * @param props - CDK AppProps (default empty). Not typically required if running using the CDK cli, but useful for direct instantiation.
     */
    constructor( app_name: string, props: CaefAppProps ) {
        super( props )

        this.node.setContext( "aws-cdk:enableDiffNoFail", true )
        this.node.setContext( "@aws-cdk/core:enablePartitionLiterals", true )

        assert( this.node.tryGetContext( 'org' ), "Organization must be specified in context as 'org'" )
        assert( this.node.tryGetContext( 'env' ), "Environment must be specified in context as 'env'" )
        assert( this.node.tryGetContext( 'domain' ), "Domain must be specified in context as 'domain'" )
        assert( this.node.tryGetContext( 'module_name' ), "Module Name must be specified in context as 'module_name'" )

        this.org = this.node.tryGetContext( "org" ).toLowerCase()
        this.env = this.node.tryGetContext( "env" ).toLowerCase()
        this.domain = this.node.tryGetContext( "domain" ).toLowerCase()
        this.moduleName = this.node.tryGetContext( 'module_name' ).toLowerCase()
        this.tags = {
            caef_org: this.org,
            caef_env: this.env,
            caef_domain: this.domain,
            caef_module_name: this.moduleName
        }

        if ( props.useBootstrap != undefined ) {
            this.useBootstrap = props.useBootstrap
        } else {
            this.useBootstrap = this.node.tryGetContext( 'use_bootstrap' ) == undefined ? true : ( /true/i ).test( this.node.tryGetContext( 'use_bootstrap' ) )
        }
        const namingModule: string = this.node.tryGetContext( 'naming_module' )
        const namingClass: string = this.node.tryGetContext( 'naming_class' )
        this.naming = this.configNamingModule( namingModule, namingClass )
        const logSuppressions: boolean = this.node.tryGetContext( 'log_suppressions' ) == undefined ? false : ( /true/i ).test( this.node.tryGetContext( 'log_suppressions' ) )
        
        // nosemgrep
        const pjson = require( "../package.json" )
        const packageVersion = pjson.version.replace( /\.\d*$/, ".x" )
        console.log( `Running CAEF CDK App ${ app_name } Version: ${ packageVersion }` );
        this.tags[ 'caef_cdk_app' ] = `${ app_name }`

        Aspects.of( this ).add( new AwsSolutionsChecks( { verbose: true, logIgnores: logSuppressions } ) )
        Aspects.of( this ).add( new NIST80053R5Checks( { verbose: true, logIgnores: logSuppressions } ) )
        Aspects.of( this ).add( new HIPAASecurityChecks( { verbose: true, logIgnores: logSuppressions } ) )

        this.applyCustomAspects()

        this.appConfigRaw = { ...this.loadConfigFromFiles( this.node.tryGetContext( 'app_configs' )?.split( "," ) || [] ), ...this.loadAppConfigDataFromContext(), ...props.appConfigRaw }
        this.tags = { ...this.loadTagConfigFromFiles(), ...this.loadTagConfigDataFromContext(), ...this.tags }

        this.deployAccount = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
        this.deployRegion = process.env.CI_SUPPLIED_TARGET_REGION || process.env.CDK_DEFAULT_REGION
        this.additionalAccounts = this.node.tryGetContext( "additional_accounts" )?.split( "," )

        this.stack = this.createEmptyStack()
        this.additionalAccountStacks = Object.fromEntries( this.additionalAccounts?.map( account => {
            const stackName = this.naming.stackName( account )
            const stackProps = {
                naming: this.naming,
                env: {
                    region: this.stack.region,
                    account: account
                }
            }
            const additionalAccountStack = new Stack( this, stackName, stackProps )
            additionalAccountStack.addDependency( this.stack )
            return [ account, additionalAccountStack ]
        } ) || [] )
        this.baseConfigParser = new CaefAppConfigParser<CaefBaseConfigContents>( this.stack, this.getConfigParserProps(), configSchema )
        this.outputEffectiveConfig = true// this.node.tryGetContext( 'output_effective_config' ) == undefined ? false : ( /true/i ).test( this.node.tryGetContext( 'output_effective_config' ) )
    }

    private loadTagConfigDataFromContext (): { [ key: string ]: string } {
        const tagConfigDataFromContextString: string = this.node.tryGetContext( 'tag_config_data' )
        if ( tagConfigDataFromContextString ) {
            return JSON.parse( tagConfigDataFromContextString )
        }
        return {}

    }

    private loadAppConfigDataFromContext (): { [ key: string ]: any } {
        const appConfigDataFromContextString: string = this.node.tryGetContext( 'app_config_data' )
        if ( appConfigDataFromContextString ) {
            return JSON.parse( appConfigDataFromContextString )
        }
        return {}
    }

    private loadTagConfigFromFiles (): { [ key: string ]: string } {
        const tagConfigRaw = this.loadConfigFromFiles( this.node.tryGetContext( 'tag_configs' )?.split( "," ) || [] )
        return tagConfigRaw[ 'tags' ] || {}
    }

    private loadConfigFromFiles ( fileList: string[] ): { [ key: string ]: any } {
        // nosemgrep
        let _ = require( 'lodash' );
        function customizer ( objValue: any, srcValue: any ): any {
            if ( _.isArray( objValue ) ) {
                return objValue.concat( srcValue );
            }
        }
        let configRaw: { [ key: string ]: any } = {}

        fileList.forEach( ( fileName: string ) => {
            console.log( `Reading config from ${ fileName }` )
            // nosemgrep
            const parsedYaml = yaml.parse( fs.readFileSync( fileName.trim(), 'utf8' ) )
            //Resolve relative paths in parsedYaml
            const baseDir = path.dirname( fileName.trim() )
            const pathResolvedYaml = new CaefConfigTransformer( new ConfigConfigPathValueTransformer( baseDir ) ).transformConfig( parsedYaml )
            configRaw = _.mergeWith( configRaw, pathResolvedYaml, customizer )
        } );

        return configRaw
    }

    private configNamingModule ( namingModule: string, namingClass: string ): ICaefResourceNaming {
        if ( namingModule ) {
            // nosemgrep
            const naming_module_path = namingModule.startsWith( "./" ) ? path.resolve( namingModule ) : namingModule
            // nosemgrep
            const customNamingModule = require( naming_module_path )
            return new customNamingModule[ namingClass ]( {
                cdkNode: this.node,
                org: this.org,
                env: this.env,
                domain: this.domain,
                moduleName: this.moduleName
            } )
        } else {
            return new CaefDefaultResourceNaming( {
                cdkNode: this.node,
                org: this.org,
                env: this.env,
                domain: this.domain,
                moduleName: this.moduleName
            } )
        }
    }

    private applyCustomAspects () {
        const customAspectsContextString: string = this.node.tryGetContext( 'custom_aspects' )
        if ( customAspectsContextString ) {
            const customAspects: CaefCustomAspect[] = JSON.parse( customAspectsContextString )
            customAspects.forEach( customAspect => this.applyCustomAspect( customAspect ) )
        }
    }

    private applyCustomAspect ( customAspect: CaefCustomAspect ) {
        const customAspectModulePath = customAspect.aspect_module.startsWith( "./" ) ? path.resolve( customAspect.aspect_module ) : customAspect.aspect_module
        console.log( `Applying custom aspect: ${ customAspect.aspect_module }:${ customAspect.aspect_class }` )
        // nosemgrep
        const customAspectModule = require( customAspectModulePath )
        const aspect = new customAspectModule[ customAspect.aspect_class ]( customAspect.aspect_props )
        Aspects.of( this ).add( aspect )
    }

    public generateStack () {

        if ( this.baseConfigParser.serviceCatalogConfig ) {
            const productStack = this.createEmptyProductStack( this.stack )
            this.subGenerateResources( productStack, this.createL3ConstructProps( productStack ), this.getConfigParserProps() )
            const productProps: CloudFormationProductProps = {
                productName: this.baseConfigParser.serviceCatalogConfig.name,
                owner: this.baseConfigParser.serviceCatalogConfig.owner,
                productVersions: [
                    {
                        productVersionName: "v1",
                        cloudFormationTemplate: CloudFormationTemplate.fromProductStack( productStack ),
                    },
                ],
            }
            const product = new CloudFormationProduct( this.stack, 'Product', productProps );
            const portfolio = Portfolio.fromPortfolioArn( this.stack, "portfolio", this.baseConfigParser.serviceCatalogConfig.portfolio_arn )
            if ( this.baseConfigParser.serviceCatalogConfig.launch_role_name ) {
                const launchRoleConstraintProps: CfnLaunchRoleConstraintProps = {
                    portfolioId: portfolio.portfolioId,
                    productId: product.productId,
                    localRoleName: this.baseConfigParser.serviceCatalogConfig.launch_role_name
                }
                new CfnLaunchRoleConstraint( this.stack, "launch-role-constraint", launchRoleConstraintProps )
            }
            portfolio.addProduct( product );
        } else {
            this.subGenerateResources( this.stack, this.createL3ConstructProps( this.stack ), this.getConfigParserProps() )
        }
        this.addTagsAndSuppressions()
    }

    /**
     * Implemented in derived CAEF App classes in order to generate CDK scopes.
     */
    protected abstract subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ): void

    private createEmptyStack (): CaefStack {
        const stackName = this.naming.stackName()
        const stackProps = {
            naming: this.naming,
            useBootstrap: this.useBootstrap,
            env: {
                region: this.deployRegion,
                account: this.deployAccount
            }
        }
        return new CaefStack( this, stackName, stackProps )
    }

    private createEmptyProductStack ( stack: CaefStack ): CaefProductStack {

        const productStackProps: CaefProductStackProps = {
            naming: this.naming,
            useBootstrap: this.useBootstrap,
            moduleName: this.moduleName
        }
        const productStack = new CaefProductStack( stack, `${ stack.stackName }-product`, productStackProps )
        const provisioningMacroFunctionRole = new CaefLambdaRole( stack, "provisioning-macro-function-role", {
            description: 'Provisioning Macro Role',
            roleName: "prov-macro",
            naming: this.naming,
            logGroupNames: [ this.naming.resourceName( "provisioningMacro" ) ],
            createParams: false,
            createOutputs: false
        } )
        const provisioningMacroFunctionProps: CaefLambdaFunctionProps = {
            runtime: Runtime.PYTHON_3_12,
            code: Code.fromAsset( `${ __dirname }/../src/python/provisioning_macro` ),
            handler: "provisioning_macro.lambda_handler",
            functionName: "provisioningMacro",
            role: provisioningMacroFunctionRole,
            naming: this.naming
        }
        const provisioningMacroFunction = new CaefLambdaFunction( stack, "provisioning-macro-function", provisioningMacroFunctionProps )
        NagSuppressions.addResourceSuppressions(
            provisioningMacroFunction,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for Cfn Macro and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for Cfn Macro and will interact only with CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for Cfn Macro and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for Cfn Macro and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for Cfn Macro and will interact only with CloudFormation.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for Cfn Macro and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );
        const provisioningMacro = new CfnMacro( stack, "provisioning-macro", {
            name: this.naming.resourceName( "provisioning-macro" ),
            functionName: provisioningMacroFunction.functionArn
        } )
        productStack.templateOptions.transforms = [ provisioningMacro.name ]
        return productStack

    }

    private addTagsAndSuppressions () {
        const allStacks = [ this.stack, ...Object.entries( this.additionalAccountStacks ).map( x => x[ 1 ] ) ]
        allStacks.forEach( stack => {
            this.baseConfigParser.nagSuppressions?.by_path?.forEach( suppression => {
                try {
                    NagSuppressions.addResourceSuppressionsByPath(
                        stack,
                        suppression.path,
                        suppression.suppressions
                    )
                } catch ( error ) {
                    console.log( `Error adding suppression for path ${ suppression.path } to stack ${ stack.stackName }` )
                }
            } )
            // Apply our tags
            for ( let tagKey in this.tags ) {
                if ( this.tags.hasOwnProperty( tagKey ) ) {
                    Tags.of( stack ).add( tagKey, this.tags[ tagKey ] );
                }
            }
        } )
    }

    private createL3ConstructProps ( stack: CaefStack ): CaefL3ConstructProps {
        return {
            naming: this.naming,
            roleHelper: stack.roleHelper,
            crossAccountStacks: this.additionalAccountStacks
        }
    }
    /**
     * 
     * @returns Astandard set of CAEF Stack Props for use in Caef App Configs
     */
    private getConfigParserProps (): CaefAppConfigParserProps {
        return {
            org: this.org,
            domain: this.domain,
            environment: this.env,
            module_name: this.moduleName,
            rawConfig: this.appConfigRaw,
            naming: this.naming,
            outputEffectiveConfig: this.outputEffectiveConfig
        }
    }


}
