/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  BedrockAgentcoreGatewayL3Construct,
  BedrockAgentcoreGatewayL3ConstructProps,
  GatewayInterceptorConfigurationsProperty,
} from '../lib';

describe('BedrockAgentcoreGatewayL3Construct Exception Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  function build(props: Partial<BedrockAgentcoreGatewayL3ConstructProps>): () => void {
    return () =>
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
        gatewayName: 'test-gateway',
        authorizerConfiguration: {
          customJwt: {
            discoveryUrl: 'https://example.com/.well-known/openid-configuration',
            allowedAudience: ['aud'],
          },
        },
        kmsKey: new Key(testApp.testStack, 'GwKey', { enableKeyRotation: true }),
        naming: testApp.naming,
        roleHelper,
        ...props,
      });
  }

  // Interceptor with an inline function definition. Interceptor count/point validation runs
  // fail-fast (before any function is built), so these exception cases need no fromAsset mock.
  // interceptionPoints is typed as string[] (not the ('REQUEST'|'RESPONSE')[] union of the prop) so
  // the negative 'invalid interception point' case can pass 'BOGUS' to exercise the runtime backstop;
  // the return is cast to the prop type accordingly.
  function lambdaFn(interceptionPoints: string[], functionName: string): GatewayInterceptorConfigurationsProperty {
    return {
      interceptionPoints,
      lambdaFunction: {
        functionName,
        srcDir: __dirname,
        handler: 'index.handler',
        runtime: 'python3.12',
        roleArn: 'arn:aws:iam::123456789012:role/interceptor-fn-role',
      },
    } as unknown as GatewayInterceptorConfigurationsProperty;
  }

  test('description exceeding 200 characters throws', () => {
    expect(build({ description: 'x'.repeat(201) })).toThrow(/between 1 and 200 characters/);
  });

  test('empty description throws', () => {
    expect(build({ description: '' })).toThrow(/between 1 and 200 characters/);
  });

  test('invalid searchType throws', () => {
    // searchType is the 'SEMANTIC' literal (schema enum); cast to exercise the runtime backstop for
    // untyped/YAML callers passing an out-of-range value.
    expect(build({ protocolConfiguration: { searchType: 'semantic' as unknown as 'SEMANTIC' } })).toThrow(
      /Invalid searchType/,
    );
  });

  test('invalid logDelivery.logRetentionDays throws at synth (not deploy)', () => {
    // 45 is not a valid CloudWatch Logs RetentionDays value — fail fast rather than at deploy.
    expect(build({ logDelivery: { logRetentionDays: 45 } })).toThrow(/Invalid logDelivery.logRetentionDays '45'/);
  });

  test('valid logDelivery.logRetentionDays does not throw', () => {
    // 90 (RetentionDays.THREE_MONTHS) is valid.
    expect(build({ logDelivery: { logRetentionDays: 90 } })).not.toThrow();
  });

  test('JWT with an invalid discoveryUrl throws', () => {
    expect(
      build({
        authorizerConfiguration: {
          customJwt: { discoveryUrl: 'https://example.com/not-openid' },
        },
      }),
    ).toThrow(/DiscoveryUrl must match pattern/);
  });

  test('more than 2 interceptors throws', () => {
    expect(
      build({
        interceptors: [lambdaFn(['REQUEST'], 'a'), lambdaFn(['RESPONSE'], 'b'), lambdaFn(['REQUEST'], 'c')],
      }),
    ).toThrow(/at most 2 interceptors/);
  });

  test('two interceptors of the same interception point throws', () => {
    expect(
      build({
        interceptors: [lambdaFn(['REQUEST'], 'a'), lambdaFn(['REQUEST'], 'b')],
      }),
    ).toThrow(/at most one REQUEST/);
  });

  test('invalid interception point throws', () => {
    expect(
      build({
        interceptors: [lambdaFn(['BOGUS'], 'a')],
      }),
    ).toThrow(/Invalid interceptionPoint/);
  });

  test('an interceptor setting both lambdaFunction and lambdaArn throws', () => {
    expect(
      build({
        interceptors: [
          {
            ...lambdaFn(['REQUEST'], 'a'),
            lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:already-deployed',
          },
        ],
      }),
    ).toThrow(/must set exactly one of "lambdaFunction" \(inline\) or "lambdaArn" \(by-ref\); received both/);
  });

  test('an interceptor setting neither lambdaFunction nor lambdaArn throws', () => {
    expect(
      build({
        // Neither Lambda source — cast through unknown since the type wants at least one.
        interceptors: [{ interceptionPoints: ['REQUEST'] }],
      } as unknown as Partial<BedrockAgentcoreGatewayL3ConstructProps>),
    ).toThrow(/must set exactly one of "lambdaFunction" \(inline\) or "lambdaArn" \(by-ref\); received neither/);
  });

  test('gateway name with no alphanumeric characters is rejected at synth', () => {
    // Rejected either by MDAA naming validation (prefixed name fails the resource-name pattern)
    // or by the gateway name sanitizer — both prevent an invalid gateway name from synthesizing.
    expect(build({ gatewayName: '___' })).toThrow(/Unable to derive a valid|Invalid string format/);
  });

  test('a gateway target missing its toolSchema is rejected fail-fast by the constructor', () => {
    // Exercises the createTargets fail-fast validateTargetConfiguration loop: an invalid target must
    // throw from the L3 constructor before any target resource is built.
    expect(
      build({
        // Deliberately invalid target shape (missing toolSchema) — cast through unknown.
        targets: {
          weather: {
            targetConfiguration: {
              lambda: {
                lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:weather-tool',
              },
            },
          },
        },
      } as unknown as Partial<BedrockAgentcoreGatewayL3ConstructProps>),
    ).toThrow(/Gateway target "weather" is missing toolSchema/);
  });

  test('a gateway target missing its lambdaArn is rejected fail-fast by the constructor', () => {
    expect(
      build({
        // Deliberately invalid target shape (missing lambdaArn) — cast through unknown.
        targets: {
          weather: {
            targetConfiguration: {
              lambda: {
                toolSchema: { inlinePayload: [{ name: 't', description: 'd', inputSchema: { type: 'object' } }] },
              },
            },
          },
        },
      } as unknown as Partial<BedrockAgentcoreGatewayL3ConstructProps>),
    ).toThrow(/Gateway target "weather" must define a lambda tool source with a lambdaArn/);
  });

  test('a gateway target with a not-yet-supported target type is rejected fail-fast by the constructor', () => {
    expect(
      build({
        // Declared target type MDAA does not yet build — cast through unknown.
        targets: {
          weather: {
            targetConfiguration: { mcpServer: { endpoint: 'https://example.com/mcp' } },
          },
        },
      } as unknown as Partial<BedrockAgentcoreGatewayL3ConstructProps>),
    ).toThrow(/uses target type "mcpServer", which is not yet supported; only lambda is currently supported/);
  });

  test('two target keys that collapse to the same target name are rejected, naming both keys', () => {
    // `my_tool` and `my-tool` are distinct construct ids but sanitize to the same target name.
    // The service requires target names unique within a gateway, so this must throw at synth
    // rather than fail at deploy with a ConflictException.
    const validTarget = (fn: string) => ({
      targetConfiguration: {
        lambda: {
          lambdaArn: `arn:test-partition:lambda:test-region:111111111111:function:${fn}`,
          toolSchema: { inlinePayload: [{ name: 't', description: 'd', inputSchema: { type: 'object' } }] },
        },
      },
    });
    expect(
      build({
        targets: { my_tool: validTarget('a'), 'my-tool': validTarget('b') },
      }),
    ).toThrow(/Gateway target names collide: keys "my_tool" and "my-tool" both resolve to target name/);
  });
});
