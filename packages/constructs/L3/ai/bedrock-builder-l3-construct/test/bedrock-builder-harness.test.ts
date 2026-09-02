/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { HarnessVpcEndpointName } from '@aws-mdaa/bedrock-agentcore-harness-l3-construct';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  NamedGatewayProps,
  NamedGuardrailProps,
  NamedHarnessProps,
} from '../lib';

// Exercises the bedrock-builder orchestration of AgentCore Harnesses: standalone harness synth, and
// config:<name> resolution of a harness's gatewayArn/guardrail.id against the module's own
// gateways/guardrails maps.

const dataAdminRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/test-role',
  name: 'test-role',
};

const customJwt = {
  customJwt: {
    discoveryUrl: 'https://example.com/.well-known/openid-configuration',
    allowedAudience: ['my-audience'],
  },
};

// networkConfiguration is required on every harness (MDAA enforces VPC mode), so each harness entry
// under test supplies a minimal valid VPC config.
const NET = { securityGroups: ['sg-test'], subnets: ['subnet-test'] };

function template(props: {
  harnesses?: NamedHarnessProps;
  gateways?: NamedGatewayProps;
  guardrails?: NamedGuardrailProps;
}): Template {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  const constructProps: BedrockBuilderL3ConstructProps = {
    dataAdminRoles: [dataAdminRoleRef],
    roleHelper,
    naming: testApp.naming,
    harnesses: props.harnesses,
    gateways: props.gateways,
    guardrails: props.guardrails,
  };
  new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
  return Template.fromStack(testApp.testStack);
}

describe('BedrockBuilderL3Construct AgentCore harness wiring', () => {
  test('creates one harness per harnesses-map entry with the sanitized, MDAA-named name', () => {
    const t = template({
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
        },
      },
    });
    t.resourceCountIs('AWS::BedrockAgentCore::Harness', 1);
    const names = Object.values(t.findResources('AWS::BedrockAgentCore::Harness')).map(
      h => h.Properties.HarnessName as string,
    );
    // Bedrock AgentCore names disallow hyphens; MDAA's naming truncation hashes the suffix to fit the
    // 40-char HarnessName limit, so assert only the surviving sanitized (underscore) prefix.
    expect(names).toEqual(expect.arrayContaining([expect.stringMatching(/^test_org_test_env_test_domain/)]));
  });

  test('the single module CMK is shared with the harness (harness provisions no key of its own)', () => {
    // The module provisions exactly one shared CMK (getOrCreateKmsKey) for agents/KBs/guardrails/
    // gateways/Lambdas, and passes it into each harness. The harness is a pure key consumer — it
    // creates no key of its own — so one harness with no other resources configured yields exactly
    // one KMS key.
    const t = template({
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
        },
      },
    });
    t.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('multiple harnesses each synthesize independently', () => {
    const t = template({
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
        },
        'harness-b': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be terse.',
          networkConfiguration: NET,
        },
      },
    });
    t.resourceCountIs('AWS::BedrockAgentCore::Harness', 2);
  });

  test('resolves a harness gatewayArn config:<name> reference to the live gateway ARN', () => {
    const t = template({
      gateways: { 'weather-gateway': { authorizerConfiguration: customJwt } },
      harnesses: {
        'gw-harness': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
          tools: { gateway_tools: { agentCoreGateway: { gatewayArn: 'config:weather-gateway' } } },
        },
      },
    });

    const gateway = Object.values(t.findResources('AWS::BedrockAgentCore::Gateway'))[0];
    const harness = Object.values(t.findResources('AWS::BedrockAgentCore::Harness'))[0];
    const gatewayLogicalId = Object.keys(t.findResources('AWS::BedrockAgentCore::Gateway'))[0];

    expect(gateway).toBeDefined();
    // The harness tool's GatewayArn references the gateway resource's Arn attribute (a live in-stack
    // token), not a literal string and not the "config:" reference.
    const toolGatewayArn = JSON.stringify(harness.Properties.Tools[0].Config.AgentCoreGateway.GatewayArn);
    expect(toolGatewayArn).toContain(gatewayLogicalId);
    expect(toolGatewayArn).not.toContain('config:weather-gateway');

    // A gateway-wired harness's execution role must also carry the scoped InvokeGateway grant, so the
    // builder-side wiring is guarded end-to-end (the ARN resolution above plus the compliance surface).
    t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Sid: 'AllowInvokeGateway' })]),
      },
    });
  });

  test('throws when a harness gatewayArn config:<name> reference is unknown', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockBuilderL3ConstructProps = {
      dataAdminRoles: [dataAdminRoleRef],
      roleHelper,
      naming: testApp.naming,
      harnesses: {
        'gw-harness': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
          tools: { gateway_tools: { agentCoreGateway: { gatewayArn: 'config:missing-gateway' } } },
        },
      },
    };
    expect(() => new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps)).toThrow(
      /references unknown gateway from config: "missing-gateway"/,
    );
  });

  test('resolves a harness guardrail.id config:<name> reference to the live guardrail id/version', () => {
    const t = template({
      guardrails: {
        'enterprise-guardrail': {
          contentFilters: {},
          blockedInputMessaging: 'blocked',
          blockedOutputsMessaging: 'blocked',
        },
      },
      harnesses: {
        'guardrail-harness': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
          guardrail: { id: 'config:enterprise-guardrail' },
        },
      },
    });

    const guardrailLogicalId = Object.keys(t.findResources('AWS::Bedrock::Guardrail'))[0];
    const harness = Object.values(t.findResources('AWS::BedrockAgentCore::Harness'))[0];
    const guardrailConfig =
      harness.Properties.AdditionalParams?.guardrailConfig ??
      // The escape-hatch override is merged onto Model.BedrockModelConfig; read from there.
      harness.Properties.Model.BedrockModelConfig.AdditionalParams.guardrailConfig;
    const guardrailIdentifier = JSON.stringify(guardrailConfig.guardrailIdentifier);
    expect(guardrailIdentifier).toContain(guardrailLogicalId);

    // The resolved version half of the map references the guardrail's attrVersion (Fn::GetAtt … Version).
    const guardrailVersion = JSON.stringify(guardrailConfig.guardrailVersion);
    expect(guardrailVersion).toContain(guardrailLogicalId);
    expect(guardrailVersion).toContain('Version');

    t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Sid: 'AllowApplyBedrockGuardrail' })]),
      },
    });
  });

  test('adds no memory CMK grant (memory is disabled in the harness)', () => {
    // The harness deploys with memory disabled (Memory.Disabled), so no memory resource is ever
    // created and the builder must not add the AgentCore Memory key-policy grant.
    const t = template({
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: NET,
        },
      },
    });
    const keys = Object.values(t.findResources('AWS::KMS::Key'));
    const hasMemoryGrant = keys.some(k =>
      (k.Properties.KeyPolicy.Statement as { Sid?: string }[]).some(s => s.Sid === 'AllowAgentCoreMemoryEncryption'),
    );
    expect(hasMemoryGrant).toBe(false);
  });

  test('no harnesses produces no harness resources', () => {
    const t = template({});
    t.resourceCountIs('AWS::BedrockAgentCore::Harness', 0);
  });

  // The per-harness construct cannot see its siblings, so the module fails fast when two harnesses
  // would each create the same VPC endpoint in one VPC (AWS allows one per service per VPC; the
  // second deploy fails). This guards the wiring end-to-end; the collision rules themselves are unit
  // tested in the harness package.
  test('throws when co-located harnesses would create the same VPC endpoint', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const vpcNet = { ...NET, vpcId: 'vpc-shared', vpcEndpoints: {} };
    const constructProps: BedrockBuilderL3ConstructProps = {
      dataAdminRoles: [dataAdminRoleRef],
      roleHelper,
      naming: testApp.naming,
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: vpcNet,
        },
        'harness-b': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be terse.',
          networkConfiguration: vpcNet,
        },
      },
    };
    expect(() => new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps)).toThrow(
      /only one Private-DNS interface endpoint per service per VPC/,
    );
  });

  test('allows co-located harnesses when the second excludes the shared endpoints (same security groups)', () => {
    // Real endpoints synthesize here (unlike the NET placeholder), so use CDK-valid VPC/SG/subnet ids.
    const vpceNet = {
      securityGroups: ['sg-0123456789abcdef0'],
      subnets: ['subnet-0123456789abcdef0'],
      vpcId: 'vpc-0123456789abcdef0',
    };
    const t = template({
      harnesses: {
        'harness-a': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be helpful.',
          networkConfiguration: { ...vpceNet, vpcEndpoints: {} },
        },
        'harness-b': {
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be terse.',
          networkConfiguration: {
            ...vpceNet,
            vpcEndpoints: {
              // harness-b reuses harness-a's endpoints, so it excludes all five it would otherwise create.
              exclude: [
                HarnessVpcEndpointName.BEDROCK_RUNTIME,
                HarnessVpcEndpointName.ECR_API,
                HarnessVpcEndpointName.ECR_DOCKER,
                HarnessVpcEndpointName.STS,
                HarnessVpcEndpointName.LOGS,
              ],
            },
          },
        },
      },
    });
    // Both harnesses synth, and only harness-a's five interface endpoints exist (harness-b creates none).
    t.resourceCountIs('AWS::BedrockAgentCore::Harness', 2);
    t.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
  });
});
