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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Service Catalog portfolio management providing provider and access control settings. Defines portfolio-specific configuration including provider information, descriptions, and role-based access control for Service Catalog governance.
 *
 * Use cases: Service Catalog portfolio configuration; Provider management; Role-based portfolio access control
 *
 * AWS: Configures AWS Service Catalog portfolios with provider information and access control settings
 *
 * Validation: providerName is required; description and access are optional
 */
export interface PortfolioConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required provider name for the Service Catalog portfolio enabling identification and management of portfolio ownership. Specifies the organization or team responsible for maintaining and providing the products within this portfolio.
   *
   * Use cases: Portfolio ownership identification; Provider accountability; Portfolio management organization
   *
   * AWS: AWS Service Catalog portfolio provider name for ownership and management identification
   *
   * Validation: Must be non-empty string; required; identifies the portfolio provider and ownership
   **/
  readonly providerName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the Service Catalog portfolio providing context and purpose information for users. Helps users understand the portfolio contents, intended use cases, and available products for better portfolio selection.
   *
   * Use cases: Portfolio documentation; User guidance; Portfolio purpose explanation
   *
   * AWS: AWS Service Catalog portfolio description for user information and guidance
   *
   * Validation: Must be string if provided; provides portfolio context and purpose information
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of role references with access to this Service Catalog portfolio enabling controlled access to portfolio products. Provides role-based access control for portfolio visibility and product provisioning capabilities.
   *
   * Use cases: Role-based portfolio access; Controlled product provisioning; Access management for Service Catalog
   *
   * AWS: AWS Service Catalog portfolio access control for role-based product access
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; controls portfolio access and visibility
   **/
  readonly access?: MdaaRoleRef[];
}

export interface MdaaServiceCatalogProductConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of portfolio names to portfolio configurations enabling Service Catalog portfolio management. Provides complete portfolio setup with provider information, access control, and governance settings for self-service infrastructure provisioning.
   *
   * Use cases: Portfolio management; Self-service provisioning; Governance-controlled infrastructure deployment
   *
   * AWS: AWS Service Catalog portfolio configuration for complete portfolio management and governance
   *
   * Validation: Must be object with string keys and valid PortfolioConfig values; required; defines all portfolio configurations
   *   **/
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
