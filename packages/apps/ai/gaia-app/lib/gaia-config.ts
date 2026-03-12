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
   * Complete GAIA generative AI platform configuration including RAG engines, LLM models, authentication, VPC networking, and chatbot API setup.
   * Encompasses all sub-configurations for Bedrock/SageMaker model integration, Cognito auth, Aurora/Kendra RAG, and custom code overwrites.
   *
   * Use cases: GenAI chatbot deployment; RAG-powered document Q&A; Multi-model AI platform setup; Enterprise conversational AI
   *
   * AWS: GAIA platform (API Gateway, Lambda, DynamoDB, S3, Step Functions, Bedrock, SageMaker, Cognito)
   *
   * Validation: Required; Must be valid GAIAProps extending SystemConfig
   */
  readonly gaia: GAIAProps;
}

export class GAIAConfigParser extends MdaaAppConfigParser<GAIAConfigContents> {
  public readonly gaia: GAIAProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.gaia = this.configContents.gaia;
  }
}
