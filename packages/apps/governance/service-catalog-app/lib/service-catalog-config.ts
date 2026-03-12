/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

import { Schema } from 'ajv';
import { PortfolioProps } from 'aws-cdk-lib/aws-servicecatalog';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Service Catalog portfolio configuration with provider info and role-based access.
 *
 * Use cases: Self-service infrastructure provisioning; Governed product catalogs; Role-based portfolio access
 *
 * AWS: Service Catalog portfolio with principal associations
 *
 * Validation: providerName required; description and access optional
 */
export interface PortfolioConfig {
  /**
   * Organization or team name responsible for this portfolio's products.
   *
   * Use cases: Portfolio ownership identification; Provider accountability
   *
   * AWS: Service Catalog portfolio provider name
   *
   * Validation: Required; non-empty string
   */
  readonly providerName: string;
  /**
   * Portfolio description for users to understand contents and purpose.
   *
   * Use cases: Portfolio documentation; User guidance
   *
   * AWS: Service Catalog portfolio description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Roles granted access to this portfolio for product provisioning.
   * Creates IAM principal associations on the portfolio.
   *
   * Use cases: Role-based portfolio access; Controlled product provisioning
   *
   * AWS: Service Catalog portfolio principal associations (IAM type)
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly access?: MdaaRoleRef[];
}

export interface MdaaServiceCatalogProductConfigContents extends MdaaBaseConfigContents {
  /**
   * Map of portfolio names to portfolio configurations.
   * Each entry creates a Service Catalog portfolio with optional role-based access.
   *
   * Use cases: Multi-portfolio governance; Self-service infrastructure provisioning
   *
   * AWS: Service Catalog portfolios with principal associations
   *
   * Validation: Required; keys are portfolio display names, values must be valid PortfolioConfig
   */
  readonly portfolios: { [portfolioName: string]: PortfolioConfig };
}

export class MdaaServiceCatalogProductConfigParser extends MdaaAppConfigParser<MdaaServiceCatalogProductConfigContents> {
  public readonly portfolioProps: PortfolioProps[];
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.portfolioProps = Object.entries(this.configContents.portfolios).map(nameAndProps => {
      return { ...{ displayName: nameAndProps[0] }, ...nameAndProps[1] };
    });
  }
}
