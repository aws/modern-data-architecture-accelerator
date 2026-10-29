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
  NamedGatewayProps,
  NamedGatewayTargetProps,
  NamedHarnessProps,
  NamedVpcEndpointSetProps,
} from '@aws-mdaa/bedrock-builder-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface BedrockBuilderConfigContents extends MdaaBaseConfigContents {
  /**
   * Admin roles granted key-admin access to the KMS key the module creates. Unused when `kmsKeyArn`
   * supplies an existing key.
   *
   * Use cases: Administrative access, role-based security, Bedrock resource management
   *
   * AWS: IAM roles for Bedrock resource administration
   *
   * Validation: Required; MdaaRoleRef[]
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Existing KMS key ARN for encrypting all Bedrock resources in this module — knowledge bases,
   * guardrails, the shared Lambda pool, and AgentCore gateways and harnesses all use this single key.
   * If omitted, one customer-managed key is created automatically and shared across them.
   *
   * When an existing key is provided, its key policy must already grant the required service and
   * execution-role use (the module cannot mutate an imported key's policy) — including the AgentCore
   * gateway grants when gateways are configured.
   *
   * Use cases: Customer-controlled encryption, security compliance, key reuse
   *
   * AWS: KMS key for Bedrock resource encryption
   *
   * Validation: Optional; String; must be valid KMS key ARN
   **/
  readonly kmsKeyArn?: string;
  /**
   * Lambda functions and layers for gateway tools, gateway interceptors, and knowledge base custom
   * transformations, referenced via `generated-function:<name>`.
   *
   * Use cases: Gateway tool logic, external API integration, custom document transformation
   *
   * AWS: Lambda functions/layers
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
  /**
   * Bedrock AgentCore Gateway configurations (compliant MCP servers), keyed by gateway name.
   * Each gateway references its tool targets by name from the sibling `gatewayTargets` map, and may
   * reuse Lambdas from `lambdaFunctions` via `generated-function:<name>` references.
   *
   * Use cases: exposing a unified MCP tool surface with per-tool authorization, agent tool gateways
   *
   * AWS: Amazon Bedrock AgentCore Gateway
   *
   * Validation: Optional; NamedGatewayProps (map of gateway name to config)
   **/
  readonly gateways?: NamedGatewayProps;
  /**
   * Bedrock AgentCore Gateway target definitions (MCP tool sources), keyed by target name.
   * Declared as a sibling of `gateways` (not nested) to keep the config flat; a gateway attaches a
   * target by naming its key in the gateway's `targets` list. Each target may be referenced by at most
   * one gateway; a target no gateway references is not deployed. A `knowledgeBase` target generates a
   * Lambda connector that exposes a knowledge base as a `Retrieve` tool.
   *
   * Use cases: defining MCP tool sources (Lambda tools, knowledge bases) once and referencing them from a gateway
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget
   *
   * Validation: Optional; NamedGatewayTargetProps (map of target name to config)
   **/
  readonly gatewayTargets?: NamedGatewayTargetProps;
  /**
   * Bedrock AgentCore Harness configurations - a declarative agent loop (model + system prompt +
   * tools) - keyed by harness name. A harness's `guardrail.id` and
   * `tools[].agentCoreGateway.gatewayArn` may use a `config:<name>` reference into the sibling
   * `guardrails` / `gateways` maps, resolved to the live resource.
   *
   * Use cases: declarative tool-using/RAG agents
   *
   * AWS: AWS::BedrockAgentCore::Harness
   *
   * Validation: Optional; NamedHarnessProps (map of harness name to config)
   **/
  readonly harnesses?: NamedHarnessProps;
  /**
   * VPC endpoint sets, keyed by set name, giving harness sessions and knowledge base connectors a
   * private outbound path (no NAT/internet). A harness references one by name from its
   * `networkConfiguration.vpcEndpoints`, and a `knowledgeBase` gateway target from its
   * `networkConfiguration.vpcEndpoints`; every consumer referencing a set shares its endpoints.
   *
   * Which endpoints exist is derived from the referencing consumers, so a set only states which VPC it
   * serves, where created endpoints go, and how each derived endpoint is reached - created here, an
   * existing one to wire to, or reached without an endpoint the set manages. Endpoint policies are
   * derived and not configurable.
   *
   * Use cases: private (no-NAT) harness sessions and knowledge base connectors, reusing centrally
   * provisioned endpoints
   *
   * AWS: AWS::EC2::VPCEndpoint (Interface and Gateway)
   *
   * Validation: Optional; NamedVpcEndpointSetProps; each set must name a distinct VPC and be referenced
   * by at least one harness or knowledge base connector
   **/
  readonly vpcEndpoints?: NamedVpcEndpointSetProps;
}

export class BedrockBuilderConfigParser extends MdaaAppConfigParser<BedrockBuilderConfigContents> {
  /**
   * Admin roles granted key-admin access to the KMS key the module creates. Unused when `kmsKeyArn`
   * supplies an existing key.
   */
  public readonly dataAdminRoles: MdaaRoleRef[];

  /**
   * (Optional) KMS key ARN
   */
  public readonly kmsKeyArn?: string;

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

  /**
   * (Optional) AgentCore Gateway configurations
   */
  public readonly gateways?: NamedGatewayProps;

  /**
   * (Optional) AgentCore Gateway target definitions
   */
  public readonly gatewayTargets?: NamedGatewayTargetProps;

  /**
   * (Optional) AgentCore Harness configurations
   */
  public readonly harnesses?: NamedHarnessProps;
  /** VPC endpoint sets referenced by the module's harnesses. */
  public readonly vpcEndpoints?: NamedVpcEndpointSetProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.dataAdminRoles = this.configContents.dataAdminRoles;
    this.kmsKeyArn = this.configContents.kmsKeyArn;
    this.lambdaFunctions = this.configContents.lambdaFunctions;
    this.knowledgeBases = this.configContents.knowledgeBases;
    this.guardrails = this.configContents.guardrails;
    this.vectorStores = this.configContents.vectorStores;
    this.gateways = this.configContents.gateways;
    this.gatewayTargets = this.configContents.gatewayTargets;
    this.harnesses = this.configContents.harnesses;
    this.vpcEndpoints = this.configContents.vpcEndpoints;
  }
}
