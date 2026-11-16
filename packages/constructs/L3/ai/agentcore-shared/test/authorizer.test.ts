/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token } from 'aws-cdk-lib';
import {
  buildCustomJwtAuthorizer,
  resolveAuthorizerType,
  validateCustomJwtAuthorizer,
  validateJwtRestrictionEntries,
} from '../lib';

const VALID_DISCOVERY_URL = 'https://example.com/.well-known/openid-configuration';

describe('resolveAuthorizerType', () => {
  it('resolves customJwt to CUSTOM_JWT', () => {
    expect(resolveAuthorizerType({ customJwt: { discoveryUrl: VALID_DISCOVERY_URL, allowedAudience: ['aud'] } })).toBe(
      'CUSTOM_JWT',
    );
  });

  it('falls back to AWS_IAM when customJwt is omitted', () => {
    expect(resolveAuthorizerType({})).toBe('AWS_IAM');
  });

  it('falls back to AWS_IAM when config is undefined', () => {
    expect(resolveAuthorizerType()).toBe('AWS_IAM');
  });
});

describe('validateCustomJwtAuthorizer', () => {
  it('accepts a valid discoveryUrl with a token restriction', () => {
    expect(() =>
      validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL, allowedAudience: ['aud'] }),
    ).not.toThrow();
  });

  it('throws when discoveryUrl is missing', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: '', allowedAudience: ['aud'] })).toThrow(
      /DiscoveryUrl is required/,
    );
  });

  it('throws when discoveryUrl does not match the OIDC pattern', () => {
    expect(() =>
      validateCustomJwtAuthorizer({ discoveryUrl: 'https://example.com/invalid', allowedAudience: ['aud'] }),
    ).toThrow(/DiscoveryUrl must match pattern/);
  });

  it('throws when neither allowedAudience nor allowedClients is set', () => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL })).toThrow(
      /must restrict which tokens it accepts/,
    );
  });

  it('treats empty lists as unset', () => {
    expect(() =>
      validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL, allowedAudience: [], allowedClients: [] }),
    ).toThrow(/must restrict which tokens it accepts/);
  });

  it.each([
    ['allowedAudience', { allowedAudience: ['aud'] }],
    ['allowedClients', { allowedClients: ['client'] }],
  ])('accepts %s alone as the restriction', (_name, restriction) => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL, ...restriction })).not.toThrow();
  });

  it.each([
    ['allowedAudience', ''],
    ['allowedAudience', '  '],
    ['allowedClients', ''],
    ['allowedClients', '  '],
  ] as const)('rejects a blank %s entry %p', (field, blank) => {
    expect(() => validateCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL, [field]: ['ok', blank] })).toThrow(
      `"${field}[1]" must be a non-blank string`,
    );
  });

  // YAML and jsii callers can pass null where the types say string[] or string.
  const yamlNull = null as unknown as string[];

  it('treats a null list as unset', () => {
    expect(() =>
      validateCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedAudience: yamlNull,
        allowedClients: ['c'],
      }),
    ).not.toThrow();
    expect(() =>
      validateCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedAudience: yamlNull,
        allowedClients: yamlNull,
      }),
    ).toThrow(/must restrict which tokens it accepts/);
  });

  it.each([
    ['null', null],
    ['a number', 12345],
  ])('rejects a %s entry', (_name, entry) => {
    expect(() =>
      validateCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedClients: [entry as unknown as string],
      }),
    ).toThrow('"allowedClients[0]" must be a non-blank string');
  });

  it('accepts an ssm: dynamic reference entry', () => {
    expect(() =>
      validateCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedAudience: ['{{resolve:ssm:/org/client-id}}'],
      }),
    ).not.toThrow();
  });

  it('accepts an unresolved token entry', () => {
    expect(() =>
      validateCustomJwtAuthorizer({
        discoveryUrl: VALID_DISCOVERY_URL,
        allowedAudience: [Token.asString({ Ref: 'AppClient' })],
      }),
    ).not.toThrow();
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

  it.each<['allowedAudience' | 'allowedClients', 'allowedAudience' | 'allowedClients']>([
    ['allowedClients', 'allowedAudience'],
    ['allowedAudience', 'allowedClients'],
  ])('omits an empty %s alongside a configured %s', (emptyField, configuredField) => {
    const result = buildCustomJwtAuthorizer({
      discoveryUrl: VALID_DISCOVERY_URL,
      [emptyField]: [],
      [configuredField]: ['value'],
    });
    expect(result[emptyField]).toBeUndefined();
    expect(result[configuredField]).toEqual(['value']);
    expect(result.discoveryUrl).toBe(VALID_DISCOVERY_URL);
  });

  it('validates before building', () => {
    expect(() => buildCustomJwtAuthorizer({ discoveryUrl: 'https://example.com/invalid' })).toThrow(
      /DiscoveryUrl must match pattern/,
    );
    expect(() => buildCustomJwtAuthorizer({ discoveryUrl: VALID_DISCOVERY_URL })).toThrow(
      /must restrict which tokens it accepts/,
    );
  });
});

describe('validateJwtRestrictionEntries', () => {
  it('accepts absent and non-blank lists', () => {
    expect(() => validateJwtRestrictionEntries()).not.toThrow();
    expect(() => validateJwtRestrictionEntries(['aud'], ['client'])).not.toThrow();
  });

  it.each([
    ['allowedAudience', [' '], undefined],
    ['allowedClients', undefined, [' ']],
  ])('names the blank %s entry', (field, audience, clients) => {
    expect(() => validateJwtRestrictionEntries(audience, clients)).toThrow(`"${field}[0]" must be a non-blank string`);
  });
});
