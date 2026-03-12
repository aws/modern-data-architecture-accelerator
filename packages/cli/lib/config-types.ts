/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationElement, MdaaCustomAspect, MdaaCustomNaming, TagElement } from '@aws-mdaa/config';
import { Deployment, MdaaEnvironmentConfig, TerraformConfig } from './mdaa-cli-config-parser';

export interface EffectiveConfig {
  readonly effectiveContext: ConfigurationElement;
  readonly effectiveTagConfig: TagElement;
  readonly tagConfigFiles: string[];
  readonly effectiveMdaaVersion?: string;
  readonly customAspects: MdaaCustomAspect[];
  readonly customNaming?: MdaaCustomNaming;
  readonly envTemplates?: { [key: string]: MdaaEnvironmentConfig };
  /** Terraform configuration for MDAA CLI enabling Terraform module deployment alongside CDK modules */
  readonly terraform?: TerraformConfig;
  readonly deployAccount?: string;
  readonly deployRegion?: string;
}

export interface DomainEffectiveConfig extends EffectiveConfig {
  /** Domain name identifier for data mesh and multi-domain architecture deployments enabling */
  readonly domainName: string;
}

export interface EnvEffectiveConfig extends DomainEffectiveConfig {
  readonly envName: string;
  readonly useBootstrap: boolean;
}
export interface HookConfig {
  /** Shell command to execute during the deployment lifecycle hook for custom validation, setup, or cleanup operations */
  readonly command?: string;
  /** Whether to exit the deployment process if the hook command fails controlling deployment failure behavior */
  readonly exit_if_fail?: boolean;
  /** Whether to execute the hook command only after successful completion of the main deployment operation */
  readonly after_success?: boolean;
}

export interface ModuleEffectiveConfig extends EnvEffectiveConfig {
  readonly moduleType?: 'cdk' | 'tf';
  readonly modulePath: string;
  /** Unique identifier for the MDAA module enabling resource naming, dependency resolution, and */
  readonly moduleName: string;
  readonly useBootstrap: boolean;
  readonly additionalStacks?: Deployment[];
  readonly allow_cross_reference_stack?: boolean;
  readonly effectiveModuleConfig: ConfigurationElement;
  readonly moduleConfigFiles?: string[];
  readonly mdaaCompliant?: boolean;
  /** Pre-deployment hook configuration for executing custom commands before module deployment begins */
  readonly predeploy?: HookConfig;
  /** Post-deployment hook configuration for executing custom commands after module deployment completes */
  readonly postdeploy?: HookConfig;
}

export interface ModuleDeploymentConfig extends ModuleEffectiveConfig {
  readonly moduleCmds: string[];
  readonly localModule: boolean;
}
