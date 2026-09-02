/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentcoreCognitoAuth } from '@aws-mdaa/agentcore-shared';
import { aws_bedrockagentcore as bedrockagentcore } from 'aws-cdk-lib';
import {
  buildAuthorizerConfiguration,
  buildLifecycleConfiguration,
  buildNetworkConfiguration,
  buildRequestHeaderConfiguration,
  extractCustomPolicyStatements,
  NetworkConfigurationProperty,
  resolveJwtAuthorizerConfig,
  sanitizeBedrockAgentcoreName,
  validateJwtAuthorizerIdpSource,
} from '../lib';

const VALID_DISCOVERY_URL = 'https://example.com/.well-known/openid-configuration';

/**
 * Stands in for the created Cognito resources. Only the two fields
 * buildAuthorizerConfiguration reads are populated — constructing a real pool here would
 * pull in a CDK stack to test pure field mapping. The pool itself is covered by
 * agentcore-shared's cognito-auth tests.
 */
const FAKE_COGNITO_AUTH = {
  discoveryUrl: 'https://cognito-idp.test-region.amazonaws.com/pool-id/.well-known/openid-configuration',
  audience: 'created-client-id',
};

/**
 * Narrows the L1's `IResolvable | CustomJWTAuthorizerConfigurationProperty` union to the
 * struct. buildAuthorizerConfiguration always returns a plain object, never a token.
 */
function jwtAuthorizerOf(
  result: bedrockagentcore.CfnRuntime.AuthorizerConfigurationProperty,
): bedrockagentcore.CfnRuntime.CustomJWTAuthorizerConfigurationProperty {
  return result.customJwtAuthorizer as bedrockagentcore.CfnRuntime.CustomJWTAuthorizerConfigurationProperty;
}

describe('bedrock-agentcore-runtime-utils', () => {
  describe('buildLifecycleConfiguration', () => {
    it('should build lifecycle configuration with valid timeout values', () => {
      const result = buildLifecycleConfiguration({
        idleRuntimeSessionTimeout: 300,
        maxLifetime: 3600,
      });

      expect(result).toEqual({
        idleRuntimeSessionTimeout: 300,
        maxLifetime: 3600,
      });
    });

    it('should handle partial configuration', () => {
      const result = buildLifecycleConfiguration({
        idleRuntimeSessionTimeout: 300,
      });

      expect(result).toEqual({
        idleRuntimeSessionTimeout: 300,
      });
    });

    it('should throw error for timeout below minimum', () => {
      expect(() =>
        buildLifecycleConfiguration({
          idleRuntimeSessionTimeout: 30,
        }),
      ).toThrow('IdleRuntimeSessionTimeout must be between 60 and 28800 seconds');
    });

    it('should throw error for timeout above maximum', () => {
      expect(() =>
        buildLifecycleConfiguration({
          maxLifetime: 30000,
        }),
      ).toThrow('MaxLifetime must be between 60 and 28800 seconds');
    });
  });

  describe('buildNetworkConfiguration', () => {
    it('should build VPC network configuration', () => {
      const result = buildNetworkConfiguration({
        securityGroups: ['sg-123'],
        subnets: ['subnet-123'],
      });

      expect(result).toEqual({
        networkMode: 'VPC',
        networkModeConfig: {
          securityGroups: ['sg-123'],
          subnets: ['subnet-123'],
        },
      });
    });

    it('should throw error for missing security groups', () => {
      expect(() =>
        buildNetworkConfiguration({
          subnets: ['subnet-123'],
        } as unknown as NetworkConfigurationProperty),
      ).toThrow('Agentcore "networkConfiguration.securityGroups" must contain 1-16 security group IDs.');
    });

    it('should throw error for missing subnets', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: ['sg-123'],
        } as unknown as NetworkConfigurationProperty),
      ).toThrow('Agentcore "networkConfiguration.subnets" must contain 1-16 subnet IDs.');
    });

    it('should throw error for empty security groups array', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: [],
          subnets: ['subnet-123'],
        }),
      ).toThrow('Agentcore "networkConfiguration.securityGroups" must contain 1-16 security group IDs.');
    });

    it('should throw error for empty subnets array', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: ['sg-123'],
          subnets: [],
        }),
      ).toThrow('Agentcore "networkConfiguration.subnets" must contain 1-16 subnet IDs.');
    });

    it('should throw error for too many security groups', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: Array(17).fill('sg-123'),
          subnets: ['subnet-123'],
        }),
      ).toThrow('Agentcore "networkConfiguration.securityGroups" must contain 1-16 security group IDs.');
    });

    it('should throw error for too many subnets', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: ['sg-123'],
          subnets: Array(17).fill('subnet-123'),
        }),
      ).toThrow('Agentcore "networkConfiguration.subnets" must contain 1-16 subnet IDs.');
    });
  });

  describe('buildAuthorizerConfiguration', () => {
    it('should build JWT authorizer configuration', () => {
      const result = buildAuthorizerConfiguration({
        customJwtAuthorizer: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
          allowedAudience: ['aud1', 'aud2'],
          allowedClients: ['client1'],
        },
      });

      expect(result).toEqual({
        customJwtAuthorizer: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
          allowedAudience: ['aud1', 'aud2'],
          allowedClients: ['client1'],
        },
      });
    });

    it('should support backward compatible jwtAuthorizer', () => {
      const result = buildAuthorizerConfiguration({
        jwtAuthorizer: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
        },
      });

      expect(result).toEqual({
        customJwtAuthorizer: {
          discoveryUrl: 'https://example.com/.well-known/openid-configuration',
        },
      });
    });

    it('should throw error for invalid discovery URL pattern', () => {
      expect(() =>
        buildAuthorizerConfiguration({
          customJwtAuthorizer: {
            discoveryUrl: 'https://example.com/invalid',
          },
        }),
      ).toThrow('DiscoveryUrl must match pattern');
    });

    it('should return empty config when no authorizer provided', () => {
      const result = buildAuthorizerConfiguration({});
      expect(result).toEqual({});
    });

    it('should throw when both discoveryUrl and cognito are configured', () => {
      expect(() =>
        buildAuthorizerConfiguration({
          customJwtAuthorizer: { discoveryUrl: VALID_DISCOVERY_URL, cognito: {} },
        }),
      ).toThrow(/accepts either discoveryUrl or cognito, not both/);
    });

    it('should throw when neither discoveryUrl nor cognito is configured', () => {
      expect(() => buildAuthorizerConfiguration({ customJwtAuthorizer: {} })).toThrow(
        /requires exactly one of discoveryUrl or cognito/,
      );
    });

    // The deprecated alias must not be a way around the XOR.
    it('should enforce the XOR through the deprecated jwtAuthorizer alias', () => {
      expect(() =>
        buildAuthorizerConfiguration({
          jwtAuthorizer: { discoveryUrl: VALID_DISCOVERY_URL, cognito: {} },
        }),
      ).toThrow(/accepts either discoveryUrl or cognito, not both/);
    });

    // Synth and deploy both succeed with this combination, then every caller is rejected —
    // AgentCore ANDs the claim filters and no Cognito token satisfies both.
    it('should throw when cognito is combined with allowedClients', () => {
      expect(() =>
        buildAuthorizerConfiguration({
          customJwtAuthorizer: { cognito: {}, allowedClients: ['my-client'] },
        }),
      ).toThrow(/cannot combine cognito with allowedClients/);
    });

    it('should allow allowedClients on the discoveryUrl path', () => {
      expect(() =>
        buildAuthorizerConfiguration({
          customJwtAuthorizer: { discoveryUrl: VALID_DISCOVERY_URL, allowedClients: ['my-client'] },
        }),
      ).not.toThrow();
    });

    it('should substitute the composed discovery URL and audience on the cognito path', () => {
      const result = buildAuthorizerConfiguration(
        { customJwtAuthorizer: { cognito: {} } },
        FAKE_COGNITO_AUTH as unknown as AgentcoreCognitoAuth,
      );

      expect(result).toEqual({
        customJwtAuthorizer: {
          discoveryUrl: FAKE_COGNITO_AUTH.discoveryUrl,
          allowedAudience: ['created-client-id'],
          allowedClients: undefined,
        },
      });
    });

    it('should prepend the created client to additional configured audiences', () => {
      const result = buildAuthorizerConfiguration(
        { customJwtAuthorizer: { cognito: {}, allowedAudience: ['extra-aud'] } },
        FAKE_COGNITO_AUTH as unknown as AgentcoreCognitoAuth,
      );

      expect(jwtAuthorizerOf(result).allowedAudience).toEqual(['created-client-id', 'extra-aud']);
    });

    // Cognito puts the client ID in the ID token's `aud`, and AgentCore ANDs the claim
    // filters it is given, so MDAA must not add allowedClients here.
    it('should not set allowedClients on the cognito path', () => {
      const result = buildAuthorizerConfiguration(
        { customJwtAuthorizer: { cognito: {} } },
        FAKE_COGNITO_AUTH as unknown as AgentcoreCognitoAuth,
      );

      expect(jwtAuthorizerOf(result).allowedClients).toBeUndefined();
    });

    it('should ignore cognito resources when the user supplied their own discoveryUrl', () => {
      const result = buildAuthorizerConfiguration({
        customJwtAuthorizer: { discoveryUrl: VALID_DISCOVERY_URL, allowedAudience: ['my-client'] },
      });

      expect(jwtAuthorizerOf(result).discoveryUrl).toBe(VALID_DISCOVERY_URL);
      expect(jwtAuthorizerOf(result).allowedAudience).toEqual(['my-client']);
    });
  });

  describe('resolveJwtAuthorizerConfig', () => {
    it('should prefer customJwtAuthorizer over the deprecated alias', () => {
      const resolved = resolveJwtAuthorizerConfig({
        customJwtAuthorizer: { discoveryUrl: VALID_DISCOVERY_URL },
        jwtAuthorizer: { discoveryUrl: 'https://deprecated.example.com/.well-known/openid-configuration' },
      });

      expect(resolved?.discoveryUrl).toBe(VALID_DISCOVERY_URL);
    });

    it('should fall back to the deprecated alias', () => {
      expect(resolveJwtAuthorizerConfig({ jwtAuthorizer: { cognito: {} } })?.cognito).toEqual({});
    });

    it('should return undefined when neither is set (AWS IAM)', () => {
      expect(resolveJwtAuthorizerConfig({})).toBeUndefined();
    });
  });

  describe('validateJwtAuthorizerIdpSource', () => {
    it('should accept discoveryUrl alone', () => {
      expect(() => validateJwtAuthorizerIdpSource({ discoveryUrl: VALID_DISCOVERY_URL })).not.toThrow();
    });

    it('should accept cognito alone', () => {
      expect(() => validateJwtAuthorizerIdpSource({ cognito: {} })).not.toThrow();
    });

    it('should reject both', () => {
      expect(() => validateJwtAuthorizerIdpSource({ discoveryUrl: VALID_DISCOVERY_URL, cognito: {} })).toThrow(
        /not both/,
      );
    });

    it('should reject neither', () => {
      expect(() => validateJwtAuthorizerIdpSource({})).toThrow(/exactly one of discoveryUrl or cognito/);
    });
  });

  describe('buildRequestHeaderConfiguration', () => {
    it('should build request header configuration', () => {
      const result = buildRequestHeaderConfiguration({
        requestHeaderAllowlist: ['X-Custom-Header', 'Authorization'],
      });

      expect(result).toEqual({
        requestHeaderAllowlist: ['X-Custom-Header', 'Authorization'],
      });
    });

    it('should support backward compatible allowedHeaders', () => {
      const result = buildRequestHeaderConfiguration({
        allowedHeaders: ['X-Custom-Header'],
      });

      expect(result).toEqual({
        requestHeaderAllowlist: ['X-Custom-Header'],
      });
    });

    it('should throw error for too many headers', () => {
      expect(() =>
        buildRequestHeaderConfiguration({
          requestHeaderAllowlist: Array(21).fill('header'),
        }),
      ).toThrow('RequestHeaderAllowlist (or AllowedHeaders) must contain 1-20 items');
    });

    it('should return empty config when no headers provided', () => {
      const result = buildRequestHeaderConfiguration({});
      expect(result).toEqual({});
    });
  });

  describe('sanitizeBedrockAgentcoreName', () => {
    it('should replace hyphens with underscores', () => {
      expect(sanitizeBedrockAgentcoreName('my-runtime-name')).toBe('my_runtime_name');
    });

    it('should add default prefix if name starts with number', () => {
      expect(sanitizeBedrockAgentcoreName('123runtime')).toBe('r_123runtime');
    });

    it('should add custom prefix if name starts with number', () => {
      expect(sanitizeBedrockAgentcoreName('123endpoint', 'endpoint_')).toBe('endpoint_123endpoint');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeBedrockAgentcoreName('my@runtime#name')).toBe('my_runtime_name');
    });

    it('should handle valid names without changes', () => {
      expect(sanitizeBedrockAgentcoreName('myRuntime123')).toBe('myRuntime123');
    });

    it('should not truncate long names', () => {
      const longName = 'a'.repeat(60);
      const result = sanitizeBedrockAgentcoreName(longName);
      expect(result.length).toBe(60);
      expect(result).toBe(longName);
    });

    it('should handle names with multiple special characters', () => {
      expect(sanitizeBedrockAgentcoreName('my-runtime@2024#v1')).toBe('my_runtime_2024_v1');
    });

    it('should handle names starting with underscore', () => {
      expect(sanitizeBedrockAgentcoreName('_runtime')).toBe('r__runtime');
    });

    it('should handle names starting with underscore with custom prefix', () => {
      expect(sanitizeBedrockAgentcoreName('_endpoint', 'endpoint_')).toBe('endpoint__endpoint');
    });

    it('should preserve underscores in the middle of names', () => {
      expect(sanitizeBedrockAgentcoreName('my_runtime_name')).toBe('my_runtime_name');
    });
  });

  describe('extractCustomPolicyStatements', () => {
    it('should extract policy statements from policy documents', () => {
      const policies = [
        {
          policyDocument: {
            Statement: [
              {
                Sid: 'TestStatement',
                Effect: 'Allow' as const,
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
        },
      ];

      const result = extractCustomPolicyStatements(policies);
      expect(result).toHaveLength(1);
      expect(result[0].sid).toBe('TestStatement');
    });

    it('should handle array actions and resources', () => {
      const policies = [
        {
          policyDocument: {
            Statement: [
              {
                Effect: 'Allow' as const,
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: ['arn:aws:s3:::bucket1/*', 'arn:aws:s3:::bucket2/*'],
              },
            ],
          },
        },
      ];

      const result = extractCustomPolicyStatements(policies);
      expect(result).toHaveLength(1);
    });

    it('should flatten multiple policy documents', () => {
      const policies = [
        {
          policyDocument: {
            Statement: [
              {
                Effect: 'Allow' as const,
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
        },
        {
          policyDocument: {
            Statement: [
              {
                Effect: 'Deny' as const,
                Action: 's3:DeleteObject',
                Resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
        },
      ];

      const result = extractCustomPolicyStatements(policies);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for undefined policies', () => {
      const result = extractCustomPolicyStatements(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out policies without statements', () => {
      const policies = [
        {
          policyArn: 'arn:aws:iam::aws:policy/SomePolicy',
        },
      ];

      const result = extractCustomPolicyStatements(policies);
      expect(result).toEqual([]);
    });
  });
});
