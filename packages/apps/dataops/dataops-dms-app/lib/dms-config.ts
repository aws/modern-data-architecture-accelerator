/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {  CaefAppConfigParserProps } from '@aws-caef/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { CaefDataOpsConfigContents, CaefDataOpsConfigParser } from '@aws-caef/dataops-shared';
import { DMSProps } from '@aws-caef/dataops-dms-l3-construct';


export interface DMSConfigContents extends CaefDataOpsConfigContents {
    readonly dms: DMSProps
}


export class DMSConfigParser extends CaefDataOpsConfigParser<DMSConfigContents> {
    public dms: DMSProps
    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.dms = this.configContents.dms
    }
}

