import { ConfigurationElement, MdaaCustomAspect, MdaaCustomNaming, TagElement } from '@aws-mdaa/config';
import { MdaaEnvironmentConfig, TerraformConfig } from './mdaa-cli-config-parser';

export interface EffectiveConfig {
  effectiveContext: ConfigurationElement;
  effectiveTagConfig: TagElement;
  tagConfigFiles: string[];
  effectiveMdaaVersion?: string;
  customAspects: MdaaCustomAspect[];
  customNaming?: MdaaCustomNaming;
  envTemplates?: { [key: string]: MdaaEnvironmentConfig };
  terraform?: TerraformConfig;
}

export interface DomainEffectiveConfig extends EffectiveConfig {
  domainName: string;
}

export interface EnvEffectiveConfig extends DomainEffectiveConfig {
  envName: string;
  useBootstrap: boolean;
  deployAccount?: string;
}

export interface ModuleEffectiveConfig extends EnvEffectiveConfig {
  moduleType?: 'cdk' | 'tf';
  modulePath: string;
  moduleName: string;
  useBootstrap: boolean;
  additionalAccounts?: string[];
  effectiveModuleConfig: ConfigurationElement;
  moduleConfigFiles?: string[];
  mdaaCompliant?: boolean;
}

export interface ModuleDeploymentConfig extends ModuleEffectiveConfig {
  moduleCmds: string[];
  localModule: boolean;
}
