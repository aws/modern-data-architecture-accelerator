/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GatewayExceptionLevel, MdaaAgentcoreGateway, MdaaAgentcoreGatewayProps } from '../lib';

// Fixture ARNs use the mdaa-testing placeholder partition/region/account (test-partition /
// test-region / 111111111111) rather than real values, per the testing standard for
// region-bearing values.
const ROLE_ARN = 'arn:test-partition:iam::111111111111:role/gateway-execution-role';
const KMS_KEY_ARN = 'arn:test-partition:kms:test-region:111111111111:key/1234abcd-12ab-34cd-56ef-1234567890ab';
const INTERCEPTOR_ARN = 'arn:test-partition:lambda:test-region:111111111111:function:req';

function baseProps(
  testApp: MdaaTestApp,
  overrides: Partial<MdaaAgentcoreGatewayProps> = {},
): MdaaAgentcoreGatewayProps {
  return {
    naming: testApp.naming,
    gatewayName: 'test-gateway',
    roleArn: ROLE_ARN,
    kmsKeyArn: KMS_KEY_ARN,
    authorizerType: 'AWS_IAM',
    ...overrides,
  };
}

describe('MdaaAgentcoreGateway', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('creates exactly one gateway with the resolved role/KMS ARNs and MCP protocol', () => {
    new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp));
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('AWS::BedrockAgentCore::Gateway', 1);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      AuthorizerType: 'AWS_IAM',
      ProtocolType: 'MCP',
      RoleArn: ROLE_ARN,
      KmsKeyArn: KMS_KEY_ARN,
    });
  });

  test('renders the supplied CUSTOM_JWT authorizer configuration', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, {
        authorizerType: 'CUSTOM_JWT',
        authorizerConfiguration: {
          customJwtAuthorizer: {
            discoveryUrl: 'https://example.com/.well-known/openid-configuration',
            allowedAudience: ['my-audience'],
          },
        },
      }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      AuthorizerType: 'CUSTOM_JWT',
      AuthorizerConfiguration: {
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://example.com/.well-known/openid-configuration',
          AllowedAudience: ['my-audience'],
        },
      },
    });
  });

  test('MDAA-names and sanitizes the gateway name to the hyphen pattern (no underscores), capped at 48 chars', () => {
    new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp, { gatewayName: 'my_gateway_01' }));
    const template = Template.fromStack(testApp.testStack);
    const name = Object.values(template.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties.Name as string;
    expect(name).not.toContain('_');
    // The service enforces ^([0-9a-zA-Z][-]?){1,48}$ at runtime (CreateGateway) — a longer name is
    // rejected and rolls the stack back — so the rendered name must satisfy the 48-char pattern.
    expect(name).toMatch(/^([0-9a-zA-Z][-]?){1,48}$/);
    expect(name.length).toBeLessThanOrEqual(48);

    // The MDAA naming prefix (org/env/domain/module from props.naming) must be applied to the
    // rendered Name — not just the user-supplied gatewayName. Guards against a regression that
    // drops MDAA naming (which would still satisfy the character pattern above). The full
    // org-env-domain-module-gateway name exceeds 48 chars, so the naming service truncates it and
    // appends a stable hash suffix — the leading prefix segments survive and the tail is the hash.
    expect(name.startsWith('test-org-test-env-test-domain-test-mod')).toBe(true);
    expect(name).toMatch(/-[0-9a-f]+$/);
  });

  test('throws when kmsKeyArn is empty (CMK is always required — compliance invariant)', () => {
    expect(() => new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp, { kmsKeyArn: '' }))).toThrow(
      /customer-managed KMS CMK/,
    );
  });

  test('rejects a disallowed authorizerType (NONE / AUTHENTICATE_ONLY are not permitted)', () => {
    expect(
      () => new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp, { authorizerType: 'NONE' })),
    ).toThrow(/authorizerType must be one of/);
    expect(
      () =>
        new MdaaAgentcoreGateway(
          testApp.testStack,
          'GatewayB',
          baseProps(testApp, { authorizerType: 'AUTHENTICATE_ONLY' }),
        ),
    ).toThrow(/authorizerType must be one of/);
  });

  test('renders SEMANTIC search onto the protocol configuration', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, { protocolConfiguration: { searchType: 'SEMANTIC' } }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      ProtocolConfiguration: { Mcp: Match.objectLike({ SearchType: 'SEMANTIC' }) },
    });
  });

  test('renders MCP instructions and supportedVersions onto the protocol configuration', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, {
        protocolConfiguration: { instructions: 'Use these tools', supportedVersions: ['2025-06-18'] },
      }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      ProtocolConfiguration: {
        Mcp: Match.objectLike({ Instructions: 'Use these tools', SupportedVersions: ['2025-06-18'] }),
      },
    });
  });

  test('throws on an invalid searchType', () => {
    expect(
      () =>
        new MdaaAgentcoreGateway(
          testApp.testStack,
          'Gateway',
          // searchType is the 'SEMANTIC' literal (schema enum); cast to exercise the runtime
          // backstop that guards untyped/YAML callers passing an out-of-range value.
          baseProps(testApp, { protocolConfiguration: { searchType: 'semantic' as unknown as 'SEMANTIC' } }),
        ),
    ).toThrow(/Invalid searchType/);
  });

  test('renders exceptionLevel DEBUG', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, { exceptionLevel: GatewayExceptionLevel.DEBUG }),
    );
    const props = Object.values(
      Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Gateway'),
    )[0].Properties;
    expect(props.ExceptionLevel).toBe('DEBUG');
  });

  test('rejects an exceptionLevel outside the enum', () => {
    expect(
      () =>
        new MdaaAgentcoreGateway(
          testApp.testStack,
          'Gateway',
          // exceptionLevel is the GatewayExceptionLevel enum (schema-validated); cast to exercise the
          // runtime backstop that guards untyped/YAML callers passing an out-of-range value.
          baseProps(testApp, { exceptionLevel: 'INFO' as unknown as GatewayExceptionLevel }),
        ),
    ).toThrow(/Invalid exceptionLevel/);
  });

  test('rejects a description outside 1-200 characters', () => {
    expect(
      () =>
        new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp, { description: 'x'.repeat(201) })),
    ).toThrow(/between 1 and 200 characters/);
    expect(
      () => new MdaaAgentcoreGateway(testApp.testStack, 'GatewayB', baseProps(testApp, { description: '' })),
    ).toThrow(/between 1 and 200 characters/);
  });

  test('renders a valid description onto the gateway', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, { description: 'MCP gateway for tools' }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', { Description: 'MCP gateway for tools' });
  });

  test('wires resolved interceptors onto the gateway with default passRequestHeaders=false', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, {
        interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: INTERCEPTOR_ARN }],
      }),
    );
    const cfg = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Gateway'))[0]
      .Properties.InterceptorConfigurations[0];
    expect(cfg.InterceptionPoints).toEqual(['REQUEST']);
    expect(cfg.InputConfiguration).toEqual({ PassRequestHeaders: false });
    expect(cfg.Interceptor.Lambda.Arn).toBe(INTERCEPTOR_ARN);
  });

  test('renders passRequestHeaders=true onto the interceptor when explicitly set', () => {
    new MdaaAgentcoreGateway(
      testApp.testStack,
      'Gateway',
      baseProps(testApp, {
        interceptors: [
          {
            interceptionPoints: ['REQUEST'],
            passRequestHeaders: true,
            lambdaArn: INTERCEPTOR_ARN,
          },
        ],
      }),
    );
    const cfg = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Gateway'))[0]
      .Properties.InterceptorConfigurations[0];
    expect(cfg.InputConfiguration).toEqual({ PassRequestHeaders: true });
  });

  test('throws when more than two interceptors are supplied', () => {
    expect(
      () =>
        new MdaaAgentcoreGateway(
          testApp.testStack,
          'Gateway',
          baseProps(testApp, {
            interceptors: [
              { interceptionPoints: ['REQUEST'], lambdaArn: 'arn:a' },
              { interceptionPoints: ['RESPONSE'], lambdaArn: 'arn:b' },
              { interceptionPoints: ['REQUEST'], lambdaArn: 'arn:c' },
            ],
          }),
        ),
    ).toThrow(/at most 2 interceptors/);
  });

  test('publishes SSM parameters for the gateway arn, id, and url, each sourced from the correct attribute', () => {
    new MdaaAgentcoreGateway(testApp.testStack, 'Gateway', baseProps(testApp));
    const params = Template.fromStack(testApp.testStack).findResources('AWS::SSM::Parameter');
    const paramValueFor = (suffix: string) =>
      JSON.stringify(
        Object.values(params).find(p => (p.Properties.Name as string).endsWith(`/${suffix}`))!.Properties.Value,
      );

    // Each param exists and its value is sourced from the correct CfnGateway attribute (Fn::GetAtt),
    // so a regression that swaps or drops an attribute is caught — not just the name suffix.
    expect(paramValueFor('arn')).toContain('GatewayArn');
    expect(paramValueFor('id')).toContain('GatewayIdentifier');
    expect(paramValueFor('url')).toContain('GatewayUrl');
  });
});
