/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildCustomJwtAuthorizer, resolveAuthorizerType, validateCustomJwtAuthorizer } from '../lib';

const VALID_DISCOVERY_URL = 'https://example.com/.well-known/openid-configuration';

describe('resolveAuthorizerType', () => {
  it('resolves customJwt to CUSTOM_JWT', () => {
    expect(resolveAuthorizerType({ customJwt: { discoveryUrl: VALID_DISCOVERY_URL } })).toBe('CUSTOM_JWT');
  });

  it('falls back to AWS_IAM when customJwt is omitted', () => {
    expect(resolveAuthorizerType({})).toBe('AWS_IAM');
  });

  it('falls back to AWS_IAM when config is undefined', () => {
    expect(resolveAuthorizerType()).toBe('AWS_IAM');
  });
});

describe('validateCustomJwtAuthorizer', () => {
  it('accepts a valid discoveryUrl', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL })).not.toThrow();
  });

  it('throws when discoveryUrl is missing', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: '' })).toThrow(/DiscoveryUrl is required/);
  });

  it('throws when discoveryUrl does not match the OIDC pattern', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: 'https://example.com/invalid' })).toThrow(
      /DiscoveryUrl must match pattern/,
    );
  });

  it('does not require allowedAudience or allowedClients', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL })).not.toThrow();
  });
});

describe('buildCustomJwtAuthorizer', () => {
  it('maps discoveryUrl, allowedAudience, and allowedClients', () => {
    expect(
      buildCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedAudience: ['aud1', 'aud2'],
        allowedClients: ['client1'],
      }),
    ).toEqual({
      discoveryUrl: VALID_DISCOVERY_URL,
      allowedAudience: ['aud1', 'aud2'],
      allowedClients: ['client1'],
    });
  });

  it('omits empty allowedAudience and allowedClients', () => {
    const result = buildCustomJwtAuthorizer({
      discoveryUrl: VALID_DISCOVERY_URL,
      allowedAudience: [],
      allowedClients: [],
    });
    expect(result.allowedAudience).toBeUndefined();
    expect(result.allowedClients).toBeUndefined();
    expect(result.discoveryUrl).toBe(VALID_DISCOVERY_URL);
  });

  it('validates before building (throws on bad discoveryUrl)', () => {
    expect(() => buildCustomJwtAuthorizer({ discoveryUrl: 'https://example.com/invalid' })).toThrow(
      /DiscoveryUrl must match pattern/,
    );
  });
});
