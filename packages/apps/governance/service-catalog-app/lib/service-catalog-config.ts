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

export interface PortfolioConfig {
  readonly providerName: string;
  readonly description?: string;
  readonly access?: MdaaRoleRef[];
}

export interface MdaaServiceCatalogProductConfigContents extends MdaaBaseConfigContents {
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
