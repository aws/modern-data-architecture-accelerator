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
   * Map of event bus names to EventBridge event bus configurations.
   * Each bus can have optional principals for cross-account/service PutEvent access
   * and an archive with configurable retention.
   *
   * Use cases: Custom event routing; Cross-account event publishing; Event archival with replay
   *
   * AWS: EventBridge custom event buses with resource policies and archives
   *
   * Validation: Required; keys are unique event bus names, values must be valid EventBusProps
   */
  readonly eventBuses: NamedEventBusProps;
}

export class EventBridgeConfigParser extends MdaaAppConfigParser<EventBridgeConfigContents> {
  public eventBuses: NamedEventBusProps;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.eventBuses = this.configContents.eventBuses;
  }
}
