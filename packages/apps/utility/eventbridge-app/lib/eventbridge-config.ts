/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { NamedEventBusProps } from '@aws-caef/eventbridge-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';


import * as configSchema from './config-schema.json';

export interface EventBridgeConfigContents extends CaefBaseConfigContents {
    readonly eventBuses: NamedEventBusProps
}

export class EventBridgeConfigParser extends CaefAppConfigParser<EventBridgeConfigContents> {
    public eventBuses: NamedEventBusProps
    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.eventBuses = this.configContents.eventBuses
    }

}

