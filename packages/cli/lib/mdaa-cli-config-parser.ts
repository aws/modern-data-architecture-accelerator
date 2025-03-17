/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigConfigPathValueTransformer,
  MdaaConfigTransformer,
  MdaaCustomAspect,
  MdaaCustomNaming,
} from '@aws-mdaa/config';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as configSchema from './config-schema.json';
import { DevOpsConfigContents } from '@aws-mdaa/devops';
import { ConfigurationElement, TagElement } from './config-types';
// nosemgrep
import path = require('path');

const avj = new Ajv();

export interface MdaaModuleConfig {
  /**
   * The type of module.
   */
  readonly module_type?: 'cdk' | 'tf';
  /**
   * The the path to the module. If an npm package is specified, MDAA will attempt to locate the package in its local repo (in local mode) or install via NPM
   */
  readonly module_path?: string;
  /**
   * @deprecated - Use module_path. The MDAA CDK Module/App to be deployed
   */
  readonly cdk_app?: string;
  /**
   * @deprecated - Use content. Additional CDK Context key/value pairs
   */
  readonly additional_context?: { [key: string]: string };

  /**
   * Additional CDK Context key/value pairs
   */
  readonly context?: ConfigurationElement;

  /**
   * A list of paths to tag configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly tag_configs?: string[];
  /**
   * @deprecated - Use module_configs instead.
   * A list of paths to MDAA app configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly app_configs?: string[];
  /**
   * @deprecated - Use module_config_data instead.
   * Config data which will be passed directly to modules
   */
  readonly app_config_data?: ConfigurationElement;
  /**
   * A list of paths to MDAA module configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly module_configs?: string[];
  /**
   * Config data which will be passed directly to modules
   */
  readonly module_config_data?: ConfigurationElement;
  /**
   * Tagging data which will be passed directly to modules
   */
  readonly tag_config_data?: TagElement;
  /**
   * Override the MDAA version
   */
  readonly mdaa_version?: string;
  /**
   * If true (default), will use the MDAA bootstrap env
   */
  readonly use_bootstrap?: boolean;
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * A list of additional accounts into which the module may deploy resources.
   */
  readonly additional_accounts?: string[];
  /**
   * Config properties for TF modules
   */
  readonly terraform?: TerraformConfig;
  /**
   * If true, MDAA will expect the module to implement MDAA_compliant behaviours
   */
  readonly mdaa_compliant?: boolean;
}

export interface TerraformConfig {
  readonly override?: {
    terraform?: {
      backend?: {
        s3: ConfigurationElement;
      };
    };
  };
}

export interface MdaaEnvironmentConfig {
  /**
   * If specified, the referenced environment template will be used as the basis for this environment config.
   * Template values can be overridden with specific values in this config.
   */
  readonly template?: string;
  /**
   * Target account for deployment
   */
  readonly account?: string;
  /**
   * Arn or SSM Import (prefix with ssm:) of the environment provider
   */
  readonly modules?: { [moduleName: string]: MdaaModuleConfig };
  /**
   * Additional CDK Context key/value pairs
   */
  readonly context?: ConfigurationElement;
  /**
   * Override the MDAA version
   */
  readonly mdaa_version?: string;
  /**
   * Tagging data which will be passed directly to apps
   */
  readonly tag_config_data?: TagElement;
  /**
   * A list of paths to tag configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly tag_configs?: string[];
  /**
   * If true (default), will use the MDAA bootstrap env
   */
  readonly use_bootstrap?: boolean;
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Config properties for TF modules
   */
  readonly terraform?: TerraformConfig;
}

export interface MdaaDomainConfig {
  /**
   * Arn or SSM Import (prefix with ssm:) of the environment provider
   */
  readonly environments: { [name: string]: MdaaEnvironmentConfig };
  /**
   * Additional CDK Context key/value pairs
   */
  readonly context?: ConfigurationElement;
  /**
   * Override the MDAA version
   */
  readonly mdaa_version?: string;
  /**
   * Tagging data which will be passed directly to apps
   */
  readonly tag_config_data?: TagElement;
  /**
   * A list of paths to tag configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly tag_configs?: string[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_aspects?: MdaaCustomAspect[];
  /**
   * Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.
   */
  readonly custom_naming?: MdaaCustomNaming;
  /**
   * Templates for environments which can be referenced throughout the config.
   */
  readonly env_templates?: { [name: string]: MdaaEnvironmentConfig };
  /**
   * Config properties for TF modules
   */
  readonly terraform?: TerraformConfig;
}

export interface MdaaConfigContents {
  /**
   * The MDAA Naming Module to be utilized
   */
  readonly naming_module?: string;
  /**
   * The MDAA Naming Class to be utilized from the Naming Module
   */
  readonly naming_class?: string;
  /**
   * Props to be passed to the custom naming class
   */
  readonly naming_props?: ConfigurationElement;
  /**
   * A string representing the target region
   */
  readonly organization: string;
  /**
   * A string representing the target region
   */
  readonly region?: string;
  /**
   * A string representing the target region
   */
  readonly log_suppressions?: boolean;
  /**
   * A list of paths to tag configuration files.
   * Configurations will be compiled together in the order they appear,
   * with later configuration files taking precendence over earlier configurations.
   */
  readonly tag_configs?: string[];
  /**
   * Objects representing domains to create
   */
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

  // ISSUE-499 need to revisit this to make sure the types really match
  private configSchema: JSONSchemaType<MdaaConfigContents> =
    configSchema as unknown as JSONSchemaType<MdaaConfigContents>;

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
      let relativePathTransformedContents;
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
