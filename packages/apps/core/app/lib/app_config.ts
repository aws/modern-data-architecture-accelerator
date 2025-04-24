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

export interface MdaaBaseConfigContents {
  /**
   * Service Catalog Config
   * If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment
   */
  readonly service_catalog_product_config?: MdaaServiceCatalogProductConfig;
  /**
   * Nag suppressions
   */
  readonly nag_suppressions?: MdaaNagSuppressionConfigs;
}

/**
 * Standard set of props for use with MdaaConfigs.
 */
export interface MdaaAppConfigParserProps {
  readonly org: string;
  readonly domain: string;
  readonly environment: string;
  readonly module_name: string;
  readonly rawConfig: ConfigurationElement;
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
   * @param configTransformers
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
    const configRefValueTranformer = new MdaaConfigRefValueTransformer(configRefValueTranformerProps);
    const resolvedRefsConfigContents = new MdaaConfigTransformer(
      configRefValueTranformer,
      configRefValueTranformer,
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
    this.configContents = resolvedParamsConfigContents as unknown as T;

    // Confirm our provided config matches our Schema (verification of Data shape)
    const avj = new Ajv();
    const configValidator = avj.compile(configSchema);
    if (!suppressOutputConfigContents) {
      console.log(
        `Effective App Config:\n============\n${yaml.stringify(
          this.configContents,
        )}\n============\nEnd Effective App Config`,
      );
    }
    if (!configValidator(this.configContents)) {
      throw new Error(`Config contains shape errors\n: ${JSON.stringify(configValidator.errors, null, 2)}`);
    }
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
