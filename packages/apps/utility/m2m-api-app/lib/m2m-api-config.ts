/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app'
import { M2MApiProps } from '@aws-caef/m2m-api-l3-construct'
import { Schema } from 'ajv';

import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface M2MApiConfigContents extends CaefBaseConfigContents {
    api: M2MApiProps
}

export class M2MApiConfigParser extends CaefAppConfigParser<M2MApiConfigContents> {

    public readonly m2mApiProps: M2MApiProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.m2mApiProps = this.configContents.api
    }
}

