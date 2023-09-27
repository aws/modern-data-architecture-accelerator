/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from '@aws-caef/app';
import { CaefDataOpsConfigContents, CaefDataOpsConfigParser } from '@aws-caef/dataops-shared';

import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { NifiProps } from '@aws-caef/dataops-nifi-l3-construct';




export interface NifiConfigContents extends CaefDataOpsConfigContents {

    /**
     * Name of the DataOps Project
     */
    readonly projectName: string

    readonly nifi: NifiProps

}

export class NifiConfigParser extends CaefDataOpsConfigParser<NifiConfigContents> {

    public readonly nifi: NifiProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.nifi = this.configContents.nifi
    }

}