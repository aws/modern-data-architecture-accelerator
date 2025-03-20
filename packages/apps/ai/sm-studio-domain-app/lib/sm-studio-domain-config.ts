/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';

import { DomainProps } from '@aws-mdaa/sm-studio-domain-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerStudioDomainConfigContents extends MdaaBaseConfigContents {
  domain: DomainProps;
}

export class SageMakerStudioDomainConfigParser extends MdaaAppConfigParser<SageMakerStudioDomainConfigContents> {
  public readonly domain: DomainProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.domain = this.configContents.domain;
  }
}
