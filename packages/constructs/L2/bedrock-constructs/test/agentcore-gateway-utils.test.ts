/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildInterceptorConfigurations,
  buildProtocolConfiguration,
  sanitizeGatewayName,
  validateInterceptorConfigurations,
} from '../lib';

describe('sanitizeGatewayName', () => {
  test('converts underscores to hyphens', () => {
    expect(sanitizeGatewayName('my_gateway_01')).toBe('my-gateway-01');
  });

  test('collapses runs of separators and strips leading/trailing hyphens', () => {
    expect(sanitizeGatewayName('--my__gateway..name--')).toBe('my-gateway-name');
  });

  test('output matches the gateway name pattern', () => {
    const result = sanitizeGatewayName('Org_Env_Domain_Gateway');
    expect(result).toMatch(/^([0-9a-zA-Z][-]?){1,100}$/);
  });

  test('throws when no alphanumeric characters remain', () => {
    expect(() => sanitizeGatewayName('___')).toThrow(/Unable to derive a valid/);
  });
});

describe('buildProtocolConfiguration', () => {
  test('returns undefined when no MCP config is provided', () => {
    expect(buildProtocolConfiguration(undefined)).toBeUndefined();
  });

  test('maps MCP fields into the typed protocol configuration', () => {
    const result = buildProtocolConfiguration({
      instructions: 'do things',
      searchType: 'SEMANTIC',
      supportedVersions: ['2025-06-18'],
    });
    expect(result).toEqual({
      mcp: { instructions: 'do things', searchType: 'SEMANTIC', supportedVersions: ['2025-06-18'] },
    });
  });

  test('renders a non-semantic gateway by omitting searchType (no NONE value exists)', () => {
    // With searchType omitted the config still renders (instructions only) and searchType stays
    // undefined so CloudFormation omits it — the service's non-semantic form.
    expect(buildProtocolConfiguration({ instructions: 'do things' })).toEqual({
      mcp: { instructions: 'do things', searchType: undefined, supportedVersions: undefined },
    });
  });

  test('throws on searchType NONE (the service accepts only SEMANTIC)', () => {
    // NONE is a common mistake — the AgentCore API has no NONE enum; omit the field instead.
    // Cast to bypass the 'SEMANTIC'-only type and exercise the runtime backstop.
    expect(() => buildProtocolConfiguration({ searchType: 'NONE' as unknown as 'SEMANTIC' })).toThrow(
      /Invalid searchType/,
    );
  });

  test('throws on an invalid searchType', () => {
    // searchType is typed as the 'SEMANTIC' literal (rendered as a JSON-schema enum), so a bad value
    // is rejected at compile time / config-schema validation. The runtime check is the backstop for
    // any untyped caller; cast to exercise it.
    expect(() => buildProtocolConfiguration({ searchType: 'semantic' as unknown as 'SEMANTIC' })).toThrow(
      /Invalid searchType/,
    );
  });
});

describe('buildInterceptorConfigurations', () => {
  test('returns undefined when no interceptors are provided', () => {
    expect(buildInterceptorConfigurations(undefined)).toBeUndefined();
    expect(buildInterceptorConfigurations([])).toBeUndefined();
  });

  test('defaults passRequestHeaders to false', () => {
    const result = buildInterceptorConfigurations([
      { interceptionPoints: ['REQUEST'], lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:a' },
    ]);
    expect(result![0].inputConfiguration).toEqual({ passRequestHeaders: false });
  });

  test('throws on more than 2 interceptors', () => {
    expect(() =>
      buildInterceptorConfigurations([
        { interceptionPoints: ['REQUEST'], lambdaArn: 'arn:a' },
        { interceptionPoints: ['RESPONSE'], lambdaArn: 'arn:b' },
        { interceptionPoints: ['REQUEST'], lambdaArn: 'arn:c' },
      ]),
    ).toThrow(/at most 2 interceptors/);
  });
});

describe('validateInterceptorConfigurations', () => {
  test('accepts undefined / empty / valid interceptors', () => {
    expect(() => validateInterceptorConfigurations(undefined)).not.toThrow();
    expect(() => validateInterceptorConfigurations([])).not.toThrow();
    expect(() =>
      validateInterceptorConfigurations([{ interceptionPoints: ['REQUEST'] }, { interceptionPoints: ['RESPONSE'] }]),
    ).not.toThrow();
  });

  test('throws on more than 2 interceptors', () => {
    expect(() =>
      validateInterceptorConfigurations([
        { interceptionPoints: ['REQUEST'] },
        { interceptionPoints: ['RESPONSE'] },
        { interceptionPoints: ['REQUEST'] },
      ]),
    ).toThrow(/at most 2 interceptors/);
  });

  test('throws on a duplicate interception point', () => {
    expect(() =>
      validateInterceptorConfigurations([{ interceptionPoints: ['REQUEST'] }, { interceptionPoints: ['REQUEST'] }]),
    ).toThrow(/at most one REQUEST/);
  });

  test('throws on an invalid interception point', () => {
    expect(() => validateInterceptorConfigurations([{ interceptionPoints: ['BOGUS'] }])).toThrow(
      /Invalid interceptionPoint/,
    );
  });

  test('throws on an empty interception-points list', () => {
    expect(() => validateInterceptorConfigurations([{ interceptionPoints: [] }])).toThrow(
      /at least one interceptionPoint/,
    );
  });
});
