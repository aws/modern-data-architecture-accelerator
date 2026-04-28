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
import * as path from 'path';

const avj = new Ajv();

export interface HookConfig {
  /** Shell command to execute during deployment lifecycle hook enabling custom validation, */
  readonly command?: string;
  /** Flag controlling deployment termination behavior when hook execution fails */
  readonly exit_if_fail?: boolean;
  /** Flag restricting hook execution to successful deployment scenarios only */
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

export interface Deployment {
  /** The target region. If not specified, defaults to the CDK default region. */
  readonly region?: string;
  /** The target account. If not specified, defaults to the CDK default account. */
  readonly account?: string;
  /** If true, adds a dependency on the main stack to make sure the main stack is deployed first. If not specified, defaults to true.*/
  readonly addDependencyMainStack?: boolean;
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
