/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  AuthorizerConfigurationProperty,
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
export function buildLifecycleConfiguration(lifecycleConfig: LifecycleConfigurationProperty): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (lifecycleConfig.idleRuntimeSessionTimeout !== undefined) {
    const timeout = lifecycleConfig.idleRuntimeSessionTimeout;
    if (timeout < 60 || timeout > 28800) {
      throw new Error('IdleRuntimeSessionTimeout must be between 60 and 28800 seconds');
    }
    config.IdleRuntimeSessionTimeout = timeout;
  }
  if (lifecycleConfig.maxLifetime !== undefined) {
    const lifetime = lifecycleConfig.maxLifetime;
    if (lifetime < 60 || lifetime > 28800) {
      throw new Error('MaxLifetime must be between 60 and 28800 seconds');
    }
    config.MaxLifetime = lifetime;
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
export function buildNetworkConfiguration(networkConfig: NetworkConfigurationProperty): Record<string, unknown> {
  // MDAA security requirement: Always use VPC mode
  const config: Record<string, unknown> = {
    NetworkMode: 'VPC',
  };

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

  config.NetworkModeConfig = {
    SecurityGroups: networkConfig.securityGroups,
    Subnets: networkConfig.subnets,
  };

  return config;
}

/**
 * Builds authorizer configuration object from authorizer configuration property.
 * Validates JWT authorizer configuration including discovery URL pattern.
 *
 * @param authorizerConfig - The authorizer configuration property
 * @returns CloudFormation-compatible authorizer configuration object
 * @throws Error if JWT configuration is invalid
 */
export function buildAuthorizerConfiguration(
  authorizerConfig: AuthorizerConfigurationProperty,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Support both customJwtAuthorizer and jwtAuthorizer (backward compatibility)
  const jwtConfig = authorizerConfig.customJwtAuthorizer || authorizerConfig.jwtAuthorizer;

  if (jwtConfig) {
    if (!jwtConfig.discoveryUrl) {
      throw new Error('DiscoveryUrl is required in CustomJwtAuthorizer (or JwtAuthorizer) configuration');
    }

    // Validate pattern: must end with /.well-known/openid-configuration
    if (!/^.+\/\.well-known\/openid-configuration$/.test(jwtConfig.discoveryUrl)) {
      throw new Error('DiscoveryUrl must match pattern: ^.+/\\.well-known/openid-configuration$');
    }

    const customJwt: Record<string, unknown> = {
      DiscoveryUrl: jwtConfig.discoveryUrl,
    };

    if (jwtConfig.allowedAudience && jwtConfig.allowedAudience.length > 0) {
      customJwt.AllowedAudience = jwtConfig.allowedAudience;
    }

    if (jwtConfig.allowedClients && jwtConfig.allowedClients.length > 0) {
      customJwt.AllowedClients = jwtConfig.allowedClients;
    }

    config.CustomJWTAuthorizer = customJwt;
  }

  return config;
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
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Support both requestHeaderAllowlist and allowedHeaders (backward compatibility)
  const allowlist = headerConfig.requestHeaderAllowlist || headerConfig.allowedHeaders;

  if (allowlist) {
    if (allowlist.length < 1 || allowlist.length > 20) {
      throw new Error('RequestHeaderAllowlist (or AllowedHeaders) must contain 1-20 items');
    }
    config.RequestHeaderAllowlist = allowlist;
  }

  return config;
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
