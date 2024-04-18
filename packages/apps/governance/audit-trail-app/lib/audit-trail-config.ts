/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { AuditTrailProps } from '@aws-caef/audit-trail-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface AuditTrailConfigContents extends CaefBaseConfigContents {
    readonly trail: AuditTrailProps
}

export class AuditTrailConfigParser extends CaefAppConfigParser<AuditTrailConfigContents> {

    public readonly trail: AuditTrailProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.trail = this.configContents.trail
    }

}

