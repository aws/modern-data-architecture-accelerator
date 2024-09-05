/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomAspect, MdaaCustomNaming } from '@aws-mdaa/config';
import * as fs from 'fs';
import * as path from 'path';
import { MdaaCliConfig, MdaaDomainConfig, MdaaEnvironmentConfig, MdaaModuleConfig } from './mdaa-cli-config-parser';

export interface DeployStageMap { [ key: string ]: { moduleConfig: ModuleEffectiveConfig, modulePath: string, localModule: boolean }[] }

export class MdaaDeploy {
    private readonly config: MdaaCliConfig
    private readonly action: string
    private readonly cwd: string
    private readonly domainFilter?: string[]
    private readonly envFilter?: string[]
    private readonly moduleFilter?: string[]
    private readonly npmTag?: string
    private readonly roleArn?: string
    private readonly workingDir: string
    private readonly mdaaVersion?: string
    private readonly npmDebug: boolean;
    private readonly updateCache: { [ prefix: string ]: boolean } = {};
    private readonly devopsMode?: boolean
    private static readonly DEFAULT_DEPLOY_STAGE = "1"
    private readonly localPackages: { [ packageName: string ]: string }
    private readonly cdkPushdown?: string[]
    private readonly cdkVerbose?: boolean

    constructor( options: { [ key: string ]: string }, cdkPushdown?: string[], configContents?: { [ key: string ]: any } ) {
        this.action = options[ 'action' ]
        /* istanbul ignore next */
        if ( !this.action ) {
            throw new Error( "MDAA action must be specified on command line: mdaa <action>" )
        }
        this.cwd = process.cwd()
        this.mdaaVersion = options[ 'mdaa_version' ]
        this.domainFilter = options[ 'domain' ]?.split( "," ).map( x => x.trim() )
        this.envFilter = options[ 'env' ]?.split( "," ).map( x => x.trim() )
        this.moduleFilter = options[ 'module' ]?.split( "," ).map( x => x.trim() )
        this.roleArn = options[ 'role_arn' ]
        this.npmTag = options[ 'tag' ]
        // nosemgrep
        this.workingDir = options[ "working_dir" ] ? path.resolve( options[ "working_dir" ] ) : path.resolve( "./.mdaa_working" )
        this.npmDebug = this.booleanOption(options,'npm_debug')

        this.devopsMode = this.booleanOption( options, 'devops' )
        this.cdkPushdown = cdkPushdown
        this.cdkVerbose = this.booleanOption( options,'cdk_verbose' )

        if ( options['local_mode']) {
            console.log ("Use of -l flag no longer necessary. Execution mode is automatically determined.")
        }

        /* istanbul ignore next */
        if ( options[ 'clear' ] && this.action != 'dryrun' ) {
            console.log( `Removing all previously installed packages from ${ this.workingDir }/packages` )
            this.execCmd( `rm -rf '${ this.workingDir }/packages'` );
        }

        this.localPackages = this.loadLocalPackages() 

        if ( this.devopsMode ) {
            console.log( "Running MDAA in devops mode." )
        }
        const configFileName = options[ 'config' ] ?? "./mdaa.yaml"
        this.config = this.loadConfig(configFileName,configContents)
    }

    private booleanOption ( options: { [ key: string ]: string },name:string):boolean {
        return options[ name ] ? true : false
    }

    private loadConfig ( configFileName: string, configContents: {[key:string]:any} | undefined ): MdaaCliConfig {
        if ( configContents ) {
            return new MdaaCliConfig( { configContents: configContents } )
        } else {
            if ( !fs.existsSync( configFileName )){
                if ( configFileName == "./mdaa.yaml" ){
                    if ( fs.existsSync( "./caef.yaml" ) ){
                        console.warn("Default config file found at 'caef.yaml'.")
                        return new MdaaCliConfig( { filename: "./caef.yaml" } )
                    } else {
                        throw new Error("Cannot open default config file at 'mdaa.yaml' or 'caef.yaml'")
                    }
                } else {
                    throw new Error( `Cannot open config file at ${configFileName}` )
                }
            } else {
                return new MdaaCliConfig( { filename: configFileName } )
            }
        }
    }

    private loadLocalPackages () {
        // nosemgrep
        const workspaceQueryJson = require( 'child_process' ).execSync( `npm query .workspace --prefix '${ __dirname }/../../../'` ).toString()
        const workspace: any[] = JSON.parse( workspaceQueryJson )
        const localPackages =  Object.fromEntries( workspace.filter( pkgInfo => {
            return pkgInfo[ 'location' ].startsWith("packages/apps/")
        }).map( pkgInfo => {
            // nosemgrep
            return [ `${ pkgInfo[ 'name' ] }`, path.resolve( `${ __dirname }/../../../${ pkgInfo[ 'location' ] }` ) ]
        } ) )
        /* istanbul ignore next */
        if ( Object.entries( localPackages ).length  > 0) {
            console.log(`Loaded ${Object.entries(localPackages).length} MDAA modules from local codebase.`)
        }
        return localPackages
    }

    public deploy () {
        const globalEffectiveConfig: EffectiveConfig = {
            effectiveContext: this.config.contents.context || {},
            effectiveAppConfig: this.config.contents.app_config_data || {},
            effectiveTagConfig: this.config.contents.tag_config_data || {},
            tagConfigFiles: this.config.contents.tag_configs || [],
            appConfigFiles: this.config.contents.app_configs || [],
            effectiveMdaaVersion: this.config.contents.mdaa_version || this.mdaaVersion,
            customAspects: this.config.contents.custom_aspects || [],
            customNaming: this.config.contents.naming_module && this.config.contents.naming_class ? { naming_module: this.config.contents.naming_module, naming_class: this.config.contents.naming_class, naming_props: this.config.contents.naming_props } : undefined,
            envTemplates: this.config.contents.env_templates || {}
        }
        this.deployDomains( globalEffectiveConfig )
        if ( this.devopsMode ) {
            this.deployDevOps( globalEffectiveConfig )
        }
    }

    private deployDevOps ( effectiveConfig: EffectiveConfig ) {
        const devopsModuleConfig: ModuleEffectiveConfig = {
            ...effectiveConfig,
            cdkApp: '@aws-mdaa/devops',
            moduleName: 'devops',
            useBootstrap: false,
            envName: 'multi-envs',
            domainName: 'multi-domains',
            effectiveAppConfig: this.config.contents.devops || {}
        }
        const [ modulePath, localModule ] = this.prepPackage('devops', '@aws-mdaa/devops' )
        this.deployModule( devopsModuleConfig, modulePath, localModule )
    }

    private deployDomains ( globalEffectiveConfig: EffectiveConfig ) {
        if ( this.domainFilter  && !this.devopsMode) {
            console.log( `Filtering for domain(s) ${ this.domainFilter }` )
        }

        Object.keys( this.config.contents.domains ).filter( domainName => this.devopsMode || this.domainFilter == undefined || this.domainFilter?.includes( domainName ) ).forEach( domainName => {
            const domain = this.config.contents.domains[ domainName ]
            const domainEffectiveConfig: DomainEffectiveConfig = this.computeDomainEffectiveConfig( domainName, domain, globalEffectiveConfig )
            this.deployDomain( domain, domainEffectiveConfig )
        } )
    }



    public deployDomain (
        domain: MdaaDomainConfig,
        domainEffectiveConfig: DomainEffectiveConfig ) {
        if(!this.devopsMode){
            console.log( `-----------------------------------------------------------` )
            console.log( `Domain ${ domainEffectiveConfig.domainName }: Running ${ this.action}` )
            console.log( `-----------------------------------------------------------` )
        }
        if ( this.envFilter && !this.devopsMode ) {
            console.log( `Domain ${ domainEffectiveConfig.domainName }: Filtering for env ${ this.envFilter }` )
        }
        Object.keys( domain.environments ).filter( envName => this.devopsMode || this.envFilter == undefined || this.envFilter?.includes( envName ) ).forEach( envName => {
            const env = domain.environments[ envName ]
            if ( env.template && ( !domainEffectiveConfig.envTemplates || !domainEffectiveConfig.envTemplates[ env.template ] ) ) {
                throw new Error( `Environment "${envName}" references invalid template name: ${env.template}.` )
            }
            const template = env.template && domainEffectiveConfig.envTemplates ? domainEffectiveConfig.envTemplates[ env.template ] : {}
            // nosemgrep
            let _ = require( 'lodash' );
            const envMergedConfig = _.mergeWith( env, template )
            const envEffectiveConfig: EnvEffectiveConfig = this.computeEnvEffectiveConfig( envName, envMergedConfig, domainEffectiveConfig )
            this.deployEnv( envMergedConfig, envEffectiveConfig )
        } )
    }

    private deployEnv (
        env: MdaaEnvironmentConfig,
        envEffectiveConfig: EnvEffectiveConfig ) {

        if(!env.modules) {
            throw new Error(`Cannot deploy environment "${envEffectiveConfig.envName}" with no modules.`)
        }

        if ( this.moduleFilter && !this.devopsMode ) {
            console.log( `Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName}: Filtering for module ${ this.moduleFilter }` )
        }
        if ( envEffectiveConfig.useBootstrap ) {
            const bootstrapModule: MdaaModuleConfig = {
                cdk_app: '@aws-mdaa/bootstrap'
            }
            env.modules[ 'caef-bootstrap' ] = bootstrapModule
        }

        const moduleEffectiveConfigs = Object.entries( env.modules ).map( entry => {
            const moduleEffectiveConfig = this.computeModuleEffectiveConfig( entry[ 0 ], entry[ 1 ], envEffectiveConfig )
            return moduleEffectiveConfig
        } )
        if(!this.devopsMode) {
            this.deployEnvModules( envEffectiveConfig, moduleEffectiveConfigs )
        } else {
            moduleEffectiveConfigs.forEach(config => {
                this.testModuleEffectiveConfigForPipelines(config)
            })
        }
    }

    private testModuleEffectiveConfigForPipelines (moduleEffectiveConfig: ModuleEffectiveConfig){
        const pipelines = Object.entries(this.config.contents.devops?.pipelines || {}).filter(pipelineEntry => {
            const pipelineConfig = pipelineEntry[1]
            return (pipelineConfig.domainFilter == undefined || pipelineConfig.domainFilter?.includes( moduleEffectiveConfig.domainName )) &&
                ( pipelineConfig.envFilter == undefined || pipelineConfig.envFilter?.includes( moduleEffectiveConfig.envName ) ) &&
                ( pipelineConfig.moduleFilter == undefined || pipelineConfig.moduleFilter?.includes( moduleEffectiveConfig.moduleName ) )
        }).map(entry => entry[0])
        if(pipelines.length == 1) {
            console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName} will be deployed via pipeline ${pipelines[0]}` )
        } else if(pipelines.length > 1) {
            throw new Error( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName} matches multiple pipeline filters: ${pipelines}`)
        } else {
            console.warn( `WARNING: Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName} matches no pipeline filters`)
        }
    }

    private deployEnvModules ( envEffectiveConfig: EnvEffectiveConfig, moduleEffectiveConfigs: ModuleEffectiveConfig[] ) {
        console.log( `-----------------------------------------------------------` )
        console.log( `Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName }: Prepping Modules and Computing Stages` )
        console.log( `-----------------------------------------------------------` )
        const envDeployStages: DeployStageMap = this.computeEnvDeployStages( moduleEffectiveConfigs )
        if ( !this.devopsMode ) {
            console.log( `-----------------------------------------------------------` )
            console.log( `Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName }: Running ${ this.action}` )
            console.log( `-----------------------------------------------------------` )
        }
        const orderedStages = this.action == "destroy" ? Object.keys( envDeployStages ).sort( ( a, b ) => ( +a - +b ) ).reverse() : Object.keys( envDeployStages ).sort( ( a, b ) => ( +a - +b ) )
        orderedStages.forEach( stage => {
            console.log( `Env ${ envEffectiveConfig.domainName }/${ envEffectiveConfig.envName } Running MDAA stage ${ stage }` )
            const stageApps = envDeployStages[ stage ]
            stageApps.forEach( module => {
                this.deployModule( module.moduleConfig, module.modulePath, module.localModule )
            } )
        } )
    }

    private computeEnvDeployStages ( moduleEffectiveConfigs: ModuleEffectiveConfig[] ): DeployStageMap {
        const deployStages: DeployStageMap = {}

        moduleEffectiveConfigs.filter( moduleEffectiveConfig => this.devopsMode|| this.moduleFilter == undefined || this.moduleFilter?.includes( moduleEffectiveConfig.moduleName ) ).forEach( moduleEffectiveConfig => {
            const logPrefix = `${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }`
            
            const effectivePackageVersion = moduleEffectiveConfig.effectiveMdaaVersion || this.npmTag

            const initialCdkAppNpmPackage = effectivePackageVersion ? `${ moduleEffectiveConfig.cdkApp }@${ effectivePackageVersion }` : moduleEffectiveConfig.cdkApp

            const finalModuleCdkAppNpmPackage = moduleEffectiveConfig.cdkApp.replace( /^@/, "" ).includes( '@' ) ?
                moduleEffectiveConfig.cdkApp : initialCdkAppNpmPackage
                
            console.log( `Module ${ logPrefix}: Prepping packages` )
            const [ modulePath, localModule ] = this.prepPackage( logPrefix, finalModuleCdkAppNpmPackage.replace(/caef/,"mdaa") )

            const customNamingModulePath = moduleEffectiveConfig.customNaming && moduleEffectiveConfig.customNaming.naming_module.startsWith( "@" ) ?
                this.prepPackage( logPrefix, moduleEffectiveConfig.customNaming.naming_module ) : moduleEffectiveConfig.customNaming?.naming_module

            const installedCustomNamingModule: MdaaCustomNaming | undefined = customNamingModulePath ? {
                naming_module: `${ customNamingModulePath }`,
                naming_class: moduleEffectiveConfig.customNaming?.naming_class || '',
                naming_props: moduleEffectiveConfig.customNaming?.naming_props

            } : undefined

            const installedCustomAspects: MdaaCustomAspect[] = moduleEffectiveConfig.customAspects?.map( customAspect => {
                const [customAspectPath, _localModule] = customAspect.aspect_module.startsWith( "@" ) ?
                    this.prepPackage( logPrefix, customAspect.aspect_module ) : [customAspect.aspect_module, true]
                return {
                    aspect_module: customAspectPath,
                    aspect_class: customAspect.aspect_class,
                    aspect_props: customAspect.aspect_props
                }
            } )

            const installedModuleConfig: ModuleEffectiveConfig = {
                ...moduleEffectiveConfig,
                customAspects: installedCustomAspects,
                customNaming: installedCustomNamingModule
            }

            const deployStage = this.computeModuleDeployStage( installedModuleConfig, modulePath )
            if ( deployStages[ deployStage ] ) {
                deployStages[ deployStage ].push( { moduleConfig: installedModuleConfig, modulePath, localModule } )
            } else {
                deployStages[ deployStage ] = [ { moduleConfig: installedModuleConfig, modulePath, localModule } ]
            }

        } )
        return deployStages
    }

    private prepLocalPackage ( logPrefix:string,npmPackage: string, npmPackageNoVersion: string ) :string {
        const prefix = this.localPackages[ npmPackage ]
        /* istanbul ignore next */
        if ( this.action == "dryrun" ) {
            console.log( `Module ${ logPrefix}: Skipping package build. In dry run mode.` )
        } else {
            console.log( `Module ${ logPrefix}: Package ${ npmPackageNoVersion } found in local codebase. Running build.` )
            const buildCmd = `npx lerna run build --scope ${ npmPackageNoVersion } --loglevel warn`
            // console.log( `Running Lerna Build: ${ buildCmd }` )
            this.execCmd( `cd '${ __dirname }/../../';${ buildCmd } > /dev/null;cd '${ this.cwd }'` );
        }
        return prefix
    }

    private installPackage ( logPrefix:string, npmPackage: string, npmPackageNoVersion: string ) : string {
        const prefix = path.resolve( `${ this.workingDir }/packages/${ MdaaDeploy.hashCodeHex( npmPackage, this.npmTag || "latest" ).replace( /^-/, "" ) }` )
        console.log( `Module ${ logPrefix}: Prepping NPM Package ${npmPackage}`)
        /* istanbul ignore next */
        if ( this.action == "dryrun" ) {
            console.log( `Module ${ logPrefix}: Skipping package installation. In dry run mode.` )
            return prefix
        }
        // nosemgrep
        /* istanbul ignore next */
        if ( !fs.existsSync( `${prefix}/package.json` ) ) {
            console.log( `Module ${ logPrefix}: Installing ${npmPackage} to ${ prefix }.` )
            //Install the module CDK App NPM package
            const npmInstallCmd = `npm install --no-fund --tag '${ this.npmTag }' --prefix '${ prefix }' '${ npmPackage }' ${ this.npmDebug ? "-d" : " > /dev/null" }`
            // console.log( `Running NPM Install Cmd: ${ npmInstallCmd }` )
            this.execCmd( `mkdir -p '${ prefix }' && ${ npmInstallCmd }` );
        } else {
            console.log( `Module ${ logPrefix}: Install prefix ${ prefix } already exists. Attempting update instead.` )
            if ( !this.updateCache[ prefix ] ) {
                const npmUpdateCmd = `npm update --no-fund --tag '${ this.npmTag }' --prefix '${ prefix }' ${ this.npmDebug ? "-d" : " > /dev/null" }`
                // console.log( `Running NPM Update Cmd: ${ npmUpdateCmd }` )
                this.execCmd( npmUpdateCmd );
                this.updateCache[ prefix ] = true
            } else {
                console.log( `Module ${ logPrefix}: Skipping update. Already updated this prefix.` )
            }
        }
        return `${ prefix }/node_modules/${ npmPackageNoVersion }`
    }

    private prepPackage (logPrefix:string, npmPackage: string ): [string, boolean] {
        const npmPackageNoVersion = npmPackage.replace( /(?<!^)@.*/, "" )
        if (this.localPackages.hasOwnProperty( npmPackage ) ) {
            return [ this.prepLocalPackage(logPrefix,npmPackage,npmPackageNoVersion), true]
        } else {
            return [ this.installPackage(logPrefix,npmPackage,npmPackageNoVersion), false]
        }
    }

    private computeModuleDeployStage (
        moduleEffectiveConfig: ModuleEffectiveConfig,
        modulePath: string
    ): string {
        const moduleMdaaDeployConfigFile = `${ modulePath }/mdaa.config.json`
        // nosemgrep
        if ( fs.existsSync( moduleMdaaDeployConfigFile ) ) {
            // nosemgrep
            const moduleMdaaDeployConfig = require( moduleMdaaDeployConfigFile )
            if ( moduleMdaaDeployConfig.hasOwnProperty( 'DEPLOY_STAGE' ) ) {
                const deployStage = moduleMdaaDeployConfig[ 'DEPLOY_STAGE' ]
                console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: Set deploy stage to ${ deployStage } by mdaa.config.json` )
                return deployStage
            }
        }
        console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: Set deploy stage to ${ MdaaDeploy.DEFAULT_DEPLOY_STAGE } by default` )
        return MdaaDeploy.DEFAULT_DEPLOY_STAGE
    }


    private deployModule ( moduleEffectiveConfig: ModuleEffectiveConfig, modulePath: string, localModule: boolean ) {
        if ( !this.devopsMode ) {
            console.log( `\n-----------------------------------------------------------` )
            console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: Running ${this.action}` )
            console.log( `-----------------------------------------------------------` )
        }
        /* istanbul ignore next */
        if ( this.action != "dryrun" ) {
            const packageJsonPath = `${ modulePath }/package.json`
            // nosemgrep
            const pjson = require( packageJsonPath );
            console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: Running CDK App ${ moduleEffectiveConfig.cdkApp } Version: ${ pjson.version }` );
        }

        const cdkCmd = this.createCdkCommand( moduleEffectiveConfig,modulePath,localModule )
        console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: Running CDK cmd:\n${ cdkCmd }` )
        /* istanbul ignore next */
        if ( this.action != "dryrun" ) {
            this.execCmd( `cd '${ modulePath }' && ${ cdkCmd }` );
        }
    }

    private createCdkCommand (
        moduleEffectiveConfig: ModuleEffectiveConfig,
        modulePath: string,
        localModule: boolean
    ): string {

        const action = this.action == 'deploy' ? `${ this.action } --all` : this.action

        const cdkEnv: string[] = this.createCdkCommandEnv( moduleEffectiveConfig )
        const cdkCmd: string[] = []
        cdkCmd.push( `npx ${ this.npmDebug ? "-d" : "" } cdk ${ action } ${this.cdkVerbose ? "-v": ""} --require-approval never` )
        
        if ( !localModule ) {
            cdkCmd.push( `-a 'npx ${ this.npmDebug ? "-d" : "" } ${ modulePath }/'` )
        }

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
        this.addOptionalCdkContextStringParam( cdkCmd, "use_bootstrap", moduleEffectiveConfig.useBootstrap?.toString() )
        this.addOptionalCdkContextStringParam( cdkCmd, "app_configs", moduleEffectiveConfig.appConfigFiles?.map( x => path.resolve( x ) ).join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "tag_configs", moduleEffectiveConfig.tagConfigFiles?.map( x => path.resolve( x ) ).join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "additional_accounts", moduleEffectiveConfig.additionalAccounts?.join( ',' ) )
        this.addOptionalCdkContextStringParam( cdkCmd, "log_suppressions", this.config.contents.log_suppressions?.toString() )
        this.addOptionalCdkContextObjParam( cdkCmd, "custom_aspects", moduleEffectiveConfig.customAspects )
        this.addOptionalCdkContextObjParam( cdkCmd, "app_config_data", moduleEffectiveConfig.effectiveAppConfig )
        this.addOptionalCdkContextObjParam( cdkCmd, "tag_config_data", moduleEffectiveConfig.effectiveTagConfig )

        if ( this.roleArn ) {
            cdkCmd.push( `-r '${ this.roleArn }'` )
        }

        cdkCmd.push( ...this.generateContextCdkParams( moduleEffectiveConfig ) )

        if ( this.cdkPushdown ) {
            console.log( `Module ${ moduleEffectiveConfig.domainName }/${ moduleEffectiveConfig.envName }/${ moduleEffectiveConfig.moduleName }: CDK Pushdown Options: ${ JSON.stringify( this.cdkPushdown, undefined, 2 ) }` )
            cdkCmd.push( ...this.cdkPushdown )

        }

        const execCmd = cdkEnv.length > 0 ? `${ cdkEnv.join( " && " ) } && ${ cdkCmd.join( ' \\\n\t' ) }` : cdkCmd.join( ' \\\n\t' )
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
        /* istanbul ignore next */
        if ( this.config.contents.region && this.config.contents.region.toLowerCase() != "default" ) {
            cdkEnv.push( `export CDK_DEPLOY_REGION=${ this.config.contents.region }` )
        }
        /* istanbul ignore next */
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

    private computeDomainEffectiveConfig ( domainName: string, domain: MdaaDomainConfig, globalEffectiveConfig: EffectiveConfig ): DomainEffectiveConfig {
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
            envTemplates: {...globalEffectiveConfig.envTemplates,...domain.env_templates},
            tagConfigFiles: [ ...globalEffectiveConfig.tagConfigFiles, ...domain.tag_configs || [] ],
            appConfigFiles: [ ...globalEffectiveConfig.appConfigFiles, ...domain.app_configs || [] ],
            domainName: domainName,
            effectiveMdaaVersion: domain.mdaa_version || globalEffectiveConfig.effectiveMdaaVersion,
            customAspects: [
                ...globalEffectiveConfig.customAspects,
                ...domain.custom_aspects || []
            ],
            customNaming: domain.custom_naming || globalEffectiveConfig.customNaming
        }
    }

    private computeEnvEffectiveConfig ( envName: string, env: MdaaEnvironmentConfig, domainEffectiveConfig: DomainEffectiveConfig ): EnvEffectiveConfig {
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
            effectiveMdaaVersion: env.mdaa_version || domainEffectiveConfig.effectiveMdaaVersion,
            useBootstrap: env.use_bootstrap == undefined || env.use_bootstrap,
            customAspects: [
                ...domainEffectiveConfig.customAspects,
                ...env.custom_aspects || []
            ],
            customNaming: env.custom_naming || domainEffectiveConfig.customNaming

        }
    }

    private computeModuleEffectiveConfig ( mdaaModuleName: string, mdaaModule: MdaaModuleConfig, envEffectiveConfig: EnvEffectiveConfig ): ModuleEffectiveConfig {
        return {
            ...envEffectiveConfig,
            effectiveContext: {
                ...envEffectiveConfig.effectiveContext,
                ...mdaaModule.context || {}
            },
            effectiveAppConfig: {
                ...envEffectiveConfig.effectiveAppConfig,
                ...mdaaModule.app_config_data || {}
            },
            effectiveTagConfig: {
                ...envEffectiveConfig.effectiveTagConfig,
                ...mdaaModule.tag_config_data || {}
            },
            cdkApp: mdaaModule.cdk_app,
            effectiveMdaaVersion: mdaaModule.mdaa_version ? mdaaModule.mdaa_version : envEffectiveConfig.effectiveMdaaVersion,
            tagConfigFiles: [ ...envEffectiveConfig.tagConfigFiles, ...mdaaModule.tag_configs || [] ],
            appConfigFiles: [ ...envEffectiveConfig.appConfigFiles, ...mdaaModule.app_configs || [] ],
            moduleName: mdaaModuleName,
            useBootstrap: envEffectiveConfig.useBootstrap && ( mdaaModule.use_bootstrap == undefined || mdaaModule.use_bootstrap ),
            customAspects: [
                ...envEffectiveConfig.customAspects || [],
                ...mdaaModule.custom_aspects || []
            ],
            customNaming: mdaaModule.custom_naming || envEffectiveConfig.customNaming,
            additionalAccounts: mdaaModule.additional_accounts
        }
    }

    /* istanbul ignore next */
    private execCmd ( cmd: string ) {
        // nosemgrep
        require( 'child_process' ).execSync( cmd, { stdio: 'inherit' } )
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
    effectiveMdaaVersion?: string
    customAspects: MdaaCustomAspect[]
    customNaming?: MdaaCustomNaming
    envTemplates?: { [ key: string ]: MdaaEnvironmentConfig }
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

