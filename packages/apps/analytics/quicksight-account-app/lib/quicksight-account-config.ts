/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { AccountProps } from '@aws-caef/quicksight-account-l3-construct';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

interface QuickSightAccountConfigContents extends CaefBaseConfigContents {
    readonly account: AccountProps
}

export class QuickSightAccountConfigParser extends CaefAppConfigParser<QuickSightAccountConfigContents> {
    readonly account: AccountProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.account = this.configContents.account
    }
}