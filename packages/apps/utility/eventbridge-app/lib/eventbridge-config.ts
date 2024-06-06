/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { NamedEventBusProps } from '@aws-mdaa/eventbridge-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';


import * as configSchema from './config-schema.json';

export interface EventBridgeConfigContents extends MdaaBaseConfigContents {
    readonly eventBuses: NamedEventBusProps
}

export class EventBridgeConfigParser extends MdaaAppConfigParser<EventBridgeConfigContents> {
    public eventBuses: NamedEventBusProps
    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.eventBuses = this.configContents.eventBuses
    }

}

