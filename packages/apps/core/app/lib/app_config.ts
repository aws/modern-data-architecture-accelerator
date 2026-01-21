/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigurationElement,
  IMdaaConfigTransformer,
  IMdaaConfigValueTransformer,
  MdaaConfigParamRefValueTransformer,
  MdaaConfigParamRefValueTransformerProps,
  MdaaConfigRefValueTransformer,
  MdaaConfigRefValueTransformerProps,
  MdaaConfigSSMValueTransformer,
  MdaaConfigTransformer,
  MdaaNagSuppressionConfigs,
  MdaaServiceCatalogProductConfig,
} from '@aws-mdaa/config';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import Ajv, { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as yaml from 'yaml';
import { coerceConfigTypes } from './utils';

export interface MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Service Catalog product configuration for governed self-service deployment enabling controlled infrastructure provisioning and governance. When specified, deploys the module as a Service Catalog product instead of direct deployment for governed access and compliance.
   *
   * Use cases: Governed deployment; Self-service provisioning; Service Catalog integration; Controlled access
   *
   * AWS: Service Catalog product configuration for governed infrastructure deployment and self-service provisioning
   *
   * Validation: Must be valid MdaaServiceCatalogProductConfig if provided; enables Service Catalog deployment mode
   **/
  readonly service_catalog_product_config?: MdaaServiceCatalogProductConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CDK Nag suppression configurations for compliance rule management enabling controlled security rule exceptions and compliance documentation. Provides structured approach to managing security rule suppressions with proper justification and documentation for compliance auditing.
   *
   * Use cases: Compliance management; Security rule exceptions; Audit documentation; Controlled suppressions
   *
   * AWS: CDK Nag suppressions for compliance rule management and security exception documentation
   *
   * Validation: Must be valid MdaaNagSuppressionConfigs if provided; enables structured compliance rule management
   **/
  readonly nag_suppressions?: MdaaNagSuppressionConfigs;
}

export interface MdaaAppConfigParserProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required organization identifier providing top-level organizational context for resource naming and configuration processing. Defines the organization scope for all configuration processing and resource naming ensuring organizational consistency and uniqueness.
   *
   * Use cases: Organizational context; Resource naming; Configuration scope; Organizational consistency
   *
   * AWS: Organization identifier for MDAA configuration processing and resource naming context
   *
   * Validation: Must be valid organization identifier; required for organizational context and resource naming
   **/
  readonly org: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain identifier providing logical grouping context for configuration processing and resource organization. Defines the domain scope within the organization for configuration processing and resource naming ensuring logical organization and management.
   *
   * Use cases: Domain context; Logical grouping; Resource organization; Domain-based management
   *
   * AWS: Domain identifier for MDAA configuration processing and logical resource organization
   *
   * Validation: Must be valid domain identifier; required for domain context and resource organization
   **/
  readonly domain: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required environment identifier providing deployment context for configuration processing and environment-specific resource management. Defines the target environment for configuration processing ensuring environment-appropriate resource deployment and management.
   *
   * Use cases: Environment context; Deployment targeting; Environment-specific configuration; Resource management
   *
   * AWS: Environment identifier for MDAA configuration processing and environment-specific deployment
   *
   * Validation: Must be valid environment identifier; required for environment context and deployment targeting
   **/
  readonly environment: string;
  readonly module_name: string;
  readonly rawConfig: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Required MDAA naming implementation providing consistent resource naming across configuration processing and deployment. Defines the naming strategy that will be applied during configuration processing for consistent resource identification and management.
   *
   * Use cases: Resource naming; Naming consistency; Configuration processing; Resource identification
   *
   * AWS: MDAA naming implementation for consistent resource naming and configuration processing
   *
   * Validation: Must be valid IMdaaResourceNaming implementation; required for consistent resource naming
   *   **/
  readonly naming: IMdaaResourceNaming;
}

/**
 * Base class for all MDAA Configurations. Facilitates common config behaviours
 * such as SSM parameter references and IAM role resolution.
 */
export class MdaaAppConfigParser<T extends MdaaBaseConfigContents> {
  /** The config on which all transformations have been applied */
  protected readonly configContents: T;

  private readonly props: MdaaAppConfigParserProps;
  private readonly stack: Stack;

  public readonly serviceCatalogConfig?: MdaaServiceCatalogProductConfig;
  public readonly nagSuppressions?: MdaaNagSuppressionConfigs;

  /**
   * Initializes IAM Role Resolver and performs standard config transformations.
   * @param stack
   * @param props
   * @param configSchema
   * @param configTransformers
   * @param suppressOutputConfigContents
   */
  constructor(
    stack: Stack,
    props: MdaaAppConfigParserProps,
    configSchema: Schema,
    configTransformers?: IMdaaConfigTransformer[],
    suppressOutputConfigContents?: boolean,
  ) {
    this.stack = stack;
    this.props = props;

    let transformedConfig = props.rawConfig;
    configTransformers?.forEach(transformer => {
      transformedConfig = transformer.transformConfig(transformedConfig);
    });

    const generatedRoleResolvedConfig = new MdaaConfigTransformer(
      new MdaaGeneratedRoleConfigValueTransformer(this.props.naming),
    ).transformConfig(transformedConfig);
    const ssmToRefResolvedConfigContents = new MdaaConfigTransformer(
      new MdaaConfigSSMValueTransformer(),
    ).transformConfig(generatedRoleResolvedConfig);

    const configRefValueTranformerProps: MdaaConfigRefValueTransformerProps = {
      org: this.stack.node.tryGetContext('org'),
      domain: this.stack.node.tryGetContext('domain'),
      env: this.stack.node.tryGetContext('env'),
      module_name: this.stack.node.tryGetContext('module_name'),
      scope: this.stack,
    };
    const configRefValueTransformer = new MdaaConfigRefValueTransformer(configRefValueTranformerProps);
    const resolvedRefsConfigContents = new MdaaConfigTransformer(
      configRefValueTransformer,
      configRefValueTransformer,
    ).transformConfig(ssmToRefResolvedConfigContents);

    const baseConfigContents = resolvedRefsConfigContents as MdaaBaseConfigContents;
    this.serviceCatalogConfig = baseConfigContents.service_catalog_product_config;
    this.nagSuppressions = baseConfigContents.nag_suppressions;

    const paramTransformerProps: MdaaConfigParamRefValueTransformerProps = {
      ...configRefValueTranformerProps,
      serviceCatalogConfig: this.serviceCatalogConfig,
    };
    const paramTransformer = new MdaaConfigParamRefValueTransformer(paramTransformerProps);
    const resolvedParamsConfigContents = new MdaaConfigTransformer(paramTransformer, paramTransformer).transformConfig(
      resolvedRefsConfigContents,
    );

    // Confirm our provided config matches our Schema (verification of Data shape)
    const avj = new Ajv();
    const configValidator = avj.compile(configSchema);
    if (!suppressOutputConfigContents) {
      console.log(
        `Effective App Config:\n============\n${yaml.stringify(
          resolvedParamsConfigContents,
        )}\n============\nEnd Effective App Config`,
      );
    }
    // Ideally before we reach here we already have the correct types
    // but as of now, the cli can't if a value if a string or a number or a boolean if it comes from context
    // so for now, we want to try to coerce the value to the type that the schema expects when schema check fails
    // this is best effort and will prefer to fail than assume coercion was correct
    if (!configValidator(resolvedParamsConfigContents) && configValidator.errors) {
      // Try to coerce types if possible
      coerceConfigTypes(resolvedParamsConfigContents, configValidator.errors);

      // Re-validate after coercion attempt
      if (!configValidator(resolvedParamsConfigContents)) {
        throw new Error(`Config contains shape errors\n: ${JSON.stringify(configValidator.errors, null, 2)}`);
      }
    }

    // TYPE_WARNING: not clear why this should work
    this.configContents = resolvedParamsConfigContents as unknown as T;
  }
}

class MdaaGeneratedRoleConfigValueTransformer implements IMdaaConfigValueTransformer {
  naming: IMdaaResourceNaming;

  constructor(naming: IMdaaResourceNaming) {
    this.naming = naming;
  }

  public transformValue(value: string): string {
    if (value.startsWith('generated-role-id:')) {
      return `ssm:${this.naming.ssmPath(
        'generated-role/' + value.replace(/^generated-role-id:\s*/, '') + '/id',
        false,
      )}`;
    } else if (value.startsWith('generated-role-arn:')) {
      return `ssm:${this.naming.ssmPath(
        'generated-role/' + value.replace(/^generated-role-arn:\s*/, '') + '/arn',
        false,
      )}`;
    } else {
      return value;
    }
  }
}
