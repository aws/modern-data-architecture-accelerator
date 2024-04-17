/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';


import * as configSchema from './config-schema.json';
import { NamedDomainsProps } from '@aws-caef/datazone-l3-construct';

export interface DataZoneConfigContents extends CaefBaseConfigContents {
    readonly domains: NamedDomainsProps
}

export class DataZoneConfigParser extends CaefAppConfigParser<DataZoneConfigContents> {
    public domains: NamedDomainsProps
    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.domains = this.configContents.domains
    }

}

