/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigurationElement,
  MdaaConfigRefValueTransformer,
  MdaaConfigRefValueTransformerProps,
  MdaaConfigTransformer,
  MdaaCustomAspect,
  MdaaCustomNaming,
  TagElement,
} from '@aws-mdaa/config';
import {
  analyzeScriptFile,
  executeCommand,
  executeCommandWithCapture,
  logExecutionError,
  logImmediate,
} from './command-utils';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  isWindows,
  setEnvCmd,
  rmRfCmd,
  mkdirpCmd,
  cpRCmd,
  devNull,
  cmdJoin,
  lineContinuation,
  pythonPathCmd,
  cdAndRun,
} from './platform-utils';
import {
  DomainEffectiveConfig,
  EffectiveConfig,
  EnvEffectiveConfig,
  ModuleDeploymentConfig,
  ModuleEffectiveConfig,
} from './config-types';
import { DuplicateAccountLevelModulesException } from './exceptions';
import {
  HookConfig,
  MdaaCliConfig,
  MdaaDomainConfig,
  MdaaEnvironmentConfig,
  MdaaModuleConfig,
} from './mdaa-cli-config-parser';
import { Deployment } from './deployment-types';
import { getMdaaConfig } from './module-service';
import { loadLocalPackages } from './package-helper';
import { validateFilters } from './filter-validator';
import {
  validateDeployAccountResolved,
  validateDeployRegionResolved,
  validateDeployments,
} from './deployment-target-validator';
import { findDuplicates, generateContextCdkParams, isBoolean } from './utils';
import { ShellCommand } from './shell-command';
import { SafeCommand, staticCommand, unsafeCommand, joinCommands } from './safe-command';
import {
  computeEffectiveContext,
  computeEffectiveCustomAspects,
  computeEffectiveCustomNaming,
  computeEffectiveMdaaVersion,
  computeEffectivePermissionsBoundaryArn,
  computeEffectiveTagConfig,
  computeEffectiveTagConfigFiles,
  computeEffectiveTerraformConfig,
} from './config-resolver';

/** Default MDAA configuration file name */
const DEFAULT_CONFIG_FILE = './mdaa.yaml';

export interface DeployStageMap {
  [key: string]: ModuleDeploymentConfig[];
}

type HookType = 'postdeploy' | 'predeploy';

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
  private readonly cdkOutDir?: string;
  private readonly baselineDir?: string;
  private readonly diffOutDir?: string;
  private readonly testMode: boolean;
  private readonly noFail: boolean;
  private pythonInstalled = false;

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
    this.cdkOutDir = options['cdk-out'] ? path.resolve(options['cdk-out']) : undefined;
    this.baselineDir = options['baseline'] ? this.validateBaselineDir(options['baseline']) : undefined;
    this.diffOutDir = options['diff-out'] ? path.resolve(options['diff-out']) : undefined;

    const configFileName = options['config'] ?? DEFAULT_CONFIG_FILE;
    this.config = this.loadConfig(configFileName, configContents);

    if (options['local_mode']) {
      console.log('Use of -l flag no longer necessary. Execution mode is automatically determined.');
    }

    /* istanbul ignore next */
    if (options['clear']) {
      console.log(`Removing all previously installed Node.JS packages from ${path.join(this.workingDir, 'nodejs')}`);
      this.execCmd(rmRfCmd(path.join(this.workingDir, 'nodejs')));
      console.log(`Removing all previously installed Python packages from ${path.join(this.workingDir, 'python')}`);
      this.execCmd(rmRfCmd(path.join(this.workingDir, 'python')));
    }

    this.localPackages = loadLocalPackages();

    if (this.devopsMode) {
      console.log('Running MDAA in devops mode.');
    }
  }

  private installPython() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const commandExists = require('command-exists');
    const pipCommandExists = commandExists.sync('pip');
    const pip3CommandExists = commandExists.sync('pip3');
    const requirementsPath = path.resolve(__dirname, '..', 'requirements.txt');
    const pythonTargetDir = path.join(this.workingDir, 'python');
    /* istanbul ignore next */
    if (pipCommandExists) {
      const pipCmd = ShellCommand.for('pip')
        .flags('install', '--upgrade', '-q')
        .option('-r', requirementsPath)
        .option('-t', pythonTargetDir)
        .build();
      console.log(`Found pip. Installing python with cmd: ${pipCmd}`);
      this.execCmd(pipCmd);
    } else if (pip3CommandExists) {
      const pipCmd = ShellCommand.for('pip3')
        .flags('install', '--upgrade', '-q')
        .option('-r', requirementsPath)
        .option('-t', pythonTargetDir)
        .build();
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
    }

    // Resolve the config file path
    const resolvedConfigFile = this.resolveConfigFilePath(configFileName);
    return new MdaaCliConfig({ filename: resolvedConfigFile });
  }

  private resolveConfigFilePath(configFileName: string): string {
    // Check if path exists
    if (fs.existsSync(configFileName)) {
      if (fs.statSync(configFileName).isDirectory()) {
        throw new Error(
          `Config path '${configFileName}' is a directory. Please provide a file path (e.g., ${configFileName}/mdaa.yaml)`,
        );
      }
      return configFileName;
    }

    // For default config, try legacy caef.yaml fallback
    if (configFileName === DEFAULT_CONFIG_FILE && fs.existsSync('./caef.yaml')) {
      console.warn("Default config file found at 'caef.yaml'.");
      return './caef.yaml';
    }

    // File not found
    const defaultMsg = configFileName === DEFAULT_CONFIG_FILE ? " or 'caef.yaml'" : '';
    throw new Error(`Cannot open config file at '${configFileName}'${defaultMsg}`);
  }

  private validateBaselineDir(baselinePath: string): string {
    const resolved = path.resolve(baselinePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Baseline directory '${baselinePath}' does not exist`);
    }
    if (!fs.statSync(resolved).isDirectory()) {
      throw new Error(`Baseline path '${baselinePath}' is not a directory`);
    }
    return resolved;
  }

  private findTemplateFile(baselinePath: string): string | undefined {
    if (!fs.existsSync(baselinePath)) {
      return undefined;
    }
    const files = fs.readdirSync(baselinePath);
    const templateFile = files.find(f => f.endsWith('.template.json'));
    return templateFile ? path.join(baselinePath, templateFile) : undefined;
  }

  public sanityCheck() {
    validateFilters({
      domainFilter: this.domainFilter,
      envFilter: this.envFilter,
      moduleFilter: this.moduleFilter,
      config: this.config.contents,
    });
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

          if (getMdaaConfig(moduleEffectiveConfig, 'accountLevelModule', isBoolean)) {
            accountLevelModuleCountMap[accountRegion] ??= {};
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
      effectiveModuleConfig: (this.config.contents.devops ?? {}) as ConfigurationElement,
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
        domainName => this.devopsMode || (this.domainFilter?.includes(domainName) ?? true),
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
        envName => this.devopsMode || (this.envFilter?.includes(envName) ?? true),
      ),
    ).forEach(envName => {
      const env = domain.environments[envName];
      const [envMergedConfig, envEffectiveConfig] = this.determineEnvEffectiveConfig(
        env,
        envName,
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

    const envModules = envEffectiveConfig.useBootstrap
      ? {
          //Ensure bootstrap is listed first
          'caef-bootstrap': {
            module_path: '@aws-mdaa/bootstrap',
          },
          ...env.modules,
        }
      : env.modules;

    const moduleEffectiveConfigs = Object.entries(envModules).map(entry => {
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
    const pipelines = Object.entries(this.config.contents.devops?.pipelines ?? {})
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
      console.log(`Module ${this.modulePrefix(moduleEffectiveConfig)} will be deployed via pipeline ${pipelines[0]}`);
    } else if (pipelines.length > 1) {
      throw new Error(
        `Module ${this.modulePrefix(moduleEffectiveConfig)} matches multiple pipeline filters: ${pipelines}`,
      );
    } else {
      console.warn(`WARNING: Module ${this.modulePrefix(moduleEffectiveConfig)} matches no pipeline filters`);
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
      logImmediate(`Env ${envEffectiveConfig.domainName}/${envEffectiveConfig.envName} Running MDAA stage ${stage}`);
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
          this.devopsMode || (this.moduleFilter?.includes(moduleEffectiveConfig.moduleName) ?? true),
      )
      .forEach(moduleEffectiveConfig => {
        const logPrefix = this.modulePrefix(moduleEffectiveConfig);

        logImmediate(`Module ${logPrefix}: Prepping packages`);
        const moduleDeploymentConfig = this.prepModule(moduleEffectiveConfig);

        const customNamingModulePath = moduleEffectiveConfig.customNaming?.naming_module.startsWith('@')
          ? this.prepNpmPackage(logPrefix, moduleEffectiveConfig.customNaming.naming_module)
          : moduleEffectiveConfig.customNaming?.naming_module;

        const installedCustomNamingModule: MdaaCustomNaming | undefined = customNamingModulePath
          ? {
              naming_module: `${customNamingModulePath}`,
              naming_class: moduleEffectiveConfig.customNaming?.naming_class ?? '',
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

        const deployStage =
          this.config.contents.useStaging === undefined || this.config.contents.useStaging
            ? this.computeModuleDeployStage(installedModuleConfig)
            : MdaaDeploy.DEFAULT_DEPLOY_STAGE;

        if (deployStages[deployStage]) {
          deployStages[deployStage].push(installedModuleConfig);
        } else {
          deployStages[deployStage] = [installedModuleConfig];
        }
      });
    return deployStages;
  }

  private prepModule(moduleConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    const refTransformerProps: MdaaConfigRefValueTransformerProps = {
      org: this.config.contents.organization,
      domain: moduleConfig.domainName,
      env: moduleConfig.envName,
      module_name: moduleConfig.moduleName,
      context: moduleConfig.effectiveContext,
    };

    const configRefTransformedConfig = new MdaaConfigTransformer(
      new MdaaConfigRefValueTransformer(refTransformerProps),
    ).transformConfig(moduleConfig as unknown as ConfigurationElement) as unknown as ModuleEffectiveConfig;

    // Validate the resolved deployment target once here, before any module type
    // branch. This is the single post-resolution guard covering every downstream
    // consumer regardless of module type — the CDK command env, the Terraform
    // commands, and the deploy hooks (which substitute {{region}}/{{account}}
    // into shell commands). The per-sink checks remain as local safety nets.
    this.validateModuleDeploymentTarget(configRefTransformedConfig);

    if (!configRefTransformedConfig.moduleType || configRefTransformedConfig.moduleType == 'cdk') {
      return this.prepCdkModule(configRefTransformedConfig);
    } else if (configRefTransformedConfig.moduleType == 'tf') {
      return this.prepTerraformModule(configRefTransformedConfig);
    } else {
      throw new Error(`Unknown module type: ${configRefTransformedConfig.moduleType}`);
    }
  }

  /**
   * Validate a module's resolved region/account before it is consumed by any
   * downstream shell-command builder. Applied uniformly for all module types so
   * that account validation is not silently skipped on the Terraform path (which
   * has no `-var account`) yet still feeds `{{account}}` into deploy hooks. The
   * `default` sentinel is excluded, matching the interpolation-site guards.
   */
  private validateModuleDeploymentTarget(moduleConfig: ModuleEffectiveConfig): void {
    const modulePrefix = this.modulePrefix(moduleConfig);
    if (moduleConfig.deployRegion && moduleConfig.deployRegion.toLowerCase() != 'default') {
      validateDeployRegionResolved(moduleConfig.deployRegion, `module ${modulePrefix}`);
    }
    if (moduleConfig.deployAccount && moduleConfig.deployAccount.toLowerCase() != 'default') {
      validateDeployAccountResolved(moduleConfig.deployAccount, `module ${modulePrefix}`);
    }
  }

  private createModuleTfWorkingConfig(moduleConfig: ModuleEffectiveConfig): ModuleEffectiveConfig {
    const moduleWorkingDir = path.resolve(path.join(this.workingDir, 'terraform', this.modulePrefix(moduleConfig)));
    this.execCmd(mkdirpCmd(moduleWorkingDir));
    this.execCmd(cpRCmd(path.resolve(moduleConfig.modulePath), moduleWorkingDir));

    return {
      ...moduleConfig,
      modulePath: moduleWorkingDir,
    };
  }

  private prepTerraformModule(moduleConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    if (!moduleConfig.modulePath) {
      throw new Error("module_path must be specified if module_type is 'tf'");
    }

    if (!this.pythonInstalled && !this.testMode) {
      this.installPython();
      this.pythonInstalled = true;
    }

    if (
      !fs.existsSync(path.join(this.workingDir, 'python', isWindows ? 'Scripts' : 'bin', 'checkov')) &&
      !this.testMode
    ) {
      console.log('Cannot locate checkov on path. Terraform modules cannot deploy. Check Python/Pip installation.');
      process.exit(1);
    }

    const modulePath = path.resolve(moduleConfig.modulePath);

    console.log(`Module ${this.modulePrefix(moduleConfig)}: Resolved path to: ${modulePath}`);

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

  private createTerraformCommands(moduleConfig: ModuleEffectiveConfig): SafeCommand[] {
    const tfAction = MdaaDeploy.TF_ACTION_MAPPINGS[this.action] ?? this.action;

    this.createTerraformOverride(moduleConfig);
    const region = this.validatedTerraformRegion();
    const lc = lineContinuation();
    const tfCmds: SafeCommand[] = [];
    if (region) {
      tfCmds.push(setEnvCmd('AWS_DEFAULT_REGION', region));
    }
    tfCmds.push(staticCommand('terraform init '));
    const checkovBin = path.join(this.workingDir, 'python', isWindows ? 'Scripts' : 'bin', 'checkov');
    const pythonDir = path.join(this.workingDir, 'python');
    // checkovBin (working-dir derived) and modulePath (config derived) are routed
    // through ShellCommand so both are shell-quoted at the sink; `-d` is literal
    // structure. pythonPathCmd wraps the whole thing in the PYTHONPATH export.
    const checkovInvocation = ShellCommand.args().arg(checkovBin).flags('-d').arg(moduleConfig.modulePath).build();
    const checkovCmd: SafeCommand[] = [
      pythonPathCmd(pythonDir, checkovInvocation),
      staticCommand('--summary-position bottom'),
      staticCommand('--quiet'),
      staticCommand('--compact'),
      staticCommand('--download-external-modules true'),
    ];
    tfCmds.push(joinCommands(checkovCmd, lc));
    if (tfAction == 'plan') {
      const tfPlanCmd: SafeCommand[] = [];
      if (region) {
        tfPlanCmd.push(setEnvCmd('AWS_DEFAULT_REGION', region));
      }
      tfPlanCmd.push(
        staticCommand('terraform plan'),
        ...this.createTerraformPlanApplyCmdArgs(moduleConfig),
        // The tfplan output path is config-derived (modulePath) — quote it at the
        // sink; `--out` is literal structure.
        ShellCommand.args().option('--out', path.join(moduleConfig.modulePath, 'tfplan.binary')).build(),
      );
      tfCmds.push(joinCommands(tfPlanCmd, lc));
    } else if (tfAction == 'apply') {
      const tfApplyCmd: SafeCommand[] = [];
      if (region) {
        tfApplyCmd.push(setEnvCmd('AWS_DEFAULT_REGION', region));
      }
      tfApplyCmd.push(
        staticCommand('terraform apply'),
        staticCommand('-auto-approve'),
        ...this.createTerraformPlanApplyCmdArgs(moduleConfig),
      );
      tfCmds.push(joinCommands(tfApplyCmd, lc));
    } else {
      const tfCmd: SafeCommand[] = [];
      if (region) {
        tfCmd.push(setEnvCmd('AWS_DEFAULT_REGION', region));
      }
      // `terraform` is the literal command name; the action verb is quoted as a
      // value so nothing is interpolated into raw text (quoting a bareword verb is
      // a shell no-op, so Terraform still receives e.g. `validate`).
      tfCmd.push(ShellCommand.for('terraform').arg(tfAction).build());
      tfCmds.push(joinCommands(tfCmd, lc));
    }
    return tfCmds;
  }

  /**
   * Returns the configured global region validated for safe interpolation into
   * the Terraform shell commands, or undefined when unset or set to the
   * `default` sentinel (in which case no region export is emitted). Centralizes
   * the guard + validation so every interpolation site uses the checked value.
   */
  private validatedTerraformRegion(): string | undefined {
    const region = this.config.contents.region;
    if (!region || region.toLowerCase() == 'default') {
      return undefined;
    }
    return validateDeployRegionResolved(region, 'terraform region');
  }

  private createTerraformPlanApplyCmdArgs(moduleConfig: ModuleEffectiveConfig): SafeCommand[] {
    const tfCmd: SafeCommand[] = [];
    tfCmd.push(staticCommand('-input=false'));
    if (moduleConfig.mdaaCompliant == undefined || moduleConfig.mdaaCompliant) {
      // org/domain/env/module_name/region are quoted at the sink like every other
      // value, so the command is safe by construction — it does not depend on the
      // upstream format validation still holding. The shell strips the quoting and
      // Terraform receives `<key>=<value>` exactly as before.
      tfCmd.push(
        ShellCommand.args().option('-var', `org=${this.config.contents.organization}`).build(),
        ShellCommand.args().option('-var', `domain=${moduleConfig.domainName}`).build(),
        ShellCommand.args().option('-var', `env=${moduleConfig.envName}`).build(),
        ShellCommand.args().option('-var', `module_name=${moduleConfig.moduleName}`).build(),
      );
      const region = this.validatedTerraformRegion();
      if (region) {
        tfCmd.push(ShellCommand.args().option('-var', `region=${region}`).build());
      } else {
        // Deliberate shell parameter expansion of AWS_DEFAULT_REGION (the operator's
        // ambient env — this branch runs only when no config region is set, so MDAA
        // emits no `export`, and the config region path above never reaches here).
        // This is a static string literal with no TS interpolation, so no value is
        // baked into it. It is also injection-safe even if the env var holds shell
        // metacharacters: POSIX shells expand `${VAR}` but do NOT re-scan the result
        // for command substitution or word operators (unlike `eval`), so a value
        // like `$(cmd)` arrives as literal bytes. The `"..."` additionally keeps it
        // a single argument. Hence `shellSyntax()` (the audited literal-shell-text
        // escape hatch) here is safe.
        tfCmd.push(ShellCommand.args().shellSyntax('-var region="${AWS_DEFAULT_REGION}"').build());
      }
    }
    const transformRefsProps: MdaaConfigRefValueTransformerProps = {
      org: this.config.contents.organization,
      domain: moduleConfig.domainName,
      env: moduleConfig.envName,
      module_name: moduleConfig.moduleName,
      context: moduleConfig.effectiveContext,
    };
    const refsTransformer = new MdaaConfigRefValueTransformer(transformRefsProps);
    Object.entries(moduleConfig.effectiveModuleConfig).forEach(([configKey, configValue]) => {
      // Arriving token: `<key>=<JSON.stringify(value)>` — Terraform decodes the
      // value with a single `jsondecode`. The whole token is single-quoted by the
      // builder, so an arbitrary key or value cannot break out of the argument.
      // (Previously this double-stringified the value inside bare double quotes,
      // which delivered the same single-layer JSON to Terraform but let a `$(...)`
      // in the value be expanded by the shell.)
      // TYPE_WARNING: see if there is a guarantee that `configEntry` value is a string
      const transformedValue = refsTransformer.transformValue(configValue as string);
      tfCmd.push(
        ShellCommand.args()
          .option('-var', `${configKey}=${JSON.stringify(transformedValue)}`)
          .build(),
      );
    });
    return tfCmd;
  }

  private createTerraformOverride(moduleConfig: ModuleEffectiveConfig) {
    if (moduleConfig.terraform?.override) {
      const overridePath = path.join(moduleConfig.modulePath, 'mdaa_override.tf.json');
      if (fs.existsSync(overridePath)) {
        fs.unlinkSync(overridePath);
      }
      const mdaaTfOverride = moduleConfig.terraform?.override || {};
      if (mdaaTfOverride.terraform?.backend?.s3) {
        mdaaTfOverride.terraform.backend.s3 = {
          ...mdaaTfOverride.terraform?.backend?.s3,
          encrypt: true,
          key: `${this.config.contents.organization}-${moduleConfig.domainName}-${moduleConfig.envName}-${moduleConfig.moduleName}`,
        };
      }
      // The working-dir copy is created by a shelled `mkdir -p` that testMode no-ops, so
      // ensure the directory here rather than failing the write with ENOENT.
      fs.mkdirSync(path.dirname(overridePath), { recursive: true });
      fs.writeFileSync(overridePath, JSON.stringify(mdaaTfOverride));
    }
  }

  private prepLocalPackage(logPrefix: string, npmPackage: string, npmPackageNoVersion: string): string {
    const prefix = this.localPackages[npmPackage];

    console.log(`Module ${logPrefix}: Package ${npmPackageNoVersion} found in local codebase. Running build.`);
    // MDAA_BUILD_CODE_ONLY makes the package build scripts compile TypeScript only,
    // skipping schema generation and documentation not needed at deploy time.
    // Platform-utils helpers keep the `cd`/env/join structure OS-portable, and the
    // config-derived package name is routed through ShellCommand so it is quoted at
    // the sink. nx builds upstream dependencies first via its `^build` task
    // dependency (nx.json).
    const buildEnv = setEnvCmd('MDAA_BUILD_CODE_ONLY', 'true');
    // One-shot single-package build, so the nx daemon adds no value; disabling it
    // also suppresses nx's interactive "Install Nx Console?" prompt.
    const daemonEnv = setEnvCmd('NX_DAEMON', 'false');
    const buildCmd = ShellCommand.for('npx')
      .flags('nx', 'run')
      .arg(`${npmPackageNoVersion}:build`)
      .flags('--output-style=static')
      .build();
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const buildChain = cdAndRun(repoRoot, cmdJoin(buildEnv, daemonEnv, buildCmd));
    const returnToCwd = cdAndRun(this.cwd, staticCommand('cd .'));
    const fullBuildCmd = cmdJoin(buildChain, returnToCwd);
    console.log(`Running Nx Build: ${fullBuildCmd}`);
    this.execCmd(fullBuildCmd);

    return prefix;
  }

  private installPackage(logPrefix: string, npmPackage: string, npmPackageNoVersion: string): string {
    const prefix = path.resolve(
      path.join(
        this.workingDir,
        'nodejs',
        MdaaDeploy.hashCodeHex(npmPackage, this.npmTag ?? 'latest').replace(/^-/, ''),
      ),
    );
    console.log(`Module ${logPrefix}: Prepping NPM Package ${npmPackage}`);

    // nosemgrep
    /* istanbul ignore next */
    if (fs.existsSync(path.join(prefix, 'package.json'))) {
      console.log(`Module ${logPrefix}: Install prefix ${prefix} already exists. Attempting update instead.`);
      if (!this.updateCache[prefix]) {
        // tag/prefix are shell-quoted values; the `-d` flag and the ` > /dev/null`
        // redirect are literal shell structure kept outside the quoting. The
        // trailing choice is a runtime branch, so it is spelled out explicitly
        // rather than smuggled through a single literal-typed argument: `-d` is a
        // plain flag; the redirect is deliberate shell syntax (devNull() returns a
        // per-platform literal-typed constant).
        const npmUpdateCmd = ShellCommand.for('npm')
          .flags('update', '--no-fund', '--save-exact')
          .option('--tag', this.npmTag ?? '')
          .option('--prefix', prefix);
        if (this.npmDebug) {
          npmUpdateCmd.flags('-d');
        } else {
          npmUpdateCmd.shellSyntax('>').arg(devNull());
        }
        this.execCmd(npmUpdateCmd.build());
        this.updateCache[prefix] = true;
      } else {
        console.log(`Module ${logPrefix}: Skipping update. Already updated this prefix.`);
      }
    } else {
      console.log(`Module ${logPrefix}: Installing ${npmPackage} to ${prefix}.`);
      // Install the module CDK App NPM package. tag/prefix/package are each
      // shell-quoted values (config-derived module path included); the `-d` flag
      // and the ` > /dev/null` redirect are literal shell structure kept outside
      // the quoting. The trailing choice is a runtime branch, spelled out
      // explicitly rather than smuggled through a single literal-typed argument.
      const npmInstallCmd = ShellCommand.for('npm')
        .flags('install', '--no-fund', '--save-exact')
        .option('--tag', this.npmTag ?? '')
        .option('--prefix', prefix)
        .arg(npmPackage);
      if (this.npmDebug) {
        npmInstallCmd.flags('-d');
      } else {
        npmInstallCmd.shellSyntax('>').arg(devNull());
      }
      this.execCmd(cmdJoin(mkdirpCmd(prefix), npmInstallCmd.build()));
    }
    return path.join(prefix, 'node_modules', npmPackageNoVersion);
  }

  private prepCdkModule(moduleEffectiveConfig: ModuleEffectiveConfig): ModuleDeploymentConfig {
    const effectivePackageVersion = moduleEffectiveConfig.effectiveMdaaVersion || this.npmTag;

    const initialCdkAppNpmPackage = effectivePackageVersion
      ? `${moduleEffectiveConfig.modulePath}@${effectivePackageVersion}`
      : moduleEffectiveConfig.modulePath;

    const finalModuleCdkAppNpmPackage = moduleEffectiveConfig.modulePath.replace(/^@/, '').includes('@')
      ? moduleEffectiveConfig.modulePath
      : initialCdkAppNpmPackage;
    const logPrefix = this.modulePrefix(moduleEffectiveConfig);
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
    const packageJsonPath = path.join(moduleDeployConfig.modulePath, 'package.json');
    // nosemgrep
    if (fs.existsSync(packageJsonPath)) {
      // nosemgrep
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageJson = require(packageJsonPath);
      const deployStage = packageJson?.mdaa?.deployStage;
      if (deployStage !== undefined) {
        console.log(
          `Module ${this.modulePrefix(moduleDeployConfig)}: Set deploy stage to ${deployStage} by package.json mdaa config`,
        );
        return String(deployStage);
      }
    }
    console.log(
      `Module ${this.modulePrefix(moduleDeployConfig)}: Set deploy stage to ${MdaaDeploy.DEFAULT_DEPLOY_STAGE} by default`,
    );
    return MdaaDeploy.DEFAULT_DEPLOY_STAGE;
  }

  private modulePrefix(config: ModuleEffectiveConfig): string {
    return `${config.domainName}/${config.envName}/${config.moduleName}`;
  }

  public deployModule(moduleDeploymentConfig: ModuleDeploymentConfig) {
    if (!this.devopsMode) {
      console.log(`\n-----------------------------------------------------------`);
      console.log(`Module ${this.modulePrefix(moduleDeploymentConfig)}: Running ${this.action}`);
      console.log(`-----------------------------------------------------------`);
    }

    // Execute predeploy hook
    if (moduleDeploymentConfig.predeploy && this.action === 'deploy') {
      this.executeHook(moduleDeploymentConfig, 'predeploy', moduleDeploymentConfig.predeploy);
    }

    let deploymentSuccess = true;
    try {
      this.reverse(moduleDeploymentConfig.moduleCmds).forEach(moduleCmd => {
        console.log(`Module ${this.modulePrefix(moduleDeploymentConfig)}: Running cmd:\n${moduleCmd}`);

        // For diff action with diffOutDir, capture output to file
        this.execModuleCmd(moduleCmd, moduleDeploymentConfig);
      });
    } catch (error) {
      deploymentSuccess = false;
      throw error;
    } finally {
      // Execute postdeploy hook
      if (moduleDeploymentConfig.postdeploy && this.action === 'deploy') {
        const shouldRunPostdeploy = !moduleDeploymentConfig.postdeploy.after_success || deploymentSuccess;
        if (shouldRunPostdeploy) {
          this.executeHook(moduleDeploymentConfig, 'postdeploy', moduleDeploymentConfig.postdeploy);
        }
      }
    }
  }

  private execModuleCmd(moduleCmd: SafeCommand, moduleDeploymentConfig: ModuleDeploymentConfig): void {
    // `cd '<modulePath>' && <moduleCmd>`: cdAndRun quotes the module path for the
    // current platform; the already-assembled module command is trusted literal
    // text appended verbatim.
    const cmd = cdAndRun(moduleDeploymentConfig.modulePath, moduleCmd);
    if (this.action === 'diff' && this.diffOutDir) {
      this.execCmdWithDiffCapture(cmd, moduleDeploymentConfig);
    } else {
      this.execCmd(cmd);
    }
  }

  private execCmdWithDiffCapture(cmd: SafeCommand, moduleDeploymentConfig: ModuleDeploymentConfig): void {
    if (this.testMode) {
      console.log(`Testing Mode (diff capture):\n ${cmd}`);
      return;
    }

    const { stdout, stderr, exitCode, signal } = executeCommandWithCapture(cmd);
    // cdk writes some of its diff commentary to stderr, so the artifact keeps both
    const output = stdout + stderr;

    // Write diff output to file (always, so output is preserved for debugging)
    const diffOutPath = path.join(
      this.diffOutDir!,
      this.config.contents.organization,
      this.modulePrefix(moduleDeploymentConfig),
    );
    this.execCmd(mkdirpCmd(diffOutPath));
    fs.writeFileSync(path.join(diffOutPath, 'diff.txt'), output);

    const modulePrefix = this.modulePrefix(moduleDeploymentConfig);

    // cdk diff exits 1 when differences exist (normal) and >= 2 on actual errors.
    // Fail fast on real errors, consistent with how deploy/synth behave. A negative
    // code means the child was killed or never ran, which is likewise not a diff result.
    if (exitCode >= 2 || exitCode < 0) {
      const cause = signal ? `killed by ${signal}` : `exit code ${exitCode}`;
      console.error(`Module ${modulePrefix}: Diff command failed (${cause}) - see ${diffOutPath}/diff.txt`);
      throw new Error(`Diff failed for module ${modulePrefix} (${cause})`);
    }

    // Print summary to console
    const hasChanges = exitCode === 1 || !output.includes('There were no differences');
    if (hasChanges) {
      console.log(`Module ${modulePrefix}: Changes detected - see ${diffOutPath}/diff.txt`);
    } else {
      console.log(`Module ${modulePrefix}: No changes`);
    }
  }

  /**
   * Execute a module `predeploy`/`postdeploy` hook command.
   *
   * TRUST BOUNDARY: the hook `command` is arbitrary shell that runs verbatim by
   * design — it is intentionally *not* routed through the {@link ShellCommand}
   * quoting builder that protects every other config-derived value, because the
   * whole point of a hook is to let the config author run their own shell. This
   * is safe only because the MDAA config is a trusted input: the CLI must never
   * be run against a config from an untrusted source. Do not "harden" this path
   * by quoting the command — that would break legitimate hooks and give a false
   * sense of a boundary that does not exist. See `HOOK_FIELD_POLICY` in
   * config-field-policy.ts (the hook `command` is classified `not-shell` for
   * exactly this reason).
   */
  private executeHook(moduleDeploymentConfig: ModuleDeploymentConfig, hookType: HookType, hookConfig: HookConfig) {
    const modulePrefix = this.modulePrefix(moduleDeploymentConfig);

    if (!hookConfig.command) {
      throw new Error(`Module ${modulePrefix}: ${hookType} hook defined but no command specified`);
    }

    // Transform template variables in hook command (e.g., {{org}}, {{domain}}, {{env}}, {{module_name}}, {{region}})
    const transformerProps: MdaaConfigRefValueTransformerProps = {
      org: this.config.contents.organization,
      domain: moduleDeploymentConfig.domainName,
      env: moduleDeploymentConfig.envName,
      module_name: moduleDeploymentConfig.moduleName,
      context: moduleDeploymentConfig.effectiveContext,
      awsEnvironment: {
        region: moduleDeploymentConfig.deployRegion,
        account: moduleDeploymentConfig.deployAccount,
        partition: 'aws', // no current way to get other partition but currently MDAA doesn't have examples of using another partition
      },
    };
    const transformer = new MdaaConfigRefValueTransformer(transformerProps);
    const transformedHookCommand = transformer.transformValue(hookConfig.command);

    // Ensure the transformed value is a string (hook commands must be strings)
    if (typeof transformedHookCommand !== 'string') {
      throw new TypeError(
        `Module ${modulePrefix}: Hook command transformation resulted in non-string value (type: ${typeof transformedHookCommand}). Hook commands must be strings.`,
      );
    }

    console.log(`Module ${modulePrefix}: Executing ${hookType} hook command: ${transformedHookCommand}`);

    try {
      // TRUST BOUNDARY (see the doc comment above): the hook command is arbitrary
      // shell run verbatim by design, so it uses the audited unsafeCommand escape
      // hatch rather than the quoting builder. Safe only because the MDAA config
      // is a trusted input.
      this.execCmd(unsafeCommand(transformedHookCommand));
      console.log(`Module ${modulePrefix}: ${hookType} hook completed successfully`);
    } catch (error) {
      if (hookConfig.exit_if_fail) {
        const message = `Module ${modulePrefix}: Exiting deployment due to ${hookType} hook failure (exit_if_fail=${hookConfig.exit_if_fail})`;
        console.error(message);
        // Create a new error with the custom message and preserve the original error
        const hookError = new Error(message) as Error & { cause?: unknown };
        // Attach the original error as a property for debugging
        hookError.cause = error;
        throw hookError;
      } else {
        const message = `Module ${modulePrefix}: Continuing deployment despite ${hookType} hook failure (exit_if_fail=${hookConfig.exit_if_fail})`;
        console.warn(message);
      }
    }
  }

  private createCdkCommand(moduleEffectiveConfig: ModuleEffectiveConfig, localModule: boolean): SafeCommand {
    const lc = lineContinuation();

    const cdkEnv: SafeCommand[] = this.createCdkCommandEnv(moduleEffectiveConfig);
    const cdkCmd: SafeCommand[] = [];
    // `npx`/`cdk`, the debug/verbose flags, `--all`, and `--require-approval never`
    // are literal command structure; the action verb is quoted as a value so no
    // runtime value is interpolated into raw text (quoting a bareword verb is a
    // shell no-op). `--all` stays a separate literal flag rather than being folded
    // into the quoted verb, so it is not swallowed into a single argument.
    const cdkHeader = ShellCommand.for('npx');
    if (this.npmDebug) {
      cdkHeader.flags('-d');
    }
    cdkHeader.flags('cdk').arg(this.action);
    if (this.action == 'deploy' || this.action == 'destroy') {
      cdkHeader.flags('--all');
    }
    if (this.cdkVerbose) {
      cdkHeader.flags('-v');
    }
    cdkCmd.push(cdkHeader.flags('--require-approval', 'never').build());

    if (!localModule) {
      // Arriving token: `npx <dbg> <modulePath>/` as one `-a` argument. The `/`
      // suffix is part of the value; ShellCommand quotes the whole thing (via the
      // platform-aware shellQuote) so a metacharacter in the module path cannot
      // break out — byte-identical to the old single-quoting for quote-free paths.
      cdkCmd.push(
        ShellCommand.args()
          .option('-a', `npx ${this.npmDebug ? '-d' : ''} ${moduleEffectiveConfig.modulePath}/`)
          .build(),
      );
    }

    // Use cdkOutDir if provided, otherwise use default workingDir. path.join keeps
    // the output directory correct on Windows; ShellCommand quotes it at the sink.
    const cdkOutBase = this.cdkOutDir ?? path.join(this.workingDir, 'cdk.out');
    // First the -o output dir, then org/env/module_name/domain (all allowlist-validated).
    // Merged into one push() call — routed through the builder for uniformity so no
    // context sink stays outside the quoting.
    cdkCmd.push(
      ShellCommand.args()
        .option(
          '-o',
          path.join(cdkOutBase, this.config.contents.organization, this.modulePrefix(moduleEffectiveConfig)),
        )
        .build(),
      ShellCommand.args().option('-c', `org=${this.config.contents.organization}`).build(),
      ShellCommand.args().option('-c', `env=${moduleEffectiveConfig.envName}`).build(),
      ShellCommand.args().option('-c', `module_name=${moduleEffectiveConfig.moduleName}`).build(),
      ShellCommand.args().option('-c', `domain=${moduleEffectiveConfig.domainName}`).build(),
    );

    // Injected as a dedicated param so domain/env/module context blocks cannot override it
    this.addOptionalCdkContextStringParam(
      cdkCmd,
      'permissions_boundary_arn',
      moduleEffectiveConfig.permissionsBoundaryArn,
    );

    if (this.config.contents.naming_module && this.config.contents.naming_class) {
      cdkCmd.push(
        ShellCommand.args().option('-c', `naming_module=${moduleEffectiveConfig.customNaming?.naming_module}`).build(),
        ShellCommand.args().option('-c', `naming_class=${moduleEffectiveConfig.customNaming?.naming_class}`).build(),
      );
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
    this.addOptionalCdkContextStringParam(
      cdkCmd,
      'allow_cross_reference_stack',
      moduleEffectiveConfig.allow_cross_reference_stack?.toString(),
    );
    if (moduleEffectiveConfig.additionalStacks) {
      validateDeployments(moduleEffectiveConfig.additionalStacks);
    }
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
      cdkCmd.push(ShellCommand.args().option('-r', this.roleArn).build());
    }

    cdkCmd.push(...generateContextCdkParams(moduleEffectiveConfig));

    if (this.cdkPushdown) {
      console.log(
        `Module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${
          moduleEffectiveConfig.moduleName
        }: CDK Pushdown Options: ${JSON.stringify(this.cdkPushdown, undefined, 2)}`,
      );
      // --cdk-pushdown args are operator-supplied CLI arguments (a trusted input,
      // like the hook command): passed through to `cdk` verbatim by design, so
      // they use the audited unsafeCommand escape hatch rather than the quoting
      // builder, which would break legitimate multi-token cdk flags.
      cdkCmd.push(...this.cdkPushdown.map(arg => unsafeCommand(arg)));
    }

    this.addBaselineTemplateParam(cdkCmd, moduleEffectiveConfig);

    const cdkCmdLine = joinCommands(cdkCmd, lc);
    return cdkEnv.length > 0 ? cmdJoin(...cdkEnv, cdkCmdLine) : cdkCmdLine;
  }

  private addBaselineTemplateParam(cdkCmd: SafeCommand[], moduleEffectiveConfig: ModuleEffectiveConfig): void {
    if (this.action !== 'diff' || !this.baselineDir) {
      return;
    }
    const baselineTemplatePath = path.join(
      this.baselineDir,
      this.config.contents.organization,
      this.modulePrefix(moduleEffectiveConfig),
    );
    const templateFile = this.findTemplateFile(baselineTemplatePath);
    if (templateFile) {
      cdkCmd.push(ShellCommand.args().option('--template', templateFile).build());
    } else {
      throw new Error(
        `No baseline template found for module ${moduleEffectiveConfig.domainName}/${moduleEffectiveConfig.envName}/${moduleEffectiveConfig.moduleName} at ${baselineTemplatePath}. ` +
          `Ensure baselines have been generated for this module.`,
      );
    }
  }

  private addOptionalCdkContextStringParam(cdkCmd: SafeCommand[], context_key: string, context_value?: string) {
    if (context_value) {
      // Arriving token: `<key>="<value>"` (the literal double quotes are part of
      // the CDK context value the receiver expects). ShellCommand quotes the whole
      // token, preserving the previous `-c '<key>="<value>"'` bytes for quote-free
      // values while neutralizing any shell metacharacter in the value.
      cdkCmd.push(ShellCommand.args().option('-c', `${context_key}="${context_value}"`).build());
    }
  }

  private addOptionalCdkContextObjParam(
    cdkCmd: SafeCommand[],
    context_key: string,
    context_value?: MdaaCustomAspect[] | TagElement | ConfigurationElement | Deployment[],
  ) {
    if (context_value) {
      if (Object.keys(context_value).length > 0) {
        // Arriving token: `<key>=<JSON.stringify(value)>` — the CDK app decodes
        // it with a single `JSON.parse` (getNodeValue). Previously this used a
        // *double* JSON.stringify wrapped in bare double quotes, so a `$(...)` or
        // backtick inside the JSON was interpreted by the shell. Routing the
        // single-layer token through the builder single-quotes the whole thing,
        // so the value arrives byte-for-byte at the receiver but the shell treats
        // every metacharacter in it as literal.
        cdkCmd.push(
          ShellCommand.args()
            .option('-c', `${context_key}=${JSON.stringify(context_value)}`)
            .build(),
        );
      }
    }
  }

  private createCdkCommandEnv(moduleEffectiveConfig: ModuleEffectiveConfig): SafeCommand[] {
    const cdkEnv: SafeCommand[] = [];
    const modulePrefix = this.modulePrefix(moduleEffectiveConfig);
    // region/account are allowlist-validated here (they contain no shell
    // metacharacters); setEnvCmd emits the platform-appropriate env-assignment
    // (`export NAME='<value>'` on POSIX, `set "NAME=<value>"` on Windows).
    if (moduleEffectiveConfig.deployRegion && moduleEffectiveConfig.deployRegion.toLowerCase() != 'default') {
      const region = validateDeployRegionResolved(moduleEffectiveConfig.deployRegion, `module ${modulePrefix}`);
      cdkEnv.push(setEnvCmd('CDK_DEPLOY_REGION', region), setEnvCmd('AWS_DEFAULT_REGION', region));
    }
    if (moduleEffectiveConfig.deployAccount && moduleEffectiveConfig.deployAccount.toLowerCase() != 'default') {
      const account = validateDeployAccountResolved(moduleEffectiveConfig.deployAccount, `module ${modulePrefix}`);
      cdkEnv.push(setEnvCmd('CDK_DEPLOY_ACCOUNT', account));
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
      effectiveContext: computeEffectiveContext(globalEffectiveConfig, domain.context),
      effectiveTagConfig: computeEffectiveTagConfig(globalEffectiveConfig, domain.tag_config_data),
      tagConfigFiles: computeEffectiveTagConfigFiles(globalEffectiveConfig, domain.tag_configs),
      effectiveMdaaVersion: computeEffectiveMdaaVersion(globalEffectiveConfig, domain.mdaa_version),
      customAspects: computeEffectiveCustomAspects(globalEffectiveConfig, domain.custom_aspects),
      customNaming: computeEffectiveCustomNaming(globalEffectiveConfig, domain.custom_naming),
      terraform: computeEffectiveTerraformConfig(globalEffectiveConfig, domain.terraform),
      deployAccount: domain.account ?? globalEffectiveConfig.deployAccount,
      deployRegion: domain.region ?? globalEffectiveConfig.deployRegion,
      permissionsBoundaryArn: computeEffectivePermissionsBoundaryArn(
        globalEffectiveConfig,
        domain.permissions_boundary_arn,
      ),
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
      effectiveContext: computeEffectiveContext(domainEffectiveConfig, env.context),
      effectiveTagConfig: computeEffectiveTagConfig(domainEffectiveConfig, env.tag_config_data),
      tagConfigFiles: computeEffectiveTagConfigFiles(domainEffectiveConfig, env.tag_configs),
      effectiveMdaaVersion: computeEffectiveMdaaVersion(domainEffectiveConfig, env.mdaa_version),
      customAspects: computeEffectiveCustomAspects(domainEffectiveConfig, env.custom_aspects),
      customNaming: computeEffectiveCustomNaming(domainEffectiveConfig, env.custom_naming),
      terraform: computeEffectiveTerraformConfig(domainEffectiveConfig, env.terraform),
      permissionsBoundaryArn: computeEffectivePermissionsBoundaryArn(
        domainEffectiveConfig,
        env.permissions_boundary_arn,
      ),
    };
  }

  private computeModuleEffectiveConfig(
    mdaaModuleName: string,
    mdaaModule: MdaaModuleConfig,
    envEffectiveConfig: EnvEffectiveConfig,
  ): ModuleEffectiveConfig {
    const modulePath = mdaaModule.module_path ?? mdaaModule.cdk_app; //NOSONAR
    if (!modulePath) {
      throw new Error('One of cdp_app or module_path must be defined');
    }
    const additionalStacks: Deployment[] | undefined =
      mdaaModule.additional_stacks || mdaaModule.additional_accounts
        ? [
            ...(mdaaModule.additional_stacks ?? []),
            ...(mdaaModule.additional_accounts ?? []).map(account => {
              return { account: account };
            }),
          ]
        : undefined;
    return {
      ...envEffectiveConfig,
      moduleName: mdaaModuleName,
      useBootstrap:
        envEffectiveConfig.useBootstrap && (mdaaModule.use_bootstrap == undefined || mdaaModule.use_bootstrap),
      moduleConfigFiles: [...(mdaaModule.app_configs ?? []), ...(mdaaModule.module_configs ?? [])], //NOSONAR
      effectiveModuleConfig: { ...(mdaaModule.app_config_data ?? {}), ...(mdaaModule.module_config_data ?? {}) }, //NOSONAR
      moduleType: mdaaModule.module_type ?? 'cdk',
      modulePath: modulePath,
      allow_cross_reference_stack: mdaaModule.allow_cross_reference_stack,
      additionalStacks: additionalStacks,
      mdaaCompliant: mdaaModule.mdaa_compliant,
      effectiveContext: computeEffectiveContext(envEffectiveConfig, mdaaModule.context),
      effectiveTagConfig: computeEffectiveTagConfig(envEffectiveConfig, mdaaModule.tag_config_data),
      effectiveMdaaVersion: computeEffectiveMdaaVersion(envEffectiveConfig, mdaaModule.mdaa_version),
      tagConfigFiles: computeEffectiveTagConfigFiles(envEffectiveConfig, mdaaModule.tag_configs),
      customAspects: computeEffectiveCustomAspects(envEffectiveConfig, mdaaModule.custom_aspects),
      customNaming: computeEffectiveCustomNaming(envEffectiveConfig, mdaaModule.custom_naming),
      terraform: computeEffectiveTerraformConfig(envEffectiveConfig, mdaaModule.terraform),
      deployAccount: envEffectiveConfig.deployAccount,
      deployRegion: envEffectiveConfig.deployRegion,
      predeploy: mdaaModule.predeploy,
      postdeploy: mdaaModule.postdeploy,
    };
  }

  /* istanbul ignore next */
  public execCmd(cmd: SafeCommand) {
    if (this.testMode) {
      console.log(`Testing Mode:\n ${cmd}`);
      return;
    }

    try {
      executeCommand(cmd);
    } catch (error: unknown) {
      this.handleCommandError(cmd, error);
    }
  }

  private handleCommandError(cmd: SafeCommand, error: unknown) {
    console.error(`\n=== Command Execution Failed ===`);
    console.error(`Command: ${cmd}`);

    logExecutionError(error);
    analyzeScriptFile(cmd);
    console.error(`=== End Error Details ===\n`);

    this.handleErrorBasedOnFailMode(error);
  }

  private handleErrorBasedOnFailMode(error: unknown) {
    if (this.noFail) {
      console.warn(`Child process raised exception: ${error}`);
      if (error instanceof Error) {
        console.error(error.stack);
      }
    } else {
      throw error;
    }
  }

  protected static hashCodeHex(...strings: string[]) {
    let h = 0;
    strings.forEach(s => {
      for (let i = 0; i < s.length; i++) h = Math.trunc(Math.imul(31, h) + (s.codePointAt(i) ?? 0));
    });
    return h.toString(16);
  }

  private createGlobalEffectiveConfig(): EffectiveConfig {
    return {
      effectiveContext: {
        ...this.config.contents.context,
      },
      effectiveTagConfig: this.config.contents.tag_config_data ?? {},
      tagConfigFiles: this.config.contents.tag_configs ?? [],
      effectiveMdaaVersion: this.config.contents.mdaa_version || this.mdaaVersion,
      customAspects: this.config.contents.custom_aspects ?? [],
      customNaming:
        this.config.contents.naming_module && this.config.contents.naming_class
          ? {
              naming_module: this.config.contents.naming_module,
              naming_class: this.config.contents.naming_class,
              naming_props: this.config.contents.naming_props,
            }
          : undefined,
      envTemplates: this.config.contents.env_templates ?? {},
      terraform: this.config.contents.terraform,
      deployAccount: this.config.contents.account,
      deployRegion: this.config.contents.region,
      permissionsBoundaryArn: this.config.contents.permissions_boundary_arn,
    };
  }

  private determineEnvEffectiveConfig(
    env: MdaaEnvironmentConfig,
    envName: string,
    domainEffectiveConfig: DomainEffectiveConfig,
  ): [MdaaEnvironmentConfig, EnvEffectiveConfig] {
    if (env.template && !domainEffectiveConfig.envTemplates?.[env.template]) {
      throw new Error(`Environment "${envName}" references invalid template name: ${env.template}.`);
    }
    const template =
      env.template && domainEffectiveConfig.envTemplates ? domainEffectiveConfig.envTemplates[env.template] : {};
    // nosemgrep
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ld = require('lodash');
    const envMergedConfig: MdaaEnvironmentConfig = {
      ...ld.mergeWith({}, template, env), //There are sideeffects here if we don't merge into an empty object
      //Ensure template modules come first
      modules: {
        ...template.modules,
        ...env.modules,
      },
    };

    return [envMergedConfig, this.computeEnvEffectiveConfig(envName, envMergedConfig, domainEffectiveConfig)];
  }
}
