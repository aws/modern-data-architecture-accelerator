/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefCustomAspect, CaefCustomNaming } from '@aws-caef/config';
import * as fs from 'fs';
import * as path from 'path';
import { CaefCliConfig, CaefDomainConfig, CaefEnvironmentConfig, CaefModuleConfig } from './caef-cli-config-parser';


export interface DeployStageMap { [ key: string ]: { moduleConfig: ModuleEffectiveConfig, modulePath: string }[] }

export class CaefDeploy {
    private config: CaefCliConfig
    private action: string

    private domainFilter?: string[]
    private envFilter?: string[]
    private moduleFilter?: string[]
    private npmTag: string
    private roleArn?: string
    private workingDir: string
    private caefVersion?: string
    private npmDebug: boolean;
    private updateCache: { [ prefix: string ]: boolean } = {};
    private readonly outputEffectiveConfig: boolean;
    private localMode?:boolean
    private static readonly DEFAULT_DEPLOY_STAGE = "1"
    private localPackages : {[packageName:string]:string}

    constructor( options: { [ key: string ]: string }, configContents?: { [ key: string ]: any } ) {
        this.action = options[ 'action' ]
        if ( !this.action ) {
            throw new Error( "CAEF action must be specified on command line: caef <action>" )
        }
        this.caefVersion = options[ 'caef_version' ]
        this.domainFilter = options[ 'domain' ]?.split( "," ).map( x => x.trim() )
        this.envFilter = options[ 'env' ]?.split( "," ).map( x => x.trim() )
        this.moduleFilter = options[ 'module' ]?.split( "," ).map( x => x.trim() )
        this.roleArn = options[ 'role_arn' ]
        this.npmTag = options[ 'tag' ] ? options[ 'tag' ] : "latest"
        this.workingDir = options[ "working_dir" ] ? `${ options[ "working_dir" ] }` : "./.caef_working"
        this.npmDebug = options[ 'npm_debug' ] ? true : false
        this.outputEffectiveConfig = options[ 'output_effective_config' ] ? true : false
        this.localMode = options[ 'local_mode' ] ? true : false

        if ( !this.localMode && options[ 'clear' ] && this.action != 'dryrun' ) {
            console.log( `Removing all previously installed packages from ${ this.workingDir }/packages` )
            this.execCmd( `rm -rf ${ this.workingDir }/packages` );
        }

        this.localPackages = this.localMode ? this.loadLocalPackages() : {}
        if(this.localMode) {
            console.log("Running CAEF in local mode.")
        }

        

        const configFileName = options[ 'config' ]
        if ( configContents ) {
            this.config = new CaefCliConfig( { configContents: configContents } )
        } else {
            this.config = new CaefCliConfig( { filename: configFileName } )
        }
    }

    private loadLocalPackages () {
        const workspaceQueryJson = require( 'child_process' ).execSync( `npm query .workspace --prefix ${ __dirname }/../../../` ).toString()
        const workspace: any[] = JSON.parse( workspaceQueryJson )
        return Object.fromEntries( workspace.map( pkgInfo => {
            return [ `${pkgInfo[ 'name' ]}@latest`, path.resolve(`${__dirname}/../../../${pkgInfo[ 'location' ]}`) ]
        } ) )
    }

    public deploy () {
        if ( this.domainFilter ) {
            console.log( `Filtering for domain ${ this.domainFilter }` )
        }
        const globalEffectiveConfig: EffectiveConfig = {
            effectiveContext: this.config.contents.context || {},
            effectiveAppConfig: this.config.contents.app_config_data || {},
            effectiveTagConfig: this.config.contents.tag_config_data || {},
            tagConfigFiles: this.config.contents.tag_configs || [],
            appConfigFiles: this.config.contents.app_configs || [],
            effectiveCaefVersion: this.config.contents.caef_version || this.caefVersion,
            customAspects: this.config.contents.custom_aspects || [],
            customNaming: this.config.contents.naming_module && this.config.contents.naming_class ? { naming_module: this.config.contents.naming_module, naming_class: this.config.contents.naming_class, naming_props: this.config.contents.naming_props } : undefined
        }
        Object.keys( this.config.contents.domains ).filter( domainName => this.domainFilter == undefined || this.domainFilter?.includes( domainName ) ).forEach( domainName => {
            const domain = this.config.contents.domains[ domainName ]
            const domainEffectiveConfig: DomainEffectiveConfig = this.computeDomainEffectiveConfig( domainName, domain, globalEffectiveConfig )
            this.deployDomain( domain, domainEffectiveConfig )
        } )
    }

    public deployDomain (
        domain: CaefDomainConfig,
        domainEffectiveConfig: DomainEffectiveConfig ) {

        console.log( `-----------------------------------------------------------` )
        console.log( `${ this.action.charAt( 0 ).toUpperCase() + this.action.slice( 1 ) }ing Domain ${ domainEffectiveConfig.domainName }` )
        console.log( `-----------------------------------------------------------` )
        if ( this.envFilter ) {
            console.log( `Filtering for env ${ this.envFilter }` )
        }
        Object.keys( domain.environments ).filter( envName => this.envFilter == undefined || this.envFilter?.includes( envName ) ).forEach( envName => {
            const env = domain.environments[ envName ]
            const envEffectiveConfig: EnvEffectiveConfig = this.computeEnvEffectiveConfig( envName, env, domainEffectiveConfig )
            this.deployEnv( env, envEffectiveConfig )
        } )
    }

    private deployEnv (
        env: CaefEnvironmentConfig,
        envEffectiveConfig: EnvEffectiveConfig ) {

        if ( this.moduleFilter ) {
            console.log( `Filtering for module ${ this.moduleFilter }` )
        }
        if ( envEffectiveConfig.useBootstrap ) {
            const bootstrapModule: CaefModuleConfig = {
                cdk_app: '@aws-caef/bootstrap'
            }
            env.modules[ 'caef-bootstrap' ] = bootstrapModule
        }

        const moduleEffectiveConfigs = Object.entries( env.modules ).map( entry => {
            return this.computeModuleEffectiveConfig( entry[ 0 ], entry[ 1 ], envEffectiveConfig )
        } )
        console.log( `-----------------------------------------------------------` )
        console.log( `Installing Packages and Computing Stages for Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName }` )
        console.log( `-----------------------------------------------------------` )
        const envDeployStages: DeployStageMap = this.computeEnvDeployStages( moduleEffectiveConfigs )
        console.log( `-----------------------------------------------------------` )
        console.log( `${ this.action.charAt( 0 ).toUpperCase() + this.action.slice( 1 ) }ing Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName }` )
        console.log( `-----------------------------------------------------------` )
        const orderedStages = this.action == "destroy" ? Object.keys( envDeployStages ).sort( ( a, b ) => ( +a - +b ) ).reverse() : Object.keys( envDeployStages ).sort( ( a, b ) => ( +a - +b ) )
        orderedStages.forEach( stage => {
            console.log( `Running CAEF stage ${ stage } for ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName }` )
            const stageApps = envDeployStages[ stage ]
            stageApps.forEach( module => {
                this.deployModule( module.moduleConfig, module.modulePath )
            } )
        } )
    }

    private computeEnvDeployStages ( moduleConfigs: ModuleEffectiveConfig[] ): DeployStageMap {
        const deployStages: DeployStageMap = {}

        moduleConfigs.filter( moduleConfig => this.moduleFilter == undefined || this.moduleFilter?.includes( moduleConfig.moduleName ) ).forEach( moduleConfig => {
            console.log( `Installing packages for ${ moduleConfig.moduleName }` )

            const moduleCdkAppNpmPackage = moduleConfig.cdkApp.replace( /^@/, "" ).includes( '@' ) ?
                moduleConfig.cdkApp : `${ moduleConfig.cdkApp }@${ moduleConfig.effectiveCaefVersion || this.npmTag }`

            const modulePath = this.installPackageToPrefix( moduleCdkAppNpmPackage )

            const customNamingModulePath = moduleConfig.customNaming && moduleConfig.customNaming.naming_module.startsWith( "@" ) ?
                this.installPackageToPrefix( moduleConfig.customNaming.naming_module ) : moduleConfig.customNaming?.naming_module

            const installedCustomNamingModule: CaefCustomNaming | undefined = customNamingModulePath ? {
                naming_module: `${ customNamingModulePath }`,
                naming_class: moduleConfig.customNaming?.naming_class || '',
                naming_props: moduleConfig.customNaming?.naming_props

            } : undefined

            const installedCustomAspects: CaefCustomAspect[] = moduleConfig.customAspects?.map( customAspect => {
                const customAspectPath = customAspect.aspect_module.startsWith( "@" ) ?
                    this.installPackageToPrefix( customAspect.aspect_module ) : customAspect.aspect_module
                return {
                    aspect_module: customAspectPath,
                    aspect_class: customAspect.aspect_class,
                    aspect_props: customAspect.aspect_props
                }
            } )

            const installedModuleConfig: ModuleEffectiveConfig = {
                ...moduleConfig,
                customAspects: installedCustomAspects,
                customNaming: installedCustomNamingModule
            }

            const deployStage = this.computeModuleDeployStage( installedModuleConfig, modulePath )
            if ( deployStages[ deployStage ] ) {
                deployStages[ deployStage ].push( { moduleConfig: installedModuleConfig, modulePath } )
            } else {
                deployStages[ deployStage ] = [ { moduleConfig: installedModuleConfig, modulePath } ]
            }

        } )
        return deployStages
    }

    private resolvePackagePrefix ( npmPackage: string ) : string {
        if( this.localMode ) {
            if(this.localPackages.hasOwnProperty(npmPackage)) {
                return this.localPackages[ npmPackage ]
            } else {
                throw new Error(`Unable to find local package location for ${npmPackage}`)
            }
        } else  {
            return path.resolve( `${ this.workingDir }/packages/${ CaefDeploy.hashCodeHex( npmPackage, this.npmTag ).replace( /^-/, "" ) }` )
        }
    }

    private installPackageToPrefix ( npmPackage: string ): string {

        const prefix = this.resolvePackagePrefix( npmPackage )
        const npmPackageNoVersion = npmPackage.replace( /(?<!^)@.*/, "" )

        if ( this.action == "dryrun" || this.localMode ) {
            console.log( `Skipping package installation. In local/dry run mode.` )
            return prefix
        }
        if ( !fs.existsSync( prefix ) ) {
            console.log( `Installing ${ npmPackage } to ${ prefix }` )
            //Install the module CDK App NPM package
            const npmInstallCmd = `npm install ${ this.npmDebug ? "-d" : "" } --no-fund --tag '${ this.npmTag }' --prefix '${ prefix }' '${ npmPackage }'`
            console.log( `Running NPM Install Cmd: \n${ npmInstallCmd }` )
            this.execCmd( `mkdir -p '${ prefix }' && ${ npmInstallCmd }` );
        } else {
            console.log( `Install prefix ${ prefix } already exists. Attempting update instead.` )
            if ( !this.updateCache[ prefix ] ) {
                const npmUpdateCmd = `npm update --no-fund --tag '${ this.npmTag }' --prefix '${ prefix }'`
                console.log( `Running NPM Update Cmd: \n${ npmUpdateCmd }` )
                this.execCmd( npmUpdateCmd );
                this.updateCache[ prefix ] = true
            } else {
                console.log( "Skipping update. Already updated this prefix." )
            }
        }
        return `${ prefix }/node_modules/${ npmPackageNoVersion }`
    }

    private computeModuleDeployStage (
        moduleConfig: ModuleEffectiveConfig,
        modulePath: string
    ): string {
        const moduleCaefDeployConfigFile = `${ modulePath }/caef.config.json`
        console.log( `Attempting to read module config from ${ moduleCaefDeployConfigFile }` )
        if ( fs.existsSync( moduleCaefDeployConfigFile ) ) {
            const moduleCaefDeployConfig = require( moduleCaefDeployConfigFile )
            if ( moduleCaefDeployConfig.hasOwnProperty( 'DEPLOY_STAGE' ) ) {
                const deployStage = moduleCaefDeployConfig[ 'DEPLOY_STAGE' ]
                console.log( `Set deploy stage for ${ moduleConfig.moduleName } ${ deployStage } by caef.config.json` )
                return deployStage
            }
        }
        console.log( `Set deploy stage for ${ moduleConfig.moduleName } to ${ CaefDeploy.DEFAULT_DEPLOY_STAGE } by default` )
        return CaefDeploy.DEFAULT_DEPLOY_STAGE
    }


    private deployModule ( moduleEffectiveConfig: ModuleEffectiveConfig, modulePath: string ) {
        console.log( `\n-----------------------------------------------------------` )
        console.log( `${ this.action.charAt( 0 ).toUpperCase() + this.action.slice( 1 ) }ing Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }` )
        console.log( `-----------------------------------------------------------` )

        if ( this.action != "dryrun" ) {
            const packageJsonPath = `${ modulePath }/package.json`
            const pjson = require( packageJsonPath );
            console.log( `Running CDK App ${ moduleEffectiveConfig.cdkApp } Version: ${ pjson.version }` );
        }

        const cdkCmd = this.createCdkCommand( moduleEffectiveConfig, modulePath )
        console.log( `Running CDK cmd:\n${ cdkCmd }` )

        if ( this.action != "dryrun" ) {
            this.execCmd( cdkCmd );
        }
    }



    private createCdkCommand (
        moduleEffectiveConfig: ModuleEffectiveConfig,
        modulePath: string
    ): string {

        const action = this.action == 'deploy' ? `${ this.action } --all` : this.action

        const cdkEnv: string[] = this.createCdkCommandEnv( moduleEffectiveConfig )
        const cdkCmd: string[] = []
        cdkCmd.push( `npx --loglevel=verbose ${ this.npmDebug ? "-d" : "" } cdk ${ action } --require-approval never` )
        cdkCmd.push( `-a 'npx --loglevel=verbose ${ this.npmDebug ? "-d" : "" } ${ modulePath }/'` )
        cdkCmd.push( `-o '${ this.workingDir }/cdk.out'` )
        cdkCmd.push( `-c 'org=${ this.config.contents.organization }'` )
        cdkCmd.push( `-c 'env=${ moduleEffectiveConfig.envName }'` )
        cdkCmd.push( `-c 'module_name=${ moduleEffectiveConfig.moduleName }'` )
        cdkCmd.push( `-c 'domain=${ moduleEffectiveConfig.domainName }'` )

        if ( this.config.contents.naming_module && this.config.contents.naming_class ) {
            cdkCmd.push( `-c 'naming_module=${ moduleEffectiveConfig.customNaming?.naming_module }'` )
            cdkCmd.push( `-c 'naming_class=${ moduleEffectiveConfig.customNaming?.naming_class }'` )
        } else if ( this.config.contents.naming_module || this.config.contents.naming_class ) {
            throw new Error( "Both 'naming_module' and 'naming_class' must be specified together." )
        }

        this.addOptionalCdkContextStringParam( cdkCmd, "output_effective_config", this.outputEffectiveConfig?.toString() )
        this.addOptionalCdkContextStringParam( cdkCmd, "use_bootstrap", moduleEffectiveConfig.useBootstrap?.toString() )
        this.addOptionalCdkContextStringParam( cdkCmd, "app_configs", moduleEffectiveConfig.appConfigFiles?.join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "tag_configs", moduleEffectiveConfig.tagConfigFiles?.join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "additional_accounts", moduleEffectiveConfig.additionalAccounts?.join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "log_suppressions", this.config.contents.log_suppressions?.toString() )
        this.addOptionalCdkContextObjParam( cdkCmd, "custom_aspects", moduleEffectiveConfig.customAspects )
        this.addOptionalCdkContextObjParam( cdkCmd, "app_config_data", moduleEffectiveConfig.effectiveAppConfig )
        this.addOptionalCdkContextObjParam( cdkCmd, "tag_config_data", moduleEffectiveConfig.effectiveTagConfig )

        if ( this.roleArn ) {
            cdkCmd.push( `-r '${ this.roleArn }'` )
        }

        cdkCmd.push( ...this.generateContextCdkParams( moduleEffectiveConfig ) )

        const execCmd = cdkEnv.length > 0 ? `${ cdkEnv.join( ";" ) };${ cdkCmd.join( ' \\\n\t' ) }` : cdkCmd.join( ' \\\n\t' )
        return execCmd
    }

    private addOptionalCdkContextStringParam ( cdkCmd: string[], context_key: string, context_value?: string ) {
        if ( context_value ) {
            cdkCmd.push( `-c '${ context_key }=${ context_value }'` )
        }
    }

    private addOptionalCdkContextObjParam ( cdkCmd: string[], context_key: string, context_value?: any ) {
        if ( context_value ) {
            if ( Object.keys( context_value ).length > 0 ) {
                const context_string_value = JSON.stringify( JSON.stringify( context_value ) )
                cdkCmd.push( `-c ${ context_key }=${ context_string_value }` )
            }
        }
    }

    private createCdkCommandEnv ( moduleEffectiveConfig: ModuleEffectiveConfig ): string[] {
        const cdkEnv: string[] = []
        if ( this.config.contents.region && this.config.contents.region.toLowerCase() != "default" ) {
            cdkEnv.push( `export CDK_DEPLOY_REGION=${ this.config.contents.region }` )
        }
        if ( moduleEffectiveConfig.deployAccount && moduleEffectiveConfig.deployAccount.toLowerCase() != "default" ) {
            cdkEnv.push( `export CDK_DEPLOY_ACCOUNT=${ moduleEffectiveConfig.deployAccount }` )
        }
        return cdkEnv
    }

    private generateContextCdkParams ( moduleEffectiveConfig: EffectiveConfig ): string[] {
        return Object.keys( moduleEffectiveConfig.effectiveContext ).map( contextKey => {
            const contextValue = moduleEffectiveConfig.effectiveContext[ contextKey ]
            let encodedContextValue: string
            if ( contextValue instanceof Array ) {
                let escaped = JSON.stringify( JSON.stringify( contextValue ) )
                escaped = escaped.substring( 1, escaped.length - 1 );
                encodedContextValue = `"list:${ escaped }"`
            } else if ( contextValue instanceof Object ) {
                let escaped = JSON.stringify( JSON.stringify( contextValue ) )
                escaped = escaped.substring( 1, escaped.length - 1 );
                encodedContextValue = `"obj:${ escaped }"`
            } else {
                encodedContextValue = contextValue
            }
            return `-c '${ contextKey }=${ encodedContextValue }'`
        } )
    }

    private computeDomainEffectiveConfig ( domainName: string, domain: CaefDomainConfig, globalEffectiveConfig: EffectiveConfig ): DomainEffectiveConfig {
        return {
            ...globalEffectiveConfig,
            effectiveContext: {
                ...globalEffectiveConfig.effectiveContext,
                ...domain.context || {}
            },
            effectiveAppConfig: {
                ...globalEffectiveConfig.effectiveAppConfig,
                ...domain.app_config_data || {}
            },
            effectiveTagConfig: {
                ...globalEffectiveConfig.effectiveTagConfig,
                ...domain.tag_config_data || {}
            },
            tagConfigFiles: [ ...globalEffectiveConfig.tagConfigFiles, ...domain.tag_configs || [] ],
            appConfigFiles: [ ...globalEffectiveConfig.appConfigFiles, ...domain.app_configs || [] ],
            domainName: domainName,
            effectiveCaefVersion: domain.caef_version || globalEffectiveConfig.effectiveCaefVersion,
            customAspects: [
                ...globalEffectiveConfig.customAspects,
                ...domain.custom_aspects || []
            ],
            customNaming: domain.custom_naming || globalEffectiveConfig.customNaming
        }
    }

    private computeEnvEffectiveConfig ( envName: string, env: CaefEnvironmentConfig, domainEffectiveConfig: DomainEffectiveConfig ): EnvEffectiveConfig {
        return {
            ...domainEffectiveConfig,
            effectiveContext: {
                ...domainEffectiveConfig.effectiveContext,
                ...env.context || {}
            },
            effectiveAppConfig: {
                ...domainEffectiveConfig.effectiveAppConfig,
                ...env.app_config_data || {}
            },
            effectiveTagConfig: {
                ...domainEffectiveConfig.effectiveTagConfig,
                ...env.tag_config_data || {}
            },
            tagConfigFiles: [ ...domainEffectiveConfig.tagConfigFiles, ...env.tag_configs || [] ],
            appConfigFiles: [ ...domainEffectiveConfig.appConfigFiles, ...env.app_configs || [] ],
            envName: envName,
            deployAccount: env.account,
            effectiveCaefVersion: env.caef_version || domainEffectiveConfig.effectiveCaefVersion,
            useBootstrap: env.use_bootstrap == undefined || env.use_bootstrap,
            customAspects: [
                ...domainEffectiveConfig.customAspects,
                ...env.custom_aspects || []
            ],
            customNaming: env.custom_naming || domainEffectiveConfig.customNaming

        }
    }

    private computeModuleEffectiveConfig ( caefModuleName: string, caefModule: CaefModuleConfig, envEffectiveConfig: EnvEffectiveConfig ): ModuleEffectiveConfig {
        return {
            ...envEffectiveConfig,
            effectiveContext: {
                ...envEffectiveConfig.effectiveContext,
                ...caefModule.context || {}
            },
            effectiveAppConfig: {
                ...envEffectiveConfig.effectiveAppConfig,
                ...caefModule.app_config_data || {}
            },
            effectiveTagConfig: {
                ...envEffectiveConfig.effectiveTagConfig,
                ...caefModule.tag_config_data || {}
            },
            cdkApp: caefModule.cdk_app,
            effectiveCaefVersion: caefModule.caef_version ? caefModule.caef_version : envEffectiveConfig.effectiveCaefVersion,
            tagConfigFiles: [ ...envEffectiveConfig.tagConfigFiles, ...caefModule.tag_configs || [] ],
            appConfigFiles: [ ...envEffectiveConfig.appConfigFiles, ...caefModule.app_configs || [] ],
            moduleName: caefModuleName,
            useBootstrap: envEffectiveConfig.useBootstrap && ( caefModule.use_bootstrap == undefined || caefModule.use_bootstrap ),
            customAspects: [
                ...envEffectiveConfig.customAspects || [],
                ...caefModule.custom_aspects || []
            ],
            customNaming: caefModule.custom_naming || envEffectiveConfig.customNaming,
            additionalAccounts: caefModule.additional_accounts
        }
    }

    private execCmd ( cmd: string ) {
        console.log( "-----------------" )
        require( 'child_process' ).execSync( cmd, { stdio: 'inherit' } )
        console.log( "-----------------\n" )
    }

    protected static hashCodeHex ( ...strings: string[] ) {
        let h = 0
        strings.forEach( s => {
            for ( let i = 0; i < s.length; i++ )
                h = Math.imul( 31, h ) + s.charCodeAt( i ) | 0;
        } )
        return h.toString( 16 );
    }

}

interface EffectiveConfig {
    effectiveContext: { [ key: string ]: any }
    effectiveAppConfig: { [ key: string ]: any }
    effectiveTagConfig: { [ key: string ]: string }
    appConfigFiles: string[]
    tagConfigFiles: string[]
    effectiveCaefVersion?: string
    customAspects: CaefCustomAspect[]
    customNaming?: CaefCustomNaming
}

interface DomainEffectiveConfig extends EffectiveConfig {
    domainName: string
}

interface EnvEffectiveConfig extends DomainEffectiveConfig {
    envName: string
    useBootstrap: boolean
    deployAccount?: string
}

interface ModuleEffectiveConfig extends EnvEffectiveConfig {
    cdkApp: string
    moduleName: string
    useBootstrap: boolean
    additionalAccounts?: string[]
}

