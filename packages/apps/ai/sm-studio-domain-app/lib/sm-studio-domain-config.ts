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
  /**
   * Q-ENHANCED-PROPERTY
   * Required SageMaker Studio domain configuration defining all aspects of the ML development environment including security, networking, and user settings. Provides domain setup with VPC security, authentication, and user workspace configuration for ML development workflows.
   *
   * Use cases: ML development environment configuration; Security and networking setup; User workspace management
   *
   * AWS: Amazon SageMaker Studio domain configuration for complete ML development environment deployment
   *
   * Validation: Must be valid DomainProps; required; defines all domain deployment and security characteristics
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearch.DomainProps.html
   **/
  readonly domain: DomainProps;
}

export class SageMakerStudioDomainConfigParser extends MdaaAppConfigParser<SageMakerStudioDomainConfigContents> {
  public readonly domain: DomainProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.domain = this.configContents.domain;
  }
}
