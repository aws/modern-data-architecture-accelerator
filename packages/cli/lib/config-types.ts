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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Terraform configuration for MDAA CLI enabling Terraform module deployment alongside CDK modules. Defines Terraform-specific configuration including backend settings, provider configuration, and Terraform module orchestration for hybrid infrastructure deployment.
   *
   * Use cases: Hybrid CDK/Terraform deployment; Terraform module integration; Multi-tool orchestration; Legacy Terraform support
   *
   * AWS: MDAA CLI Terraform orchestration for hybrid infrastructure deployment
   *
   * Validation: Must be valid TerraformConfig; optional configuration for Terraform integration
   *   */
  readonly terraform?: TerraformConfig;
  readonly deployAccount?: string;
  readonly deployRegion?: string;
}

export interface DomainEffectiveConfig extends EffectiveConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain name identifier for data mesh and multi-domain architecture deployments enabling domain-specific resource organization. Provides the domain context for resource naming, SSM parameter organization, and cross-domain data sharing coordination in MDAA data mesh architectures.
   *
   * Use cases: Data mesh domain identification; Domain-specific resource organization; Cross-domain coordination; Data mesh governance
   *
   * AWS: Domain identifier for AWS resource naming and SSM parameter organization in data mesh architectures
   *
   * Validation: Must be valid AWS resource name component; required for domain-scoped deployments and data mesh coordination
   *   */
  readonly domainName: string;
}

export interface EnvEffectiveConfig extends DomainEffectiveConfig {
  readonly envName: string;
  readonly useBootstrap: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * Hook configuration interface for MDAA CLI deployment lifecycle management enabling custom pre/post deployment actions and validation steps. Defines hook commands that execute at specific deployment phases for custom validation, preparation, and cleanup operations in MDAA orchestration workflows.
 *
 * Use cases: Pre-deployment validation; Post-deployment testing; Custom setup scripts; Environment preparation; Cleanup operations
 *
 * AWS: Custom deployment lifecycle management for MDAA module orchestration and validation workflows
 *
 * Validation: Hook commands must be valid shell commands; execution context must be appropriate for deployment phase
 */
export interface HookConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Shell command to execute during the deployment lifecycle hook for custom validation, setup, or cleanup operations. Defines the executable command that runs at specific deployment phases enabling custom automation and validation in MDAA deployment workflows.
   *
   * Use cases: Custom validation scripts; Environment setup; Pre-deployment checks; Post-deployment testing; Cleanup operations
   *
   * AWS: MDAA CLI deployment lifecycle management for custom command execution
   *
   * Validation: Must be valid shell command; execution context must be appropriate for deployment phase; optional string
   *   */
  readonly command?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Whether to exit the deployment process if the hook command fails controlling deployment failure behavior. Defines failure handling for hook commands enabling strict validation enforcement or allowing deployment to continue despite hook failures.
   *
   * Use cases: Strict validation enforcement; Deployment failure control; Critical validation checks; Optional validation steps
   *
   * AWS: MDAA CLI deployment lifecycle management for failure handling control
   *
   * Validation: Boolean value; optional flag for failure behavior control
   * @default false   */
  readonly exit_if_fail?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Whether to execute the hook command only after successful completion of the main deployment operation. Controls conditional execution of post-deployment hooks based on deployment success status for cleanup, notification, or validation operations.
   *
   * Use cases: Success-only notifications; Post-deployment validation; Conditional cleanup; Success-triggered workflows
   *
   * AWS: MDAA CLI deployment lifecycle management for conditional hook execution
   *
   * Validation: Boolean value; optional flag for success-conditional hook execution
   * @default false   */
  readonly after_success?: boolean;
}

export interface ModuleEffectiveConfig extends EnvEffectiveConfig {
  readonly moduleType?: 'cdk' | 'tf';
  readonly modulePath: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique identifier for the MDAA module enabling resource naming, dependency resolution, and deployment orchestration. Provides the module name used for CloudFormation stack naming, SSM parameter organization, and inter-module dependency management within MDAA architectures.
   *
   * Use cases: Module identification; Resource naming; Dependency resolution; Stack organization; SSM parameter namespacing
   *
   * AWS: MDAA CLI module naming for CloudFormation stack and resource identification
   *
   * Validation: Must be valid module name; required; used for resource naming and dependency resolution
   *   */
  readonly moduleName: string;
  readonly useBootstrap: boolean;
  readonly additionalStacks?: Deployment[];
  readonly effectiveModuleConfig: ConfigurationElement;
  readonly moduleConfigFiles?: string[];
  readonly mdaaCompliant?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Pre-deployment hook configuration for executing custom commands before module deployment begins. Defines pre-deployment validation, setup, or preparation operations that execute before the main deployment process for environment readiness and validation.
   *
   * Use cases: Pre-deployment validation; Environment preparation; Dependency checks; Setup scripts; Readiness verification
   *
   * AWS: MDAA CLI deployment lifecycle management for pre-deployment hook execution
   *
   * Validation: Must be valid HookConfig; optional configuration for pre-deployment automation
   *   */
  readonly predeploy?: HookConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Post-deployment hook configuration for executing custom commands after module deployment completes. Defines post-deployment validation, testing, or cleanup operations that execute after the main deployment process for verification and finalization.
   *
   * Use cases: Post-deployment testing; Validation checks; Cleanup operations; Notification scripts; Deployment verification
   *
   * AWS: MDAA CLI deployment lifecycle management for post-deployment hook execution
   *
   * Validation: Must be valid HookConfig; optional configuration for post-deployment automation
   *   */
  readonly postdeploy?: HookConfig;
}

export interface ModuleDeploymentConfig extends ModuleEffectiveConfig {
  readonly moduleCmds: string[];
  readonly localModule: boolean;
}
