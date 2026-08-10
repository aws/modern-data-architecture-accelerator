/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationElement, MdaaCustomAspect, MdaaCustomNaming, TagElement } from '@aws-mdaa/config';
import { DevOpsConfigContents } from '@aws-mdaa/devops';
import { Deployment } from './deployment-types';
import { SafeCommand } from './safe-command';

// ─── Parsed config-file shapes ──────────────────────────────────────────────
// The raw YAML config as parsed (before resolution). Kept here in the
// dependency-free types module so both the parser and config-field-policy import
// from a common lower layer (no cycle). `MdaaConfigContents` is the schema
// generator's root type (see build_cli_package.js), so its JSDoc is surfaced
// verbatim in config-schema.json / SCHEMA.md — keep it user-facing.

export interface HookConfig {
  /** Shell command to execute during the deployment lifecycle hook for custom validation, setup, or cleanup operations */
  readonly command?: string;
  /** Whether to exit the deployment process if the hook command fails controlling deployment failure behavior */
  readonly exit_if_fail?: boolean;
  /** Whether to execute the hook command only after successful completion of the main deployment operation */
  readonly after_success?: boolean;
}

export interface MdaaModuleConfig {
  /** Module type specification controlling deployment engine selection for MDAA module orchestration */
  readonly module_type?: 'cdk' | 'tf';
  /** Module path specification for MDAA module location and source identification */
  readonly module_path?: string;
  /** Deprecated CDK application path specification replaced by module_path for consistent module sourcing */
  readonly cdk_app?: string;
  /** Deprecated additional CDK context specification replaced by context property for consistent configuration management */
  readonly additional_context?: { [key: string]: string };
  /** CDK context configuration providing deployment-specific context and configuration data for module execution */
  readonly context?: ConfigurationElement;
  /** Array of tag configuration file paths for resource tagging strategy compilation */
  readonly tag_configs?: string[];
  /** Deprecated application configuration file paths replaced by module_configs for consistent configuration management */
  readonly app_configs?: string[];
  /** Deprecated application configuration data replaced by module_config_data for consistent configuration management */
  readonly app_config_data?: ConfigurationElement;
  /** Array of module configuration file paths for module configuration compilation */
  readonly module_configs?: string[];
  /** Module configuration data providing direct configuration parameters for module execution */
  readonly module_config_data?: ConfigurationElement;
  /** Tag configuration data providing direct tagging parameters for resource tagging strategy */
  readonly tag_config_data?: TagElement;
  /** MDAA version override for module-specific version control enabling selective version management across modules */
  readonly mdaa_version?: string;
  /** Flag controlling CDK bootstrap environment usage for module deployment enabling bootstrap */
  readonly use_bootstrap?: boolean;
  /** Array of custom CDK aspects for advanced deployment customization and cross-cutting */
  readonly custom_aspects?: MdaaCustomAspect[];
  /** Custom naming configuration for module-specific resource naming conventions enabling */
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Enable this flag to allow native cross region stack references.
   * Enabling this will create a CloudFormation custom resource in both the producing stack and consuming stack in order to perform the export/import.
   * Required for resources that must be created in us-east-1 but referenced from other regions (e.g., WAF ACLs for CloudFront)
   */
  readonly allow_cross_reference_stack?: boolean;
  /** Array of additional AWS account IDs for cross-account resource deployment enabling */
  readonly additional_accounts?: string[];
  /** Array of additional deployment configurations for multi-stack and multi-region deployment scenarios */
  readonly additional_stacks?: Deployment[];
  /** Terraform-specific configuration for modules using Terraform deployment engine enabling */
  readonly terraform?: TerraformConfig;
  /** Flag indicating whether the module implements MDAA-compliant behaviors and security controls */
  readonly mdaa_compliant?: boolean;
  /** Pre-deployment hook configuration for custom validation and setup operations before module deployment */
  readonly predeploy?: HookConfig;
  /** Post-deployment hook configuration for custom validation and cleanup operations after module deployment */
  readonly postdeploy?: HookConfig;
}

export interface TerraformConfig {
  /** Terraform configuration override settings for customizing Terraform backend and provider */
  readonly override?: {
    readonly terraform?: {
      backend?: {
        /** S3 backend configuration for Terraform state management enabling remote state storage and collaboration */
        s3: ConfigurationElement;
      };
    };
  };
}

export interface MdaaEnvironmentConfig {
  /** Environment template reference for template-based environment configuration enabling */
  readonly template?: string;
  /** Target AWS account ID for MDAA environment deployment enabling multi-account deployment strategies */
  readonly account?: string;
  /** Target AWS region for MDAA environment deployment enabling multi-region deployment strategies */
  readonly region?: string;
  /** Map of MDAA module names to their configuration enabling multi-module deployment orchestration */
  readonly modules?: { [moduleName: string]: MdaaModuleConfig };
  /** Additional CDK context key/value pairs for environment-specific configuration enabling */
  readonly context?: ConfigurationElement;
  /** MDAA version override for environment-specific version control enabling selective version */
  readonly mdaa_version?: string;
  /** Tag configuration data providing direct tagging parameters for environment resource tagging strategy */
  readonly tag_config_data?: TagElement;
  /** Array of tag configuration file paths for resource tagging strategy compilation */
  readonly tag_configs?: string[];
  /** Flag controlling CDK bootstrap environment usage for environment deployment enabling */
  readonly use_bootstrap?: boolean;
  /** Array of custom CDK aspects for advanced deployment customization and cross-cutting */
  readonly custom_aspects?: MdaaCustomAspect[];
  /** Custom naming configuration for environment-specific resource naming conventions enabling */
  readonly custom_naming?: MdaaCustomNaming;
  /** Terraform configuration for environment-specific Terraform module deployment enabling */
  readonly terraform?: TerraformConfig;
  /**
   * IAM permissions boundary policy ARN. Overrides the parent (domain or top-level) value.
   * When specified, the managed policy is applied as a permissions boundary to all IAM roles
   * in this environment's stacks.
   */
  readonly permissions_boundary_arn?: string;
}

export interface MdaaDomainConfig {
  /** Map of environment names to environment configurations for multi-environment MDAA deployment orchestration */
  readonly environments: { [name: string]: MdaaEnvironmentConfig };
  /** Additional CDK context key/value pairs for domain-wide configuration enabling flexible */
  readonly context?: ConfigurationElement;
  /** MDAA version override for domain-wide version control enabling consistent version */
  readonly mdaa_version?: string;
  /** Tag configuration data providing direct tagging parameters for domain-wide resource tagging strategy */
  readonly tag_config_data?: TagElement;
  /** Array of tag configuration file paths for domain-wide resource tagging strategy compilation */
  readonly tag_configs?: string[];
  /** Array of custom CDK aspects for advanced deployment customization and cross-cutting */
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_naming?: MdaaCustomNaming;
  /** Environment templates configuration for reusable environment definitions enabling */
  readonly env_templates?: { [name: string]: MdaaEnvironmentConfig };
  /** Terraform configuration for Terraform module integration enabling hybrid CDK/Terraform deployments within MDAA */
  readonly terraform?: TerraformConfig;
  /** Target AWS region for MDAA deployments overriding CDK default region settings */
  readonly region?: string;
  /** Target AWS account number for MDAA deployments enabling cross-account deployment scenarios */
  readonly account?: string;
  /**
   * IAM permissions boundary policy ARN. Overrides the top-level value for this domain.
   * When specified, the managed policy is applied as a permissions boundary to all IAM roles
   * in this domain's stacks.
   */
  readonly permissions_boundary_arn?: string;
}

export interface MdaaConfigContents {
  /** Module path for custom MDAA naming implementation overriding the default org-env-domain-module pattern */
  readonly naming_module?: string;
  /** Class name for custom MDAA naming implementation within the specified module */
  readonly naming_class?: string;
  /** Configuration properties passed to custom naming implementation constructor for naming behavior customization */
  readonly naming_props?: ConfigurationElement;
  /** Organization identifier that serves as the top-level namespace for all AWS resource names */
  readonly organization: string;
  /** Target AWS region for MDAA deployments overriding CDK default region settings */
  readonly region?: string;
  /** Target AWS account number for MDAA deployments enabling cross-account deployment scenarios */
  readonly account?: string;
  /** Flag controlling CDK Nag suppression logging for compliance and debugging purposes */
  readonly log_suppressions?: boolean;
  /** Array of tag configuration file paths for centralized tagging strategy implementation */
  readonly tag_configs?: string[];
  /** Map of domain configurations defining the organizational structure and deployment targets for MDAA modules */
  readonly domains: { [name: string]: MdaaDomainConfig };
  /**
   * Additional CDK Context key/value pairs
   */
  readonly context?: ConfigurationElement;
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Override the MDAA version
   */
  readonly mdaa_version?: string;
  /**
   * Tagging data which will be passed directly to apps
   */
  readonly tag_config_data?: TagElement;

  /**
   * Configurations used when deploying MDAA DevOps resources
   */
  readonly devops?: DevOpsConfigContents;

  /**
   * Templates for environments which can be referenced throughout the config.
   */
  readonly env_templates?: { [name: string]: MdaaEnvironmentConfig };

  /**
   * Config properties for TF modules
   */
  readonly terraform?: TerraformConfig;

  readonly useStaging?: boolean;

  /**
   * IAM permissions boundary policy ARN. When specified, the managed policy
   * is applied as a permissions boundary to all IAM roles across all stacks.
   * Supports hierarchy: can be set at the top level, domain, or environment level.
   * A child value overrides the parent. This is a first-class config field and
   * cannot be overridden via generic context blocks.
   */
  readonly permissions_boundary_arn?: string;
}

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
  /**
   * IAM permissions boundary policy ARN. Injected as a dedicated CDK context
   * parameter so it cannot be overridden by domain/env/module context blocks.
   */
  readonly permissionsBoundaryArn?: string;
}

export interface DomainEffectiveConfig extends EffectiveConfig {
  /** Domain name identifier for data mesh and multi-domain architecture deployments enabling */
  readonly domainName: string;
}

export interface EnvEffectiveConfig extends DomainEffectiveConfig {
  readonly envName: string;
  readonly useBootstrap: boolean;
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
  readonly moduleCmds: SafeCommand[];
  readonly localModule: boolean;
}
