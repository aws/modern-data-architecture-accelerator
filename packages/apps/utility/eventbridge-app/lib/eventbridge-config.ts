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
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of event bus names to EventBridge event bus configurations enabling custom event routing and decoupled messaging. Provides event bus setup with custom routing rules, event patterns, and target configurations for event-driven architectures.
   *
   * Use cases: Custom event routing; Decoupled application messaging; Event-driven architecture implementation
   *
   * AWS: Amazon EventBridge custom event buses for event routing and decoupled messaging capabilities
   *
   * Validation: Must be valid NamedEventBusProps; required; defines all custom event bus configurations and routing
   **/
  readonly eventBuses: NamedEventBusProps;
}

export class EventBridgeConfigParser extends MdaaAppConfigParser<EventBridgeConfigContents> {
  public eventBuses: NamedEventBusProps;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.eventBuses = this.configContents.eventBuses;
  }
}
