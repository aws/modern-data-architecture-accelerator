/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';

import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { NifiProps } from '@aws-mdaa/dataops-nifi-l3-construct';




export interface NifiConfigContents extends MdaaDataOpsConfigContents {

    /**
     * Name of the DataOps Project
     */
    readonly projectName: string

    readonly nifi: NifiProps

}

export class NifiConfigParser extends MdaaDataOpsConfigParser<NifiConfigContents> {

    public readonly nifi: NifiProps

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.nifi = this.configContents.nifi
    }

}