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
   * Admin roles granted access to Bedrock agent resources including KMS keys and S3 buckets.
   *
   * Use cases: Administrative access, role-based security, Bedrock resource management
   *
   * AWS: IAM roles for Bedrock resource administration
   *
   * Validation: Required; MdaaRoleRef[]
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Bedrock agent configurations with foundation models, action groups, knowledge base integration, and guardrails.
   *
   * Use cases: AI agent deployment, conversational AI, task automation, intelligent workflows
   *
   * AWS: Amazon Bedrock Agents
   *
   * Validation: Optional; NamedAgentProps (map of agent name to config)
   **/
  readonly agents?: NamedAgentProps;
  /**
   * Existing KMS key ARN for encrypting Bedrock agent resources.
   * If omitted, a customer-managed key is created automatically.
   *
   * Use cases: Customer-controlled encryption, security compliance, key reuse
   *
   * AWS: KMS key for Bedrock resource encryption
   *
   * Validation: Optional; String; must be valid KMS key ARN
   **/
  readonly kmsKeyArn?: string;
  /**
   * Existing S3 bucket ARN for agent data storage.
   * If omitted, a dedicated bucket is created automatically.
   *
   * Use cases: Agent artifact storage, data management, bucket reuse
   *
   * AWS: S3 bucket for Bedrock agent storage
   *
   * Validation: Optional; String; must be valid S3 bucket ARN
   **/
  readonly agentBucketArn?: string;
  /**
   * Lambda functions and layers for Bedrock agent action groups.
   * Enables custom business logic, API integrations, and business process automation within agents.
   *
   * Use cases: Custom action group logic, external API integration, business process automation
   *
   * AWS: Lambda functions/layers for Bedrock agent action groups
   *
   * Validation: Optional; LambdaFunctionProps
   **/
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * Vector store configurations for knowledge bases (OpenSearch Serverless or Aurora).
   * Provides vector database storage for semantic search and retrieval-augmented generation.
   *
   * Use cases: Semantic search, RAG applications, knowledge retrieval, embedding storage
   *
   * AWS: OpenSearch Serverless or Aurora vector stores for Bedrock knowledge bases
   *
   * Validation: Optional; NamedVectorStoreProps (map of store name to config)
   **/
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * Knowledge base configurations with S3/SharePoint data sources and custom parsing strategies.
   * Enables document ingestion, embedding generation, and retrieval for RAG applications.
   *
   * Use cases: Knowledge management, document processing, question-answering, information retrieval
   *
   * AWS: Bedrock Knowledge Bases
   *
   * Validation: Optional; NamedKnowledgeBaseProps (map of KB name to config)
   **/
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * Guardrail configurations for AI safety, content filtering, and responsible AI deployment.
   *
   * Use cases: AI safety controls, content filtering, responsible AI, content moderation
   *
   * AWS: Bedrock Guardrails
   *
   * Validation: Optional; NamedGuardrailProps (map of guardrail name to config)
   **/
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
