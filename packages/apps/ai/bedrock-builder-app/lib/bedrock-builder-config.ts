/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import {
  LambdaFunctionProps,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  NamedGuardrailProps,
  NamedAgentProps,
} from '@aws-mdaa/bedrock-builder-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface BedrockBuilderConfigContents extends MdaaBaseConfigContents {
  /**
   * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[];

  /**
   * Bedrock Agents
   */
  readonly agents?: NamedAgentProps;

  /**
   * (Optional) The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the agent resources.
   * If not provided, a customer managed key will be created
   */
  readonly kmsKeyArn?: string;

  /**
   * (Optional) S3 Bucket Arn for the agent
   */
  readonly agentBucketArn?: string;

  /**
   * (Optional) Lambda Functions and associated layers Used By Agent Action Groups
   */
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * (Optional) Knowledge Bases Vector Store configs
   */
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * (Optional) Knowledge Bases configuration
   */
  readonly knowledgeBases?: NamedKnowledgeBaseProps;

  /**
   * (Optional) Guardrails configuration
   */
  readonly guardrails?: NamedGuardrailProps;
}

export class BedrockBuilderConfigParser extends MdaaAppConfigParser<BedrockBuilderConfigContents> {
  /**
   * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
   */
  public readonly dataAdminRoles: MdaaRoleRef[];

  /**
   * Bedrock Agent
   */
  public readonly agents?: NamedAgentProps;

  /**
   * (Optional) KMS key ARN
   */
  public readonly kmsKeyArn?: string;

  /**
   * (Optional) S3 Bucket Arn for the agent
   */
  public readonly agentBucketArn?: string;

  /**
   * (Optional) Lambda Functions and associated layers
   */
  public readonly lambdaFunctions?: LambdaFunctionProps;

  /**
   * (Optional) Knowledge Bases Vector Store configs
   */
  readonly vectorStores?: NamedVectorStoreProps;

  /**
   * (Optional) Knowledge Bases configuration
   */
  public readonly knowledgeBases?: NamedKnowledgeBaseProps;

  /**
   * (Optional) Guardrails configuration
   */
  public readonly guardrails?: NamedGuardrailProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.dataAdminRoles = this.configContents.dataAdminRoles;
    this.agents = this.configContents.agents;
    this.kmsKeyArn = this.configContents.kmsKeyArn;
    this.agentBucketArn = this.configContents.agentBucketArn;
    this.lambdaFunctions = this.configContents.lambdaFunctions;
    this.knowledgeBases = this.configContents.knowledgeBases;
    this.guardrails = this.configContents.guardrails;
    this.vectorStores = this.configContents.vectorStores;
  }
}
