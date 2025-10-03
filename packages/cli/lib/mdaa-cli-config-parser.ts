/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigConfigPathValueTransformer,
  ConfigurationElement,
  MdaaConfigTransformer,
  MdaaCustomAspect,
  MdaaCustomNaming,
  TagElement,
} from '@aws-mdaa/config';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as configJsonSchema from './config-schema.json';
import { DevOpsConfigContents } from '@aws-mdaa/devops';
// nosemgrep
import path = require('path');

const avj = new Ajv();

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
   * Optional shell command to execute during deployment lifecycle hook enabling custom validation, preparation, and cleanup operations. Defines the specific command that will be executed at the designated deployment phase for custom logic, validation scripts, or environment preparation tasks.
   *
   * Use cases: Custom validation scripts; Environment preparation; Pre-deployment checks; Post-deployment testing; Cleanup operations
   *
   * AWS: Shell command execution during MDAA CLI deployment lifecycle for custom deployment logic
   *
   * Validation: Must be valid shell command if provided; executed in deployment context with appropriate permissions
   **/
  readonly command?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling deployment termination behavior when hook execution fails. When enabled, causes the entire MDAA deployment to exit if the hook command fails, providing strict validation and quality gates for deployment processes.
   *
   * Use cases: Strict validation gates; Quality control; Deployment safety; Critical validation enforcement; Failure handling
   *
   * AWS: MDAA CLI deployment control for hook failure handling and deployment termination
   *
   * Validation: Boolean value; defaults to false; controls deployment continuation on hook failure
   **/
  readonly exit_if_fail?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag restricting hook execution to successful deployment scenarios only. When enabled, ensures the hook only runs after successful deployment completion, useful for post-deployment validation, notification, or cleanup operations that should not run on failed deployments.
   *
   * Use cases: Post-deployment validation; Success notifications; Cleanup after success; Conditional operations; Success-only actions
   *
   * AWS: MDAA CLI deployment lifecycle control for success-conditional hook execution
   *
   * Validation: Boolean value; defaults to false; controls hook execution timing based on deployment success
   **/
  readonly after_success?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * MDAA module deployment configuration interface for individual module orchestration within multi-module data architectures. Defines module-specific deployment parameters including module type (CDK/Terraform), source paths, execution context, dependency management, and deployment targeting for systematic module deployment with dependency resolution and configuration inheritance.
 *
 * Use cases: Individual module deployment; CDK and Terraform module support; Module dependency management; Configuration inheritance; Selective module deployment
 *
 * AWS: Module-scoped AWS resource deployment with CloudFormation or Terraform state management, dependency resolution, and configuration context
 *
 * Validation: module_type must be 'cdk' or 'tf'; module_path must be valid file path or npm package name; context must be valid configuration elements; dependencies must reference existing modules
 */
export interface MdaaModuleConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional module type specification controlling deployment engine selection for MDAA module orchestration. Determines whether the module will be deployed using CDK (CloudFormation) or Terraform infrastructure-as-code engines, enabling hybrid deployment strategies and tool-specific optimizations.
   *
   * Use cases: Deployment engine selection; CDK vs Terraform choice; Hybrid infrastructure deployment; Tool-specific optimizations
   *
   * AWS: MDAA CLI deployment engine selection for CloudFormation or Terraform-based resource deployment
   *
   * Validation: Must be 'cdk' or 'tf' if provided; defaults to 'cdk'; determines deployment engine and state management
   *   **/
  readonly module_type?: 'cdk' | 'tf';
  /**
   * Q-ENHANCED-PROPERTY
   * Optional module path specification for MDAA module location and source identification. Defines the file system path or npm package name for the module to be deployed, enabling local development, npm package deployment, and flexible module sourcing strategies.
   *
   * Use cases: Module source specification; Local development; NPM package deployment; Flexible module sourcing; Path-based module loading
   *
   * AWS: MDAA CLI module loading and source resolution for deployment orchestration
   *
   * Validation: Must be valid file path or npm package name if provided; used for module location and loading
   **/
  readonly module_path?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Deprecated CDK application path specification replaced by module_path for consistent module sourcing. Previously used to specify the MDAA CDK Module/App to be deployed, now superseded by the more flexible module_path property.
   *
   * Use cases: Legacy CDK app specification; Backward compatibility; Migration to module_path
   *
   * AWS: Legacy MDAA CDK application specification for deployment
   *
   * Validation: Deprecated - use module_path instead; maintained for backward compatibility
   **/
  readonly cdk_app?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Deprecated additional CDK context specification replaced by context property for consistent configuration management. Previously used for additional CDK Context key/value pairs, now superseded by the more context property.
   *
   * Use cases: Legacy CDK context specification; Backward compatibility; Migration to context property
   *
   * AWS: Legacy CDK context configuration for deployment
   *
   * Validation: Deprecated - use context instead; maintained for backward compatibility
   *   **/
  readonly additional_context?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CDK context configuration providing deployment-specific context and configuration data for module execution. Defines key/value pairs that will be passed to CDK applications as context, enabling environment-specific configuration and deployment customization.
   *
   * Use cases: Environment-specific configuration; CDK context data; Deployment customization; Configuration inheritance; Module parameterization
   *
   * AWS: CDK context configuration for deployment-specific parameters and environment customization
   *
   * Validation: Must be valid ConfigurationElement if provided; passed as CDK context for module configuration
   **/
  readonly context?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of tag configuration file paths for resource tagging strategy compilation. Defines ordered list of tag configuration files that will be merged to create the effective tagging strategy, with later files taking precedence for tag inheritance and override scenarios.
   *
   * Use cases: Tag configuration compilation; Resource tagging strategy; Tag inheritance; Configuration file management; Tagging governance
   *
   * AWS: AWS resource tagging configuration compilation for tagging strategy
   *
   * Validation: Must be array of valid file paths if provided; files merged in order with later files taking precedence
   **/
  readonly tag_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Deprecated application configuration file paths replaced by module_configs for consistent configuration management. Previously used for MDAA app configuration files, now superseded by the more module_configs property.
   *
   * Use cases: Legacy app configuration; Backward compatibility; Migration to module_configs
   *
   * AWS: Legacy MDAA application configuration file management
   *
   * Validation: Deprecated - use module_configs instead; maintained for backward compatibility
   **/
  readonly app_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Deprecated application configuration data replaced by module_config_data for consistent configuration management. Previously used for config data passed directly to modules, now superseded by the more module_config_data property.
   *
   * Use cases: Legacy app configuration data; Backward compatibility; Migration to module_config_data
   *
   * AWS: Legacy MDAA application configuration data management
   *
   * Validation: Deprecated - use module_config_data instead; maintained for backward compatibility
   **/
  readonly app_config_data?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of module configuration file paths for module configuration compilation. Defines ordered list of configuration files that will be merged to create the effective module configuration, with later files taking precedence for configuration inheritance and override scenarios.
   *
   * Use cases: Module configuration compilation; Configuration inheritance; Configuration file management; Multi-file configuration; Override scenarios
   *
   * AWS: MDAA module configuration compilation for deployment configuration
   *
   * Validation: Must be array of valid file paths if provided; files merged in order with later files taking precedence
   **/
  readonly module_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional module configuration data providing direct configuration parameters for module execution. Defines configuration data that will be passed directly to modules without file-based configuration, enabling inline configuration and dynamic configuration scenarios.
   *
   * Use cases: Inline module configuration; Dynamic configuration; Direct parameter passing; Configuration without files; Runtime configuration
   *
   * AWS: MDAA module configuration data for direct parameter passing and runtime configuration
   *
   * Validation: Must be valid ConfigurationElement if provided; passed directly to modules for configuration
   **/
  readonly module_config_data?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional tag configuration data providing direct tagging parameters for resource tagging strategy. Defines tagging data that will be passed directly to modules without file-based configuration, enabling inline tagging configuration and dynamic tagging scenarios.
   *
   * Use cases: Inline tag configuration; Dynamic tagging; Direct tag parameter passing; Tagging without files; Runtime tagging configuration
   *
   * AWS: AWS resource tagging configuration data for direct parameter passing and runtime tagging
   *
   * Validation: Must be valid TagElement if provided; passed directly to modules for resource tagging
   **/
  readonly tag_config_data?: TagElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MDAA version override for module-specific version control enabling selective version management across modules. Allows individual modules to use different MDAA versions for gradual upgrades, compatibility management, and version-specific feature requirements.
   *
   * Use cases: Module-specific versioning; Gradual MDAA upgrades; Version compatibility; Selective version management; Feature-specific versions
   *
   * AWS: MDAA CLI version control for module-specific deployment and compatibility management
   *
   * Validation: Must be valid MDAA version string if provided; controls module deployment version and feature availability
   **/
  readonly mdaa_version?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling CDK bootstrap environment usage for module deployment enabling bootstrap dependency management. Controls whether the module requires CDK bootstrap resources for deployment operations, with default true ensuring bootstrap availability for CDK deployments.
   *
   * Use cases: Bootstrap dependency management; CDK deployment control; Environment preparation; Bootstrap resource usage; Deployment requirements
   *
   * AWS: AWS CDK bootstrap environment usage for module deployment operations and stack management
   *
   * Validation: Boolean value; defaults to true; controls bootstrap environment dependency for CDK deployments
   **/
  readonly use_bootstrap?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of custom CDK aspects for advanced deployment customization and cross-cutting concerns in module deployment. Enables injection of custom logic, validation rules, and modifications across all CDK constructs within the module for organization-specific requirements and advanced customization.
   *
   * Use cases: Custom validation rules; Cross-cutting concerns; Organization-specific modifications; Advanced customization; Policy enforcement at module level
   *
   * AWS: CDK aspect system for custom deployment logic and cross-construct modifications within modules
   *
   * Validation: Must be array of valid MdaaCustomAspect objects if provided; aspects applied across all CDK constructs in module
   *   **/
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom naming configuration for module-specific resource naming conventions enabling organization-specific naming patterns at module level. Allows customization of default MDAA naming patterns for individual modules to align with specific requirements while maintaining overall consistency.
   *
   * Use cases: Module-specific naming; Custom naming patterns; Organization alignment; Naming convention customization; Module-level branding
   *
   * AWS: Custom naming patterns for AWS resources deployed by specific MDAA modules
   *
   * Validation: Must be valid MdaaCustomNaming configuration if provided; overrides default naming for module resources
   *   **/
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional AWS account IDs for cross-account resource deployment enabling multi-account MDAA infrastructure orchestration. Specifies additional accounts where the module may deploy resources beyond the primary target account for cross-account data sharing and multi-account architectures.
   *
   * Use cases: Cross-account deployments; Multi-account architectures; Account isolation; Shared services; Cross-account data access
   *
   * AWS: AWS account targeting for cross-account CloudFormation deployments and resource sharing
   *
   * Validation: Must be array of valid 12-digit AWS account IDs if provided; enables cross-account deployment when specified
   **/
  readonly additional_accounts?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional deployment configurations for multi-stack and multi-region deployment scenarios. Defines additional account/region combinations where the module may deploy resources enabling complex deployment topologies and multi-region architectures.
   *
   * Use cases: Multi-stack deployments; Multi-region architectures; Complex deployment topologies; Regional redundancy; Distributed infrastructure
   *
   * AWS: AWS CloudFormation stack deployment targeting for multi-region and multi-account scenarios
   *
   * Validation: Must be array of valid Deployment objects if provided; enables multi-stack deployment when specified
   *   **/
  readonly additional_stacks?: Deployment[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Terraform-specific configuration for modules using Terraform deployment engine enabling Terraform backend and provider configuration. Provides Terraform-specific settings including backend configuration and provider overrides for Terraform-based MDAA modules.
   *
   * Use cases: Terraform backend configuration; Provider overrides; Terraform-specific settings; State management; Terraform deployment
   *
   * AWS: Terraform AWS provider configuration and backend settings for infrastructure deployment
   *
   * Validation: Must be valid TerraformConfig object if provided; enables Terraform-specific configuration when specified
   **/
  readonly terraform?: TerraformConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag indicating whether the module implements MDAA-compliant behaviors and security controls. When enabled, MDAA expects the module to follow MDAA compliance patterns including security configurations, naming conventions, and governance requirements.
   *
   * Use cases: Compliance enforcement; Security validation; MDAA pattern adherence; Governance requirements; Standard compliance
   *
   * AWS: MDAA compliance validation for security controls and governance pattern enforcement
   *
   * Validation: Must be boolean if provided; defaults to true for MDAA modules; controls compliance expectations
   **/
  readonly mdaa_compliant?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional pre-deployment hook configuration for custom validation and setup operations before module deployment. Defines hook commands that execute before module deployment enabling pre-deployment validation, environment setup, and custom preparation logic.
   *
   * Use cases: Pre-deployment validation; Environment setup; Custom preparation; Validation gates; Setup automation
   *
   * AWS: MDAA CLI pre-deployment lifecycle hook for custom validation and setup operations
   *
   * Validation: Must be valid HookConfig object if provided; enables pre-deployment automation when specified
   **/
  readonly predeploy?: HookConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional post-deployment hook configuration for custom validation and cleanup operations after module deployment. Defines hook commands that execute after module deployment enabling post-deployment validation, notification, and custom cleanup logic.
   *
   * Use cases: Post-deployment validation; Cleanup operations; Success notifications; Integration testing; Deployment verification
   *
   * AWS: MDAA CLI post-deployment lifecycle hook for custom validation and cleanup operations
   *
   * Validation: Must be valid HookConfig object if provided; enables post-deployment automation when specified
   **/
  readonly postdeploy?: HookConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * AWS deployment targeting configuration interface for specifying target account and region for MDAA module deployment. Defines deployment destination parameters that override CDK defaults, enabling cross-account and cross-region deployment targeting for multi-environment MDAA infrastructure orchestration.
 *
 * Use cases: Cross-account deployments; Multi-region infrastructure; Environment-specific targeting; Account isolation; Regional data residency
 *
 * AWS: AWS account and region targeting for CloudFormation stack deployment with CDK default override capabilities
 *
 * Validation: account must be valid 12-digit AWS account ID; region must be valid AWS region identifier; both optional with CDK defaults
 */
export interface Deployment {
  /** The target region. If not specified, defaults to the CDK default region. */
  readonly region?: string;
  /** The target account. If not specified, defaults to the CDK default account. */
  readonly account?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Terraform backend configuration interface for MDAA Terraform module deployment with S3 state management and backend override capabilities. Defines Terraform-specific configuration including S3 backend settings for state management, enabling Terraform module deployment within MDAA orchestration with customizable backend configuration.
 *
 * Use cases: Terraform state management; S3 backend configuration; Terraform module deployment; Infrastructure as Code with Terraform; Backend customization
 *
 * AWS: Terraform S3 backend configuration for state management with customizable backend settings for MDAA Terraform module deployment
 *
 * Validation: S3 backend configuration must include valid S3 bucket and key settings; backend configuration must be valid Terraform backend syntax
 */
export interface TerraformConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Terraform configuration override settings for customizing Terraform backend and provider configuration within MDAA orchestration. Provides ability to override default Terraform settings including backend configuration, provider settings, and other Terraform-specific parameters for advanced Terraform module deployment scenarios.
   *
   * Use cases: Terraform backend customization; Provider configuration override; Advanced Terraform settings; Custom state management; Terraform deployment customization
   *
   * AWS: Terraform configuration override for customized backend and provider settings within MDAA Terraform module deployment
   *
   * Validation: Must be valid Terraform configuration structure if provided; backend configuration must be valid Terraform syntax; optional for Terraform customization
   **/
  readonly override?: {
    readonly terraform?: {
      backend?: {
        /**
         * Q-ENHANCED-PROPERTY
         * Required S3 backend configuration for Terraform state management enabling remote state storage and collaboration. Defines S3-specific backend settings including bucket, key, region, and other S3 backend parameters for Terraform state management within MDAA orchestration.
         *
         * Use cases: Remote state storage; Team collaboration; State locking; Terraform backend configuration; S3 state management
         *
         * AWS: Terraform S3 backend configuration for remote state storage and management in Amazon S3
         *
         * Validation: Must be valid S3 backend configuration object; required for Terraform remote state management
         */
        s3: ConfigurationElement;
      };
    };
  };
}

/**
 * Q-ENHANCED-INTERFACE
 * MDAA environment configuration interface for multi-environment deployment management with template inheritance and account targeting capabilities. Defines environment-specific configuration including account/region targeting, module configuration, and template-based configuration inheritance for systematic multi-environment MDAA deployments.
 *
 * Use cases: Multi-environment deployments; Template-based configuration; Account/region targeting; Environment-specific module configuration; Configuration inheritance
 *
 * AWS: Multi-account and multi-region MDAA deployment configuration with environment-specific targeting and template inheritance
 *
 * Validation: account and region must be valid AWS identifiers; template must reference existing environment template; modules must be valid MDAA module configurations
 */
export interface MdaaEnvironmentConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment template reference for template-based environment configuration enabling configuration inheritance and standardization. Specifies the name of an environment template from env_templates that will be used as the base configuration for this environment, with template values being overridable by specific environment values.
   *
   * Use cases: Template-based configuration; Configuration inheritance; Environment standardization; Configuration reuse
   *
   * AWS: MDAA environment template reference for standardized environment configuration and inheritance
   *
   * Validation: Must be valid template name from env_templates if provided; template values can be overridden by environment-specific values
   **/
  readonly template?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS account ID for MDAA environment deployment enabling multi-account deployment strategies. Specifies the destination AWS account where the MDAA environment and modules will be deployed, supporting cross-account deployment patterns and account isolation strategies.
   *
   * Use cases: Multi-account deployment; Account isolation; Cross-account resource deployment; Environment segregation by account
   *
   * AWS: AWS account targeting for MDAA deployment and resource creation across multiple AWS accounts
   *
   * Validation: Must be valid 12-digit AWS account ID if provided; enables cross-account deployment when specified
   **/
  readonly account?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS region for MDAA environment deployment enabling multi-region deployment strategies. Specifies the destination AWS region where the MDAA environment and modules will be deployed, supporting regional deployment patterns and geographic distribution strategies.
   *
   * Use cases: Multi-region deployment; Geographic distribution; Regional compliance requirements; Disaster recovery deployment
   *
   * AWS: AWS region targeting for MDAA deployment and resource creation across multiple AWS regions
   *
   * Validation: Must be valid AWS region identifier if provided; enables cross-region deployment when specified
   **/
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of MDAA module names to their configuration enabling multi-module deployment orchestration. Defines which MDAA modules to deploy in this environment with their specific configurations, supporting complex data platform architectures with multiple integrated components.
   *
   * Use cases: Multi-module deployment; Data platform orchestration; Component integration; Modular architecture deployment
   *
   * AWS: MDAA module deployment configuration for orchestrated data platform component deployment
   *
   * Validation: Must be object with string keys and valid MdaaModuleConfig values if provided; module names must be valid MDAA modules
   *   **/
  readonly modules?: { [moduleName: string]: MdaaModuleConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional CDK context key/value pairs for environment-specific configuration enabling flexible deployment customization. Provides mechanism to pass custom configuration values to CDK applications for environment-specific behavior and resource configuration.
   *
   * Use cases: Environment-specific configuration; CDK context customization; Deployment parameter passing; Custom resource configuration
   *
   * AWS: AWS CDK context configuration for environment-specific deployment customization and resource configuration
   *
   * Validation: Must be valid ConfigurationElement if provided; enables custom CDK context for deployment flexibility
   **/
  readonly context?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MDAA version override for environment-specific version control enabling selective version management across environments. Allows individual environments to use different MDAA versions for gradual upgrades, compatibility management, and version-specific feature requirements.
   *
   * Use cases: Environment-specific versioning; Gradual MDAA upgrades; Version compatibility; Selective version management
   *
   * AWS: MDAA CLI version control for environment-specific deployment and compatibility management
   *
   * Validation: Must be valid MDAA version string if provided; controls environment deployment version and feature availability
   **/
  readonly mdaa_version?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional tag configuration data providing direct tagging parameters for environment resource tagging strategy. Defines tagging data that will be passed directly to modules without file-based configuration, enabling inline tagging configuration and dynamic tagging scenarios.
   *
   * Use cases: Inline tag configuration; Dynamic tagging; Direct tag parameter passing; Tagging without files; Runtime tagging configuration
   *
   * AWS: AWS resource tagging configuration data for direct parameter passing and runtime tagging
   *
   * Validation: Must be valid TagElement if provided; passed directly to modules for resource tagging
   **/
  readonly tag_config_data?: TagElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of tag configuration file paths for resource tagging strategy compilation. Defines ordered list of tag configuration files that will be merged to create the effective tagging strategy, with later files taking precedence for tag inheritance and override scenarios.
   *
   * Use cases: Tag configuration compilation; Resource tagging strategy; Tag inheritance; Configuration file management; Tagging governance
   *
   * AWS: AWS resource tagging configuration compilation for tagging strategy
   *
   * Validation: Must be array of valid file paths if provided; files merged in order with later files taking precedence
   **/
  readonly tag_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling CDK bootstrap environment usage for environment deployment enabling bootstrap dependency management. Controls whether the environment requires CDK bootstrap resources for deployment operations, with default true ensuring bootstrap availability for CDK deployments.
   *
   * Use cases: Bootstrap dependency management; CDK deployment control; Environment preparation; Bootstrap resource usage
   *
   * AWS: AWS CDK bootstrap environment usage for environment deployment operations and stack management
   *
   * Validation: Boolean value; defaults to true; controls bootstrap environment dependency for CDK deployments
   **/
  readonly use_bootstrap?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of custom CDK aspects for advanced deployment customization and cross-cutting concerns in environment deployment. Enables injection of custom logic, validation rules, and modifications across all CDK constructs within the environment for organization-specific requirements.
   *
   * Use cases: Custom validation rules; Cross-cutting concerns; Organization-specific modifications; Advanced customization; Policy enforcement
   *
   * AWS: CDK aspect system for custom deployment logic and cross-construct modifications within environments
   *
   * Validation: Must be array of valid MdaaCustomAspect objects if provided; aspects applied across all CDK constructs in environment
   *   **/
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom naming configuration for environment-specific resource naming conventions enabling organization-specific naming patterns. Allows customization of default MDAA naming patterns for individual environments to align with specific requirements while maintaining overall consistency.
   *
   * Use cases: Environment-specific naming; Custom naming patterns; Organization alignment; Naming convention customization
   *
   * AWS: Custom naming patterns for AWS resources deployed by specific MDAA environments
   *
   * Validation: Must be valid MdaaCustomNaming configuration if provided; overrides default naming for environment resources
   *   **/
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Terraform configuration for environment-specific Terraform module deployment enabling hybrid infrastructure deployment strategies. Provides Terraform-specific configuration including backend settings for environments using Terraform modules alongside CDK modules.
   *
   * Use cases: Terraform module deployment; Hybrid infrastructure; Backend configuration; Multi-tool deployment
   *
   * AWS: Terraform configuration for environment-specific infrastructure deployment and state management
   *
   * Validation: Must be valid TerraformConfig if provided; enables Terraform module deployment within environment
   **/
  readonly terraform?: TerraformConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * MdaaDomainConfig configuration interface for MDAA deployment orchestration and configuration management.
 *
 * Use cases: Multi-module deployment; Configuration management; Environment orchestration; CLI operations
 *
 * AWS: MDAA CLI configuration for deployment orchestration and configuration management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to MDAA CLI and MDAA requirements
 */
export interface MdaaDomainConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of environment names to environment configurations for multi-environment MDAA deployment orchestration. Defines the environments that will be deployed as part of this domain with their specific configurations, supporting complex multi-environment data platform architectures.
   *
   * Use cases: Multi-environment deployment; Environment orchestration; Domain-wide configuration; Environment management
   *
   * AWS: MDAA environment deployment configuration for multi-environment orchestration and management
   *
   * Validation: Must be object with string keys and valid MdaaEnvironmentConfig values; required for domain deployment
   *   **/
  readonly environments: { [name: string]: MdaaEnvironmentConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional CDK context key/value pairs for domain-wide configuration enabling flexible deployment customization across all environments. Provides mechanism to pass custom configuration values to CDK applications for domain-wide behavior and resource configuration.
   *
   * Use cases: Domain-wide configuration; CDK context customization; Deployment parameter passing; Cross-environment configuration
   *
   * AWS: AWS CDK context configuration for domain-wide deployment customization and resource configuration
   *
   * Validation: Must be valid ConfigurationElement if provided; enables custom CDK context for domain flexibility
   **/
  readonly context?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MDAA version override for domain-wide version control enabling consistent version management across all environments. Allows the entire domain to use a specific MDAA version for consistency, compatibility management, and coordinated upgrades.
   *
   * Use cases: Domain-wide versioning; Consistent version management; Coordinated upgrades; Version compatibility
   *
   * AWS: MDAA CLI version control for domain-wide deployment and compatibility management
   *
   * Validation: Must be valid MDAA version string if provided; controls domain deployment version and feature availability
   **/
  readonly mdaa_version?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional tag configuration data providing direct tagging parameters for domain-wide resource tagging strategy. Defines tagging data that will be passed directly to all environments and modules without file-based configuration, enabling consistent tagging across the domain.
   *
   * Use cases: Domain-wide tagging; Consistent tagging strategy; Direct tag parameter passing; Centralized tagging
   *
   * AWS: AWS resource tagging configuration data for domain-wide tagging strategy and consistency
   *
   * Validation: Must be valid TagElement if provided; passed to all environments and modules for consistent tagging
   **/
  readonly tag_config_data?: TagElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of tag configuration file paths for domain-wide resource tagging strategy compilation. Defines ordered list of tag configuration files that will be merged to create the effective tagging strategy for all environments, with later files taking precedence.
   *
   * Use cases: Domain-wide tag configuration; Centralized tagging strategy; Tag inheritance; Configuration file management
   *
   * AWS: AWS resource tagging configuration compilation for domain-wide tagging strategy
   *
   * Validation: Must be array of valid file paths if provided; files merged in order with later files taking precedence
   **/
  readonly tag_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of custom CDK aspects for advanced deployment customization and cross-cutting concerns across all domain environments. Enables injection of custom logic, validation rules, and modifications across all CDK constructs within the domain for organization-specific requirements.
   *
   * Use cases: Domain-wide custom validation; Cross-cutting concerns; Organization-specific modifications; Policy enforcement
   *
   * AWS: CDK aspect system for custom deployment logic and cross-construct modifications across domain
   *
   * Validation: Must be array of valid MdaaCustomAspect objects if provided; aspects applied across all CDK constructs in domain
   *   **/
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment templates configuration for reusable environment definitions enabling template-based environment creation and standardization. Defines reusable environment configurations that can be referenced and extended by actual environments for consistent deployment patterns and reduced configuration duplication.
   *
   * Use cases: Environment standardization; Template-based deployment; Configuration reuse; Consistent environment patterns
   *
   * AWS: MDAA environment template configuration for standardized deployment patterns and environment consistency
   *
   * Validation: Must be object with string keys and valid MdaaEnvironmentConfig values if provided; templates can be referenced by environments
   **/
  readonly env_templates?: { [name: string]: MdaaEnvironmentConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Terraform configuration for Terraform module integration enabling hybrid CDK/Terraform deployments within MDAA. Provides configuration for Terraform modules that can be deployed alongside CDK modules for comprehensive infrastructure management and tool integration.
   *
   * Use cases: Hybrid CDK/Terraform deployment; Terraform module integration; Multi-tool infrastructure; Legacy Terraform integration
   *
   * AWS: Terraform configuration for hybrid infrastructure deployment and multi-tool integration with MDAA
   *
   * Validation: Must be valid TerraformConfig if provided; enables Terraform module deployment alongside CDK modules
   **/
  readonly terraform?: TerraformConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS region for MDAA deployments overriding CDK default region settings. Enables region-specific deployments and supports multi-region data architecture strategies with consistent configuration management.
   *
   * Use cases: Region-specific deployments; Multi-region data architecture; Geographic data placement
   *
   * AWS: AWS region selection for all MDAA resource deployments and regional service configuration
   *
   * Validation: Must be valid AWS region identifier if provided; defaults to CDK default region
   **/
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS account number for MDAA deployments enabling cross-account deployment scenarios. Supports multi-account data architecture strategies and organizational account separation with consistent configuration management.
   *
   * Use cases: Cross-account deployments; Multi-account data architecture; Organizational account separation
   *
   * AWS: AWS account targeting for MDAA resource deployments and cross-account permissions
   *
   * Validation: Must be valid 12-digit AWS account number if provided; defaults to CDK default account
   **/
  readonly account?: string;
}

export interface MdaaConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional module path for custom MDAA naming implementation overriding the default org-env-domain-module pattern. Enables integration with enterprise naming standards and regulatory requirements for consistent resource naming across the organization.
   *
   * Use cases: Enterprise naming standard compliance; Regulatory naming requirements; Custom naming for legacy integration
   *
   * AWS: Custom naming module loading for AWS resource name generation across all MDAA deployments
   *
   * Validation: Must be valid Node.js module path if provided; module must export the specified naming class
   **/
  readonly naming_module?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional class name for custom MDAA naming implementation within the specified module. Must implement IMdaaResourceNaming interface to provide consistent resource naming methods across all MDAA modules and deployments.
   *
   * Use cases: Specific naming class selection; Multiple naming strategies per module; Custom naming implementation targeting
   *
   * AWS: Naming class instantiation for custom AWS resource name generation patterns
   *
   * Validation: Must be valid exported class name implementing IMdaaResourceNaming interface if provided
   **/
  readonly naming_class?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional configuration properties passed to custom naming implementation constructor for naming behavior customization. Enables parameterized naming patterns and environment-specific naming configuration for flexible organizational requirements.
   *
   * Use cases: Naming behavior customization; Environment-specific naming patterns; Parameterized naming rules
   *
   * AWS: Naming constructor parameters for customized AWS resource name generation behavior
   *
   * Validation: Must be valid configuration object matching naming constructor expectations if provided
   **/
  readonly naming_props?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Required organization identifier that serves as the top-level namespace for all AWS resource names and forms the foundation of the MDAA naming hierarchy. Ensures global uniqueness and organizational consistency across all data platform deployments.
   *
   * Use cases: Organizational namespace definition; Global resource name uniqueness; Multi-organization AWS account management
   *
   * AWS: Organization prefix for all AWS resource names across all MDAA deployments
   *
   * Validation: Must be valid organization identifier; required; forms basis of all resource naming
   **/
  readonly organization: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS region for MDAA deployments overriding CDK default region settings. Enables region-specific deployments and supports multi-region data architecture strategies with consistent configuration management.
   *
   * Use cases: Region-specific deployments; Multi-region data architecture; Geographic data placement
   *
   * AWS: AWS region selection for all MDAA resource deployments and regional service configuration
   *
   * Validation: Must be valid AWS region identifier if provided; defaults to CDK default region
   **/
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target AWS account number for MDAA deployments enabling cross-account deployment scenarios. Supports multi-account data architecture strategies and organizational account separation with consistent configuration management.
   *
   * Use cases: Cross-account deployments; Multi-account data architecture; Organizational account separation
   *
   * AWS: AWS account targeting for MDAA resource deployments and cross-account permissions
   *
   * Validation: Must be valid 12-digit AWS account number if provided; defaults to CDK default account
   **/
  readonly account?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling CDK Nag suppression logging for compliance and debugging purposes. When enabled, provides detailed logging of security rule suppressions to support compliance auditing and security review processes.
   *
   * Use cases: Compliance auditing; Security review processes; Suppression tracking and documentation
   *
   * AWS: CDK Nag suppression logging for security compliance tracking and audit trails
   *
   * Validation: Boolean value; defaults to false; enables suppression logging when true
   **/
  readonly log_suppressions?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of tag configuration file paths for centralized tagging strategy implementation. Enables consistent resource tagging across all MDAA deployments with hierarchical tag precedence and organizational tagging standards.
   *
   * Use cases: Centralized tagging strategy; Organizational tagging standards; Cost allocation and resource management
   *
   * AWS: AWS resource tagging configuration for all MDAA-deployed resources
   *
   * Validation: Must be array of valid file paths if provided; files processed in order with later precedence
   **/
  readonly tag_configs?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of domain configurations defining the organizational structure and deployment targets for MDAA modules. Each domain represents a logical grouping of environments and modules with specific deployment characteristics and operational boundaries.
   *
   * Use cases: Organizational structure definition; Deployment target specification; Logical module grouping
   *
   * AWS: Domain-based organization for AWS resource deployment and operational management
   *
   * Validation: Must be object with string keys and MdaaDomainConfig values; required; at least one domain must be defined
   *   **/
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
}

export interface MdaaParserConfig {
  readonly filename?: string;
  readonly configContents?: object;
}

export class MdaaCliConfig {
  public readonly contents: MdaaConfigContents;

  private props: MdaaParserConfig;

  // TYPE_WARNING: need to revisit this to make sure the types really match
  private configSchema = configJsonSchema as unknown as JSONSchemaType<MdaaConfigContents>;
  private static readonly VALIDATE_NAME_REGEXP = '^[a-z0-9\\-]+$';

  constructor(props: MdaaParserConfig) {
    this.props = props;

    if (!this.props.filename && !this.props.configContents) {
      throw new Error("ConfigParser class requires either 'filename' or 'configContents' to be specified");
    }

    const configShapeValidator: ValidateFunction = avj.compile(this.configSchema);
    if (this.props.filename) {
      // nosemgrep
      const configFileContentsString = fs.readFileSync(this.props.filename, { encoding: 'utf8' });
      let relativePathTransformedContents: unknown;
      try {
        const parsedContents = yaml.parse(configFileContentsString);
        //Resolve relative paths in parsedYaml
        const baseDir = path.dirname(this.props.filename.trim());
        relativePathTransformedContents = new MdaaConfigTransformer(
          new ConfigConfigPathValueTransformer(baseDir),
        ).transformConfig(parsedContents);
      } catch (err) {
        throw Error(`${this.props.filename}: Structural problem found in the YAML file: ${err} `);
      }
      // Confirm our provided file matches our Schema (verification of Data shape)
      if (!configShapeValidator(relativePathTransformedContents)) {
        throw new Error(
          `${this.props.filename}' contains shape errors\n: ${JSON.stringify(configShapeValidator.errors, null, 2)}`,
        );
      }
      // Config file is shaped correctly and contains required values!
      this.contents = relativePathTransformedContents as MdaaConfigContents;
    } else {
      if (!configShapeValidator(this.props.configContents)) {
        throw new Error(
          `Config contents contains shape errors\n: ${JSON.stringify(configShapeValidator.errors, null, 2)}`,
        );
      } else {
        // Config file is shaped correctly and contains required values!
        this.contents = this.props.configContents as MdaaConfigContents;
      }
    }
    this.validateConfig();
  }

  private validateConfig() {
    const namePattern = new RegExp(MdaaCliConfig.VALIDATE_NAME_REGEXP);
    if (!namePattern.test(this.contents.organization)) {
      throw new Error(
        `Org name ${this.contents.organization} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`,
      );
    }
    Object.entries(this.contents.domains).forEach(domainEntry => {
      if (!namePattern.test(domainEntry[0])) {
        throw new Error(`Domain name ${domainEntry[0]} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`);
      }
      Object.entries(domainEntry[1].environments).forEach(envEntry => {
        if (!namePattern.test(envEntry[0])) {
          throw new Error(`Env name ${envEntry[0]} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`);
        }
        Object.entries(envEntry[1].modules || {}).forEach(moduleEntry => {
          if (!namePattern.test(moduleEntry[0])) {
            throw new Error(`Module name ${moduleEntry[0]} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`);
          }
        });
      });
      Object.entries(domainEntry[1].env_templates || {}).forEach(envTemplateEntry => {
        Object.entries(envTemplateEntry[1].modules || {}).forEach(moduleEntry => {
          if (!namePattern.test(moduleEntry[0])) {
            throw new Error(`Module name ${moduleEntry[0]} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`);
          }
        });
      });
    });
    Object.entries(this.contents.env_templates || {}).forEach(envTemplateEntry => {
      Object.entries(envTemplateEntry[1].modules || {}).forEach(moduleEntry => {
        if (!namePattern.test(moduleEntry[0])) {
          throw new Error(`Module name ${moduleEntry[0]} must match pattern ${MdaaCliConfig.VALIDATE_NAME_REGEXP}`);
        }
      });
    });
  }
}
