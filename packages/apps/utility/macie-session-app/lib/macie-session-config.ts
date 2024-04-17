/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { MacieSessionProps } from '@aws-caef/macie-session-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';


import * as configSchema from './config-schema.json';

export interface MacieSessionConfigContents extends CaefBaseConfigContents {
    readonly session: MacieSessionProps
}

export class MacieSessionConfigParser extends CaefAppConfigParser<MacieSessionConfigContents> {
    public readonly macieSessionConfig: MacieSessionProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.macieSessionConfig = this.configContents.session
    }
}

