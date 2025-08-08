/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationElement, MdaaCustomAspect, MdaaCustomNaming, TagElement } from '@aws-mdaa/config';
import { Deployment, MdaaEnvironmentConfig, TerraformConfig } from './mdaa-cli-config-parser';

export interface EffectiveConfig {
  effectiveContext: ConfigurationElement;
  effectiveTagConfig: TagElement;
  tagConfigFiles: string[];
  effectiveMdaaVersion?: string;
  customAspects: MdaaCustomAspect[];
  customNaming?: MdaaCustomNaming;
  envTemplates?: { [key: string]: MdaaEnvironmentConfig };
  terraform?: TerraformConfig;
  deployAccount?: string;
  deployRegion?: string;
}

export interface DomainEffectiveConfig extends EffectiveConfig {
  domainName: string;
}

export interface EnvEffectiveConfig extends DomainEffectiveConfig {
  envName: string;
  useBootstrap: boolean;
}
export interface HookConfig {
  command?: string;
  exit_if_fail?: boolean;
  after_success?: boolean;
}

export interface ModuleEffectiveConfig extends EnvEffectiveConfig {
  moduleType?: 'cdk' | 'tf';
  modulePath: string;
  moduleName: string;
  useBootstrap: boolean;
  additionalStacks?: Deployment[];
  effectiveModuleConfig: ConfigurationElement;
  moduleConfigFiles?: string[];
  mdaaCompliant?: boolean;
  predeploy?: HookConfig;
  postdeploy?: HookConfig;
}

export interface ModuleDeploymentConfig extends ModuleEffectiveConfig {
  moduleCmds: string[];
  localModule: boolean;
}
