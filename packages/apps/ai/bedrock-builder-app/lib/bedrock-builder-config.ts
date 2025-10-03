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
   * Q-ENHANCED-PROPERTY
   * Required array of admin role references for Bedrock resource access control enabling role-based administration and security management. Provides IAM roles that will be granted administrative access to Bedrock agent resources including KMS keys, S3 buckets, and other infrastructure components.
   *
   * Use cases: Administrative access; Role-based security; Resource access control; Bedrock administration
   *
   * AWS: IAM role references for Bedrock resource administrative access and security management
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required for Bedrock resource access control and administration
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of Bedrock agent configurations for AI agent deployment enabling conversational AI and task automation capabilities. Provides agent configuration including foundation models, action groups, and knowledge base integration for intelligent automation and user interaction.
   *
   * Use cases: AI agent deployment; Conversational AI; Task automation; Intelligent user interaction
   *
   * AWS: Bedrock agents for AI-powered conversational interfaces and intelligent task automation
   *
   * Validation: Must be valid NamedAgentProps if provided; enables AI agent deployment and conversational capabilities
   *   **/
  readonly agents?: NamedAgentProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for Bedrock resource encryption enabling customer-controlled encryption and enhanced security compliance. When provided, uses existing KMS key for encrypting agent resources; otherwise creates customer-managed key for data protection and security compliance.
   *
   * Use cases: Resource encryption; Customer-controlled keys; Security compliance; Data protection
   *
   * AWS: KMS key ARN for Bedrock resource encryption and customer-controlled data protection
   *
   * Validation: Must be valid KMS key ARN if provided; enables customer-controlled encryption for Bedrock resources
   **/
  readonly kmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 bucket ARN for Bedrock agent storage enabling agent artifact management and data storage capabilities. When provided, uses existing S3 bucket for agent resources; otherwise creates dedicated bucket for agent data, models, and artifacts.
   *
   * Use cases: Agent storage; Artifact management; Data storage; Resource organization
   *
   * AWS: S3 bucket ARN for Bedrock agent storage and artifact management
   *
   * Validation: Must be valid S3 bucket ARN if provided; enables agent storage and artifact management capabilities
   **/
  readonly agentBucketArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function configurations for Bedrock agent action groups enabling custom business logic and external system integration. Provides Lambda functions and layers for agent action groups enabling custom functionality, API integrations, and business process automation within AI agents.
   *
   * Use cases: Custom business logic; API integrations; Action group implementation; External system connectivity
   *
   * AWS: Lambda functions for Bedrock agent action groups and custom business logic implementation
   *
   * Validation: Must be valid LambdaFunctionProps if provided; enables custom action group functionality and integrations
   **/
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional vector store configurations for knowledge base deployment enabling semantic search and retrieval-augmented generation capabilities. Provides vector database configuration for knowledge bases supporting similarity search, document retrieval, and RAG-based AI applications.
   *
   * Use cases: Vector storage; Semantic search; Knowledge retrieval; RAG applications
   *
   * AWS: Vector stores for Bedrock knowledge bases and semantic search capabilities
   *
   * Validation: Must be valid NamedVectorStoreProps if provided; enables vector storage and semantic search functionality
   *   **/
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional knowledge base configurations for document-based AI capabilities enabling intelligent document processing and question-answering systems. Provides knowledge base setup with document ingestion, embedding generation, and retrieval capabilities for AI-powered information systems.
   *
   * Use cases: Knowledge management; Document processing; Question-answering systems; Information retrieval
   *
   * AWS: Bedrock knowledge bases for document-based AI capabilities and intelligent information systems
   *
   * Validation: Must be valid NamedKnowledgeBaseProps if provided; enables knowledge base deployment and document AI
   *   **/
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional guardrail configurations for AI safety and content filtering enabling responsible AI deployment and content moderation. Provides guardrail setup for content filtering, safety controls, and responsible AI practices ensuring appropriate AI behavior and content generation.
   *
   * Use cases: AI safety; Content filtering; Responsible AI; Content moderation
   *
   * AWS: Bedrock guardrails for AI safety controls and responsible AI deployment
   *
   * Validation: Must be valid NamedGuardrailProps if provided; enables AI safety controls and content filtering
   *   **/
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
