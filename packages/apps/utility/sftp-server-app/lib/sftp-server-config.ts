/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app'
import { ServerProps } from '@aws-mdaa/sftp-server-l3-construct';
import { Schema } from 'ajv';

import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface SftpServerConfigContents extends MdaaBaseConfigContents {
    server: ServerProps
}

export class SftpServerConfigParser extends MdaaAppConfigParser<SftpServerConfigContents> {

    public readonly server: ServerProps

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.server = this.configContents.server
    }
}

