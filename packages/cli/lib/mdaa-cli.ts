/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigurationElement,
  MdaaConfigParamRefValueTransformerProps,
  MdaaConfigRefValueTransformer,
  MdaaCustomAspect,
  MdaaCustomNaming,
  TagElement,
} from '@aws-mdaa/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  Deployment,
  MdaaCliConfig,
  MdaaDomainConfig,
  MdaaEnvironmentConfig,
  MdaaModuleConfig,
  TerraformConfig,
} from './mdaa-cli-config-parser';
import { DuplicateAccountLevelModulesException } from './exceptions';
import {
  DomainEffectiveConfig,
  EffectiveConfig,
  EnvEffectiveConfig,
  ModuleDeploymentConfig,
  ModuleEffectiveConfig,
} from './config-types';
import { getMdaaConfig } from './module-service';
import { findDuplicates, generateContextCdkParams, isBoolean } from './utils';
import { loadLocalPackages } from './package-helper';

export interface DeployStageMap {
  [key: string]: ModuleDeploymentConfig[];
}

export class MdaaDeploy {
  private readonly config: MdaaCliConfig;
  private readonly action: string;
  private readonly cwd: string;
  private readonly domainFilter?: string[];
  private readonly envFilter?: string[];
  private readonly moduleFilter?: string[];
  private readonly npmTag?: string;
  private readonly roleArn?: string;
  private readonly workingDir: string;
  private readonly mdaaVersion?: string;
  private readonly npmDebug: boolean;
  private readonly updateCache: { [prefix: string]: boolean } = {};
  private readonly devopsMode?: boolean;
  private static readonly DEFAULT_DEPLOY_STAGE = '1';
  private readonly localPackages: { [packageName: string]: string };
  private readonly cdkPushdown?: string[];
  private readonly cdkVerbose?: boolean;
  private readonly testMode: boolean;
  private readonly noFail: boolean;

  private static readonly TF_ACTION_MAPPINGS: { [key: string]: string } = {
    list: 'validate',
    ls: 'validate',
    synth: 'validate',
    diff: 'plan',
    deploy: 'apply',
    destroy: 'destroy',
  };

  constructor(options: { [key: string]: string }, cdkPushdown?: string[], configContents?: ConfigurationElement) {
    this.action = options['action'];
    /* istanbul ignore next */
    if (!this.action) {
      throw new Error('MDAA action must be specified on command line: mdaa <action>');
    }
    this.noFail = this.booleanOption(options, 'nofail');
    this.testMode = this.booleanOption(options, 'testing');
    this.cwd = process.cwd();
    this.mdaaVersion = options['mdaa_version'];
    this.domainFilter = options['domain']?.split(',').map(x => x.trim());
    this.envFilter = options['env']?.split(',').map(x => x.trim());
    this.moduleFilter = options['module']?.split(',').map(x => x.trim());
    this.roleArn = options['role_arn'];
    this.npmTag = options['tag'];
    // nosemgrep
    this.workingDir = options['working_dir'] ? path.resolve(options['working_dir']) : path.resolve('./.mdaa_working');
    console.log(`Set MDAA working directory to ${this.workingDir}`);
    this.npmDebug = this.booleanOption(options, 'npm_debug');

    this.devopsMode = this.booleanOption(options, 'devops');
    this.cdkPushdown = cdkPushdown;
    this.cdkVerbose = this.booleanOption(options, 'cdk_verbose');

    const configFileName = options['config'] ?? './mdaa.yaml';
    this.config = this.loadConfig(configFileName, configContents);

    if (options['local_mode']) {
      console.log('Use of -l flag no longer necessary. Execution mode is automatically determined.');
    }

    /* istanbul ignore next */
    if (options['clear']) {
      console.log(`Removing all previously installed Node.JS packages from ${this.workingDir}/nodejs`);
      this.execCmd(`rm -rf '${this.workingDir}/nodejs'`);
      console.log(`Removing all previously installed Python packages from ${this.workingDir}/python`);
      this.execCmd(`rm -rf '${this.workingDir}/python'`);
    }

    this.localPackages = loadLocalPackages();

    if (this.devopsMode) {
      console.log('Running MDAA in devops mode.');
    }
  }

  private installPython() {
    const commandExists = require('command-exists');
    const pipCommandExists = commandExists.sync('pip');
    const pip3CommandExists = commandExists.sync('pip3');
    /* istanbul ignore next */
    if (pipCommandExists) {
      const pipCmd = `pip install --upgrade -q -r ${__dirname}/../requirements.txt -t ${this.workingDir}/python`;
      console.log(`Found pip. Installing python with cmd: ${pipCmd}`);
      this.execCmd(pipCmd);
    } else if (pip3CommandExists) {
      const pipCmd = `pip3 install --upgrade -q -r ${__dirname}/../requirements.txt -t ${this.workingDir}/python`;
      console.log(`Found pip3. Installing python with cmd: ${pipCmd}`);
      this.execCmd(pipCmd);
    } else {
      throw new Error('pip not available');
    }
  }

  private booleanOption(options: { [key: string]: string }, name: string): boolean {
    return !!options[name];
  }

  private loadConfig(configFileName: string, configContents: ConfigurationElement | undefined): MdaaCliConfig {
    if (configContents) {
      return new MdaaCliConfig({ configContents: configContents });
    } else {
      if (!fs.existsSync(configFileName)) {
        if (configFileName == './mdaa.yaml') {
          if (fs.existsSync('./caef.yaml')) {
            console.warn("Default config file found at 'caef.yaml'.");
            return new MdaaCliConfig({ filename: './caef.yaml' });
          } else {
            throw new Error("Cannot open default config file at 'mdaa.yaml' or 'caef.yaml'");
          }
        } else {
          throw new Error(`Cannot open config file at ${configFileName}`);
        }
      } else {
        return new MdaaCliConfig({ filename: configFileName });
      }
    }
  }

  public sanityCheck() {
    const accountLevelModuleCountMap: Record<string, Record<string, number>> = {};
    const globalEffectiveConfig = this.createGlobalEffectiveConfig();
    Object.entries(this.config.contents.domains).forEach(([domainName, domain]) => {
      const domainEffectiveConfig: DomainEffectiveConfig = this.computeDomainEffectiveConfig(
        domainName,
        domain,
        globalEffectiveConfig,
      );
      return Object.entries(domain.environments).forEach(([envName, env]) => {
        const [envMergedConfig, envEffectiveConfig] = this.determineEnvEffectiveConfig(
          env,
          envName,
          domainEffectiveConfig,
        );
        const account = envMergedConfig.account ?? 'default';
        const region = envMergedConfig.region ?? 'default';
        const accountRegion = `${account}/${region}`;
        return Object.entries(envMergedConfig.modules ?? {}).forEach(([moduleName, module]) => {
          const moduleEffectiveConfig = this.computeModuleEffectiveConfig(moduleName, module, envEffectiveConfig);

          if (getMdaaConfig(moduleEffectiveConfig, 'ACCOUNT_LEVEL_MODULE', isBoolean)) {
            if (accountLevelModuleCountMap[accountRegion] == null) {
              accountLevelModuleCountMap[accountRegion] = {};
            }
            const moduleCountMap = accountLevelModuleCountMap[accountRegion];
            moduleCountMap[moduleName] = (moduleCountMap[moduleName] ?? 0) + 1;
          }
        });
      });
    });
    const duplicates = findDuplicates(accountLevelModuleCountMap);
    if (duplicates.length > 0) throw new DuplicateAccountLevelModulesException(duplicates);
  }

  public deploy() {
    this.installPython();

    const globalEffectiveConfig: EffectiveConfig = this.createGlobalEffectiveConfig();
    this.deployDomains(globalEffectiveConfig);
    if (this.devopsMode) {
      this.deployDevOps(globalEffectiveConfig);
    }
  }

  private deployDevOps(effectiveConfig: EffectiveConfig) {
    const devopsModuleConfig: ModuleEffectiveConfig = {
      ...effectiveConfig,
      modulePath: '@aws-mdaa/devops',
      moduleName: 'devops',
      useBootstrap: false,
      envName: 'multi-envs',
      domainName: 'multi-domains',
      effectiveModuleConfig: (this.config.contents.devops || {}) as ConfigurationElement,
    };

    const devOpsModuleDeploymentConfig = this.prepCdkModule(devopsModuleConfig);
    this.deployModule(devOpsModuleDeploymentConfig);
  }

  private deployDomains(globalEffectiveConfig: EffectiveConfig) {
    if (this.domainFilter && !this.devopsMode) {
      console.log(`Filtering for domain(s) ${this.domainFilter}`);
    }

    this.reverse(
      Object.keys(this.config.contents.domains).filter(
        domainName => this.devopsMode || this.domainFilter == undefined || this.domainFilter?.includes(domainName),
      ),
    ).forEach(domainName => {
      const domain = this.config.contents.domains[domainName];
      const domainEffectiveConfig: DomainEffectiveConfig = this.computeDomainEffectiveConfig(
        domainName,
        domain,
        globalEffectiveConfig,
      );
      this.deployDomain(domain, domainEffectiveConfig);
    });
  }

  public deployDomain(domain: MdaaDomainConfig, domainEffectiveConfig: DomainEffectiveConfig) {
    if (!this.devopsMode) {
      console.log(`-----------------------------------------------------------`);
      console.log(`Domain ${domainEffectiveConfig.domainName}: Running ${this.action}`);
      console.log(`-----------------------------------------------------------`);
    }
    if (this.envFilter && !this.devopsMode) {
      console.log(`Domain ${domainEffectiveConfig.domainName}: Filtering for env ${this.envFilter}`);
    }
    this.reverse(
      Object.keys(domain.environments).filter(
        envName => this.devopsMode || this.envFilter == undefined || this.envFilter?.includes(envName),
      ),
    ).forEach(envName => {
      const env = domain.environments[envName];
      if (env.template && (!domainEffectiveConfig.envTemplates || !domainEffectiveConfig.envTemplates[env.template])) {
        throw new Error(`Environment "${envName}" references invalid template name: ${env.template}.`);
      }
      const template =
        env.template && domainEffectiveConfig.envTemplates ? domainEffectiveConfig.envTemplates[env.template] : {};
      // nosemgrep
      const _ = require('lodash');
      const envMergedConfig = _.mergeWith(env, template);
      const envEffectiveConfig: EnvEffectiveConfig = this.computeEnvEffectiveConfig(
        envName,
        envMergedConfig,
        domainEffectiveConfig,
      );
      this.deployEnv(envMergedConfig, envEffectiveConfig);
    });
  }

  private deployEnv(env: MdaaEnvironmentConfig, envEffectiveConfig: EnvEffectiveConfig) {
    if (!env.modules) {
      throw new Error(`Cannot deploy environment "${envEffectiveConfig.envName}" with no modules.`);
    }

    if (this.moduleFilter && !this.devopsMode) {
      console.log(
        `Env ${envEffectiveConfig.domainName}/${envEffectiveConfig.envName}: Filtering for module ${this.moduleFilter}`,
      );
    }
    if (envEffectiveConfig.useBootstrap) {
      env.modules['caef-bootstrap'] = {
        module_path: '@aws-mdaa/bootstrap',
      };
    }

    const moduleEffectiveConfigs = Object.entries(env.modules).map(entry => {
      return this.computeModuleEffectiveConfig(entry[0], entry[1], envEffectiveConfig);
    });

    if (!this.devopsMode) {
      this.deployEnvModules(envEffectiveConfig, moduleEffectiveConfigs);
    } else {
      moduleEffectiveConfigs.forEach(config => {
        this.testModuleEffectiveConfigForPipelines(config);
      });
    }
  }

  private testModuleEffectiveConfigForPipelines(moduleEffectiveConfig: ModuleEffectiveConfig) {
    const pipelines = Object.entries(this.config.contents.devops?.pipelines || {})
      .filter(pipelineEntry => {
        const pipelineConfig = pipelineEntry[1];
        return (
          (pipelineConfig.domainFilter == undefined ||
            pipelineConfig.domainFilter?.includes(moduleEffectiveConfig.domainName)) &&
          (pipelineConfig.envFilter == undefined ||
            pipelineConfig.envFilter?.includes(moduleEffectiveConfig.envName)) &&
          (pipelineConfig.moduleFilter == undefined ||
            pipelineConfig.moduleFilter?.includes(moduleEffectiveConfig.moduleName))
        );
      })
      .map(entry => entry[0]);
    if (pipelines.length == 1) {
      console.log(
        `Module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName} will be deployed via pipeline ${pipelines[0]}`,
      );
    } else if (pipelines.length > 1) {
      throw new Error(
        `Module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName} matches multiple pipeline filters: ${pipelines}`,
      );
    } else {
      console.warn(
        `WARNING: Module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName} matches no pipeline filters`,
      );
    }
  }

  private deployEnvModules(envEffectiveConfig: EnvEffectiveConfig, moduleEffectiveConfigs: ModuleEffectiveConfig[]) {
    console.log(`-----------------------------------------------------------`);
    console.log(
      `Env ${envEffectiveConfig.domainName}/${envEffectiveConfig.envName}: Prepping Modules and Computing Stages`,
    );
    console.log(`-----------------------------------------------------------`);

    const envDeployStages: DeployStageMap = this.computeEnvDeployStages(moduleEffectiveConfigs);

    if (!this.devopsMode) {
      console.log(`-----------------------------------------------------------`);
      console.log(`Env ${envEffectiveConfig.domainName}/${envEffectiveConfig.envName}: Running ${this.action}`);
      console.log(`-----------------------------------------------------------`);
    }

    this.reverse(Object.keys(envDeployStages).sort((a, b) => +a - +b)).forEach(stage => {
      console.log(`Env ${envEffectiveConfig.domainName}/${envEffectiveConfig.envName} Running MDAA stage ${stage}`);
      this.reverse(envDeployStages[stage]).forEach(module => {
        this.deployModule(module);
      });
    });
  }

  private reverse<T>(elements: T[]): T[] {
    if (this.action == 'destroy') {
      return [...elements.reverse()];
    }
    return elements;
  }

  private computeEnvDeployStages(moduleEffectiveConfigs: ModuleEffectiveConfig[]): DeployStageMap {
    const deployStages: DeployStageMap = {};

    moduleEffectiveConfigs
      .filter(
        moduleEffectiveConfig =>
          this.devopsMode ||
          this.moduleFilter == undefined ||
          this.moduleFilter?.includes(moduleEffectiveConfig.moduleName),
      )
      .forEach(moduleEffectiveConfig => {
        const logPrefix = `${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName}`;

        console.log(`Module ${logPrefix}: Prepping packages`);
        const moduleDeploymentConfig = this.prepModule(moduleEffectiveConfig);

        const customNamingModulePath =
          moduleEffectiveConfig.customNaming && moduleEffectiveConfig.customNaming.naming_module.startsWith('@')
            ? this.prepNpmPackage(logPrefix, moduleEffectiveConfig.customNaming.naming_module)
            : moduleEffectiveConfig.customNaming?.naming_module;

        const installedCustomNamingModule: MdaaCustomNaming | undefined = customNamingModulePath
          ? {
              naming_module: `${customNamingModulePath}`,
              naming_class: moduleEffectiveConfig.customNaming?.naming_class || '',
              naming_props: moduleEffectiveConfig.customNaming?.naming_props,
            }
          : undefined;

        const installedCustomAspects: MdaaCustomAspect[] = moduleEffectiveConfig.customAspects?.map(customAspect => {
          const [customAspectPath] = customAspect.aspect_module.startsWith('@')
            ? this.prepNpmPackage(logPrefix, customAspect.aspect_module)
            : [customAspect.aspect_module, true];
          return {
            aspect_module: customAspectPath,
            aspect_class: customAspect.aspect_class,
            aspect_props: customAspect.aspect_props,
          };
        });

        const installedModuleConfig: ModuleDeploymentConfig = {
          ...moduleDeploymentConfig,
          customAspects: installedCustomAspects,
          customNaming: installedCustomNamingModule,
        };

        const deployStage = this.computeModuleDeployStage(installedModuleConfig);
        if (deployStages[deployStage]) {
          deployStages[deployStage].push(installedModuleConfig);
        } else {
          deployStages[deployStage] = [installedModuleConfig];
        }
      });
    return deployStages;
  }

  private prepModule(moduleConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    if (!moduleConfig.moduleType || moduleConfig.moduleType == 'cdk') {
      return this.prepCdkModule(moduleConfig);
    } else if (moduleConfig.moduleType == 'tf') {
      return this.prepTerraformModule(moduleConfig);
    } else {
      throw new Error(`Unknown module type: ${moduleConfig.moduleType}`);
    }
  }

  private createModuleTfWorkingConfig(moduleConfig: ModuleEffectiveConfig): ModuleEffectiveConfig {
    const moduleWorkingDir = path.resolve(
      `${this.workingDir}/terraform/${moduleConfig.domainName}/${moduleConfig.envName}/${moduleConfig.moduleName}`,
    );
    this.execCmd(`mkdir -p '${moduleWorkingDir}'`);
    this.execCmd(`cp -r ${path.resolve(moduleConfig.modulePath)}/* ${moduleWorkingDir}`);

    return {
      ...moduleConfig,
      modulePath: moduleWorkingDir,
    };
  }

  private prepTerraformModule(moduleConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    if (!moduleConfig.modulePath) {
      throw new Error("module_path must be specified if module_type is 'tf'");
    }

    if (!fs.existsSync(`${this.workingDir}/python/bin/checkov`) && !this.testMode) {
      console.log('Cannot locate checkov on path. Terraform modules cannot deploy. Check Python/Pip installation.');
      process.exit(1);
    }

    const modulePath = path.resolve(moduleConfig.modulePath);

    console.log(
      `Module ${moduleConfig.domainName}/${moduleConfig.envName}/${moduleConfig.moduleName}: Resolved path to: ${modulePath}`,
    );

    const preppedModuleConfig: ModuleEffectiveConfig = {
      ...moduleConfig,
      modulePath: modulePath,
      mdaaCompliant: moduleConfig.modulePath.startsWith('aws-mdaa') ? true : moduleConfig.mdaaCompliant,
    };

    const moduleWorkingConfig = this.createModuleTfWorkingConfig(preppedModuleConfig);

    return {
      ...moduleWorkingConfig,
      moduleCmds: this.createTerraformCommands(moduleWorkingConfig),
      localModule: true,
    };
  }

  private createTerraformCommands(moduleConfig: ModuleEffectiveConfig): string[] {
    const tfAction = MdaaDeploy.TF_ACTION_MAPPINGS[this.action] ?? this.action;

    this.createTerraformOverride(moduleConfig);
    const tfCmds: string[] = [];
    if (this.config.contents.region && this.config.contents.region.toLowerCase() != 'default') {
      tfCmds.push(`export AWS_DEFAULT_REGION=${this.config.contents.region}`);
    }
    tfCmds.push(`terraform init `);
    const checkovCmd: string[] = [
      `export PYTHONPATH=${this.workingDir}/python && ${this.workingDir}/python/bin/checkov -d ${moduleConfig.modulePath}`,
    ];
    checkovCmd.push('--summary-position bottom');
    checkovCmd.push('--quiet');
    checkovCmd.push('--compact');
    checkovCmd.push('--download-external-modules true');
    tfCmds.push(checkovCmd.join(' \\\n\t'));
    if (tfAction == 'plan') {
      const tfPlanCmd: string[] = [];
      if (this.config.contents.region && this.config.contents.region.toLowerCase() != 'default') {
        tfPlanCmd.push(`export AWS_DEFAULT_REGION=${this.config.contents.region}`);
      }
      tfPlanCmd.push('terraform plan');
      tfPlanCmd.push(...this.createTerraformPlanApplyCmdArgs(moduleConfig));
      tfPlanCmd.push(`--out ${moduleConfig.modulePath}/tfplan.binary`);
      tfCmds.push(tfPlanCmd.join(' \\\n\t'));
    } else if (tfAction == 'apply') {
      const tfApplyCmd: string[] = [];
      if (this.config.contents.region && this.config.contents.region.toLowerCase() != 'default') {
        tfApplyCmd.push(`export AWS_DEFAULT_REGION=${this.config.contents.region}`);
      }
      tfApplyCmd.push('terraform apply');
      tfApplyCmd.push('-auto-approve');
      tfApplyCmd.push(...this.createTerraformPlanApplyCmdArgs(moduleConfig));
      tfCmds.push(tfApplyCmd.join(' \\\n\t'));
    } else {
      const tfCmd: string[] = [];
      if (this.config.contents.region && this.config.contents.region.toLowerCase() != 'default') {
        tfCmd.push(`export AWS_DEFAULT_REGION=${this.config.contents.region}`);
      }
      tfCmd.push(`terraform ${tfAction}`);
      tfCmds.push(tfCmd.join(' \\\n\t'));
    }
    return tfCmds;
  }

  private createTerraformPlanApplyCmdArgs(moduleConfig: ModuleEffectiveConfig): string[] {
    const tfCmd: string[] = [];
    tfCmd.push('-input=false');
    if (moduleConfig.mdaaCompliant == undefined || moduleConfig.mdaaCompliant) {
      tfCmd.push(`-var org="${this.config.contents.organization}"`);
      tfCmd.push(`-var domain="${moduleConfig.domainName}"`);
      tfCmd.push(`-var env="${moduleConfig.envName}"`);
      tfCmd.push(`-var module_name="${moduleConfig.moduleName}"`);
      if (this.config.contents.region && this.config.contents.region.toLowerCase() != 'default') {
        tfCmd.push(`-var region="${this.config.contents.region}"`);
      } else {
        tfCmd.push('-var region="${AWS_DEFAULT_REGION}"');
      }
    }
    const transformRefsProps: MdaaConfigParamRefValueTransformerProps = {
      org: this.config.contents.organization,
      domain: moduleConfig.domainName,
      env: moduleConfig.envName,
      module_name: moduleConfig.moduleName,
      context: moduleConfig.effectiveContext,
    };
    const refsTransformer = new MdaaConfigRefValueTransformer(transformRefsProps);
    Object.entries(moduleConfig.effectiveModuleConfig).forEach(([configKey, configValue]) => {
      tfCmd.push(
        `-var ${configKey}="${JSON.stringify(
          // TYPE_WARNING: see if there is a guarantee that `configEntry` value is a string
          JSON.stringify(refsTransformer.transformValue(configValue as string)),
        )}"`,
      );
    });
    return tfCmd;
  }

  private createTerraformOverride(moduleConfig: ModuleEffectiveConfig) {
    if (moduleConfig.terraform?.override) {
      this.execCmd(`rm -rf ${moduleConfig.modulePath}/mdaa_override.tf.json `);
      const mdaaTfOverride = moduleConfig.terraform?.override || {};
      if (mdaaTfOverride.terraform?.backend?.s3) {
        mdaaTfOverride.terraform.backend.s3 = {
          ...mdaaTfOverride.terraform?.backend?.s3,
          encrypt: true,
          key: `${this.config.contents.organization}-${moduleConfig.domainName}-${moduleConfig.envName}-${moduleConfig.moduleName}`,
        };
      }
      fs.writeFileSync(`${moduleConfig.modulePath}/mdaa_override.tf.json`, JSON.stringify(mdaaTfOverride));
    }
  }

  private prepLocalPackage(logPrefix: string, npmPackage: string, npmPackageNoVersion: string): string {
    const prefix = this.localPackages[npmPackage];

    console.log(`Module ${logPrefix}: Package ${npmPackageNoVersion} found in local codebase. Running build.`);
    const buildCmd = `npx lerna run build --scope ${npmPackageNoVersion} --loglevel warn`;
    const fullBuildCmd = `cd '${__dirname}/../../../' && ${buildCmd} && cd '${this.cwd}'`;
    console.log(`Running Lerna Build: ${fullBuildCmd}`);
    this.execCmd(fullBuildCmd);

    return prefix;
  }

  private installPackage(logPrefix: string, npmPackage: string, npmPackageNoVersion: string): string {
    const prefix = path.resolve(
      `${this.workingDir}/nodejs/${MdaaDeploy.hashCodeHex(npmPackage, this.npmTag || 'latest').replace(/^-/, '')}`,
    );
    console.log(`Module ${logPrefix}: Prepping NPM Package ${npmPackage}`);

    // nosemgrep
    /* istanbul ignore next */
    if (!fs.existsSync(`${prefix}/package.json`)) {
      console.log(`Module ${logPrefix}: Installing ${npmPackage} to ${prefix}.`);
      //Install the module CDK App NPM package
      const npmInstallCmd = `npm install --no-fund --tag '${this.npmTag}' --prefix '${prefix}' '${npmPackage}' ${
        this.npmDebug ? '-d' : ' > /dev/null'
      }`;
      // console.log( `Running NPM Install Cmd: ${ npmInstallCmd }` )
      this.execCmd(`mkdir -p '${prefix}' && ${npmInstallCmd}`);
    } else {
      console.log(`Module ${logPrefix}: Install prefix ${prefix} already exists. Attempting update instead.`);
      if (!this.updateCache[prefix]) {
        const npmUpdateCmd = `npm update --no-fund --tag '${this.npmTag}' --prefix '${prefix}' ${
          this.npmDebug ? '-d' : ' > /dev/null'
        }`;
        // console.log( `Running NPM Update Cmd: ${ npmUpdateCmd }` )
        this.execCmd(npmUpdateCmd);
        this.updateCache[prefix] = true;
      } else {
        console.log(`Module ${logPrefix}: Skipping update. Already updated this prefix.`);
      }
    }
    return `${prefix}/node_modules/${npmPackageNoVersion}`;
  }

  private prepCdkModule(moduleEffectiveConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    const effectivePackageVersion = moduleEffectiveConfig.effectiveMdaaVersion || this.npmTag;

    const initialCdkAppNpmPackage = effectivePackageVersion
      ? `${moduleEffectiveConfig.modulePath}@${effectivePackageVersion}`
      : moduleEffectiveConfig.modulePath;

    const finalModuleCdkAppNpmPackage = moduleEffectiveConfig.modulePath.replace(/^@/, '').includes('@')
      ? moduleEffectiveConfig.modulePath
      : initialCdkAppNpmPackage;
    const logPrefix = `${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName}`;
    const [modulePath, localModule] = this.prepNpmPackage(
      logPrefix,
      finalModuleCdkAppNpmPackage.replace(/caef/, 'mdaa'),
    );

    const moduleInstalledConfig: ModuleEffectiveConfig = {
      ...moduleEffectiveConfig,
      modulePath: modulePath,
    };

    return {
      ...moduleInstalledConfig,
      moduleCmds: [this.createCdkCommand(moduleInstalledConfig, localModule)],
      localModule: localModule,
    };
  }

  private prepNpmPackage(logPrefix: string, npmPackageName: string): [string, boolean] {
    const npmPackageNoVersion = npmPackageName.replace(/(?<!^)@.*/, '');
    return npmPackageName in this.localPackages
      ? [this.prepLocalPackage(logPrefix, npmPackageName, npmPackageNoVersion), true]
      : [this.installPackage(logPrefix, npmPackageName, npmPackageNoVersion), false];
  }

  private computeModuleDeployStage(moduleDeployConfig: ModuleDeploymentConfig): string {
    const moduleMdaaDeployConfigFile = `${moduleDeployConfig.modulePath}/mdaa.config.json`;
    // nosemgrep
    if (fs.existsSync(moduleMdaaDeployConfigFile)) {
      // nosemgrep
      const moduleMdaaDeployConfig = require(moduleMdaaDeployConfigFile);
      if ('DEPLOY_STAGE' in moduleMdaaDeployConfig) {
        const deployStage = moduleMdaaDeployConfig['DEPLOY_STAGE'];
        console.log(
          `Module ${moduleDeployConfig.domainName}/${moduleDeployConfig.envName}/${moduleDeployConfig.moduleName}: Set deploy stage to ${deployStage} by mdaa.config.json`,
        );
        return deployStage;
      }
    }
    console.log(
      `Module ${moduleDeployConfig.domainName}/${moduleDeployConfig.envName}/${moduleDeployConfig.moduleName}: Set deploy stage to ${MdaaDeploy.DEFAULT_DEPLOY_STAGE} by default`,
    );
    return MdaaDeploy.DEFAULT_DEPLOY_STAGE;
  }

  private deployModule(moduleDeploymentConfig: ModuleDeploymentConfig) {
    if (!this.devopsMode) {
      console.log(`\n-----------------------------------------------------------`);
      console.log(
        `Module ${moduleDeploymentConfig.domainName}/${moduleDeploymentConfig.envName}/${moduleDeploymentConfig.moduleName}: Running ${this.action}`,
      );
      console.log(`-----------------------------------------------------------`);
    }

    this.reverse(moduleDeploymentConfig.moduleCmds).forEach(moduleCmd => {
      console.log(
        `Module ${moduleDeploymentConfig.domainName}/${moduleDeploymentConfig.envName}/${moduleDeploymentConfig.moduleName}: Running cmd:\n${moduleCmd}`,
      );
      this.execCmd(`cd '${moduleDeploymentConfig.modulePath}' && ${moduleCmd}`);
    });
  }

  private createCdkCommand(moduleEffectiveConfig: ModuleEffectiveConfig, localModule: boolean): string {
    const action = this.action == 'deploy' ? `${this.action} --all` : this.action;

    const cdkEnv: string[] = this.createCdkCommandEnv(moduleEffectiveConfig);
    const cdkCmd: string[] = [];
    cdkCmd.push(
      `npx ${this.npmDebug ? '-d' : ''} cdk ${action} ${this.cdkVerbose ? '-v' : ''} --require-approval never`,
    );

    if (!localModule) {
      cdkCmd.push(`-a 'npx ${this.npmDebug ? '-d' : ''} ${moduleEffectiveConfig.modulePath}/'`);
    }

    cdkCmd.push(
      `-o '${this.workingDir}/cdk.out/${this.config.contents.organization}/${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName}'`,
    );
    cdkCmd.push(`-c 'org=${this.config.contents.organization}'`);
    cdkCmd.push(`-c 'env=${moduleEffectiveConfig.envName}'`);
    cdkCmd.push(`-c 'module_name=${moduleEffectiveConfig.moduleName}'`);
    cdkCmd.push(`-c 'domain=${moduleEffectiveConfig.domainName}'`);

    if (this.config.contents.naming_module && this.config.contents.naming_class) {
      cdkCmd.push(`-c 'naming_module=${moduleEffectiveConfig.customNaming?.naming_module}'`);
      cdkCmd.push(`-c 'naming_class=${moduleEffectiveConfig.customNaming?.naming_class}'`);
    } else if (this.config.contents.naming_module || this.config.contents.naming_class) {
      throw new Error("Both 'naming_module' and 'naming_class' must be specified together.");
    }
    this.addOptionalCdkContextStringParam(cdkCmd, 'use_bootstrap', moduleEffectiveConfig.useBootstrap?.toString());
    this.addOptionalCdkContextStringParam(
      cdkCmd,
      'module_configs',
      moduleEffectiveConfig.moduleConfigFiles?.map(x => path.resolve(x)).join(','),
    );
    this.addOptionalCdkContextStringParam(
      cdkCmd,
      'tag_configs',
      moduleEffectiveConfig.tagConfigFiles?.map(x => path.resolve(x)).join(','),
    );
    this.addOptionalCdkContextObjParam(cdkCmd, 'additional_stacks', moduleEffectiveConfig.additionalStacks);
    this.addOptionalCdkContextStringParam(
      cdkCmd,
      'log_suppressions',
      this.config.contents.log_suppressions?.toString(),
    );
    this.addOptionalCdkContextObjParam(cdkCmd, 'custom_aspects', moduleEffectiveConfig.customAspects);
    this.addOptionalCdkContextObjParam(cdkCmd, 'module_config_data', moduleEffectiveConfig.effectiveModuleConfig);
    this.addOptionalCdkContextObjParam(cdkCmd, 'tag_config_data', moduleEffectiveConfig.effectiveTagConfig);

    if (this.roleArn) {
      cdkCmd.push(`-r '${this.roleArn}'`);
    }

    cdkCmd.push(...generateContextCdkParams(moduleEffectiveConfig));

    if (this.cdkPushdown) {
      console.log(
        `Module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${
          moduleEffectiveConfig.moduleName
        }: CDK Pushdown Options: ${JSON.stringify(this.cdkPushdown, undefined, 2)}`,
      );
      cdkCmd.push(...this.cdkPushdown);
    }

    return cdkEnv.length > 0 ? `${cdkEnv.join(' && ')} && ${cdkCmd.join(' \\\n\t')}` : cdkCmd.join(' \\\n\t');
  }

  private addOptionalCdkContextStringParam(cdkCmd: string[], context_key: string, context_value?: string) {
    if (context_value) {
      cdkCmd.push(`-c '${context_key}="${context_value}"'`);
    }
  }

  private addOptionalCdkContextObjParam(
    cdkCmd: string[],
    context_key: string,
    context_value?: MdaaCustomAspect[] | TagElement | ConfigurationElement | Deployment[],
  ) {
    if (context_value) {
      if (Object.keys(context_value).length > 0) {
        const context_string_value = JSON.stringify(JSON.stringify(context_value));
        cdkCmd.push(`-c '${context_key}'=${context_string_value}`);
      }
    }
  }

  private createCdkCommandEnv(moduleEffectiveConfig: ModuleEffectiveConfig): string[] {
    const cdkEnv: string[] = [];
    /* istanbul ignore next */
    if (moduleEffectiveConfig.deployRegion && moduleEffectiveConfig.deployRegion.toLowerCase() != 'default') {
      cdkEnv.push(`export CDK_DEPLOY_REGION=${moduleEffectiveConfig.deployRegion}`);
      cdkEnv.push(`export AWS_DEFAULT_REGION=${moduleEffectiveConfig.deployRegion}`);
    }
    /* istanbul ignore next */
    if (moduleEffectiveConfig.deployAccount && moduleEffectiveConfig.deployAccount.toLowerCase() != 'default') {
      cdkEnv.push(`export CDK_DEPLOY_ACCOUNT=${moduleEffectiveConfig.deployAccount}`);
    }
    return cdkEnv;
  }

  private computeDomainEffectiveConfig(
    domainName: string,
    domain: MdaaDomainConfig,
    globalEffectiveConfig: EffectiveConfig,
  ): DomainEffectiveConfig {
    return {
      ...globalEffectiveConfig,
      domainName: domainName,
      envTemplates: { ...globalEffectiveConfig.envTemplates, ...domain.env_templates },
      effectiveContext: this.computeEffectiveContext(globalEffectiveConfig, domain.context),
      effectiveTagConfig: this.computeEffectiveTagConfig(globalEffectiveConfig, domain.tag_config_data),
      tagConfigFiles: this.computeEffectiveTagConfigFiles(globalEffectiveConfig, domain.tag_configs),
      effectiveMdaaVersion: this.computeEffectiveMdaaVersion(globalEffectiveConfig, this.config.contents.mdaa_version),
      customAspects: this.computeEffectiveCustomAspects(globalEffectiveConfig, domain.custom_aspects),
      customNaming: this.computeEffectiveCustomNaming(globalEffectiveConfig, domain.custom_naming),
      terraform: this.computeEffectiveTerraformConfig(globalEffectiveConfig, domain.terraform),
      deployAccount: domain.account ?? globalEffectiveConfig.deployAccount,
      deployRegion: domain.region ?? globalEffectiveConfig.deployRegion,
    };
  }

  private computeEnvEffectiveConfig(
    envName: string,
    env: MdaaEnvironmentConfig,
    domainEffectiveConfig: DomainEffectiveConfig,
  ): EnvEffectiveConfig {
    return {
      ...domainEffectiveConfig,
      envName: envName,
      deployAccount: env.account ?? domainEffectiveConfig.deployAccount,
      deployRegion: env.region ?? domainEffectiveConfig.deployRegion,
      useBootstrap: env.use_bootstrap == undefined || env.use_bootstrap,
      effectiveContext: this.computeEffectiveContext(domainEffectiveConfig, env.context),
      effectiveTagConfig: this.computeEffectiveTagConfig(domainEffectiveConfig, env.tag_config_data),
      tagConfigFiles: this.computeEffectiveTagConfigFiles(domainEffectiveConfig, env.tag_configs),
      effectiveMdaaVersion: this.computeEffectiveMdaaVersion(domainEffectiveConfig, env.mdaa_version),
      customAspects: this.computeEffectiveCustomAspects(domainEffectiveConfig, env.custom_aspects),
      customNaming: this.computeEffectiveCustomNaming(domainEffectiveConfig, env.custom_naming),
      terraform: this.computeEffectiveTerraformConfig(domainEffectiveConfig, env.terraform),
    };
  }

  private computeModuleEffectiveConfig(
    mdaaModuleName: string,
    mdaaModule: MdaaModuleConfig,
    envEffectiveConfig: EnvEffectiveConfig,
  ): ModuleEffectiveConfig {
    const modulePath = mdaaModule.module_path ? mdaaModule.module_path : mdaaModule.cdk_app; //NOSONAR
    if (!modulePath) {
      throw new Error('One of cdp_app or module_path must be defined');
    }
    const additionalStacks: Deployment[] | undefined =
      mdaaModule.additional_stacks || mdaaModule.additional_accounts
        ? [
            ...(mdaaModule.additional_stacks || []),
            ...(mdaaModule.additional_accounts || []).map(account => {
              return { account: account };
            }),
          ]
        : undefined;
    return {
      ...envEffectiveConfig,
      moduleName: mdaaModuleName,
      useBootstrap:
        envEffectiveConfig.useBootstrap && (mdaaModule.use_bootstrap == undefined || mdaaModule.use_bootstrap),
      moduleConfigFiles: [...(mdaaModule.app_configs || []), ...(mdaaModule.module_configs || [])], //NOSONAR
      effectiveModuleConfig: { ...(mdaaModule.app_config_data || {}), ...(mdaaModule.module_config_data || {}) }, //NOSONAR
      moduleType: mdaaModule.module_type ?? 'cdk',
      modulePath: modulePath,
      additionalStacks: additionalStacks,
      mdaaCompliant: mdaaModule.mdaa_compliant,
      effectiveContext: this.computeEffectiveContext(envEffectiveConfig, mdaaModule.context),
      effectiveTagConfig: this.computeEffectiveTagConfig(envEffectiveConfig, mdaaModule.tag_config_data),
      effectiveMdaaVersion: this.computeEffectiveMdaaVersion(envEffectiveConfig, mdaaModule.mdaa_version),
      tagConfigFiles: this.computeEffectiveTagConfigFiles(envEffectiveConfig, mdaaModule.tag_configs),
      customAspects: this.computeEffectiveCustomAspects(envEffectiveConfig, mdaaModule.custom_aspects),
      customNaming: this.computeEffectiveCustomNaming(envEffectiveConfig, mdaaModule.custom_naming),
      terraform: this.computeEffectiveTerraformConfig(envEffectiveConfig, mdaaModule.terraform),
      deployAccount: envEffectiveConfig.deployAccount,
      deployRegion: envEffectiveConfig.deployRegion,
    };
  }

  private computeEffectiveTerraformConfig(
    parent: EffectiveConfig,
    child?: TerraformConfig,
  ): TerraformConfig | undefined {
    const _ = require('lodash');
    return _.mergeWith(child, parent.terraform);
  }

  private computeEffectiveCustomNaming(
    parent: EffectiveConfig,
    child?: MdaaCustomNaming,
  ): MdaaCustomNaming | undefined {
    return child || parent.customNaming;
  }

  private computeEffectiveCustomAspects(parent: EffectiveConfig, child?: MdaaCustomAspect[]): MdaaCustomAspect[] {
    return [...(parent.customAspects || []), ...(child || [])];
  }

  private computeEffectiveTagConfigFiles(parent: EffectiveConfig, child?: string[]): string[] {
    return [...(parent.tagConfigFiles || []), ...(child || [])];
  }

  private computeEffectiveMdaaVersion(parent: EffectiveConfig, child?: string): string | undefined {
    return child || parent.effectiveMdaaVersion;
  }

  private computeEffectiveTagConfig(parent: EffectiveConfig, child?: TagElement): TagElement {
    return {
      ...parent.effectiveTagConfig,
      ...child,
    };
  }

  private computeEffectiveContext(parent: EffectiveConfig, child?: ConfigurationElement): ConfigurationElement {
    return {
      ...parent.effectiveContext,
      ...child,
    };
  }

  /* istanbul ignore next */
  private execCmd(cmd: string) {
    // nosemgrep
    if (!this.testMode) {
      try {
        require('child_process').execSync(cmd, { stdio: 'inherit' });
      } catch (error: unknown) {
        if (this.noFail) {
          console.warn(`Child process raised exception: ${error}`);
          if (error instanceof Error) {
            console.error(error.stack);
          }
        } else {
          throw error;
        }
      }
    } else {
      console.log(`Testing Mode:\n ${cmd}`);
    }
  }

  protected static hashCodeHex(...strings: string[]) {
    let h = 0;
    strings.forEach(s => {
      for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    });
    return h.toString(16);
  }

  private createGlobalEffectiveConfig(): EffectiveConfig {
    return {
      effectiveContext: this.config.contents.context || {},
      effectiveTagConfig: this.config.contents.tag_config_data || {},
      tagConfigFiles: this.config.contents.tag_configs || [],
      effectiveMdaaVersion: this.config.contents.mdaa_version || this.mdaaVersion,
      customAspects: this.config.contents.custom_aspects || [],
      customNaming:
        this.config.contents.naming_module && this.config.contents.naming_class
          ? {
              naming_module: this.config.contents.naming_module,
              naming_class: this.config.contents.naming_class,
              naming_props: this.config.contents.naming_props,
            }
          : undefined,
      envTemplates: this.config.contents.env_templates || {},
      terraform: this.config.contents.terraform,
      deployAccount: this.config.contents.account,
      deployRegion: this.config.contents.region,
    };
  }

  private determineEnvEffectiveConfig(
    env: MdaaEnvironmentConfig,
    envName: string,
    domainEffectiveConfig: DomainEffectiveConfig,
  ): [MdaaEnvironmentConfig, EnvEffectiveConfig] {
    if (env.template && (!domainEffectiveConfig.envTemplates || !domainEffectiveConfig.envTemplates[env.template])) {
      throw new Error(`Environment "${envName}" references invalid template name: ${env.template}.`);
    }
    const template =
      env.template && domainEffectiveConfig.envTemplates ? domainEffectiveConfig.envTemplates[env.template] : {};
    // nosemgrep
    const ld = require('lodash');
    const envMergedConfig = ld.mergeWith(env, template);
    return [envMergedConfig, this.computeEnvEffectiveConfig(envName, envMergedConfig, domainEffectiveConfig)];
  }
}
