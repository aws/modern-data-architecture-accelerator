/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { GAIAProps } from '@aws-mdaa/gaia-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface GAIAConfigContents extends MdaaBaseConfigContents {
  readonly gaia: GAIAProps;
}

export class GAIAConfigParser extends MdaaAppConfigParser<GAIAConfigContents> {
  public readonly gaia: GAIAProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.gaia = this.configContents.gaia;
  }
}
