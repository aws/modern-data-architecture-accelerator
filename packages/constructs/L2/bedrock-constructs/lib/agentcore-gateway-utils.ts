/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnGateway } from 'aws-cdk-lib/aws-bedrockagentcore';

/**
 * MCP protocol configuration for the gateway.
 *
 * Use cases: tool discovery semantics, semantic search, MCP version negotiation
 *
 * AWS: AWS::BedrockAgentCore::Gateway MCPGatewayConfiguration
 *
 * Validation: searchType, when set, must be SEMANTIC (the only value the service accepts); omit it
 * for a non-semantic gateway. Semantic search is immutable after creation.
 */
export interface McpProtocolConfigurationProperty {
  /**
   * System instructions surfaced to agents via MCP.
   *
   * Use cases: agent guidance, tool-use instructions
   *
   * AWS: MCPGatewayConfiguration Instructions
   *
   * Validation: Optional; String
   **/
  readonly instructions?: string;
  /**
   * Tool search strategy. `SEMANTIC` (natural-language tool discovery) is the only accepted value
   * and is immutable after creation; OMIT the field to run without it (there is no `NONE`).
   *
   * Use cases: semantic tool discovery
   *
   * AWS: MCPGatewayConfiguration SearchType
   *
   * Validation: Optional; must be 'SEMANTIC' when set (omit for non-semantic)
   **/
  readonly searchType?: 'SEMANTIC';
  /**
   * Supported MCP protocol versions.
   *
   * Use cases: MCP version negotiation
   *
   * AWS: MCPGatewayConfiguration SupportedVersions
   *
   * Validation: Optional; String[]
   **/
  readonly supportedVersions?: string[];
}

/**
 * An interceptor that references its Lambda function by ARN — the form the L2 renders onto the
 * gateway after the L3 deploys the inline function and passes this shape to {@link MdaaAgentcoreGateway}.
 *
 * Use cases: per-tool/operation/parameter authorization, request/response transformation
 *
 * AWS: AWS::BedrockAgentCore::Gateway GatewayInterceptorConfiguration
 *
 * Validation: at most one REQUEST and one RESPONSE interceptor (max 2 total)
 */
export interface InterceptorConfigurationsProperty {
  /**
   * Interception points at which this interceptor runs.
   *
   * Use cases: request validation, response transformation
   *
   * AWS: GatewayInterceptorConfiguration InterceptionPoints
   *
   * Validation: Required; non-empty subset of ['REQUEST', 'RESPONSE']
   **/
  readonly interceptionPoints: ('REQUEST' | 'RESPONSE')[];
  /**
   * ARN of the Lambda function invoked as the interceptor.
   *
   * Use cases: custom interception logic
   *
   * AWS: LambdaInterceptorConfiguration Arn
   *
   * Validation: Required; String
   **/
  readonly lambdaArn: string;
  /**
   * Whether to pass inbound request headers to the interceptor. Defaults to false since headers
   * may carry sensitive authorization tokens.
   *
   * Use cases: header-aware interception
   *
   * AWS: InterceptorInputConfiguration PassRequestHeaders
   *
   * Validation: Optional; Boolean
   * @default false
   **/
  readonly passRequestHeaders?: boolean;
}

/**
 * Maximum number of interceptors a gateway supports (at most one REQUEST and one RESPONSE),
 * per the AWS::BedrockAgentCore::Gateway InterceptorConfigurations limit.
 */
const MAX_INTERCEPTORS = 2;

/**
 * Valid interception points for a gateway interceptor.
 */
const VALID_INTERCEPTION_POINTS = ['REQUEST', 'RESPONSE'];

/**
 * Valid MCP `searchType` values. The API accepts only `SEMANTIC`; we reject anything else at synth
 * rather than let the service roll the stack back at deploy. Omit the field to run without it.
 */
const VALID_SEARCH_TYPES = ['SEMANTIC'];

/**
 * Exception level a gateway surfaces in responses and logs. The only value AWS accepts for
 * `AWS::BedrockAgentCore::Gateway ExceptionLevel` is `DEBUG`; omitting the field leaves the secure
 * service default (INFO), so no `INFO` member is declared (the service has no such settable value).
 *
 * `DEBUG` raises the verbosity of the exception detail the gateway exposes — possibly sensitive
 * internal error/stack and request context — so it is for troubleshooting only, never production.
 *
 * A named enum (rather than a bare `string`) gives schema-level validation for config authors and a
 * synth-time backstop via {@link validateExceptionLevel} for untyped/YAML callers.
 */
export enum GatewayExceptionLevel {
  /** Verbose exception detail for troubleshooting (may expose sensitive internal/request context). */
  DEBUG = 'DEBUG',
}

/**
 * Validates a gateway exception level and returns the value to render (or `undefined` to leave the
 * service default). A missing value (undefined/null from a TS or YAML/jsii caller) is accepted as
 * "unset". Any other value outside {@link GatewayExceptionLevel} is rejected at synth — naming the
 * value and the accepted set — rather than let the service roll the stack back at deploy.
 *
 * @returns the validated exception level, or undefined when unset
 * @throws Error if a non-empty value is not a member of {@link GatewayExceptionLevel}
 */
export function validateExceptionLevel(exceptionLevel?: string): GatewayExceptionLevel | undefined {
  // Loose null check: jsii/YAML callers can surface a missing value as null, not undefined.
  if (exceptionLevel == null) {
    return undefined;
  }
  const validValues = Object.values(GatewayExceptionLevel);
  if (!validValues.includes(exceptionLevel as GatewayExceptionLevel)) {
    throw new Error(
      `Invalid exceptionLevel "${exceptionLevel}"; valid values are ${validValues.join(', ')} (omit for the service default).`,
    );
  }
  return exceptionLevel as GatewayExceptionLevel;
}

/** Minimal interceptor shape needed for validation (interception points only). */
interface InterceptionPointsHolder {
  readonly interceptionPoints: string[];
}

/**
 * Validates interceptor count and points: at most {@link MAX_INTERCEPTORS} interceptors, each a
 * non-empty subset of {@link VALID_INTERCEPTION_POINTS}, and at most one of each point. Takes only
 * the points shape so the L3 can run it fail-fast and the L2 can re-run it as a backstop.
 *
 * @throws Error if the count limit is exceeded or an interception point is invalid/duplicated
 */
export function validateInterceptorConfigurations(interceptors?: InterceptionPointsHolder[]): void {
  if (!interceptors || interceptors.length === 0) {
    return;
  }
  if (interceptors.length > MAX_INTERCEPTORS) {
    throw new Error(
      `A gateway supports at most ${MAX_INTERCEPTORS} interceptors (one REQUEST and one RESPONSE); received ${interceptors.length}.`,
    );
  }
  const pointCounts: Record<string, number> = {};
  for (const interceptor of interceptors) {
    const points = interceptor.interceptionPoints ?? [];
    if (points.length === 0) {
      throw new Error('Each interceptor requires at least one interceptionPoint (REQUEST or RESPONSE).');
    }
    for (const point of points) {
      if (!VALID_INTERCEPTION_POINTS.includes(point)) {
        throw new Error(
          `Invalid interceptionPoint "${point}"; valid values are ${VALID_INTERCEPTION_POINTS.join(', ')}.`,
        );
      }
      pointCounts[point] = (pointCounts[point] ?? 0) + 1;
      if (pointCounts[point] > 1) {
        throw new Error(`A gateway supports at most one ${point} interceptor; received ${pointCounts[point]}.`);
      }
    }
  }
}

/**
 * Maximum length of an AgentCore Gateway `Name`. The service enforces `{1,48}` at runtime even though
 * the CloudFormation docs list `{1,100}`. Gateway limit only — the *target* name has its own (also
 * shorter-than-documented) cap, so do not reuse this constant there.
 */
export const MAX_GATEWAY_NAME_LENGTH = 48;

/**
 * Sanitizes a name to the AgentCore `Name` charset: alphanumerics with optional single hyphens (no
 * underscores, no leading/trailing/double hyphens). Follows the API contract, not the docs (which
 * disagree on underscores/length); inverse of the Runtime sanitizer. Charset only — the length cap
 * (gateway {1,48}, target {1,100}) is applied by the naming service before this call. `resourceKind`
 * labels the resource in the failure error.
 *
 * @throws Error if no valid non-empty name remains
 */
export function sanitizeGatewayName(name: string, resourceKind = 'Gateway'): string {
  // Collapse non-charset runs to a single hyphen, then strip a leading/trailing one. Single-character
  // anchors (runs already collapsed) avoid the backtracking a quantified `/-+$/` can trigger.
  const sanitized = name
    .replace(/[^0-9a-zA-Z-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');

  if (sanitized.length === 0 || !/^[0-9a-zA-Z]/.test(sanitized)) {
    throw new Error(
      `Unable to derive a valid Bedrock AgentCore ${resourceKind} name from "${name}". The name must contain at ` +
        'least one alphanumeric character and match the AgentCore name charset ^([0-9a-zA-Z][-]?)+$.',
    );
  }

  return sanitized;
}

/**
 * Min/max length of an AgentCore `Description` — both AWS::BedrockAgentCore::Gateway and
 * ::GatewayTarget document Minimum 1, Maximum 200. No character-set restriction.
 */
const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Validates a gateway/target `Description` length ({@link MIN_DESCRIPTION_LENGTH}-{@link
 * MAX_DESCRIPTION_LENGTH}). A missing value (undefined, or null from a YAML/jsii caller) means "no
 * description" and skips the check. `resourceContext` is prefixed to the error (e.g. `Gateway target
 * "weather"`); omit for the gateway itself.
 *
 * @throws Error if a present description is out of range
 */
export function validateDescription(description?: string, resourceContext?: string): void {
  if (description == null) {
    return;
  }
  if (description.length < MIN_DESCRIPTION_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
    const prefix = resourceContext ? `${resourceContext} ` : '';
    throw new Error(
      `${prefix}description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters; ` +
        `received ${description.length}.`,
    );
  }
}

/**
 * Builds the typed MCP protocol configuration for the gateway. MCP is currently the only protocol
 * the service supports.
 *
 * @param mcpConfig - The MCP protocol configuration property
 * @returns Typed GatewayProtocolConfigurationProperty, or undefined if nothing is set
 */
export function buildProtocolConfiguration(
  mcpConfig?: McpProtocolConfigurationProperty,
): CfnGateway.GatewayProtocolConfigurationProperty | undefined {
  if (!mcpConfig) {
    return undefined;
  }

  if (mcpConfig.searchType !== undefined && !VALID_SEARCH_TYPES.includes(mcpConfig.searchType)) {
    throw new Error(`Invalid searchType "${mcpConfig.searchType}"; valid values are ${VALID_SEARCH_TYPES.join(', ')}.`);
  }

  const mcp: CfnGateway.MCPGatewayConfigurationProperty = {
    instructions: mcpConfig.instructions,
    searchType: mcpConfig.searchType,
    supportedVersions: mcpConfig.supportedVersions,
  };

  return { mcp };
}

/**
 * Builds the typed CFN interceptor configurations from ARN-referenced interceptors. Re-runs
 * {@link validateInterceptorConfigurations} as a backstop and defaults `passRequestHeaders` to false.
 *
 * @param interceptors - Optional array of interceptors (interception points + lambda ARN)
 * @returns Typed GatewayInterceptorConfigurationProperty array, or undefined if none provided
 * @throws Error if interception points are invalid or the count limits are exceeded
 */
export function buildInterceptorConfigurations(
  interceptors?: InterceptorConfigurationsProperty[],
): CfnGateway.GatewayInterceptorConfigurationProperty[] | undefined {
  if (!interceptors || interceptors.length === 0) {
    return undefined;
  }

  validateInterceptorConfigurations(interceptors);

  return interceptors.map(interceptor => ({
    interceptionPoints: interceptor.interceptionPoints,
    interceptor: { lambda: { arn: interceptor.lambdaArn } },
    inputConfiguration: { passRequestHeaders: interceptor.passRequestHeaders ?? false },
  }));
}
