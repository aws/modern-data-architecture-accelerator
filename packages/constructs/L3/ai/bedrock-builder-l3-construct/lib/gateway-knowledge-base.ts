/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GatewayTargetConfigurationProperty,
  GatewayTargetCredentialProperty,
  GatewayTargetToolSchemaProperty,
} from '@aws-mdaa/bedrock-agentcore-gateway-l3-construct';
import { Token } from 'aws-cdk-lib';

/**
 * Search type a knowledge base connector requests from Retrieve.
 *
 * AWS: bedrock-agent-runtime Retrieve vectorSearchConfiguration.overrideSearchType
 */
export enum GatewayKnowledgeBaseSearchType {
  /** Combines keyword and vector search. */
  HYBRID = 'HYBRID',
  /** Vector search only. */
  SEMANTIC = 'SEMANTIC',
}

/**
 * VPC placement of a knowledge base connector. The connector runs in `subnets`, in the VPC of the
 * `vpcEndpoints` set it references. When the set creates or brings the Bedrock Agent Runtime endpoint,
 * the connector calls Retrieve through it, so its requests carry `aws:SourceVpc` and `aws:SourceVpce`;
 * when the set marks it external, the network path is yours.
 *
 * Use cases: an organization policy that requires Lambda functions to be VPC-bound (`lambda:VpcIds`);
 * data perimeter policies that require `aws:SourceVpc` or `aws:SourceVpce` on `bedrock:Retrieve`
 *
 * AWS: AWS::Lambda::Function VpcConfig
 *
 * Validation: `subnets` and `vpcEndpoints` required
 */
export interface GatewayKnowledgeBaseNetworkProperty {
  /**
   * Subnets the connector's network interfaces are placed in, in the VPC of the `vpcEndpoints` set.
   *
   * Use cases: placing the connector in private subnets
   *
   * AWS: AWS::Lambda::Function VpcConfig.SubnetIds
   *
   * Validation: Required; String[]; 1-16 entries
   *
   * @minItems 1
   * @maxItems 16
   **/
  readonly subnets: string[];
  /**
   * Name of the set in the module's `vpcEndpoints` map the connector reaches Retrieve through. When the
   * set creates the Bedrock Agent Runtime endpoint or brings an existing one, the module creates the
   * connector's security group with HTTPS access to it; when the set marks it external, set
   * `securityGroupId`.
   *
   * Use cases: a private path to Retrieve with no NAT
   *
   * AWS: AWS::EC2::VPCEndpoint (bedrock-agent-runtime)
   *
   * Validation: Required; String; a key in `vpcEndpoints`
   *
   * @minLength 1
   **/
  readonly vpcEndpoints: string;
  /**
   * Security group for the connector, when the set marks `bedrockAgentRuntime` external: the module then
   * has no endpoint to wire, so this group must already allow HTTPS to wherever Retrieve is reached.
   *
   * Use cases: an endpoint whose security group is managed by a central networking team
   *
   * AWS: AWS::Lambda::Function VpcConfig.SecurityGroupIds
   *
   * Validation: Required when the set marks `bedrockAgentRuntime` external, and not allowed otherwise
   *
   * @minLength 1
   **/
  readonly securityGroupId?: string;
}

/**
 * Knowledge base tool source for a gateway target. bedrock-builder generates a Lambda connector that
 * calls `bedrock-agent-runtime:Retrieve` against this knowledge base and registers it as a Lambda
 * target exposing one `Retrieve` tool, with the same input and output shape as the native
 * managed-knowledge-base connector's `Retrieve` tool.
 *
 * Use cases: RAG over a customer-managed knowledge base from a harness or any MCP client of the gateway
 *
 * AWS: AWS::Lambda::Function (connector) + AWS::BedrockAgentCore::GatewayTarget (Lambda target)
 *
 * Validation: id and description are required
 */
export interface GatewayTargetKnowledgeBaseProperty {
  /**
   * Knowledge base the connector queries. `config:<name>` references a knowledge base in this
   * module's `knowledgeBases` map and resolves to the deployed knowledge base. Otherwise, the id of an
   * existing knowledge base in the same account and region, as a literal or an `ssm:` reference.
   *
   * Use cases: querying a knowledge base built by this module; querying one built by another module
   *
   * AWS: bedrock-agent-runtime Retrieve knowledgeBaseId; scopes the connector's bedrock:Retrieve grant
   *
   * Validation: Required; `config:<name>` naming a key in `knowledgeBases`, an `ssm:` reference, or a
   * 10-character alphanumeric knowledge base id (not an ARN or knowledge base name)
   **/
  readonly id: string;
  /**
   * Description of the `Retrieve` tool as the model sees it. Say what the knowledge base contains and
   * when to search it; the model uses this to decide when to call the tool.
   *
   * Use cases: steering tool selection when a gateway exposes several knowledge bases or tools
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget ToolDefinition Description
   *
   * Validation: Required; non-empty String
   *
   * @minLength 1
   **/
  readonly description: string;
  /**
   * Number of results each query retrieves. Omit to use the Retrieve service default.
   *
   * Use cases: trading answer grounding against response size
   *
   * AWS: bedrock-agent-runtime Retrieve vectorSearchConfiguration.numberOfResults
   *
   * Validation: Optional; integer 1-100
   *
   * @TJS-type integer
   * @minimum 1
   * @maximum 100
   **/
  readonly numberOfResults?: number;
  /**
   * Search type each query requests. Omit to let the knowledge base choose.
   *
   * Use cases: forcing keyword-plus-vector search, or vector-only search
   *
   * AWS: bedrock-agent-runtime Retrieve vectorSearchConfiguration.overrideSearchType
   *
   * Validation: Optional; HYBRID | SEMANTIC
   **/
  readonly overrideSearchType?: GatewayKnowledgeBaseSearchType;
  /**
   * VPC placement of the connector Lambda, through a set in the module's `vpcEndpoints` map. Omit to run
   * the connector outside your VPC.
   *
   * Use cases: VPC-bound Lambda policies; data perimeter policies on `bedrock:Retrieve`
   *
   * AWS: AWS::Lambda::Function VpcConfig
   *
   * Validation: Optional; {@link GatewayKnowledgeBaseNetworkProperty}
   **/
  readonly networkConfiguration?: GatewayKnowledgeBaseNetworkProperty;
}

/**
 * Tool source for a bedrock-builder gateway target: the gateway target types, plus `knowledgeBase`,
 * which bedrock-builder turns into a generated Lambda connector.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget TargetConfiguration.Mcp
 *
 * Validation: exactly one target type; currently `lambda` or `knowledgeBase`
 *
 * @minProperties 1
 * @maxProperties 1
 */
export interface BuilderGatewayTargetConfigurationProperty extends GatewayTargetConfigurationProperty {
  /**
   * Knowledge base tool source. bedrock-builder generates the connector Lambda, its execution role,
   * and a Lambda target exposing a `Retrieve` tool.
   *
   * Use cases: RAG over a customer-managed knowledge base through a gateway
   *
   * AWS: AWS::Lambda::Function + AWS::BedrockAgentCore::GatewayTarget TargetConfiguration.Mcp.Lambda
   *
   * Validation: Optional; must be the only target type set; {@link GatewayTargetKnowledgeBaseProperty}
   **/
  readonly knowledgeBase?: GatewayTargetKnowledgeBaseProperty;
}

// Standalone rather than extending GatewayTargetProps: jsii rejects redeclaring `targetConfiguration`
// with a wider type in a sub-interface (JSII5015).
/**
 * Configuration for a single bedrock-builder gateway target (a tool source registered against a
 * gateway).
 *
 * Use cases: registering a Lambda or knowledge base tool source against a gateway
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget
 *
 * Validation: `targetConfiguration` sets exactly one target type (currently `lambda` or `knowledgeBase`)
 */
export interface BuilderGatewayTargetProps {
  /**
   * Description of the target, as target metadata. It is not shown to the model: tool descriptions
   * come from the tool schema or, for a `knowledgeBase` target, from `knowledgeBase.description`.
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget Description
   *
   * Validation: Optional; String; 1-200 characters
   *
   * @minLength 1
   * @maxLength 200
   **/
  readonly description?: string;
  /**
   * Tool source for the target. Exactly one target type is set (currently `lambda` or `knowledgeBase`).
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget TargetConfiguration
   *
   * Validation: Required; {@link BuilderGatewayTargetConfigurationProperty}
   **/
  readonly targetConfiguration: BuilderGatewayTargetConfigurationProperty;
  /**
   * Outbound credential provider. Optional - defaults to `GATEWAY_IAM_ROLE`.
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget CredentialProviderConfigurations
   *
   * Validation: Optional; when set, `type` must be a supported credential provider type
   **/
  readonly credentialProvider?: GatewayTargetCredentialProperty;
}

/** Name of the one tool a knowledge base connector serves, matching the native connector's tool. */
export const KNOWLEDGE_BASE_RETRIEVE_TOOL_NAME = 'Retrieve';

/** Prefix of a reference into this module's `knowledgeBases` map. */
export const KNOWLEDGE_BASE_CONFIG_REF_PREFIX = 'config:';

const KNOWLEDGE_BASE_ID_PATTERN = /^[0-9A-Za-z]{10}$/;
const MIN_NUMBER_OF_RESULTS = 1;
const MAX_NUMBER_OF_RESULTS = 100;
const SEARCH_TYPES = new Set<string>(Object.values(GatewayKnowledgeBaseSearchType));
// The subnet limit of a Lambda function's VPC configuration.
const MAX_CONNECTOR_SUBNETS = 16;
// The value CDK returns for an SSM parameter lookup before the lookup has run.
const SSM_LOOKUP_PLACEHOLDER_PREFIX = 'dummy-value-for-';

/**
 * Validates a `knowledgeBase` gateway target: it is the only target type set, it has an id and a
 * non-empty description, a literal id has the knowledge base id format, and the retrieval settings are
 * in range. Whether a `config:` reference names a knowledge base in the module is checked when it is
 * resolved.
 *
 * @returns the validated knowledge base tool source
 * @throws Error naming the offending target if any constraint is violated
 */
export function validateKnowledgeBaseTarget(
  targetName: string,
  targetConfig: BuilderGatewayTargetProps,
): GatewayTargetKnowledgeBaseProperty {
  const knowledgeBase = targetConfig.targetConfiguration?.knowledgeBase;
  if (!knowledgeBase) {
    throw new Error(`Gateway target "${targetName}" must define a knowledgeBase tool source.`);
  }
  validateSingleTargetType(targetName, targetConfig.targetConfiguration);
  if (!knowledgeBase.id) {
    throw new Error(`Gateway target "${targetName}" knowledgeBase must set an id.`);
  }
  if (!knowledgeBase.description?.trim()) {
    throw new Error(
      `Gateway target "${targetName}" knowledgeBase must set a non-empty description (the tool description the ` +
        'model sees).',
    );
  }
  validateKnowledgeBaseId(targetName, knowledgeBase.id);
  validateRetrievalSettings(targetName, knowledgeBase);
  validateConnectorNetwork(targetName, knowledgeBase.networkConfiguration);
  return knowledgeBase;
}

/**
 * Whether a value is unknown at synth time, so its format cannot be checked: an unresolved CDK token
 * (what an `ssm:` config reference becomes), a CloudFormation dynamic reference (`{{resolve:...}}`,
 * which some config reference forms produce), or CDK's placeholder for an SSM lookup
 * (`@mdaaLookupSSMValues`) whose value is not in context yet. Rejecting the placeholder would fail the
 * first synth pass and so stop the lookup from ever running.
 */
export function isUnresolvedAtSynth(value: string): boolean {
  return Token.isUnresolved(value) || value.includes('{{resolve:') || value.startsWith(SSM_LOOKUP_PLACEHOLDER_PREFIX);
}

/**
 * Builds the inline tool schema of a knowledge base connector: one `Retrieve` tool taking
 * `retrievalQuery.text`, as the native connector's `Retrieve` tool does. No output schema is declared,
 * because Retrieve result items vary in shape.
 */
export function buildKnowledgeBaseToolSchema(description: string): GatewayTargetToolSchemaProperty {
  return {
    inlinePayload: [
      {
        name: KNOWLEDGE_BASE_RETRIEVE_TOOL_NAME,
        description,
        inputSchema: {
          type: 'object',
          properties: {
            retrievalQuery: {
              type: 'object',
              description: 'Contains the query to send to the knowledge base.',
              properties: {
                text: {
                  type: 'string',
                  description: 'The text of the query made to the knowledge base.',
                },
              },
              required: ['text'],
            },
          },
          required: ['retrievalQuery'],
        },
      },
    ],
  };
}

/**
 * Builds the connector Lambda's environment. Retrieval settings are set only when configured, so an
 * omitted setting falls back to the Retrieve service default.
 */
export function buildKnowledgeBaseConnectorEnvironment(
  knowledgeBaseId: string,
  knowledgeBase: GatewayTargetKnowledgeBaseProperty,
): { [name: string]: string } {
  return {
    KNOWLEDGE_BASE_ID: knowledgeBaseId,
    ...(knowledgeBase.numberOfResults !== undefined && { NUMBER_OF_RESULTS: String(knowledgeBase.numberOfResults) }),
    ...(knowledgeBase.overrideSearchType !== undefined && { SEARCH_TYPE: knowledgeBase.overrideSearchType }),
  };
}

function validateSingleTargetType(targetName: string, configuration: BuilderGatewayTargetConfigurationProperty): void {
  const otherTypes = Object.entries(configuration)
    .filter(([targetType, value]) => targetType !== 'knowledgeBase' && value !== undefined)
    .map(([targetType]) => targetType);
  if (otherTypes.length > 0) {
    throw new Error(
      `Gateway target "${targetName}" targetConfiguration sets knowledgeBase together with ${otherTypes.join(', ')}; ` +
        'a knowledgeBase target must set no other target type.',
    );
  }
}

function validateKnowledgeBaseId(targetName: string, id: string): void {
  if (id.startsWith(KNOWLEDGE_BASE_CONFIG_REF_PREFIX) || isUnresolvedAtSynth(id)) {
    return;
  }
  if (!KNOWLEDGE_BASE_ID_PATTERN.test(id)) {
    throw new Error(
      `Gateway target "${targetName}" knowledgeBase.id "${id}" must be a 10-character alphanumeric knowledge base ` +
        'id, a config:<name> reference, or an ssm: reference. Knowledge base ARNs and names are not accepted.',
    );
  }
}

function validateRetrievalSettings(targetName: string, knowledgeBase: GatewayTargetKnowledgeBaseProperty): void {
  const { numberOfResults, overrideSearchType } = knowledgeBase;
  if (
    numberOfResults !== undefined &&
    (!Number.isInteger(numberOfResults) ||
      numberOfResults < MIN_NUMBER_OF_RESULTS ||
      numberOfResults > MAX_NUMBER_OF_RESULTS)
  ) {
    throw new Error(
      `Gateway target "${targetName}" knowledgeBase.numberOfResults must be an integer from ` +
        `${MIN_NUMBER_OF_RESULTS} to ${MAX_NUMBER_OF_RESULTS}; received ${numberOfResults}.`,
    );
  }
  if (overrideSearchType !== undefined && !SEARCH_TYPES.has(overrideSearchType)) {
    throw new Error(
      `Gateway target "${targetName}" knowledgeBase.overrideSearchType must be one of ` +
        `${[...SEARCH_TYPES].join(', ')}; received "${overrideSearchType}".`,
    );
  }
}

/**
 * Checks what a VPC-bound connector's placement can be checked for on its own. Whether
 * `securityGroupId` is required depends on how the referenced set provides the endpoint, so that is
 * checked once the set is resolved.
 */
function validateConnectorNetwork(
  targetName: string,
  networkConfiguration: GatewayKnowledgeBaseNetworkProperty | undefined,
): void {
  if (!networkConfiguration) {
    return;
  }
  const location = `Gateway target "${targetName}" knowledgeBase.networkConfiguration`;
  const { subnets, vpcEndpoints, securityGroupId } = networkConfiguration;
  if (!subnets?.length || subnets.length > MAX_CONNECTOR_SUBNETS) {
    throw new Error(`${location}.subnets must list 1 to ${MAX_CONNECTOR_SUBNETS} subnets.`);
  }
  // typeof, not a bare trim: a YAML key with no value parses as null.
  if (typeof vpcEndpoints !== 'string' || vpcEndpoints.trim().length === 0) {
    throw new Error(`${location}.vpcEndpoints must name a set in the module's "vpcEndpoints" map.`);
  }
  if (securityGroupId != null && (typeof securityGroupId !== 'string' || securityGroupId.trim().length === 0)) {
    throw new Error(`${location}.securityGroupId must not be empty.`);
  }
}
