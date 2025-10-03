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
  /**
   * Q-ENHANCED-PROPERTY
   * Required GAIA platform configuration defining all aspects of the generative AI deployment including model integration, authentication, and conversational interface setup. Provides GenAI platform setup with secure authentication, model access, and AI-powered conversational capabilities.
   *
   * Use cases: GenAI platform configuration; Model integration setup; Conversational AI interface and authentication management
   *
   * AWS: GAIA GenAI platform configuration for complete AI-powered chatbot deployment and model integration
   *
   * Validation: Must be valid GAIAProps; required; defines all GenAI platform and conversational interface characteristics
   **/
  readonly gaia: GAIAProps;
}

export class GAIAConfigParser extends MdaaAppConfigParser<GAIAConfigContents> {
  public readonly gaia: GAIAProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.gaia = this.configContents.gaia;
  }
}
