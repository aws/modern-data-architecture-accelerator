/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MacieSessionProps } from '@aws-mdaa/macie-session-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface MacieSessionConfigContents extends MdaaBaseConfigContents {
  readonly session: MacieSessionProps;
}

export class MacieSessionConfigParser extends MdaaAppConfigParser<MacieSessionConfigContents> {
  public readonly macieSessionConfig: MacieSessionProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.macieSessionConfig = this.configContents.session;
  }
}
