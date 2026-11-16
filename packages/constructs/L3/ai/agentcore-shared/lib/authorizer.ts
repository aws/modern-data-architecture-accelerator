/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OIDC discovery URL pattern required by AgentCore (Runtime and Gateway both enforce it):
 * the URL must end with `/.well-known/openid-configuration`.
 */
const DISCOVERY_URL_PATTERN = /^.+\/\.well-known\/openid-configuration$/;

/**
 * The AWS `authorizerType` values MDAA supports for AgentCore inbound authorization.
 *
 * AgentCore Gateway takes this as an explicit (required) field; AgentCore Runtime has no such
 * field (it infers AWS IAM when no JWT authorizer is configured). MDAA models both with the same
 * {@link AgentcoreAuthorizerConfigProperty} and derives this type via
 * {@link resolveAuthorizerType}, so the customer-facing UX is identical across modules:
 * provide `customJwt`, or omit it for AWS IAM.
 *
 * MDAA intentionally does not expose the service's `NONE` (unauthenticated) or `AUTHENTICATE_ONLY`
 * (authenticated but no per-caller authorization) values.
 */
export type AuthorizerType = 'CUSTOM_JWT' | 'AWS_IAM';

/**
 * Custom JWT (OIDC) inbound authorizer configuration shared by the AgentCore Runtime and Gateway
 * L3 constructs. The field set matches both services' `CustomJWTAuthorizerConfiguration` exactly,
 * so a built object (see {@link buildCustomJwtAuthorizer}) is assignable to either L1's typed
 * authorizer property.
 *
 * At least one of `allowedAudience` or `allowedClients` is required. AgentCore checks every
 * restriction that is configured, so a token must satisfy all of them.
 *
 * Use cases: JWT authentication, OIDC integration, token validation
 *
 * AWS: AWS::BedrockAgentCore::{Runtime,Gateway} CustomJWTAuthorizerConfiguration
 *
 * Validation: discoveryUrl required and must end with /.well-known/openid-configuration; at least
 * one of allowedAudience or allowedClients
 */
export interface CustomJwtAuthorizerProperty {
  /**
   * OIDC discovery URL used to validate JWTs.
   *
   * Use cases: OIDC integration, token validation, identity provider connection
   *
   * AWS: CustomJWTAuthorizerConfiguration DiscoveryUrl
   *
   * Validation: Required; String; must end with /.well-known/openid-configuration
   **/
  readonly discoveryUrl: string;
  /**
   * Allowed audience values validated against the token `aud` claim. Use for ID tokens, and for
   * access tokens from IdPs that set `aud`.
   *
   * Use cases: audience validation, access restriction
   *
   * AWS: CustomJWTAuthorizerConfiguration AllowedAudience
   *
   * Validation: Optional; String[]; at least one of allowedAudience / allowedClients required (empty
   * list = unset); entries non-blank
   **/
  readonly allowedAudience?: string[];
  /**
   * Allowed client IDs validated against the token `client_id` claim. Use for Cognito access
   * tokens, which carry the app client in `client_id` and have no `aud` claim.
   *
   * Use cases: client filtering, access control
   *
   * AWS: CustomJWTAuthorizerConfiguration AllowedClients
   *
   * Validation: Optional; String[]; at least one of allowedAudience / allowedClients required (empty
   * list = unset); entries non-blank
   **/
  readonly allowedClients?: string[];
}

/**
 * Inbound authorization configuration shared by the AgentCore Runtime and Gateway L3 constructs.
 * The single customer-facing model: provide a `customJwt` authorizer, or omit it to use AWS IAM
 * (SigV4) — there is no separate `awsIam` marker, as IAM is the no-configuration fallback. The
 * whole config (and this property) is optional; absent config means AWS IAM.
 *
 * Use cases: inbound access control
 *
 * AWS: AgentCore inbound authorization (CUSTOM_JWT when customJwt is set; otherwise AWS_IAM)
 *
 * Validation: customJwt optional; when present it must be valid (see {@link validateCustomJwtAuthorizer})
 */
export interface AgentcoreAuthorizerConfigProperty {
  /**
   * Custom JWT (OIDC) inbound authorization. When set, maps to `authorizerType: CUSTOM_JWT`.
   * When omitted, the gateway/runtime fall back to AWS IAM (SigV4).
   *
   * Use cases: JWT/OIDC inbound authorization
   *
   * AWS: CustomJWTAuthorizer
   *
   * Validation: Optional; valid CustomJwtAuthorizerProperty when present
   **/
  readonly customJwt?: CustomJwtAuthorizerProperty;
}

/**
 * Resolves the shared authorizer config into the AWS `authorizerType`: `CUSTOM_JWT` when a
 * `customJwt` authorizer is configured, otherwise `AWS_IAM` (the no-configuration fallback). The
 * Gateway feeds the returned value to its required `authorizerType` field; the Runtime ignores it
 * (its L1 has no `authorizerType` — it infers AWS IAM when no JWT authorizer is set) but uses the
 * same model so the two constructs share one config UX.
 */
export function resolveAuthorizerType(config?: AgentcoreAuthorizerConfigProperty): AuthorizerType {
  return config?.customJwt ? 'CUSTOM_JWT' : 'AWS_IAM';
}

/**
 * Validates a shared Custom JWT authorizer configuration: `discoveryUrl` is required and must end
 * with `/.well-known/openid-configuration`, and at least one of `allowedAudience` /
 * `allowedClients` must be set with non-blank entries (an empty list counts as unset). AgentCore
 * rejects an authorizer with no claim rule at deploy; this fails the same config at synth.
 *
 * @throws Error if discoveryUrl is missing or malformed, no token restriction is set, or an entry is blank
 */
export function validateCustomJwtAuthorizer(jwtConfig: CustomJwtAuthorizerProperty): void {
  if (!jwtConfig.discoveryUrl) {
    throw new Error('DiscoveryUrl is required in CustomJwt authorizer configuration');
  }
  if (!DISCOVERY_URL_PATTERN.test(jwtConfig.discoveryUrl)) {
    throw new Error(String.raw`DiscoveryUrl must match pattern: ^.+/\.well-known/openid-configuration$`);
  }
  validateJwtRestrictionEntries(jwtConfig.allowedAudience, jwtConfig.allowedClients);
  if (!jwtConfig.allowedAudience?.length && !jwtConfig.allowedClients?.length) {
    throw new Error(
      'CustomJwt authorizer must restrict which tokens it accepts: set allowedAudience (validated against ' +
        'the token aud claim, e.g. ID tokens) and/or allowedClients (validated against the client_id claim, ' +
        'e.g. Cognito access tokens).',
    );
  }
}

/**
 * Validates that every `allowedAudience` / `allowedClients` entry is a non-blank string. Exported so
 * the Runtime can check the user's own lists before it adds the MDAA-created Cognito client, keeping
 * reported indexes aligned with the configured lists.
 *
 * @throws Error naming the first blank entry
 */
export function validateJwtRestrictionEntries(allowedAudience?: string[], allowedClients?: string[]): void {
  validateNonBlankEntries(allowedAudience, 'allowedAudience');
  validateNonBlankEntries(allowedClients, 'allowedClients');
}

// Loose input types: YAML and jsii callers can pass null lists or non-string entries.
function validateNonBlankEntries(values: readonly unknown[] | null | undefined, fieldName: string): void {
  const blankIndex = (values ?? []).findIndex(value => typeof value !== 'string' || value.trim().length === 0);
  if (blankIndex >= 0) {
    throw new Error(`CustomJwt authorizer "${fieldName}[${blankIndex}]" must be a non-blank string.`);
  }
}

/**
 * Builds the JWT authorizer object for an AgentCore L1 construct. The returned plain object matches
 * the `CustomJWTAuthorizerConfiguration` shape of both `CfnRuntime` and `CfnGateway` (they are
 * structurally identical), so callers assign it directly to their typed L1 authorizer property.
 * Empty `allowedAudience` / `allowedClients` arrays are dropped so the template omits them.
 *
 * @throws Error if the JWT configuration is invalid (see {@link validateCustomJwtAuthorizer})
 */
export function buildCustomJwtAuthorizer(jwtConfig: CustomJwtAuthorizerProperty): CustomJwtAuthorizerProperty {
  validateCustomJwtAuthorizer(jwtConfig);
  return {
    discoveryUrl: jwtConfig.discoveryUrl,
    allowedAudience:
      jwtConfig.allowedAudience && jwtConfig.allowedAudience.length > 0 ? jwtConfig.allowedAudience : undefined,
    allowedClients:
      jwtConfig.allowedClients && jwtConfig.allowedClients.length > 0 ? jwtConfig.allowedClients : undefined,
  };
}
