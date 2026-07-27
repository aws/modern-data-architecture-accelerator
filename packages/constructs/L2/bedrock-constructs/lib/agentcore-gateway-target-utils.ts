/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { Token } from 'aws-cdk-lib';
import { CfnGatewayTarget } from 'aws-cdk-lib/aws-bedrockagentcore';
import { sanitizeGatewayName } from './agentcore-gateway-utils';

/**
 * Maximum supported nesting depth of a tool input/output JSON schema. Bounds {@link buildSchemaDefinition}
 * so a pathologically deep (or self-referential) schema fails fast at synth with an actionable error
 * naming the limit, rather than throwing an opaque `RangeError: Maximum call stack size exceeded`.
 * 100 is far deeper than any realistic MCP tool schema (JSON schemas are typically nested well under
 * ~32 levels) while remaining safely below the JS call-stack limit.
 */
export const MAX_TOOL_SCHEMA_DEPTH = 100;

/**
 * Credential provider type a gateway target uses for outbound authorization to its tool source.
 * These are the values AWS accepts for
 * `AWS::BedrockAgentCore::GatewayTarget CredentialProviderConfiguration.CredentialProviderType`
 * (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrockagentcore-gatewaytarget-credentialproviderconfiguration.html).
 *
 * All values are declared so the configuration surface is stable as support is added; MDAA
 * validation currently accepts only `GATEWAY_IAM_ROLE` (the gateway invokes the tool with its own
 * execution role, no separate credential sub-object) and rejects the others as not yet supported.
 */
export enum GatewayTargetCredentialProviderType {
  /** The gateway invokes the tool using its own execution role (no separate credential). */
  GATEWAY_IAM_ROLE = 'GATEWAY_IAM_ROLE',
  /** OAuth 2.0 credential provider (token vault). */
  OAUTH = 'OAUTH',
  /** API-key credential provider (token vault). */
  API_KEY = 'API_KEY',
  /** The gateway forwards the caller's IAM credentials to the target. */
  CALLER_IAM_CREDENTIALS = 'CALLER_IAM_CREDENTIALS',
  /** The gateway passes the inbound JWT through to the target. */
  JWT_PASSTHROUGH = 'JWT_PASSTHROUGH',
}

/**
 * The credential provider type MDAA currently supports for a gateway target. The gateway invokes
 * the tool with its own execution role, so no separate credential sub-object is rendered.
 */
export const DEFAULT_CREDENTIAL_PROVIDER_TYPE = GatewayTargetCredentialProviderType.GATEWAY_IAM_ROLE;

/**
 * Tool schema for a Lambda gateway target. Exactly one of `inlinePayload` (the tool definitions
 * declared inline) or `s3` (a JSON tool-schema document in S3) must be provided.
 *
 * Use cases: declaring the MCP tools a Lambda target exposes
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget ToolSchema
 * (https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html#gateway-lambda-tool-schema)
 *
 * Validation: exactly one of inlinePayload (non-empty) or s3
 */
export interface GatewayTargetToolSchemaProperty {
  /**
   * Tool definitions declared inline. Each entry describes one MCP tool the Lambda implements.
   *
   * Use cases: small tool sets defined directly in config
   *
   * AWS: ToolSchema InlinePayload
   *
   * Validation: Optional; non-empty array when set; mutually exclusive with `s3`
   **/
  readonly inlinePayload?: GatewayTargetToolDefinitionProperty[];
  /**
   * Location of a JSON tool-schema document in S3. To keep a tool schema as a file in the source
   * tree, upload it to a bucket you own (e.g. an `MdaaBucket`) and reference the object here.
   *
   * Use cases: large tool sets maintained as a separate artifact
   *
   * AWS: ToolSchema S3
   *
   * Validation: Optional; valid S3 configuration; mutually exclusive with `inlinePayload`
   **/
  readonly s3?: GatewayTargetS3Property;
}

/**
 * S3 location of a schema document (a Lambda tool schema, or an OpenAPI / Smithy API schema).
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget S3Configuration
 */
export interface GatewayTargetS3Property {
  /**
   * S3 URI of the schema object (`s3://bucket/key`).
   *
   * AWS: S3Configuration Uri
   *
   * Validation: Required; S3 URI
   **/
  readonly uri: string;
  /**
   * Expected owner account id of the S3 bucket (cross-account confused-deputy protection). MDAA
   * defaults this to the deploying account when omitted (or empty), so the gateway verifies the
   * bucket owner on the cross-account read. An explicit value is validated at synth: it must be a
   * 12-digit account id (or an unresolved CDK token).
   *
   * AWS: S3Configuration BucketOwnerAccountId
   *
   * Validation: Optional; 12-digit account id; defaults to the deploying account
   **/
  readonly bucketOwnerAccountId?: string;
}

/**
 * A single MCP tool definition for an inline tool schema.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget ToolDefinition
 * (https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_ToolDefinition.html)
 */
export interface GatewayTargetToolDefinitionProperty {
  /**
   * Tool name (as surfaced to the agent over MCP).
   *
   * AWS: ToolDefinition Name
   *
   * Validation: Required; String
   **/
  readonly name: string;
  /**
   * Human-readable description of what the tool does.
   *
   * AWS: ToolDefinition Description
   *
   * Validation: Required; String
   **/
  readonly description: string;
  /**
   * JSON-schema definition of the tool's input.
   *
   * AWS: ToolDefinition InputSchema
   * (https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_SchemaDefinition.html)
   *
   * Validation: Required; {@link GatewayTargetSchemaDefinitionProperty}
   **/
  readonly inputSchema: GatewayTargetSchemaDefinitionProperty;
  /**
   * JSON-schema definition of the tool's output.
   *
   * AWS: ToolDefinition OutputSchema
   * (https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_SchemaDefinition.html)
   *
   * Validation: Optional; {@link GatewayTargetSchemaDefinitionProperty}
   **/
  readonly outputSchema?: GatewayTargetSchemaDefinitionProperty;
}

/**
 * A JSON-schema definition node (recursive), mirroring the AWS gateway-target SchemaDefinition.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget SchemaDefinition
 * (https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_SchemaDefinition.html)
 */
export interface GatewayTargetSchemaDefinitionProperty {
  /**
   * JSON-schema type (e.g. `string`, `number`, `object`, `array`, `boolean`).
   *
   * AWS: SchemaDefinition Type
   *
   * Validation: Required; String
   **/
  readonly type: string;
  /**
   * Description of this schema node.
   *
   * AWS: SchemaDefinition Description
   *
   * Validation: Optional; String
   **/
  readonly description?: string;
  /**
   * Property schemas, keyed by property name (for `object` types).
   *
   * AWS: SchemaDefinition Properties
   *
   * Validation: Optional; map of {@link GatewayTargetSchemaDefinitionProperty}
   **/
  readonly properties?: { [name: string]: GatewayTargetSchemaDefinitionProperty };
  /**
   * Names of required properties (for `object` types).
   *
   * AWS: SchemaDefinition Required
   *
   * Validation: Optional; String[]
   **/
  readonly required?: string[];
  /**
   * Item schema (for `array` types).
   *
   * AWS: SchemaDefinition Items
   *
   * Validation: Optional; {@link GatewayTargetSchemaDefinitionProperty}
   **/
  readonly items?: GatewayTargetSchemaDefinitionProperty;
}

/**
 * Lambda tool source for a gateway target. The gateway invokes this Lambda (using its execution
 * role) to serve the MCP tools described by `toolSchema`.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget McpLambdaTargetConfiguration
 */
export interface GatewayTargetLambdaProperty {
  /**
   * ARN of the Lambda function that implements the tool(s). The gateway execution role is granted
   * scoped `lambda:InvokeFunction` on exactly this ARN (by the L3 orchestration construct).
   *
   * AWS: McpLambdaTargetConfiguration LambdaArn
   *
   * Validation: Required; Lambda function ARN
   **/
  readonly lambdaArn: string;
  /**
   * Schema describing the MCP tools the Lambda exposes — the catalog (tool name + JSON-schema of
   * inputs/outputs) the gateway advertises to agents and dispatches to this Lambda. For example, a
   * `getWeather` tool taking a required `city` string:
   * `{ inlinePayload: [{ name: 'getWeather', description: 'Returns the weather for a city',
   * inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }] }`.
   * See the AWS tool-schema examples
   * (https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html#gateway-lambda-example).
   *
   * AWS: McpLambdaTargetConfiguration ToolSchema
   *
   * Validation: Required; exactly one of inlinePayload or s3
   **/
  readonly toolSchema: GatewayTargetToolSchemaProperty;
}

/**
 * OpenAPI schema tool source for a gateway target (a REST API described by an OpenAPI 3.0 schema).
 * Declared for a stable configuration surface; MDAA does not yet build this target type.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget McpTargetConfiguration OpenApiSchema (ApiSchemaConfiguration)
 */
export interface GatewayTargetOpenApiProperty {
  /**
   * OpenAPI schema declared inline (a JSON/YAML document as a string).
   *
   * AWS: ApiSchemaConfiguration InlinePayload
   *
   * Validation: Optional; mutually exclusive with `s3`
   **/
  readonly inlinePayload?: string;
  /**
   * Location of an OpenAPI schema document in S3.
   *
   * AWS: ApiSchemaConfiguration S3
   *
   * Validation: Optional; mutually exclusive with `inlinePayload`
   **/
  readonly s3?: GatewayTargetS3Property;
}

/**
 * Smithy model tool source for a gateway target (an AWS service described by a Smithy model).
 * Declared for a stable configuration surface; MDAA does not yet build this target type.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget McpTargetConfiguration SmithyModel (ApiSchemaConfiguration)
 */
export interface GatewayTargetSmithyProperty {
  /**
   * Smithy model declared inline (a JSON document as a string).
   *
   * AWS: ApiSchemaConfiguration InlinePayload
   *
   * Validation: Optional; mutually exclusive with `s3`
   **/
  readonly inlinePayload?: string;
  /**
   * Location of a Smithy model document in S3.
   *
   * AWS: ApiSchemaConfiguration S3
   *
   * Validation: Optional; mutually exclusive with `inlinePayload`
   **/
  readonly s3?: GatewayTargetS3Property;
}

/**
 * MCP server tool source for a gateway target (an external MCP-compliant server the gateway
 * synchronizes tools from). Declared for a stable configuration surface; MDAA does not yet build
 * this target type.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget McpServerTargetConfiguration
 */
export interface GatewayTargetMcpServerProperty {
  /**
   * HTTPS endpoint of the MCP server.
   *
   * AWS: McpServerTargetConfiguration Endpoint
   *
   * Validation: Required; HTTPS URL
   **/
  readonly endpoint: string;
  /**
   * Tool listing mode.
   *
   * AWS: McpServerTargetConfiguration ListingMode
   *
   * Validation: Optional; String
   **/
  readonly listingMode?: string;
}

/**
 * API Gateway tool source for a gateway target (a REST API fronted by Amazon API Gateway).
 * Declared for a stable configuration surface; MDAA does not yet build this target type.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget ApiGatewayTargetConfiguration
 */
export interface GatewayTargetApiGatewayProperty {
  /**
   * Id of the API Gateway REST API.
   *
   * AWS: ApiGatewayTargetConfiguration RestApiId
   *
   * Validation: Required; String
   **/
  readonly restApiId: string;
  /**
   * Deployment stage of the REST API.
   *
   * AWS: ApiGatewayTargetConfiguration Stage
   *
   * Validation: Required; String
   **/
  readonly stage: string;
}

/**
 * Tool source (target-type configuration) for a gateway target. Exactly one target type must be
 * set. MDAA currently supports only `lambda`; the other types are declared so the configuration
 * surface is stable as support is added, and are rejected as not yet supported at synth.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget TargetConfiguration.Mcp
 *
 * Validation: exactly one target type; currently must be `lambda`
 */
export interface GatewayTargetConfigurationProperty {
  /**
   * Lambda tool source (function ARN + tool schema).
   *
   * AWS: TargetConfiguration.Mcp.Lambda
   *
   * Validation: exactly one target type; `lambda` is currently the only supported type
   **/
  readonly lambda?: GatewayTargetLambdaProperty;
  /**
   * OpenAPI schema tool source. Declared; not yet supported.
   *
   * AWS: TargetConfiguration.Mcp.OpenApiSchema
   **/
  readonly openApiSchema?: GatewayTargetOpenApiProperty;
  /**
   * Smithy model tool source. Declared; not yet supported.
   *
   * AWS: TargetConfiguration.Mcp.SmithyModel
   **/
  readonly smithyModel?: GatewayTargetSmithyProperty;
  /**
   * MCP server tool source. Declared; not yet supported.
   *
   * AWS: TargetConfiguration.Mcp.McpServer
   **/
  readonly mcpServer?: GatewayTargetMcpServerProperty;
  /**
   * API Gateway tool source. Declared; not yet supported.
   *
   * AWS: TargetConfiguration.Mcp.ApiGateway
   **/
  readonly apiGateway?: GatewayTargetApiGatewayProperty;
}

// The target-type keys of GatewayTargetConfigurationProperty, in declaration order. Internal (a
// `keyof` type is not part of the jsii-exportable API surface); the supported subset is what
// validation currently builds — others are declared but rejected until supported.
const GATEWAY_TARGET_TYPE_KEYS: (keyof GatewayTargetConfigurationProperty)[] = [
  'lambda',
  'openApiSchema',
  'smithyModel',
  'mcpServer',
  'apiGateway',
];
const SUPPORTED_TARGET_TYPE_KEYS: (keyof GatewayTargetConfigurationProperty)[] = ['lambda'];

/**
 * Outbound credential provider for a gateway target.
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget CredentialProviderConfiguration
 */
export interface GatewayTargetCredentialProperty {
  /**
   * Credential provider type. Optional — defaults to `GATEWAY_IAM_ROLE` (the gateway invokes the
   * tool with its own execution role). All {@link GatewayTargetCredentialProviderType} values are
   * accepted by the type, but MDAA validation currently supports only `GATEWAY_IAM_ROLE` and
   * rejects the others as not yet supported.
   *
   * AWS: CredentialProviderConfiguration CredentialProviderType
   *
   * Validation: Optional; a {@link GatewayTargetCredentialProviderType}; currently `GATEWAY_IAM_ROLE`
   **/
  readonly type?: GatewayTargetCredentialProviderType;
}

/**
 * Configuration for a single gateway target (a tool source registered against a gateway).
 *
 * Use cases: registering a tool source (Lambda, and — as support is added — OpenAPI / Smithy /
 * MCP-server / API-Gateway) against a gateway
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget
 *
 * Validation: `targetConfiguration` sets exactly one target type (currently `lambda`);
 * `credentialProvider`, when set, must be a supported {@link GatewayTargetCredentialProviderType}
 */
export interface GatewayTargetProps {
  /**
   * Description of the target.
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget Description
   *
   * Validation: Optional; String; 1-200 characters
   **/
  readonly description?: string;
  /**
   * Tool source for the target. Exactly one target type is set (currently `lambda`).
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget TargetConfiguration
   *
   * Validation: Required; {@link GatewayTargetConfigurationProperty}
   **/
  readonly targetConfiguration: GatewayTargetConfigurationProperty;
  /**
   * Outbound credential provider. Optional — defaults to `GATEWAY_IAM_ROLE`.
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget CredentialProviderConfigurations
   *
   * Validation: Optional; when set, `type` must be a supported {@link GatewayTargetCredentialProviderType}
   **/
  readonly credentialProvider?: GatewayTargetCredentialProperty;
}

/**
 * Validates a gateway target:
 * - `targetConfiguration` sets exactly one target type;
 * - that target type is one MDAA currently supports (`lambda`) — others are rejected as not yet
 *   supported so the error is actionable rather than a downstream deploy failure;
 * - the Lambda tool source is well-formed (a `lambdaArn` and a `toolSchema` with exactly one of
 *   `inlinePayload` (non-empty) or `s3`).
 *
 * Returns the validated Lambda tool source so callers consume the narrowed value
 *
 * @returns the validated Lambda tool source
 * @throws Error naming the offending target if any constraint is violated
 */
export function validateTargetConfiguration(
  targetName: string,
  targetConfig: GatewayTargetProps,
): GatewayTargetLambdaProperty {
  const configuration = targetConfig.targetConfiguration;
  if (!configuration) {
    throw new Error(`Gateway target "${targetName}" must define a targetConfiguration.`);
  }

  const setTypes = GATEWAY_TARGET_TYPE_KEYS.filter(key => configuration[key] !== undefined);
  if (setTypes.length !== 1) {
    throw new Error(
      `Gateway target "${targetName}" targetConfiguration must set exactly one target type ` +
        `(one of ${GATEWAY_TARGET_TYPE_KEYS.join(', ')}); received ${setTypes.length} (${setTypes.join(', ') || 'none'}).`,
    );
  }

  const targetType = setTypes[0];
  if (!SUPPORTED_TARGET_TYPE_KEYS.includes(targetType)) {
    throw new Error(
      `Gateway target "${targetName}" uses target type "${targetType}", which is not yet supported; ` +
        `only ${SUPPORTED_TARGET_TYPE_KEYS.join(', ')} is currently supported.`,
    );
  }

  // The one set-and-supported type so far is `lambda`
  const lambda = configuration.lambda;
  if (!lambda) {
    throw new Error(`Gateway target "${targetName}" must define a lambda tool source.`);
  }

  validateLambdaToolSource(targetName, lambda);
  return lambda;
}

/**
 * Validates the Lambda tool source of a gateway target: a `lambdaArn` and a `toolSchema` with
 * exactly one of `inlinePayload` (non-empty, each tool with a non-empty name and description) or
 * `s3` (with a `uri`, and — when set explicitly — a well-formed `bucketOwnerAccountId`).
 *
 * These fail-fast at synth so a config mistake surfaces here (naming the target) rather than as an
 * opaque CloudFormation pattern violation at deploy time.
 *
 * @throws Error naming the offending target if any constraint is violated
 */
export function validateLambdaToolSource(targetName: string, lambda: GatewayTargetLambdaProperty): void {
  if (!lambda?.lambdaArn) {
    throw new Error(`Gateway target "${targetName}" must define a lambda tool source with a lambdaArn.`);
  }

  const toolSchema = lambda.toolSchema;
  if (!toolSchema) {
    throw new Error(`Gateway target "${targetName}" is missing toolSchema (required for a Lambda target).`);
  }

  // Destructure so the `!== undefined` checks below narrow the property types directly (no non-null
  // assertion needed): TS does not propagate narrowing through a separate `hasInline`/`hasS3` boolean.
  const { inlinePayload, s3 } = toolSchema;
  const hasInline = inlinePayload !== undefined;
  const hasS3 = s3 !== undefined;
  if (hasInline === hasS3) {
    throw new Error(
      `Gateway target "${targetName}" toolSchema must set exactly one of inlinePayload or s3 (received ` +
        `${hasInline && hasS3 ? 'both' : 'neither'}).`,
    );
  }
  if (inlinePayload !== undefined) {
    validateInlineTools(targetName, inlinePayload);
  }
  if (s3 !== undefined) {
    validateS3ToolSchema(targetName, s3);
  }
}

/**
 * Validates an inline tool payload: at least one tool, and each tool declares a non-empty `name`
 * and `description` (both Required by the AWS ToolDefinition, which rejects empty strings at deploy).
 */
function validateInlineTools(targetName: string, inlinePayload: GatewayTargetToolDefinitionProperty[]): void {
  if (inlinePayload.length === 0) {
    throw new Error(`Gateway target "${targetName}" toolSchema.inlinePayload must contain at least one tool.`);
  }
  inlinePayload.forEach((tool, index) => {
    if (!tool.name) {
      throw new Error(`Gateway target "${targetName}" toolSchema.inlinePayload[${index}] must set a non-empty name.`);
    }
    if (!tool.description) {
      throw new Error(`Gateway target "${targetName}" tool "${tool.name}" must set a non-empty description.`);
    }
  });
}

/**
 * Validates an S3 tool schema location: a `uri`, and — when `bucketOwnerAccountId` is set
 * explicitly (a non-empty, unresolved-token-free string) — that it is a 12-digit account id. An
 * empty string is treated as unset (it defaults to the deploying account in {@link buildLambdaToolSchema}),
 * so it is not validated here. This catches a typo (e.g. `"12345"`) at synth rather than as an
 * opaque CloudFormation pattern violation at deploy, and keeps the confused-deputy default intact.
 */
function validateS3ToolSchema(targetName: string, s3: GatewayTargetS3Property): void {
  if (!s3.uri) {
    throw new Error(`Gateway target "${targetName}" toolSchema.s3 must set a uri.`);
  }
  const accountId = s3.bucketOwnerAccountId;
  // Empty string is treated as unset (defaulted downstream); unresolved tokens (e.g. Aws.ACCOUNT_ID)
  // cannot be validated at synth and are trusted.
  if (accountId && !Token.isUnresolved(accountId) && !/^\d{12}$/.test(accountId)) {
    throw new Error(
      `Gateway target "${targetName}" toolSchema.s3.bucketOwnerAccountId "${accountId}" must be a 12-digit AWS ` +
        'account id.',
    );
  }
}

/**
 * Resolves and validates the credential provider type for a target. When no credential provider is
 * supplied — or one is supplied without a `type` (e.g. `credentialProvider: {}`) — it defaults to
 * `GATEWAY_IAM_ROLE` (the safe default: the gateway invokes the tool with its own execution role).
 * A value outside {@link GatewayTargetCredentialProviderType} is rejected as invalid; a
 * known-but-unsupported value is rejected as not yet supported. Both name the offending target and
 * value.
 *
 * @returns the resolved credential provider type to render onto the target
 * @throws Error if the credential provider type is invalid or not yet supported
 */
export function resolveTargetCredentialProviderType(
  targetName: string,
  targetConfig: GatewayTargetProps,
): GatewayTargetCredentialProviderType {
  const type = targetConfig.credentialProvider?.type ?? DEFAULT_CREDENTIAL_PROVIDER_TYPE;

  const knownTypes = Object.values(GatewayTargetCredentialProviderType);
  if (!knownTypes.includes(type)) {
    throw new Error(
      `Gateway target "${targetName}" uses invalid credentialProvider type "${type}"; must be one of ${knownTypes.join(', ')}.`,
    );
  }
  if (type !== DEFAULT_CREDENTIAL_PROVIDER_TYPE) {
    throw new Error(
      `Gateway target "${targetName}" uses credentialProvider type "${type}", which is not yet supported; ` +
        `only ${DEFAULT_CREDENTIAL_PROVIDER_TYPE} is currently supported.`,
    );
  }
  return type;
}

/**
 * Builds the typed CFN tool schema for a Lambda target from the validated config. Exactly one of
 * `inlinePayload` / `s3` is set (enforced by {@link validateLambdaToolSource}).
 *
 * For an S3 tool schema, `bucketOwnerAccountId` (cross-account confused-deputy protection) is
 * applied compliance-by-default: when the caller omits it (or passes an empty string), it defaults
 * to `deployingAccount` so the gateway always verifies the bucket owner on the cross-account read.
 * An explicit non-empty value is always respected. This default is enforced here so the protection
 * holds regardless of the consumer — an empty string cannot bypass it.
 *
 * @param deployingAccount the account to default `s3.bucketOwnerAccountId` to (the deploying
 *   account). Required and must be non-empty — a caller must supply it (typically
 *   `Stack.of(scope).account`) so the confused-deputy protection cannot be bypassed by omitting it.
 *   This function is scopeless (pure), so it cannot resolve the account itself.
 * @throws Error if `deployingAccount` is empty (the enforced fallback would otherwise be empty).
 */
export function buildLambdaToolSchema(
  toolSchema: GatewayTargetToolSchemaProperty,
  deployingAccount: string,
): CfnGatewayTarget.ToolSchemaProperty {
  if (toolSchema.s3) {
    // The confused-deputy default must hold even against an empty string, so treat both an empty
    // explicit bucketOwnerAccountId and an empty deployingAccount as unset (`??` alone only catches
    // null/undefined, so `""` — a plausible YAML accident or defensive `?? ''` upstream — would
    // otherwise render `BucketOwnerAccountId: ""` and defeat the protection). deployingAccount is
    // required and must be a real value, since it is the enforced fallback.
    if (!deployingAccount) {
      throw new Error(
        'buildLambdaToolSchema requires a non-empty deployingAccount to default the S3 ' +
          'bucketOwnerAccountId (confused-deputy protection); received an empty value.',
      );
    }
    // `||` (not `??`): an empty-string explicit owner is falsy and falls through to the deploying
    // account, so it cannot render BucketOwnerAccountId: "" and defeat the confused-deputy default.
    return {
      s3: {
        uri: toolSchema.s3.uri,
        bucketOwnerAccountId: toolSchema.s3.bucketOwnerAccountId || deployingAccount,
      },
    };
  }

  return {
    inlinePayload: (toolSchema.inlinePayload ?? []).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: buildSchemaDefinition(tool.inputSchema),
      outputSchema: tool.outputSchema ? buildSchemaDefinition(tool.outputSchema) : undefined,
    })),
  };
}

/**
 * Recursively builds the typed CFN schema definition from the config shape. The schema is a JSON
 * schema tree (object properties, array items), so this maps each node 1:1.
 *
 * Nesting depth is bounded by {@link MAX_TOOL_SCHEMA_DEPTH}: a pathologically deep (or
 * self-referential) schema throws a clear error naming the limit rather than an opaque
 * `RangeError: Maximum call stack size exceeded`. The optional `depth` argument is internal
 * (defaulted) — callers pass a single schema.
 */
export function buildSchemaDefinition(
  schema: GatewayTargetSchemaDefinitionProperty,
  depth = 1,
): CfnGatewayTarget.SchemaDefinitionProperty {
  if (depth > MAX_TOOL_SCHEMA_DEPTH) {
    throw new Error(
      `Tool inputSchema/outputSchema nesting exceeds the maximum supported depth of ${MAX_TOOL_SCHEMA_DEPTH}. ` +
        'Flatten the schema or reference a shared type; a deeper (or self-referential) schema is not supported.',
    );
  }

  const properties = schema.properties
    ? Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [key, buildSchemaDefinition(value, depth + 1)]),
      )
    : undefined;

  return {
    type: schema.type,
    description: schema.description,
    properties,
    required: schema.required,
    items: schema.items ? buildSchemaDefinition(schema.items, depth + 1) : undefined,
  };
}

/**
 * Maximum length of an `AWS::BedrockAgentCore::GatewayTarget` `Name`. The create API and CFN docs
 * advertise `{1,100}`, so a longer name deploys, but the service then rejects it on a later operation
 * (e.g. enabling exceptionLevel) — and its own error is self-inconsistent, citing both "<= 64" and
 * "up to 50 characters". We cap at the conservative 50 so a deployable-but-later-rejected name can't
 * be produced. Same docs-vs-runtime gap as the gateway name (MAX_GATEWAY_NAME_LENGTH, enforced 48).
 */
const MAX_GATEWAY_TARGET_NAME_LENGTH = 50;

/**
 * Derives the `AWS::BedrockAgentCore::GatewayTarget` `Name` from a logical target name: the naming
 * service prefixes and caps it, then {@link sanitizeGatewayName} maps it to the service charset. The
 * single source of truth for the target name — the L2 names the resource with it and the L3 uses it
 * to detect target keys that collapse to the same name (names must be unique within a gateway).
 */
export function deriveGatewayTargetName(naming: IMdaaResourceNaming, targetName: string): string {
  const named = naming
    .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_GATEWAY_TARGET)
    .resourceName(targetName, MAX_GATEWAY_TARGET_NAME_LENGTH);
  return sanitizeGatewayName(named, 'Gateway Target');
}
