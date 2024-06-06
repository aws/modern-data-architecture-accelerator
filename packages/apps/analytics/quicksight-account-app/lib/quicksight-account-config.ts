/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { AccountProps } from '@aws-mdaa/quicksight-account-l3-construct';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

interface QuickSightAccountConfigContents extends MdaaBaseConfigContents {
    readonly account: AccountProps
}

export class QuickSightAccountConfigParser extends MdaaAppConfigParser<QuickSightAccountConfigContents> {
    readonly account: AccountProps

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.account = this.configContents.account
    }
}