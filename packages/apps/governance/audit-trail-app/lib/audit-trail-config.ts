/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { AuditTrailProps } from '@aws-mdaa/audit-trail-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface AuditTrailConfigContents extends MdaaBaseConfigContents {
    readonly trail: AuditTrailProps
}

export class AuditTrailConfigParser extends MdaaAppConfigParser<AuditTrailConfigContents> {

    public readonly trail: AuditTrailProps

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.trail = this.configContents.trail
    }

}

