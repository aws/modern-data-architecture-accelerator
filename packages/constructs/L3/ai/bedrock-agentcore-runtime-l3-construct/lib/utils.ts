/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentcoreCognitoAuth, buildCustomJwtAuthorizer } from '@aws-mdaa/agentcore-shared';
import { aws_bedrockagentcore as bedrockagentcore } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  AuthorizerConfigurationProperty,
  CustomJwtAuthorizerProperty,
  LifecycleConfigurationProperty,
  NetworkConfigurationProperty,
  PolicyProperty,
  RequestHeaderConfigurationProperty,
} from './bedrock-agentcore-runtime-l3-construct';

/**
 * Builds lifecycle configuration object from lifecycle configuration property.
 * Validates timeout values are within acceptable range (60-28800 seconds).
 *
 * @param lifecycleConfig - The lifecycle configuration property
 * @returns CloudFormation-compatible lifecycle configuration object
 * @throws Error if timeout values are outside valid range
 */
export function buildLifecycleConfiguration(
  lifecycleConfig: LifecycleConfigurationProperty,
): bedrockagentcore.CfnRuntime.LifecycleConfigurationProperty {
  const config: { idleRuntimeSessionTimeout?: number; maxLifetime?: number } = {};
  if (lifecycleConfig.idleRuntimeSessionTimeout !== undefined) {
    const timeout = lifecycleConfig.idleRuntimeSessionTimeout;
    if (timeout < 60 || timeout > 28800) {
      throw new Error('IdleRuntimeSessionTimeout must be between 60 and 28800 seconds');
    }
    config.idleRuntimeSessionTimeout = timeout;
  }
  if (lifecycleConfig.maxLifetime !== undefined) {
    const lifetime = lifecycleConfig.maxLifetime;
    if (lifetime < 60 || lifetime > 28800) {
      throw new Error('MaxLifetime must be between 60 and 28800 seconds');
    }
    config.maxLifetime = lifetime;
  }
  return config;
}

/**
 * Builds network configuration object from network configuration property.
 * MDAA enforces VPC mode only for security. Hardcodes NetworkMode to VPC.
 *
 * @param networkConfig - The network configuration property
 * @returns CloudFormation-compatible network configuration object
 * @throws Error if VPC configuration is missing or invalid
 */
export function buildNetworkConfiguration(
  networkConfig: NetworkConfigurationProperty,
): bedrockagentcore.CfnRuntime.NetworkConfigurationProperty {
  // Validate required fields
  if (!networkConfig.securityGroups || networkConfig.securityGroups.length === 0) {
    throw new Error('securityGroups is required in networkConfiguration');
  }
  if (!networkConfig.subnets || networkConfig.subnets.length === 0) {
    throw new Error('subnets is required in networkConfiguration');
  }

  // Validate array lengths
  if (networkConfig.securityGroups.length < 1 || networkConfig.securityGroups.length > 16) {
    throw new Error('securityGroups must be an array with 1-16 items');
  }
  if (networkConfig.subnets.length < 1 || networkConfig.subnets.length > 16) {
    throw new Error('subnets must be an array with 1-16 items');
  }

  // MDAA security requirement: Always use VPC mode
  return {
    networkMode: 'VPC',
    networkModeConfig: {
      securityGroups: networkConfig.securityGroups,
      subnets: networkConfig.subnets,
    },
  };
}

/**
 * Resolves the effective JWT authorizer config, preferring `customJwtAuthorizer` over the
 * deprecated `jwtAuthorizer` alias. Returns undefined when neither is set, which means
 * AWS IAM (SigV4) — the runtime's no-configuration default.
 *
 * Both aliases route through here so the `cognito`/`discoveryUrl` XOR and the discovery
 * URL composition cannot be bypassed by configuring the deprecated field.
 */
export function resolveJwtAuthorizerConfig(
  authorizerConfig: AuthorizerConfigurationProperty,
): CustomJwtAuthorizerProperty | undefined {
  return authorizerConfig.customJwtAuthorizer || authorizerConfig.jwtAuthorizer; // NOSONAR
}

/**
 * Validates that exactly one identity-provider source is configured on a JWT authorizer.
 *
 * `discoveryUrl` and `cognito` are two ways of naming the IdP, differing only in who
 * provisions it, so configuring both is ambiguous rather than additive — MDAA cannot know
 * which pool's tokens the caller intends to present. Configuring neither leaves the
 * authorizer with no issuer at all.
 *
 * Called before the pool is created so a misconfiguration fails without leaving a
 * half-built authorizer, and reported against `customJwtAuthorizer` regardless of which
 * alias supplied the config, since that is the field new configs should use.
 *
 * @throws Error if both or neither of discoveryUrl and cognito are configured
 */
export function validateJwtAuthorizerIdpSource(jwtConfig: CustomJwtAuthorizerProperty): void {
  if (jwtConfig.discoveryUrl && jwtConfig.cognito) {
    throw new Error(
      'authorizerConfiguration.customJwtAuthorizer accepts either discoveryUrl or cognito, not both. ' +
        'Use discoveryUrl for an identity provider you already run, or cognito to have MDAA create one.',
    );
  }
  if (!jwtConfig.discoveryUrl && !jwtConfig.cognito) {
    throw new Error(
      'authorizerConfiguration.customJwtAuthorizer requires exactly one of discoveryUrl or cognito. ' +
        'Supply discoveryUrl for an identity provider you already run, or cognito: {} to have MDAA create one.',
    );
  }
  // The third fatal combination, alongside both above. AgentCore ANDs every claim filter it
  // is given, and on the cognito path MDAA sets allowedAudience to the created app client.
  // Cognito puts that ID in the ID token's `aud` but the access token's `client_id`, so no
  // single token satisfies both filters and every caller is rejected — while synth and
  // deploy both succeed, which is what makes it worth failing here.
  if (jwtConfig.cognito && jwtConfig.allowedClients?.length) {
    throw new Error(
      'authorizerConfiguration.customJwtAuthorizer cannot combine cognito with allowedClients. ' +
        'AgentCore validates every claim filter it is given, and MDAA sets allowedAudience to the app ' +
        'client it creates: Cognito puts that ID in the ID token aud claim but the access token client_id ' +
        'claim, so no token satisfies both and every caller is rejected. Use discoveryUrl with a ' +
        'hand-configured allowedClients for access-token callers.',
    );
  }
}

/**
 * Builds authorizer configuration object from authorizer configuration property.
 * Validates JWT authorizer configuration including discovery URL pattern.
 *
 * @param authorizerConfig - The authorizer configuration property
 * @param cognitoAuth - The MDAA-created Cognito resources, when the `cognito` path is in
 *   use. Its composed discovery URL and client ID supply the values the user did not, and
 *   the client ID is prepended to any additional audiences the user configured.
 * @returns CloudFormation-compatible authorizer configuration object
 * @throws Error if JWT configuration is invalid
 */
export function buildAuthorizerConfiguration(
  authorizerConfig: AuthorizerConfigurationProperty,
  cognitoAuth?: AgentcoreCognitoAuth,
): bedrockagentcore.CfnRuntime.AuthorizerConfigurationProperty {
  const jwtConfig = resolveJwtAuthorizerConfig(authorizerConfig);

  // No JWT authorizer => AWS IAM (SigV4) is the runtime's default; emit no authorizer config.
  if (!jwtConfig) {
    return {};
  }

  validateJwtAuthorizerIdpSource(jwtConfig);

  // On the cognito path the discovery URL is an unresolved CDK token pointing at the pool
  // MDAA just created, and the created client is always an accepted audience. `allowedClients`
  // is deliberately left as configured (MDAA never sets it) — Cognito puts the client ID in
  // the ID token's `aud`, and AgentCore ANDs the claim filters it is given.
  const resolvedJwtConfig: CustomJwtAuthorizerProperty = cognitoAuth
    ? {
        ...jwtConfig,
        discoveryUrl: cognitoAuth.discoveryUrl,
        allowedAudience: [cognitoAuth.audience, ...(jwtConfig.allowedAudience ?? [])],
      }
    : jwtConfig;

  // Validation and JWT field mapping are shared with the gateway module via @aws-mdaa/agentcore-shared.
  // The built object matches both CfnRuntime/CfnGateway CustomJWTAuthorizerConfiguration shapes.
  // The shared validator still requires a discoveryUrl, so the composed URL is checked by
  // exactly the same pattern a user-supplied one is.
  const customJwtAuthorizer: bedrockagentcore.CfnRuntime.CustomJWTAuthorizerConfigurationProperty =
    buildCustomJwtAuthorizer({ ...resolvedJwtConfig, discoveryUrl: resolvedJwtConfig.discoveryUrl! });

  return { customJwtAuthorizer };
}

/**
 * Builds request header configuration object from request header configuration property.
 * Validates header allowlist size (1-20 items).
 *
 * @param headerConfig - The request header configuration property
 * @returns CloudFormation-compatible request header configuration object
 * @throws Error if allowlist size is invalid
 */
export function buildRequestHeaderConfiguration(
  headerConfig: RequestHeaderConfigurationProperty,
): bedrockagentcore.CfnRuntime.RequestHeaderConfigurationProperty {
  // Support both requestHeaderAllowlist and allowedHeaders (backward compatibility)
  const allowlist = headerConfig.requestHeaderAllowlist || headerConfig.allowedHeaders; // NOSONAR

  if (!allowlist) {
    return {};
  }

  if (allowlist.length < 1 || allowlist.length > 20) {
    throw new Error('RequestHeaderAllowlist (or AllowedHeaders) must contain 1-20 items');
  }

  return { requestHeaderAllowlist: allowlist };
}

/**
 * Sanitizes Bedrock AgentCore names to match CloudFormation pattern requirements.
 * Pattern: ^[a-zA-Z][a-zA-Z0-9_]{0,47}$ (no hyphens allowed)
 *
 * This function only handles character sanitization. Length enforcement should be
 * handled by the naming service (props.naming.resourceName) before calling this function.
 *
 * Transformations applied:
 * - Replaces hyphens with underscores
 * - Removes invalid characters (keeps only alphanumeric and underscores)
 * - Ensures name starts with a letter (adds prefix if needed)
 *
 * @param name - The name to sanitize
 * @param prefix - Optional prefix to add if name doesn't start with a letter (default: 'r_')
 * @returns Sanitized name matching CloudFormation pattern
 */
export function sanitizeBedrockAgentcoreName(name: string, prefix: string = 'r_'): string {
  // Replace hyphens with underscores (Bedrock AgentCore doesn't allow hyphens)
  let sanitized = name.replace(/-/g, '_');

  // Remove any invalid characters (keep only alphanumeric and underscores)
  sanitized = sanitized.replace(/\W/g, '_');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = `${prefix}${sanitized}`;
  }

  return sanitized;
}

/**
 * Extracts and converts custom policy statements from configuration to CDK PolicyStatement objects.
 * Flattens nested policy documents and normalizes Action and Resource fields to arrays.
 *
 * @param policies - Optional array of policy properties containing policy documents
 * @returns Array of CDK PolicyStatement objects
 */
export function extractCustomPolicyStatements(policies?: PolicyProperty[]): PolicyStatement[] {
  if (!policies) {
    return [];
  }

  return policies
    .filter(policy => policy.policyDocument?.Statement)
    .flatMap(policy => policy.policyDocument!.Statement)
    .map(
      stmt =>
        new PolicyStatement({
          sid: stmt.Sid,
          effect: stmt.Effect === 'Allow' ? Effect.ALLOW : Effect.DENY,
          actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
          resources: Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource],
          conditions: stmt.Condition,
        }),
    );
}
