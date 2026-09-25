/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  NamedGatewayProps,
  NamedGuardrailProps,
  NamedHarnessProps,
  NamedVpcEndpointSetProps,
  VpcEndpointSetProps,
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
    // gateways/Lambdas, and passes it into each harness. The harness is a pure key consumer - it
    // creates no key of its own - so one harness with no other resources configured yields exactly
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

    // The resolved version half of the map references the guardrail's attrVersion (Fn::GetAtt ... Version).
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

  describe('VPC endpoint set orchestration', () => {
    const VPC_A = 'vpc-0aaaaaaaaaaaaaaaa';
    const VPC_B = 'vpc-0bbbbbbbbbbbbbbbb';
    const GATEWAY_TOOL = {
      ops: { agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/gw' } },
    };

    /** A harness referencing the given endpoint set. */
    function harness(setName: string, tools?: NamedHarnessProps[string]['tools'], subnets = ['subnet-a1']) {
      return {
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be helpful.',
        tools,
        networkConfiguration: {
          securityGroups: ['sg-0123456789abcdef0'],
          subnets,
          vpcEndpoints: setName,
        },
      };
    }

    /** A minimal fully-private set: everything created, image layers over an S3 gateway endpoint. */
    function set(vpcId: string, overrides: Partial<VpcEndpointSetProps> = {}): VpcEndpointSetProps {
      return { vpcId, subnetIds: ['subnet-a1', 'subnet-a2'], routeTableIds: ['rtb-a1'], ...overrides };
    }

    function build(props: {
      vpcEndpoints?: NamedVpcEndpointSetProps;
      harnesses?: NamedHarnessProps;
      gateways?: NamedGatewayProps;
    }): Template {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', {
        dataAdminRoles: [dataAdminRoleRef],
        roleHelper,
        naming: testApp.naming,
        harnesses: props.harnesses,
        gateways: props.gateways,
        vpcEndpoints: props.vpcEndpoints,
      });
      return Template.fromStack(testApp.testStack);
    }

    /** Endpoint service names in the template, as the rendered ServiceName carries region and partition. */
    function endpointServiceNames(t: Template): string[] {
      return Object.values(t.findResources('AWS::EC2::VPCEndpoint')).map(endpoint =>
        JSON.stringify(endpoint.Properties?.ServiceName),
      );
    }

    test('creates one shared set of endpoints for harnesses referencing it', () => {
      // The reason endpoint ownership moved here: AWS allows one Private DNS endpoint per service per
      // VPC, so two harnesses each creating their own collided at deploy.
      const t = build({
        vpcEndpoints: { private: set(VPC_A) },
        harnesses: { 'harness-a': harness('private'), 'harness-b': harness('private') },
      });

      t.resourceCountIs('AWS::BedrockAgentCore::Harness', 2);
      // Five interface endpoints plus the S3 gateway endpoint.
      t.resourceCountIs('AWS::EC2::VPCEndpoint', 6);
      // Five endpoint groups plus one client group per harness.
      t.resourceCountIs('AWS::EC2::SecurityGroup', 7);
      // Each harness wires itself to all five, from its own client group, so the rules never collide.
      t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 10);
    });

    test('creates an independent set per VPC', () => {
      const t = build({
        vpcEndpoints: { 'private-a': set(VPC_A), 'private-b': set(VPC_B, { routeTableIds: ['rtb-b1'] }) },
        harnesses: { 'harness-a': harness('private-a'), 'harness-b': harness('private-b') },
      });

      const vpcIds = Object.values(t.findResources('AWS::EC2::VPCEndpoint')).map(
        endpoint => endpoint.Properties?.VpcId as string,
      );
      expect(vpcIds.filter(id => id === VPC_A)).toHaveLength(6);
      expect(vpcIds.filter(id => id === VPC_B)).toHaveLength(6);
    });

    test('creates nothing for a harness referencing no set', () => {
      const t = build({
        harnesses: {
          'harness-a': {
            modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
            systemPrompt: 'Be helpful.',
            networkConfiguration: NET,
          },
        },
      });

      t.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
      t.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });

    test('places created endpoint ENIs in the set subnets, and honours a per-endpoint override', () => {
      const t = build({
        vpcEndpoints: { private: set(VPC_A, { ecrApi: { subnetIds: ['subnet-a1'] } }) },
        harnesses: { 'harness-a': harness('private') },
      });

      const byService = Object.values(t.findResources('AWS::EC2::VPCEndpoint'));
      const ecrApi = byService.find(endpoint => JSON.stringify(endpoint.Properties?.ServiceName).includes('ecr.api'));
      const runtime = byService.find(endpoint =>
        JSON.stringify(endpoint.Properties?.ServiceName).includes('bedrock-runtime'),
      );
      expect(ecrApi?.Properties?.SubnetIds).toEqual(['subnet-a1']);
      expect(runtime?.Properties?.SubnetIds).toEqual(['subnet-a1', 'subnet-a2']);
    });

    test('wires a brought endpoint without creating it', () => {
      const t = build({
        vpcEndpoints: { private: set(VPC_A, { sts: { securityGroupId: 'sg-central-sts' } }) },
        harnesses: { 'harness-a': harness('private') },
      });

      // Four interface endpoints created instead of five, plus the S3 gateway endpoint.
      t.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
      expect(endpointServiceNames(t).some(name => name.includes('.sts'))).toBe(false);
      // The harness is still wired to all five services, the brought one by the security group named.
      t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 5);
      t.hasResourceProperties('AWS::EC2::SecurityGroupIngress', { GroupId: 'sg-central-sts' });
    });

    test('neither creates nor wires an external endpoint', () => {
      const t = build({
        vpcEndpoints: {
          private: set(VPC_A, { sts: { external: true }, logs: { external: true } }),
        },
        harnesses: { 'harness-a': harness('private') },
      });

      // Three interface endpoints plus the S3 gateway endpoint, and three rule pairs.
      t.resourceCountIs('AWS::EC2::VPCEndpoint', 4);
      t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 3);
      t.resourceCountIs('AWS::EC2::SecurityGroupEgress', 3);
    });

    test('creates no S3 gateway endpoint when image layers are external', () => {
      const t = build({
        vpcEndpoints: { private: { vpcId: VPC_A, subnetIds: ['subnet-a1'], s3ImageLayers: { external: true } } },
        harnesses: { 'harness-a': harness('private') },
      });

      t.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
      const gateways = Object.values(t.findResources('AWS::EC2::VPCEndpoint')).filter(
        endpoint => endpoint.Properties?.VpcEndpointType === 'Gateway',
      );
      expect(gateways).toHaveLength(0);
    });

    test('scopes the S3 gateway endpoint policy to the ECR image-layer bucket', () => {
      const t = build({
        vpcEndpoints: { private: set(VPC_A, { routeTableIds: ['rtb-a1', 'rtb-a2'] }) },
        harnesses: { 'harness-a': harness('private') },
      });

      const gateway = Object.values(t.findResources('AWS::EC2::VPCEndpoint')).find(
        endpoint => endpoint.Properties?.VpcEndpointType === 'Gateway',
      );
      expect(gateway?.Properties?.RouteTableIds).toEqual(['rtb-a1', 'rtb-a2']);
      expect(gateway?.Properties?.PolicyDocument).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowEcrImageLayerPull',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: 'arn:test-partition:s3:::prod-test-region-starport-layer-bucket/*',
          },
        ],
      });
    });

    test('adds the AgentCore Gateway endpoint when a referencing harness declares a gateway tool', () => {
      const t = build({
        gateways: {
          'ops-gateway': {
            authorizerConfiguration: {
              customJwt: {
                discoveryUrl: 'https://example.com/.well-known/openid-configuration',
                allowedAudience: ['a'],
              },
            },
          },
        },
        vpcEndpoints: { private: set(VPC_A) },
        harnesses: {
          'harness-plain': harness('private'),
          'harness-gw': harness('private', { ops: { agentCoreGateway: { gatewayArn: 'config:ops-gateway' } } }),
        },
      });

      // Six interface endpoints plus the S3 gateway endpoint.
      t.resourceCountIs('AWS::EC2::VPCEndpoint', 7);
      expect(endpointServiceNames(t).some(name => name.includes('bedrock-agentcore.gateway'))).toBe(true);
      // Only the gateway harness is wired to all six: 6 + 5 rule pairs.
      t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 11);
    });

    test('scopes the AgentCore Gateway endpoint policy to gateway invocation', () => {
      const t = build({
        vpcEndpoints: { private: set(VPC_A) },
        harnesses: { 'harness-gw': harness('private', GATEWAY_TOOL) },
      });

      // Gateway data-plane invokes are the endpoint's only legitimate traffic (management goes to the
      // separate bedrock-agentcore-control service), so it carries an action-scoped policy where the
      // multi-action supporting endpoints must stay on the AWS default.
      const gateway = Object.values(t.findResources('AWS::EC2::VPCEndpoint')).find(endpoint =>
        JSON.stringify(endpoint.Properties?.ServiceName).includes('bedrock-agentcore.gateway'),
      );
      expect(gateway?.Properties?.PolicyDocument).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowScopedServiceAccess',
            Effect: 'Allow',
            Principal: '*',
            Action: 'bedrock-agentcore:InvokeGateway',
            Resource: '*',
          },
        ],
      });
    });

    test('leaves the multi-action supporting endpoints on the AWS default policy', () => {
      // Private DNS makes an interface endpoint VPC-wide, so restricting these would break unrelated
      // workloads in the same VPC; the execution role's identity policy is the scope instead.
      const t = build({
        vpcEndpoints: { private: set(VPC_A) },
        harnesses: { 'harness-a': harness('private') },
      });

      Object.values(t.findResources('AWS::EC2::VPCEndpoint'))
        .filter(endpoint => endpoint.Properties?.VpcEndpointType !== 'Gateway')
        .forEach(endpoint => expect(endpoint.Properties?.PolicyDocument).toBeUndefined());
    });

    test('allows harnesses with different security groups to share a set', () => {
      // The case the removed per-harness exclude/collision machinery existed to work around: a shared
      // endpoint admitting only one harness's security groups deployed cleanly and hung at first invoke.
      const t = build({
        vpcEndpoints: { private: set(VPC_A) },
        harnesses: {
          'harness-a': {
            ...harness('private'),
            networkConfiguration: {
              securityGroups: ['sg-0aaaaaaaaaaaaaaaa'],
              subnets: ['subnet-a1'],
              vpcEndpoints: 'private',
            },
          },
          'harness-b': {
            ...harness('private'),
            networkConfiguration: {
              securityGroups: ['sg-0bbbbbbbbbbbbbbbb'],
              subnets: ['subnet-a1'],
              vpcEndpoints: 'private',
            },
          },
        },
      });

      const ingressSources = Object.values(t.findResources('AWS::EC2::SecurityGroupIngress')).map(rule =>
        JSON.stringify(rule.Properties?.SourceSecurityGroupId),
      );
      // Each harness's rules name its own client group, so both are admitted and neither collides.
      expect(new Set(ingressSources).size).toBe(2);
    });

    test('keeps the endpoint security group names of two sets apart', () => {
      // Both sets provision the same services, and MDAA naming scopes an explicit name only to the
      // module, so identical GroupNames would deploy-fail invisibly at synth.
      const t = build({
        vpcEndpoints: { 'private-a': set(VPC_A), 'private-b': set(VPC_B, { routeTableIds: ['rtb-b1'] }) },
        harnesses: { 'harness-a': harness('private-a'), 'harness-b': harness('private-b') },
      });

      const groupNames = Object.values(t.findResources('AWS::EC2::SecurityGroup')).map(
        group => group.Properties?.GroupName as string,
      );
      expect(new Set(groupNames).size).toBe(groupNames.length);
      expect(groupNames.some(name => name.includes('private-a'))).toBe(true);
      expect(groupNames.some(name => name.includes('private-b'))).toBe(true);
    });

    test('creates no endpoint construct for a set whose every endpoint is brought or external', () => {
      const t = build({
        vpcEndpoints: {
          private: {
            vpcId: VPC_A,
            subnetIds: ['subnet-a1'],
            s3ImageLayers: { external: true },
            bedrockRuntime: { securityGroupId: 'sg-central-runtime' },
            ecrApi: { external: true },
            ecrDocker: { external: true },
            sts: { securityGroupId: 'sg-central-sts' },
            logs: { external: true },
          },
        },
        harnesses: { 'harness-a': harness('private') },
      });

      t.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
      // Only the harness's own client security group, wired to the two brought endpoints.
      t.resourceCountIs('AWS::EC2::SecurityGroup', 1);
      t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2);
    });

    describe('rejected configurations', () => {
      test('a harness referencing an undeclared set', () => {
        expect(() =>
          build({ vpcEndpoints: { private: set(VPC_A) }, harnesses: { 'harness-a': harness('privat') } }),
        ).toThrow('references VPC endpoint set "privat", which is not defined in vpcEndpoints');
      });

      test('a set no harness references', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A), unused: set(VPC_B, { routeTableIds: ['rtb-b1'] }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('VPC endpoint set "unused" is referenced by no harness');
      });

      // A set declared with no harnesses block at all is the same error as an unreferenced set beside a
      // referenced one, and reaches it only because reconciliation runs before the no-harness return.
      test('a set declared with no harnesses at all', () => {
        expect(() => build({ vpcEndpoints: { private: set(VPC_A) } })).toThrow(
          'VPC endpoint set "private" is referenced by no harness',
        );
      });

      test('a set declared with an empty harnesses map', () => {
        expect(() => build({ vpcEndpoints: { private: set(VPC_A) }, harnesses: {} })).toThrow(
          'VPC endpoint set "private" is referenced by no harness',
        );
      });

      test('two sets naming the same VPC', () => {
        expect(() =>
          build({
            vpcEndpoints: { 'private-a': set(VPC_A), 'private-b': set(VPC_A) },
            harnesses: { 'harness-a': harness('private-a'), 'harness-b': harness('private-b') },
          }),
        ).toThrow(`both name VPC "${VPC_A}"`);
      });

      test('set names differing only in case', () => {
        expect(() =>
          build({
            vpcEndpoints: { Private: set(VPC_A), private: set(VPC_B, { routeTableIds: ['rtb-b1'] }) },
            harnesses: { 'harness-a': harness('Private'), 'harness-b': harness('private') },
          }),
        ).toThrow('differ only in case');
      });

      test('neither route tables nor an image-layer decision', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: { vpcId: VPC_A, subnetIds: ['subnet-a1'] } },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('must state how container image layers are reached');
      });

      test('both route tables and an external image-layer marker', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { s3ImageLayers: { external: true } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('sets both "routeTableIds" and "s3ImageLayers.external"');
      });

      test('a set with no subnets', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: { vpcId: VPC_A, subnetIds: [], routeTableIds: ['rtb-a1'] } },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('requires "subnetIds"');
      });

      test('a set with an empty vpcId', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: { vpcId: '', subnetIds: ['subnet-a1'], routeTableIds: ['rtb-a1'] } },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('VPC endpoint set "private" requires "vpcId"');
      });

      // Distinct from 'placement on an endpoint that is not created here': the guard above it tests
      // `subnetIds?.length`, which is falsy for [], so an empty list on a CREATED endpoint falls through
      // to its own check rather than being reported as misplaced.
      test('a created endpoint with an empty subnetIds list', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { sts: { subnetIds: [] } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('endpoint "sts" has an empty "subnetIds" list. Provide a subnet, or omit it.');
      });

      // Same distinction as the empty subnetIds list: a blank value is rejected, an absent one still means
      // "create it". Without this the blank would be indistinguishable from absent at reconcileSet's
      // truthiness test, and the endpoint the operator meant to reuse would be created instead.
      test('a brought endpoint with an empty securityGroupId', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { sts: { securityGroupId: '' } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('endpoint "sts" has an empty "securityGroupId"');
      });

      test('a brought endpoint whose securityGroupId is whitespace only', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { sts: { securityGroupId: '   ' } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('endpoint "sts" has an empty "securityGroupId"');
      });

      test('an endpoint that is both brought and external', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { sts: { external: true, securityGroupId: 'sg-x' } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('sets both "external" and "securityGroupId"');
      });

      test('placement on an endpoint that is not created here', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { sts: { external: true, subnetIds: ['subnet-a1'] } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow('sets "subnetIds" on an endpoint that is not created here');
      });

      test('a gateway endpoint no referencing harness needs', () => {
        expect(() =>
          build({
            vpcEndpoints: { private: set(VPC_A, { agentCoreGateway: { external: true } }) },
            harnesses: { 'harness-a': harness('private') },
          }),
        ).toThrow(
          'configures "agentCoreGateway", but no harness referencing it requires the ' +
            '"bedrock-agentcore.gateway" endpoint',
        );
      });
    });
  });
});
