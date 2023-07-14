/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app'
import { ServerProps } from '@aws-caef/sftp-server-l3-construct';
import { Schema } from 'ajv';

import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface SftpServerConfigContents extends CaefBaseConfigContents {
    server: ServerProps
}

export class SftpServerConfigParser extends CaefAppConfigParser<SftpServerConfigContents> {

    public readonly server: ServerProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.server = this.configContents.server
    }
}

