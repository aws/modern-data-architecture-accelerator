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
  /**
   * Q-ENHANCED-PROPERTY
   * Required Macie session configuration defining data discovery and classification capabilities including sensitive data detection, security monitoring, and compliance reporting. Provides complete Macie session setup with data protection monitoring and governance features.
   *
   * Use cases: Data discovery and classification; Sensitive data protection; Security monitoring and compliance reporting
   *
   * AWS: Amazon Macie session configuration for data discovery and protection monitoring
   *
   * Validation: Must be valid MacieSessionProps; required; defines all Macie session capabilities and monitoring features
   **/
  readonly session: MacieSessionProps;
}

export class MacieSessionConfigParser extends MdaaAppConfigParser<MacieSessionConfigContents> {
  public readonly macieSessionConfig: MacieSessionProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.macieSessionConfig = this.configContents.session;
  }
}
