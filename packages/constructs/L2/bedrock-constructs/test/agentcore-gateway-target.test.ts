/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  GatewayTargetConfigurationProperty,
  GatewayTargetCredentialProviderType,
  GatewayTargetProps,
  MdaaAgentcoreGatewayTarget,
  MdaaAgentcoreGatewayTargetProps,
} from '../lib';

// Input reference to an external Lambda — uses the mdaa-testing placeholder partition/region/account
// (test-partition / test-region / 111111111111) per the testing standard for region-bearing values.
const LAMBDA_ARN = 'arn:test-partition:lambda:test-region:111111111111:function:my-tool';
const GATEWAY_IDENTIFIER = 'my-gateway-a1b2c3d4e5';

// A default inline Lambda tool source, overridable per test.
function lambdaConfiguration(
  overrides: Partial<GatewayTargetConfigurationProperty> = {},
): GatewayTargetConfigurationProperty {
  return {
    lambda: {
      lambdaArn: LAMBDA_ARN,
      toolSchema: {
        inlinePayload: [
          {
            name: 'getWeather',
            description: 'Returns the weather for a city',
            inputSchema: {
              type: 'object',
              properties: { city: { type: 'string', description: 'City name' } },
              required: ['city'],
            },
          },
        ],
      },
    },
    ...overrides,
  };
}

function lambdaTargetConfig(overrides: Partial<GatewayTargetProps> = {}): GatewayTargetProps {
  return {
    targetConfiguration: lambdaConfiguration(),
    ...overrides,
  };
}

function baseProps(
  testApp: MdaaTestApp,
  overrides: Partial<MdaaAgentcoreGatewayTargetProps> = {},
): MdaaAgentcoreGatewayTargetProps {
  return {
    naming: testApp.naming,
    targetName: 'weather',
    targetConfig: lambdaTargetConfig(),
    gatewayIdentifier: GATEWAY_IDENTIFIER,
    ...overrides,
  };
}

describe('MdaaAgentcoreGatewayTarget', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('creates exactly one Lambda GatewayTarget referencing the gateway with GATEWAY_IAM_ROLE credential', () => {
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp));
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 1);
    template.hasResourceProperties('AWS::BedrockAgentCore::GatewayTarget', {
      GatewayIdentifier: GATEWAY_IDENTIFIER,
      CredentialProviderConfigurations: [{ CredentialProviderType: 'GATEWAY_IAM_ROLE' }],
      TargetConfiguration: {
        Mcp: { Lambda: Match.objectLike({ LambdaArn: LAMBDA_ARN }) },
      },
    });
  });

  test('MDAA-names and sanitizes the target name to the hyphen pattern (no underscores)', () => {
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp, { targetName: 'my_weather_tool' }));
    const template = Template.fromStack(testApp.testStack);
    const name = Object.values(template.findResources('AWS::BedrockAgentCore::GatewayTarget'))[0].Properties
      .Name as string;
    expect(name).not.toContain('_');
    expect(name).toMatch(/^([0-9a-zA-Z][-]?){1,50}$/);
  });

  test('renders the inline tool schema (tool name, input schema) onto the target', () => {
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp));
    const targets = Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget');
    const toolSchema = Object.values(targets)[0].Properties.TargetConfiguration.Mcp.Lambda.ToolSchema;
    expect(toolSchema.InlinePayload[0].Name).toBe('getWeather');
    expect(toolSchema.InlinePayload[0].InputSchema.Type).toBe('object');
    expect(toolSchema.InlinePayload[0].InputSchema.Required).toEqual(['city']);
  });

  test('supports an S3 tool schema', () => {
    new MdaaAgentcoreGatewayTarget(
      testApp.testStack,
      'Target',
      baseProps(testApp, {
        targetConfig: lambdaTargetConfig({
          targetConfiguration: lambdaConfiguration({
            lambda: {
              lambdaArn: LAMBDA_ARN,
              toolSchema: { s3: { uri: 's3://my-bucket/schema.json', bucketOwnerAccountId: '111111111111' } },
            },
          }),
        }),
      }),
    );
    const targets = Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget');
    const toolSchema = Object.values(targets)[0].Properties.TargetConfiguration.Mcp.Lambda.ToolSchema;
    expect(toolSchema.S3).toEqual({ Uri: 's3://my-bucket/schema.json', BucketOwnerAccountId: '111111111111' });
  });

  test('defaults an S3 tool-schema bucketOwnerAccountId to the deploying account when omitted (compliance-by-default)', () => {
    // The L2 is the compliance boundary: confused-deputy protection must be enforced here, not only
    // when the L3 orchestration construct applies it. MdaaTestApp deploys into account 'test-account'.
    new MdaaAgentcoreGatewayTarget(
      testApp.testStack,
      'Target',
      baseProps(testApp, {
        targetConfig: lambdaTargetConfig({
          targetConfiguration: lambdaConfiguration({
            lambda: { lambdaArn: LAMBDA_ARN, toolSchema: { s3: { uri: 's3://my-bucket/schema.json' } } },
          }),
        }),
      }),
    );
    const targets = Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget');
    const toolSchema = Object.values(targets)[0].Properties.TargetConfiguration.Mcp.Lambda.ToolSchema;
    expect(toolSchema.S3).toEqual({ Uri: 's3://my-bucket/schema.json', BucketOwnerAccountId: 'test-account' });
  });

  test('treats a null description as absent (jsii/YAML callers may surface a missing key as null)', () => {
    // A TS caller omits description (undefined), but a jsii Python/Java or YAML caller can surface a
    // missing key as null. Both mean "no description" and must not crash on description.length.
    expect(
      () =>
        new MdaaAgentcoreGatewayTarget(
          testApp.testStack,
          'Target',
          baseProps(testApp, {
            targetConfig: lambdaTargetConfig({ description: null as unknown as string }),
          }),
        ),
    ).not.toThrow();
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 1);
  });

  test('renders the optional description onto the target', () => {
    new MdaaAgentcoreGatewayTarget(
      testApp.testStack,
      'Target',
      baseProps(testApp, { targetConfig: lambdaTargetConfig({ description: 'Weather tools' }) }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::GatewayTarget', { Description: 'Weather tools' });
  });

  test('rejects a description outside 1-200 characters, naming the target', () => {
    expect(
      () =>
        new MdaaAgentcoreGatewayTarget(
          testApp.testStack,
          'Target',
          baseProps(testApp, { targetConfig: lambdaTargetConfig({ description: 'x'.repeat(201) }) }),
        ),
    ).toThrow(/Gateway target "weather" description must be between 1 and 200 characters/);
    expect(
      () =>
        new MdaaAgentcoreGatewayTarget(
          testApp.testStack,
          'TargetB',
          baseProps(testApp, { targetConfig: lambdaTargetConfig({ description: '' }) }),
        ),
    ).toThrow(/Gateway target "weather" description must be between 1 and 200 characters/);
  });

  test('an explicit GATEWAY_IAM_ROLE credential provider is accepted', () => {
    new MdaaAgentcoreGatewayTarget(
      testApp.testStack,
      'Target',
      baseProps(testApp, {
        targetConfig: lambdaTargetConfig({
          credentialProvider: { type: GatewayTargetCredentialProviderType.GATEWAY_IAM_ROLE },
        }),
      }),
    );
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::GatewayTarget', {
      CredentialProviderConfigurations: [{ CredentialProviderType: 'GATEWAY_IAM_ROLE' }],
    });
  });

  test('the GATEWAY_IAM_ROLE credential entry carries no credential sub-object (exact match)', () => {
    // hasResourceProperties is a partial match; assert the rendered entry EXACTLY equals
    // { CredentialProviderType: 'GATEWAY_IAM_ROLE' } so a regression adding a stray CredentialProvider
    // sub-object (the gateway uses its own execution role, so none is valid) is caught.
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp));
    const target = Object.values(
      Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget'),
    )[0];
    expect(target.Properties.CredentialProviderConfigurations).toEqual([
      { CredentialProviderType: 'GATEWAY_IAM_ROLE' },
    ]);
  });

  test('throws when toolSchema is missing, naming the target', () => {
    expect(
      () =>
        new MdaaAgentcoreGatewayTarget(
          testApp.testStack,
          'Target',
          baseProps(testApp, {
            targetConfig: {
              targetConfiguration: {
                lambda: { lambdaArn: LAMBDA_ARN } as GatewayTargetConfigurationProperty['lambda'],
              },
            },
          }),
        ),
    ).toThrow(/Gateway target "weather" is missing toolSchema/);
  });

  test('throws on a non-GATEWAY_IAM_ROLE credential provider with the offending pair', () => {
    expect(
      () =>
        new MdaaAgentcoreGatewayTarget(
          testApp.testStack,
          'Target',
          baseProps(testApp, {
            targetConfig: lambdaTargetConfig({
              credentialProvider: { type: GatewayTargetCredentialProviderType.OAUTH },
            }),
          }),
        ),
    ).toThrow(/Gateway target "weather" uses credentialProvider type "OAUTH".*not yet supported.*GATEWAY_IAM_ROLE/);
  });

  test('publishes per-target SSM parameters for arn and id', () => {
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp));
    const params = Template.fromStack(testApp.testStack).findResources('AWS::SSM::Parameter');
    const names = Object.values(params).map(p => p.Properties.Name as string);
    ['arn', 'id'].forEach(suffix => {
      expect(names.some(n => n.endsWith(`/gateway-target/weather/${suffix}`))).toBe(true);
    });
  });

  test('the arn and id SSM parameters are sourced from the correct target attributes', () => {
    new MdaaAgentcoreGatewayTarget(testApp.testStack, 'Target', baseProps(testApp));
    const params = Template.fromStack(testApp.testStack).findResources('AWS::SSM::Parameter');
    const paramValueFor = (suffix: string) =>
      JSON.stringify(
        Object.values(params).find(p => (p.Properties.Name as string).endsWith(`/gateway-target/weather/${suffix}`))!
          .Properties.Value,
      );

    // arn is sourced from the target's GatewayArn attribute (the target ARN); id from TargetId. A
    // regression pointing either param at the wrong attribute is caught.
    expect(paramValueFor('arn')).toContain('GatewayArn');
    expect(paramValueFor('id')).toContain('TargetId');
  });
});
