/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {  MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';
import { DMSProps } from '@aws-mdaa/dataops-dms-l3-construct';


export interface DMSConfigContents extends MdaaDataOpsConfigContents {
    readonly dms: DMSProps
}


export class DMSConfigParser extends MdaaDataOpsConfigParser<DMSConfigContents> {
    public dms: DMSProps
    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.dms = this.configContents.dms
    }
}

