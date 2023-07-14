/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';

import { Schema } from 'ajv';
import { PortfolioProps } from 'aws-cdk-lib/aws-servicecatalog';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface PortfolioConfig {
    readonly providerName: string,
    readonly description?: string,
    readonly access?: CaefRoleRef[]
}

export interface CaefServiceCatalogProductConfigContents extends CaefBaseConfigContents {
    readonly portfolios: { [ portfolioName: string ]: PortfolioConfig }
}

export class CaefServiceCatalogProductConfigParser extends CaefAppConfigParser<CaefServiceCatalogProductConfigContents> {
    public readonly portfolioProps: PortfolioProps[]
    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.portfolioProps = Object.entries( this.configContents.portfolios ).map( nameAndProps => {
            return { ...{ displayName: nameAndProps[ 0 ] }, ...nameAndProps[ 1 ] }
        } )
    }
}

