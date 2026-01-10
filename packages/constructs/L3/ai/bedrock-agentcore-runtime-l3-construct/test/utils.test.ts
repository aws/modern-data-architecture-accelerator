/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildAuthorizerConfiguration,
  buildLifecycleConfiguration,
  buildNetworkConfiguration,
  buildRequestHeaderConfiguration,
  extractCustomPolicyStatements,
  NetworkConfigurationProperty,
  sanitizeBedrockAgentcoreName,
} from '../lib';

describe('bedrock-agentcore-runtime-utils', () => {
  describe('buildLifecycleConfiguration', () => {
    it('should build lifecycle configuration with valid timeout values', () => {
      const result = buildLifecycleConfiguration({
        idleRuntimeSessionTimeout: 300,
        maxLifetime: 3600,
      });

      expect(result).toEqual({
        IdleRuntimeSessionTimeout: 300,
        MaxLifetime: 3600,
      });
    });

    it('should handle partial configuration', () => {
      const result = buildLifecycleConfiguration({
        idleRuntimeSessionTimeout: 300,
      });

      expect(result).toEqual({
        IdleRuntimeSessionTimeout: 300,
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
        NetworkMode: 'VPC',
        NetworkModeConfig: {
          SecurityGroups: ['sg-123'],
          Subnets: ['subnet-123'],
        },
      });
    });

    it('should throw error for missing security groups', () => {
      expect(() =>
        buildNetworkConfiguration({
          subnets: ['subnet-123'],
        } as unknown as NetworkConfigurationProperty),
      ).toThrow('securityGroups is required in networkConfiguration');
    });

    it('should throw error for missing subnets', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: ['sg-123'],
        } as unknown as NetworkConfigurationProperty),
      ).toThrow('subnets is required in networkConfiguration');
    });

    it('should throw error for too many security groups', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: Array(17).fill('sg-123'),
          subnets: ['subnet-123'],
        }),
      ).toThrow('securityGroups must be an array with 1-16 items');
    });

    it('should throw error for too many subnets', () => {
      expect(() =>
        buildNetworkConfiguration({
          securityGroups: ['sg-123'],
          subnets: Array(17).fill('subnet-123'),
        }),
      ).toThrow('subnets must be an array with 1-16 items');
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
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://example.com/.well-known/openid-configuration',
          AllowedAudience: ['aud1', 'aud2'],
          AllowedClients: ['client1'],
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
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://example.com/.well-known/openid-configuration',
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
  });

  describe('buildRequestHeaderConfiguration', () => {
    it('should build request header configuration', () => {
      const result = buildRequestHeaderConfiguration({
        requestHeaderAllowlist: ['X-Custom-Header', 'Authorization'],
      });

      expect(result).toEqual({
        RequestHeaderAllowlist: ['X-Custom-Header', 'Authorization'],
      });
    });

    it('should support backward compatible allowedHeaders', () => {
      const result = buildRequestHeaderConfiguration({
        allowedHeaders: ['X-Custom-Header'],
      });

      expect(result).toEqual({
        RequestHeaderAllowlist: ['X-Custom-Header'],
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
