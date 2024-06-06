/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app'
import { M2MApiProps } from '@aws-mdaa/m2m-api-l3-construct'
import { Schema } from 'ajv';

import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface M2MApiConfigContents extends MdaaBaseConfigContents {
    api: M2MApiProps
}

export class M2MApiConfigParser extends MdaaAppConfigParser<M2MApiConfigContents> {

    public readonly m2mApiProps: M2MApiProps

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.m2mApiProps = this.configContents.api
    }
}

