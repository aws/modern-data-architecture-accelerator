/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { IKey } from 'aws-cdk-lib/aws-kms';
import {
  BedrockAgentcoreHarnessL3Construct,
  BedrockAgentcoreHarnessL3ConstructProps,
  HarnessBedrockApiFormat,
  HarnessGuardrailTrace,
  HarnessTruncationStrategy,
} from '../lib';

// networkConfiguration is required (MDAA enforces VPC mode), so every harness under test supplies a
// minimal valid VPC config. Tests that specifically exercise network behaviour override it inline.
const NET = { securityGroups: ['sg-test'], subnets: ['subnet-test'] };

/** Standalone security-group rule resources, as opposed to rules inlined on a group. */
const RULE_TYPES = new Set(['AWS::EC2::SecurityGroupIngress', 'AWS::EC2::SecurityGroupEgress']);

describe('BedrockAgentcoreHarnessL3Construct Unit Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;
  let kmsKey: IKey;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    // The harness is a pure key consumer - the caller (orchestrating module) provides the CMK.
    // A rotation-enabled in-stack key stands in for the module's shared CMK here (rotation keeps
    // the compliance/cdk-nag checks clean, matching what the orchestrator actually provisions).
    kmsKey = new Key(testApp.testStack, 'TestKmsKey', { enableKeyRotation: true });
  });

  describe('Basic Harness Creation', () => {
    test('should create a base harness with model + system prompt + created role', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'test-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'You are a helpful assistant.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      const construct = new BedrockAgentcoreHarnessL3Construct(
        testApp.testStack,
        'test-harness-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      expect(construct.harness).toBeDefined();
      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        // Names are truncated to the 40-char HarnessName limit with a hashed suffix, so assert only
        // the surviving MDAA-sanitized (underscore) prefix.
        HarnessName: Match.stringLikeRegexp('^test_org_test_env_test_domain'),
        Model: {
          BedrockModelConfig: {
            ModelId:
              'arn:test-partition:bedrock:test-region::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0',
          },
        },
        SystemPrompt: [{ Text: 'You are a helpful assistant.' }],
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'bedrock-agentcore.amazonaws.com' },
              Condition: {
                StringEquals: { 'aws:SourceAccount': 'test-account' },
                ArnLike: {
                  // Service-wide (:*), NOT harness/<name>-* or harness/*: the SourceArn the AgentCore
                  // control plane presents at CreateHarness role validation is not the harness ARN, so a
                  // harness/-prefixed pattern fails validation on deploy (verified). SourceAccount gives
                  // the confused-deputy protection; SourceArn matches the Runtime construct + AWS sample.
                  'aws:SourceArn': 'arn:test-partition:bedrock-agentcore:test-region:test-account:*',
                },
              },
            }),
          ]),
        },
      });
    });

    test('should populate modelConfig temperature/topP/maxTokens when set', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'tuned-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        modelConfig: { temperature: 0.5, topP: 0.9, maxTokens: 2048 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'tuned-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            Temperature: 0.5,
            TopP: 0.9,
            MaxTokens: 2048,
          },
        },
      });
    });

    test('should not include temperature/topP/maxTokens when modelConfig is absent', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'untuned-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'untuned-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            Temperature: Match.absent(),
            TopP: Match.absent(),
            MaxTokens: Match.absent(),
          },
        },
      });
    });

    test('should resolve a full ARN model identifier as-is', () => {
      const modelArn = 'arn:aws:bedrock:test-region::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0';
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'arn-model-harness',
        modelId: modelArn,
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'arn-model-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: { BedrockModelConfig: { ModelId: modelArn } },
      });
    });
  });

  describe('Model API Format', () => {
    // apiFormat is not caller-configurable: the construct always renders converse_stream - the only
    // format wired today (see HarnessBedrockApiFormat) and the only one Bedrock Guardrails support.
    // The OpenAI-compatible Mantle formats ('responses' / 'chat_completions') route to a separate
    // `bedrock-mantle` endpoint host, for which no interface endpoint service exists.
    test('should always render Model.BedrockModelConfig.ApiFormat = converse_stream', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'api-format-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'api-format-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: { BedrockModelConfig: { ApiFormat: HarnessBedrockApiFormat.CONVERSE_STREAM } },
      });
    });

    test('should render ApiFormat = converse_stream alongside the sampling fields', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'sampling-api-format-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        modelConfig: { temperature: 0.5, topP: 0.8, maxTokens: 1024 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(
        testApp.testStack,
        'sampling-api-format-harness-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            Temperature: 0.5,
            TopP: 0.8,
            MaxTokens: 1024,
            ApiFormat: HarnessBedrockApiFormat.CONVERSE_STREAM,
          },
        },
      });
    });
  });

  describe('Field Validation', () => {
    test('should throw for an empty modelId', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'empty-model-harness',
        modelId: '   ',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'empty-model-harness-construct', constructProps);
      }).toThrow('Harness "modelId" is required');
    });

    test('should throw for an empty systemPrompt', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'empty-prompt-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: '',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'empty-prompt-harness-construct', constructProps);
      }).toThrow('Harness "systemPrompt" is required');
    });

    test('should throw for a temperature outside 0-2', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-temp-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        modelConfig: { temperature: 2.5 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-temp-harness-construct', constructProps);
      }).toThrow('Harness "modelConfig.temperature" must be between 0 and 2');
    });

    test('should throw for a topP outside 0-1', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-topp-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        modelConfig: { topP: 1.5 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-topp-harness-construct', constructProps);
      }).toThrow('Harness "modelConfig.topP" must be between 0 and 1');
    });

    test('should throw for a non-positive maxTokens', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-maxtokens-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        modelConfig: { maxTokens: 0 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-maxtokens-harness-construct', constructProps);
      }).toThrow('Harness "modelConfig.maxTokens" must be an integer >= 1');
    });

    test('should throw for a non-positive maxIterations', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-iter-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        maxIterations: 0,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-iter-harness-construct', constructProps);
      }).toThrow('Harness "maxIterations" must be an integer >= 1');
    });

    test('should throw for a non-positive or non-integer timeoutSeconds', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-timeout-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        timeoutSeconds: 0,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-timeout-harness-construct', constructProps);
      }).toThrow('Harness "timeoutSeconds" must be an integer >= 1');
    });

    test('should throw for an invalid logRetentionDays value', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-retention-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        logRetentionDays: 45,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-retention-harness-construct', constructProps);
      }).toThrow('Invalid logRetentionDays');
    });
  });

  describe('Execution Role', () => {
    test('should use a supplied role reference and create no new role', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ref-role-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        role: { arn: 'arn:aws:iam::test-account:role/existing-role' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'ref-role-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        ExecutionRoleArn: 'arn:aws:iam::test-account:role/existing-role',
      });

      // Two roles present belong to the always-on log-protection custom resource
      // (handler + CR provider), not a harness execution role.
      template.resourceCountIs('AWS::IAM::Role', 2);

      // The execution permission set must attach to the *referenced* role (via the managed policy's
      // Roles), not be silently dropped - otherwise the harness deploys green and fails at first
      // invoke. The imported role's name ('existing-role') is what CloudFormation references.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        Roles: ['existing-role'],
        PolicyDocument: {
          Statement: Match.arrayWith([Match.objectLike({ Sid: 'BedrockModelInvocation' })]),
        },
      });
    });

    test('should make the created harness depend on its execution-role managed policy', () => {
      // The permission set attaches policy-side (MdaaManagedPolicy `roles: [role]`), which creates no
      // implicit CfnHarness->policy dependency. Without the explicit dependency added by the construct,
      // CreateHarness can run before the policy attaches and the first deploy fails with
      // `NotStabilized: Role validation failed`. Assert the DependsOn edge is present.
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'dep-role-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'dep-role-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Resolve the harness execution-role managed policy's logical id via its BedrockModelInvocation Sid.
      const managedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
      const policyLogicalId = Object.entries(managedPolicies).find(([, policy]) =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (statement: { Sid?: string }) => statement.Sid === 'BedrockModelInvocation',
        ),
      )?.[0];
      expect(policyLogicalId).toBeDefined();

      const harnesses = template.findResources('AWS::BedrockAgentCore::Harness');
      expect(Object.keys(harnesses)).toHaveLength(1);
      const harness = Object.values(harnesses)[0];
      expect(harness.DependsOn).toContain(policyLogicalId);
    });

    test('should scope InvokeModel(+Stream) to the resolved model ARN, not a wildcard', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'scoped-model-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'scoped-model-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockModelInvocation',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource:
                'arn:test-partition:bedrock:test-region::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0',
            }),
          ]),
        },
      });
    });

    test('should add GetInferenceProfile for inference-profile model ids', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'inference-profile-harness',
        modelId: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'inference-profile-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockModelInvocation',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
            }),
          ]),
        },
      });
    });

    test('should grant the paired foundation-model ARN (InferenceProfileArn-gated) for a cross-region inference profile', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'inference-profile-fm-harness',
        modelId: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(
        testApp.testStack,
        'inference-profile-fm-harness-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      // Invoke on the profile ARN alone yields AccessDeniedException at runtime; the destination
      // foundation model must also be granted, region-wildcarded and gated to this profile so the
      // grant is usable only through it.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockInferenceProfileModelInvocation',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: 'arn:test-partition:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0',
              Condition: {
                StringLike: {
                  'bedrock:InferenceProfileArn':
                    'arn:test-partition:bedrock:test-region:test-account:inference-profile/us.anthropic.claude-sonnet-4-6-20250514-v1:0',
                },
              },
            }),
          ]),
        },
      });
    });

    // An application inference profile needs the same paired foundation-model grant a system profile
    // does, but its id is opaque so that grant cannot be scoped at synth. Accepting one would emit a
    // role holding invoke on the profile alone - deploys clean, then AccessDeniedException at first
    // invoke. Reject at synth instead; the error must name the supported alternatives.
    test('should throw for an application inference profile ARN rather than under-scoping the role', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'app-profile-harness',
        modelId: 'arn:aws:bedrock:test-region:test-account:application-inference-profile/abc123def456',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'app-profile-harness-construct', constructProps);
      }).toThrow('does not support application inference profile ARNs');
      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'app-profile-harness-construct-2', constructProps);
      }).toThrow('Use a system inference-profile id');
    });

    test('should NOT add the paired foundation-model statement for a plain foundation-model id', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'plain-model-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'plain-model-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const harnessPolicy = Object.values(policies).find(policy =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (s: { Sid?: string }) => s.Sid === 'BedrockModelInvocation',
        ),
      );
      const sids = (harnessPolicy!.Properties.PolicyDocument.Statement as { Sid?: string }[]).map(s => s.Sid);
      expect(sids).not.toContain('BedrockInferenceProfileModelInvocation');
    });

    test('should render the full statement set and stay under the managed-policy size limit when every conditional grant fires', () => {
      // Every config-conditional grant enabled at once: a guardrail, an agentcore_gateway tool, and a
      // custom container image. This is the worst-case (largest) execution-role policy the construct
      // can emit. (Memory is disabled, so there is no AgentCore Memory grant.)
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'max-policy-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'abc123', version: '1' },
        tools: {
          gateway_tools: {
            agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gw' },
          },
        },
        container: { containerUri: 'test-account.dkr.ecr.test-region.amazonaws.com/my-harness:latest' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'max-policy-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Locate the harness execution-role managed policy (not the log-protection CR policies) by its
      // BedrockModelInvocation Sid, and pull out its statement list.
      const managedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
      const harnessPolicy = Object.values(managedPolicies).find(policy =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (statement: { Sid?: string }) => statement.Sid === 'BedrockModelInvocation',
        ),
      );
      expect(harnessPolicy).toBeDefined();
      const statements: { Sid?: string }[] = harnessPolicy!.Properties.PolicyDocument.Statement;

      // The complete worst-case Sid set: 13 always-on statements + 3 conditional ones. The harness
      // image ECR pull/token grants are always emitted with a single Sid pair (HarnessImageEcr*), scoped
      // here to BOTH the always-granted AWS-managed harness-<region> repo and the BYO container
      // repository. No ECR-Public/STS-bearer grants: VPC mode pulls from private ECR only.
      const expectedSids = [
        'BedrockModelInvocation',
        'XRayTracingAccess',
        'CloudWatchLogsGroup',
        'CloudWatchLogsDescribeGroups',
        'CloudWatchLogsStream',
        'CloudWatchLogsPutResourcePolicy',
        'CloudWatchMetricsPublish',
        'AgentCoreWorkloadIdentity',
        'AgentCoreBrowserDefault',
        'AgentCoreCodeInterpreterDefault',
        'DenyRoleAssumption',
        'HarnessImageEcrPull',
        'HarnessImageEcrToken',
        'AllowApplyBedrockGuardrail',
        'GuardrailKmsDecrypt',
        'AllowInvokeGateway',
      ];
      expect(statements.map(s => s.Sid).sort()).toEqual([...expectedSids].sort());
      // No conditional was dropped and nothing extra crept in.
      expect(statements).toHaveLength(expectedSids.length);

      // IAM caps a customer-managed policy document at 6,144 characters. Assert the rendered policy
      // (whitespace stripped, as IAM measures it) stays comfortably under that ceiling in the worst
      // case. CDK tokens (KMS key ARN etc.) are not part of this policy, so JSON.stringify is faithful.
      const renderedSize = JSON.stringify(harnessPolicy!.Properties.PolicyDocument).length;
      expect(renderedSize).toBeLessThan(6144);
    });
  });

  describe('Idle TTL / Lifecycle Configuration', () => {
    test('should map idleRuntimeSessionTimeout to the lifecycleConfiguration, not TimeoutSeconds', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'idle-ttl-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        lifecycleConfiguration: { idleRuntimeSessionTimeout: 900 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'idle-ttl-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Environment: {
          AgentCoreRuntimeEnvironment: {
            LifecycleConfiguration: { IdleRuntimeSessionTimeout: 900 },
          },
        },
        TimeoutSeconds: Match.absent(),
      });
    });

    test('should throw for an idle timeout outside 60-28800 seconds', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'invalid-idle-ttl-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        lifecycleConfiguration: { idleRuntimeSessionTimeout: 30 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'invalid-idle-ttl-harness-construct', constructProps);
      }).toThrow('idleRuntimeSessionTimeout must be between 60 and 28800 seconds');
    });

    test('should populate timeoutSeconds and maxIterations independently of lifecycleConfiguration', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'timeout-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        timeoutSeconds: 300,
        maxIterations: 10,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'timeout-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        TimeoutSeconds: 300,
        MaxIterations: 10,
      });
    });
  });

  describe('JWT Authorizer Configuration', () => {
    test('should create harness with JWT authorizer', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'jwt-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        authorizerConfiguration: {
          customJwt: {
            discoveryUrl:
              'https://cognito-idp.test-region.amazonaws.com/test-region_test/.well-known/openid-configuration',
            allowedAudience: ['client-id-1', 'client-id-2'],
            allowedClients: ['client-id-1'],
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'jwt-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        AuthorizerConfiguration: {
          CustomJWTAuthorizer: {
            DiscoveryUrl:
              'https://cognito-idp.test-region.amazonaws.com/test-region_test/.well-known/openid-configuration',
            AllowedAudience: ['client-id-1', 'client-id-2'],
            AllowedClients: ['client-id-1'],
          },
        },
      });
    });

    test('should omit AuthorizerConfiguration when no customJwt is set (AWS IAM fallback)', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'iam-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'iam-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        AuthorizerConfiguration: Match.absent(),
      });
    });

    test('should throw for an invalid discovery URL', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'invalid-jwt-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        authorizerConfiguration: {
          customJwt: { discoveryUrl: 'https://invalid-url.com' },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'invalid-jwt-harness-construct', constructProps);
      }).toThrow('DiscoveryUrl must match pattern');
    });
  });

  describe('Inline Function Tool', () => {
    test('should render an inline_function tool', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'inline-fn-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          get_weather: {
            inlineFunction: {
              description: 'Returns the current weather for a city',
              inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
            },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'inline-fn-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Tools: [
          {
            Type: 'inline_function',
            Name: 'get_weather',
            Config: {
              InlineFunction: {
                Description: 'Returns the current weather for a city',
                InputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
              },
            },
          },
        ],
      });
    });

    test('should throw when a tool sets neither inlineFunction nor agentCoreGateway', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-tool-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: { nothing: {} },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-tool-harness-construct', constructProps);
      }).toThrow('must set exactly one of "inlineFunction" or "agentCoreGateway"');
    });

    test('should throw when a tool sets both inlineFunction and agentCoreGateway', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'both-tool-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          both: {
            inlineFunction: { description: 'x', inputSchema: { type: 'object' } },
            agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gw' },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'both-tool-harness-construct', constructProps);
      }).toThrow('must set exactly one of "inlineFunction" or "agentCoreGateway"');
    });

    test('should throw when a tool name violates the HarnessTool.Name pattern', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-tool-name-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          'get weather!': {
            inlineFunction: { description: 'x', inputSchema: { type: 'object' } },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-tool-name-harness-construct', constructProps);
      }).toThrow('Harness tool name must match');
    });

    test('should throw when a tool name exceeds 64 characters', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'long-tool-name-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          ['a'.repeat(65)]: {
            inlineFunction: { description: 'x', inputSchema: { type: 'object' } },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'long-tool-name-harness-construct', constructProps);
      }).toThrow('Harness tool name must be 1-64 characters');
    });

    test('should throw when an inlineFunction description is empty', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'empty-desc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          get_weather: {
            inlineFunction: { description: '   ', inputSchema: { type: 'object' } },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'empty-desc-harness-construct', constructProps);
      }).toThrow('inlineFunction "description" is required');
    });

    test('should throw when an inlineFunction description exceeds 4096 characters', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'long-desc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          get_weather: {
            inlineFunction: { description: 'x'.repeat(4097), inputSchema: { type: 'object' } },
          },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'long-desc-harness-construct', constructProps);
      }).toThrow('inlineFunction "description" must be at most 4096 characters');
    });
  });

  describe('AgentCore Gateway Tool', () => {
    test('should render an agentcore_gateway tool with a literal ARN and grant scoped InvokeGateway', () => {
      const gatewayArn = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gw';
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'gw-literal-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: { gateway_tools: { agentCoreGateway: { gatewayArn } } },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'gw-literal-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Tools: [
          {
            Type: 'agentcore_gateway',
            Name: 'gateway_tools',
            Config: {
              AgentCoreGateway: {
                GatewayArn: gatewayArn,
                OutboundAuth: { AwsIam: {} },
              },
            },
          },
        ],
      });

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowInvokeGateway',
              Effect: 'Allow',
              Action: 'bedrock-agentcore:InvokeGateway',
              Resource: gatewayArn,
            }),
          ]),
        },
      });
    });

    test('should resolve a config:<name> gatewayArn reference against the gateways map', () => {
      const gatewayArn = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/resolved-gw';
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'gw-config-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: { gateway_tools: { agentCoreGateway: { gatewayArn: 'config:my-gateway' } } },
        gateways: { 'my-gateway': gatewayArn },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'gw-config-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Tools: [Match.objectLike({ Config: { AgentCoreGateway: { GatewayArn: gatewayArn } } })],
      });
    });

    // Regression: `tools` is keyed by tool name, so two gateway tools cannot collide on one name. When
    // it was a list, a duplicate name silently collapsed both tools onto the last gateway's ARN and
    // dropped the first gateway from AllowInvokeGateway - no synth error. Distinct keys must stay
    // distinct end to end: one tool and one grant per gateway.
    test('should keep two gateway tools independent, wiring and granting each gateway separately', () => {
      const gatewayArnA = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/gw-alpha';
      const gatewayArnB = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/gw-beta';
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'gw-multi-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: {
          alpha_tools: { agentCoreGateway: { gatewayArn: gatewayArnA } },
          beta_tools: { agentCoreGateway: { gatewayArn: gatewayArnB } },
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'gw-multi-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Each tool keeps its own gateway ARN - no last-write-wins collapse.
      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Tools: [
          Match.objectLike({ Name: 'alpha_tools', Config: { AgentCoreGateway: { GatewayArn: gatewayArnA } } }),
          Match.objectLike({ Name: 'beta_tools', Config: { AgentCoreGateway: { GatewayArn: gatewayArnB } } }),
        ],
      });
      // ...and both gateways reach the IAM grant.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowInvokeGateway',
              Resource: [gatewayArnA, gatewayArnB],
            }),
          ]),
        },
      });
    });

    test('should throw when a config:<name> gatewayArn reference is unknown', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'gw-unknown-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: { gateway_tools: { agentCoreGateway: { gatewayArn: 'config:missing-gateway' } } },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'gw-unknown-harness-construct', constructProps);
      }).toThrow('references unknown gateway from config: "missing-gateway"');
    });

    test('should throw when an agentCoreGateway gatewayArn is an empty string', () => {
      // Regression: an empty gatewayArn is not a `config:` reference, so it would pass through as a
      // literal and render `resources: ['']` on AllowInvokeGateway plus `GatewayArn: ""` - a deploy-time
      // MalformedPolicyDocument. Fail at synth instead.
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'gw-empty-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        tools: { gateway_tools: { agentCoreGateway: { gatewayArn: '' } } },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'gw-empty-harness-construct', constructProps);
      }).toThrow('agentCoreGateway "gatewayArn" is required and must be a non-empty string.');
    });

    test('should not grant InvokeGateway when no agentcore_gateway tools are configured', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'no-gw-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-gw-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const hasInvokeGatewayStatement = Object.values(policies).some(policy => {
        const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
        return statements.some((s: { Sid?: string }) => s.Sid === 'AllowInvokeGateway');
      });
      expect(hasInvokeGatewayStatement).toBe(false);
    });
  });

  describe('Guardrail', () => {
    test('should render the guardrail escape hatch and grant scoped ApplyGuardrail for a literal id', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-literal-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'abc123', version: '1' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'guardrail-literal-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            AdditionalParams: {
              guardrailConfig: {
                guardrailIdentifier: 'abc123',
                guardrailVersion: '1',
                // Default trace is the valid lowercase Converse value, not the invalid 'ENABLED'.
                trace: 'enabled',
              },
            },
            // The harness always renders the Converse (converse_stream) API - the only format that
            // carries guardrailConfig - so a guarded harness is always self-consistent.
            ApiFormat: 'converse_stream',
          },
        },
      });

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowApplyBedrockGuardrail',
              Effect: 'Allow',
              Action: 'bedrock:ApplyGuardrail',
              Resource: 'arn:test-partition:bedrock:test-region:test-account:guardrail/abc123',
            }),
            Match.objectLike({
              Sid: 'GuardrailKmsDecrypt',
              Effect: 'Allow',
              Action: ['kms:Decrypt', 'kms:DescribeKey'],
              Condition: {
                StringLike: {
                  'kms:ViaService': 'bedrock.test-region.amazonaws.com',
                },
              },
            }),
          ]),
        },
      });
    });

    test('should not grant GuardrailKmsDecrypt when no guardrail is configured', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'no-guardrail-kms-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-guardrail-kms-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const harnessPolicy = Object.values(policies).find(policy =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (s: { Sid?: string }) => s.Sid === 'BedrockModelInvocation',
        ),
      );
      const sids = (harnessPolicy!.Properties.PolicyDocument.Statement as { Sid?: string }[]).map(s => s.Sid);
      expect(sids).not.toContain('GuardrailKmsDecrypt');
    });

    test('should not double-wrap a guardrail id that is already a full ARN', () => {
      const guardrailArn = 'arn:aws:bedrock:test-region:test-account:guardrail/gr-abc123';
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-arn-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: guardrailArn, version: '1' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'guardrail-arn-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // The ApplyGuardrail grant is scoped to the ARN verbatim - never re-wrapped into
      // '...:guardrail/arn:aws:bedrock:...'.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowApplyBedrockGuardrail',
              Action: 'bedrock:ApplyGuardrail',
              Resource: guardrailArn,
            }),
          ]),
        },
      });
    });

    test('should render an explicit guardrail trace', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-trace-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'abc123', version: '1', trace: HarnessGuardrailTrace.ENABLED_FULL },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'guardrail-trace-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            AdditionalParams: { guardrailConfig: { trace: 'enabled_full' } },
          },
        },
      });
    });

    test('should throw for a guardrail trace outside the enum', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-trace-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        // Simulate an untyped/YAML caller passing the (invalid) legacy uppercase value.
        guardrail: { id: 'abc123', version: '1', trace: 'ENABLED' as HarnessGuardrailTrace },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-trace-harness-construct', constructProps);
      }).toThrow('Harness "guardrail.trace" must be one of');
    });

    test('should resolve a config:<name> guardrail reference and use its live version', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-config-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'config:my-guardrail' },
        guardrails: { 'my-guardrail': { guardrailId: 'resolved-id', guardrailVersion: '3' } },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'guardrail-config-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Model: {
          BedrockModelConfig: {
            AdditionalParams: {
              guardrailConfig: {
                guardrailIdentifier: 'resolved-id',
                guardrailVersion: '3',
              },
            },
          },
        },
      });
    });

    test('should reject an empty guardrail id', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-empty-id-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: '', version: '1' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'guardrail-empty-id-harness-construct',
          constructProps,
        );
      }).toThrow('Harness guardrail "id" is required and must be a non-empty string.');
    });

    test('should reject an empty guardrail version alongside a config:<name> reference', () => {
      // Regression: an empty-string version must not survive as `guardrailVersion: ""`. validateGuardrail
      // rejects it at synth (the `||` fallback in resolveGuardrail is the defence-in-depth backstop).
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-empty-version-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'config:my-guardrail', version: '' },
        guardrails: { 'my-guardrail': { guardrailId: 'resolved-id', guardrailVersion: '3' } },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'guardrail-empty-version-harness-construct',
          constructProps,
        );
      }).toThrow('Harness guardrail "version", when provided, must be a non-empty string.');
    });

    test('should throw when a literal guardrail id has no version', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-no-version-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'abc123' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'guardrail-no-version-harness-construct',
          constructProps,
        );
      }).toThrow('Harness guardrail "version" is required when "id" is a literal guardrail id.');
    });

    test('should throw when a config:<name> guardrail reference is unknown', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'guardrail-unknown-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        guardrail: { id: 'config:missing-guardrail' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'guardrail-unknown-harness-construct',
          constructProps,
        );
      }).toThrow('references unknown guardrail from config: "missing-guardrail"');
    });

    test('should not grant ApplyGuardrail when no guardrail is configured', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'no-guardrail-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-guardrail-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const hasApplyGuardrailStatement = Object.values(policies).some(policy => {
        const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
        return statements.some((s: { Sid?: string }) => s.Sid === 'AllowApplyBedrockGuardrail');
      });
      expect(hasApplyGuardrailStatement).toBe(false);
    });
  });

  describe('SSM Parameters', () => {
    test('should create SSM parameters for harness arn/id/role-arn', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ssm-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'ssm-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const params = template.findResources('AWS::SSM::Parameter');
      const paramNames = Object.values(params).map(p => p.Properties.Name as string);
      expect(paramNames.some(n => n.endsWith('/harness/ssm-harness/arn'))).toBe(true);
      expect(paramNames.some(n => n.endsWith('/harness/ssm-harness/id'))).toBe(true);
      expect(paramNames.some(n => n.endsWith('/harness/ssm-harness/role-arn'))).toBe(true);
      // The harness no longer provisions its own key, so it publishes no kms-key-arn parameter.
      expect(paramNames.some(n => n.endsWith('/harness/ssm-harness/kms-key-arn'))).toBe(false);
    });
  });

  describe('Log Protection', () => {
    test('should apply the caller-provided key via a log protection custom resource', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'log-protection-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'log-protection-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // The harness is a pure key consumer: the only KMS key in the stack is the caller-provided one
      // (created in the test), never a harness-owned key.
      template.resourceCountIs('AWS::KMS::Key', 1);
      template.resourceCountIs('Custom::AgentCoreLogProtection', 1);
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        runtimeId: Match.anyValue(),
        kmsKeyArn: Match.anyValue(),
      });
    });

    test('should pass logRetentionDays to the custom resource', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'retention-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        logRetentionDays: 90,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'retention-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        retentionDays: '90',
      });
    });

    test('should pass the always-on data protection policy (built-in floor plus additions)', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'dp-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        dataProtection: { additionalIdentifiers: ['DriversLicense-US'] },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'dp-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const crs = template.findResources('Custom::AgentCoreLogProtection');
      const policyJson = Object.values(crs)[0].Properties.dataProtectionPolicy as string;
      // Built-in floor identifier plus the caller-supplied addition are both present.
      expect(policyJson).toContain('data-identifier/EmailAddress');
      expect(policyJson).toContain('data-identifier/DriversLicense-US');
      // The policy Name is the module-specific literal this construct passes to the shared
      // buildDataProtectionPolicy; pinning it guards against the shared builder's default diverging
      // (the AgentCore Runtime construct pins its own 'agentcore-runtime-data-protection' the same way).
      expect(policyJson).toContain('"Name":"agentcore-harness-data-protection"');
    });
  });

  describe('Allowed Tools', () => {
    test('should render AllowedTools when set', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'allowed-tools-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        allowedTools: ['file_*', '@builtin/shell'],
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'allowed-tools-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        AllowedTools: ['file_*', '@builtin/shell'],
      });
    });

    test('should omit AllowedTools when the list is empty', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'empty-allowed-tools-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        allowedTools: [],
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(
        testApp.testStack,
        'empty-allowed-tools-harness-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        AllowedTools: Match.absent(),
      });
    });

    test('should throw for a blank allowedTools entry', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'blank-allowed-tools-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        allowedTools: ['   '],
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'blank-allowed-tools-harness-construct',
          constructProps,
        );
      }).toThrow('Harness "allowedTools" entries must be non-empty strings.');
    });

    test('should throw when allowedTools exceeds the 64-entry maximum', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'over-max-allowed-tools-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        // 65 entries - one over the AllowedTools CFN cap of 64.
        allowedTools: Array.from({ length: 65 }, (_, i) => `tool_${i}`),
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'over-max-allowed-tools-harness-construct',
          constructProps,
        );
      }).toThrow('Harness "allowedTools" must contain at most 64 entries; received 65.');
    });
  });

  describe('Skills', () => {
    test('should render path skills', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'skills-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        skills: [{ path: '/skills/analysis' }, { path: '/skills/reporting' }],
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'skills-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Skills: [{ Path: '/skills/analysis' }, { Path: '/skills/reporting' }],
      });
    });

    test('should throw for a blank skill path', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-skill-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        skills: [{ path: '  ' }],
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-skill-harness-construct', constructProps);
      }).toThrow('Harness "skills[0].path" is required');
    });
  });

  describe('Memory', () => {
    // Memory is not supported yet: every harness is deployed with memory disabled, so no memory
    // resource is created and the execution role gets no memory grant.
    test('should set the empty Disabled opt-out marker and add no memory grant', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'memory-off-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'memory-off-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // The service opt-out marker is the empty object `Memory.Disabled: {}` - no memory resource is
      // created.
      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Memory: { Disabled: {} },
      });
      // With memory off, the execution role gets no AgentCore Memory grant.
      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const hasMemoryGrant = Object.values(policies).some(policy =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (statement: { Sid?: string }) => statement.Sid === 'AgentCoreMemory',
        ),
      );
      expect(hasMemoryGrant).toBe(false);
    });
  });

  describe('Container', () => {
    test('should render the environment artifact and scope private-ECR pull to the repository', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'container-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        container: { containerUri: 'test-account.dkr.ecr.test-region.amazonaws.com/my-harness:latest' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'container-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        EnvironmentArtifact: {
          ContainerConfiguration: {
            ContainerUri: 'test-account.dkr.ecr.test-region.amazonaws.com/my-harness:latest',
          },
        },
      });
      // The harness-image ECR pull grant covers BOTH the AWS-managed base image (harness-<region>, pulled
      // even for a BYO container) AND the resolved BYO container repository. Omitting the managed repo was
      // proven at runtime to fail the pull with 403, hanging the invoke.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'HarnessImageEcrPull',
              Resource: Match.arrayWith([
                'arn:test-partition:ecr:test-region:*:repository/harness-test-region',
                'arn:test-partition:ecr:test-region:test-account:repository/my-harness',
              ]),
            }),
          ]),
        },
      });
    });

    test('should throw for an invalid ECR container URI', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-container-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        container: { containerUri: 'docker.io/library/nginx:latest' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-container-harness-construct', constructProps);
      }).toThrow('Invalid ECR container URI format');
    });

    test('should throw for a blank container URI', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'blank-container-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        container: { containerUri: '   ' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'blank-container-harness-construct', constructProps);
      }).toThrow('Harness "container.containerUri" is required and must be a non-empty string.');
    });
  });

  describe('Network Configuration', () => {
    test('should render VPC network configuration with NetworkMode VPC', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'vpc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: { securityGroups: ['sg-123'], subnets: ['subnet-a', 'subnet-b'] },
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'vpc-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Environment: {
          AgentCoreRuntimeEnvironment: {
            NetworkConfiguration: {
              NetworkMode: 'VPC',
              NetworkModeConfig: { SecurityGroups: ['sg-123'], Subnets: ['subnet-a', 'subnet-b'] },
            },
          },
        },
      });
    });

    test('should throw when securityGroups is empty', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-vpc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: { securityGroups: [], subnets: ['subnet-a'] },
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-vpc-harness-construct', constructProps);
      }).toThrow('Harness "networkConfiguration.securityGroups" must contain 1-16');
    });

    test('should throw when subnets is out of bounds (empty)', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-subnet-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: { securityGroups: ['sg-123'], subnets: [] },
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-subnet-harness-construct', constructProps);
      }).toThrow('Harness "networkConfiguration.subnets" must contain 1-16');
    });

    test('should throw when networkConfiguration is omitted (VPC mode is enforced)', () => {
      const constructProps = {
        harnessName: 'no-net-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      } as unknown as BedrockAgentcoreHarnessL3ConstructProps;

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-net-harness-construct', constructProps);
      }).toThrow('Harness "networkConfiguration" is required');
    });
  });

  describe('VPC endpoint wiring', () => {
    const VPCE_NET = {
      securityGroups: ['sg-0123456789abcdef0'],
      subnets: ['subnet-0123456789abcdef0'],
      vpcEndpoints: 'agentcore-private',
    };
    const GATEWAY_TOOL = {
      gateway_tools: {
        agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gw' },
      },
    };

    /** The services every VPC-mode harness derives regardless of its tool configuration. */
    const ALWAYS_REQUIRED_SERVICES = ['bedrock-runtime', 'ecr.api', 'ecr.dkr', 'sts', 'logs'];
    const AGENTCORE_GATEWAY_SERVICE = 'bedrock-agentcore.gateway';

    /**
     * The endpoints the orchestrating module resolved for this harness from the set it references,
     * already narrowed to the services the harness derives.
     */
    function resolved(services: string[]) {
      return {
        vpcId: 'vpc-0123456789abcdef0',
        securityGroupIds: Object.fromEntries(
          services.map(service => [service, `sg-vpce-${service.replace(/\./g, '-')}`]),
        ),
      };
    }

    /**
     * Builds a harness with the given network config, returning the synthesized template. The resolved
     * access defaults to whatever the network config's set reference implies, so a harness referencing no
     * set gets none - matching what the orchestrating module does.
     */
    function synth(
      id: string,
      networkConfiguration: BedrockAgentcoreHarnessL3ConstructProps['networkConfiguration'],
      tools?: BedrockAgentcoreHarnessL3ConstructProps['tools'],
      accessOverride?: BedrockAgentcoreHarnessL3ConstructProps['vpcEndpointAccess'],
    ): Template {
      const derived = networkConfiguration.vpcEndpoints
        ? resolved(tools ? [...ALWAYS_REQUIRED_SERVICES, AGENTCORE_GATEWAY_SERVICE] : ALWAYS_REQUIRED_SERVICES)
        : undefined;
      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, `${id}-construct`, {
        harnessName: id,
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration,
        tools,
        kmsKey,
        vpcEndpointAccess: accessOverride ?? derived,
        naming: testApp.naming,
        roleHelper,
      });
      return Template.fromStack(testApp.testStack);
    }

    test('should create no endpoints or connectivity wiring when no set is referenced', () => {
      const template = synth('no-vpce-harness', {
        securityGroups: ['sg-0123456789abcdef0'],
        subnets: ['subnet-0123456789abcdef0'],
      });

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
    });

    test('should treat a null set reference as opted out, as YAML with no value parses it', () => {
      const template = synth('null-ref-harness', {
        securityGroups: ['sg-123'],
        subnets: ['subnet-a'],
        vpcEndpoints: null as unknown as string,
      });

      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
    });

    test('should create only consumer-side wiring, never an endpoint', () => {
      const template = synth('consumer-harness', VPCE_NET);

      // The whole point of the split: the orchestrating module owns the endpoints (one set per VPC), the
      // harness owns a client SG and its rules and nothing else.
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', ALWAYS_REQUIRED_SERVICES.length);
    });

    test('should grant HTTPS from its own client security group on each resolved endpoint group', () => {
      const template = synth('ingress-harness', VPCE_NET);

      // A client SG per harness is what keeps endpoint ingress rules per consumer: harnesses sharing a
      // set share the endpoints, and their rules differ by source rather than colliding.
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-vpce-bedrock-runtime',
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
      });
      Object.values(template.findResources('AWS::EC2::SecurityGroupIngress')).forEach(rule => {
        expect(rule.Properties.CidrIp).toBeUndefined();
        expect(rule.Properties.SourceSecurityGroupId).toBeDefined();
      });
    });

    test('should create the client security group in the set VPC', () => {
      const template = synth('vpc-harness', VPCE_NET);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', { VpcId: 'vpc-0123456789abcdef0' });
    });

    test('should attach the client security group to the harness alongside the configured groups', () => {
      const template = synth('sg-attach-harness', VPCE_NET);

      // Without this the sessions have no membership in the group the endpoints admit, so the harness
      // reaches READY and then hangs at first invoke.
      const harness = Object.values(template.findResources('AWS::BedrockAgentCore::Harness'))[0];
      const groups = harness.Properties?.Environment?.AgentCoreRuntimeEnvironment?.NetworkConfiguration
        ?.NetworkModeConfig?.SecurityGroups as unknown[];
      expect(groups).toHaveLength(2);
      expect(groups[0]).toEqual('sg-0123456789abcdef0');
    });

    test('should egress only HTTPS to the resolved endpoint security groups', () => {
      const template = synth('egress-harness', VPCE_NET);

      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        DestinationSecurityGroupId: 'sg-vpce-bedrock-runtime',
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
      });
    });

    /** Logical IDs of every security-group rule in a template, sorted. */
    function ruleLogicalIds(template: Template): string[] {
      return Object.entries(template.toJSON().Resources as { [id: string]: { Type: string } })
        .filter(([, resource]) => RULE_TYPES.has(resource.Type))
        .map(([logicalId]) => logicalId)
        .sort();
    }

    test('should key both rules of a pair on the service, not on its position', () => {
      // CDK names an egress rule after its peer, and for an unresolved token that name is a positional
      // counter ({IndirectPeer}, {IndirectPeer2}, ...). Adding or removing one service would renumber the
      // rest, and every property of a rule being create-only, CloudFormation would author a replacement
      // identical to a rule it has not deleted yet: InvalidPermission.Duplicate on update.
      const ids = ruleLogicalIds(synth('stable-id-harness', VPCE_NET));

      expect(ids).toHaveLength(2 * ALWAYS_REQUIRED_SERVICES.length);
      expect(ids.filter(id => id.includes('IndirectPeer'))).toHaveLength(0);
      ALWAYS_REQUIRED_SERVICES.forEach(service => {
        const flattened = service.replace(/[.-]/g, '');
        expect(ids.filter(id => id.toLowerCase().includes(flattened))).toHaveLength(2);
      });
    });

    test('should name the client security group per harness so co-located harnesses do not collide', () => {
      ['name-a-harness', 'name-b-harness'].forEach(harnessName => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, `${harnessName}-construct`, {
          harnessName,
          modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
          systemPrompt: 'Be concise.',
          networkConfiguration: VPCE_NET,
          kmsKey,
          vpcEndpointAccess: resolved(ALWAYS_REQUIRED_SERVICES),
          naming: testApp.naming,
          roleHelper,
        });
      });
      const template = Template.fromStack(testApp.testStack);

      const groupNames = Object.values(template.findResources('AWS::EC2::SecurityGroup'))
        .map(sg => sg.Properties?.GroupName as string)
        .filter(name => typeof name === 'string' && name.includes('name-') && name.includes('harness'));

      expect(groupNames).toHaveLength(2);
      expect(new Set(groupNames).size).toBe(2);
    });

    test('should wire the gateway endpoint for a harness declaring a gateway tool', () => {
      const template = synth('gw-harness', VPCE_NET, GATEWAY_TOOL);

      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-vpce-bedrock-agentcore-gateway',
      });
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', ALWAYS_REQUIRED_SERVICES.length + 1);
    });

    test('should wire only the endpoints resolved, so a non-gateway harness never reaches the gateway', () => {
      // The orchestrating module provisions the union its VPC needs but resolves only what this harness
      // derives, so a harness sharing a set with a gateway harness is granted no access to that endpoint.
      const template = synth('no-gw-harness', VPCE_NET);

      const ingressGroups = Object.values(template.findResources('AWS::EC2::SecurityGroupIngress')).map(
        rule => rule.Properties?.GroupId as string,
      );
      expect(ingressGroups).not.toContain('sg-vpce-bedrock-agentcore-gateway');
      expect(ingressGroups).toHaveLength(ALWAYS_REQUIRED_SERVICES.length);
    });

    test('should wire nothing for a service the set marks external', () => {
      // An external service is reached without an endpoint the set manages, so it is absent from the
      // resolved map and gets no rule pair.
      const template = synth('external-harness', VPCE_NET, undefined, resolved(['bedrock-runtime']));

      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 1);
    });

    test('should throw when a set is referenced but the orchestrator resolved nothing', () => {
      // Guards the construct being used directly rather than through the module that owns the sets, so
      // it is built without the helper's derived access.
      expect(
        () =>
          new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'unresolved-harness-construct', {
            harnessName: 'unresolved-harness',
            modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
            systemPrompt: 'Be concise.',
            networkConfiguration: VPCE_NET,
            kmsKey,
            naming: testApp.naming,
            roleHelper,
          }),
      ).toThrow('references set "agentcore-private", which is resolved by the module that owns the sets');
    });

    test('should throw on a blank set reference', () => {
      expect(() => synth('blank-ref-harness', { ...VPCE_NET, vpcEndpoints: '   ' })).toThrow(
        'must name a VPC endpoint set declared in the module',
      );
    });

    test('should throw on a non-string set reference instead of a TypeError', () => {
      expect(() => synth('numeric-ref-harness', { ...VPCE_NET, vpcEndpoints: 123 as unknown as string })).toThrow(
        'must name a VPC endpoint set declared in the module',
      );
    });

    test('should throw when the configured security groups leave no room for the client group', () => {
      expect(() =>
        synth('sg-full-harness', {
          ...VPCE_NET,
          securityGroups: Array.from({ length: 16 }, (_unused, index) => `sg-${index}`),
        }),
      ).toThrow('can contain at most 15 entries');
    });

    test('should publish no endpoint SSM parameters (the endpoints are in-stack resources)', () => {
      const template = synth('no-ssm-harness', VPCE_NET);

      const endpointParams = Object.values(template.findResources('AWS::SSM::Parameter')).filter(param =>
        JSON.stringify(param.Properties?.Name).includes('vpc-endpoint'),
      );
      expect(endpointParams).toHaveLength(0);
    });
  });

  describe('Environment Variables', () => {
    test('should render environment variables', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'env-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        environmentVariables: { LOG_LEVEL: 'DEBUG' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'env-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        EnvironmentVariables: { LOG_LEVEL: 'DEBUG' },
      });
    });
  });

  describe('Cost Controls', () => {
    test('should render the top-level MaxTokens cap', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'maxtokens-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        maxTokens: 100000,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'maxtokens-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        MaxTokens: 100000,
      });
    });

    test('should throw for a non-positive top-level maxTokens', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-maxtokens-top-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        maxTokens: 0,
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(
          testApp.testStack,
          'bad-maxtokens-top-harness-construct',
          constructProps,
        );
      }).toThrow('Harness "maxTokens" must be an integer >= 1');
    });

    test('should render maxLifetime in the lifecycle configuration', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'maxlifetime-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        lifecycleConfiguration: { idleRuntimeSessionTimeout: 900, maxLifetime: 3600 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'maxlifetime-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Environment: {
          AgentCoreRuntimeEnvironment: {
            LifecycleConfiguration: { IdleRuntimeSessionTimeout: 900, MaxLifetime: 3600 },
          },
        },
      });
    });

    test('should throw for a maxLifetime outside 60-28800 seconds', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-maxlifetime-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        lifecycleConfiguration: { maxLifetime: 30 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-maxlifetime-harness-construct', constructProps);
      }).toThrow('maxLifetime must be between 60 and 28800 seconds');
    });
  });

  describe('Harness Endpoint', () => {
    test('should create a HarnessEndpoint resource with a sanitized name and dependency', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', description: 'Production endpoint', targetVersion: '2' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      const construct = new BedrockAgentcoreHarnessL3Construct(
        testApp.testStack,
        'ep-harness-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      expect(construct.harnessEndpoint).toBeDefined();
      template.resourceCountIs('AWS::BedrockAgentCore::HarnessEndpoint', 1);
      template.hasResourceProperties('AWS::BedrockAgentCore::HarnessEndpoint', {
        HarnessId: Match.anyValue(),
        EndpointName: Match.stringLikeRegexp('prod'),
        Description: 'Production endpoint',
        TargetVersion: '2',
      });

      // Endpoint id is published to SSM.
      const params = template.findResources('AWS::SSM::Parameter');
      const paramNames = Object.values(params).map(p => p.Properties.Name as string);
      expect(paramNames.some(n => n.endsWith('/harnessendpoint/ep-harness/id'))).toBe(true);
    });

    test('should default TargetVersion to the harness current version when not pinned', () => {
      // No explicit targetVersion -> the endpoint must default to the harness's current version
      // (CfnHarness.attrVersion, a Fn::GetAtt) so a named endpoint ADVANCES on every redeploy instead of
      // freezing at its create-time version. Assert the property is the harness Version GetAtt.
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ep-float-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', description: 'Latest-tracking endpoint' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'ep-float-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Resolve the harness logical id to build the expected Fn::GetAtt.
      const harnessLogicalId = Object.keys(template.findResources('AWS::BedrockAgentCore::Harness'))[0];
      template.hasResourceProperties('AWS::BedrockAgentCore::HarnessEndpoint', {
        TargetVersion: { 'Fn::GetAtt': [harnessLogicalId, 'Version'] },
      });
    });

    // The endpoint is a raw CfnResource (no typed CfnHarnessEndpoint in the pinned CDK), so it is not
    // ITaggable and the app-level Tags.of(stack) aspect skips it - it would deploy untagged while the
    // Harness it fronts is tagged, silently outside cost-allocation and ownership attribution. The module
    // tags are therefore rendered directly, and must match what the Harness carries.
    test('should tag the HarnessEndpoint with the module tags, matching the Harness', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ep-tags-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
        tags: { mdaa_org: 'test-org', mdaa_env: 'test-env' },
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'ep-tags-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::HarnessEndpoint', {
        Tags: Match.arrayWith([
          { Key: 'mdaa_org', Value: 'test-org' },
          { Key: 'mdaa_env', Value: 'test-env' },
        ]),
      });
    });

    test('should omit Tags on the HarnessEndpoint when no module tags are supplied', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'ep-notags-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'ep-notags-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // An empty/absent tag map must omit the property entirely rather than render `Tags: []`.
      const endpoints = template.findResources('AWS::BedrockAgentCore::HarnessEndpoint');
      const props = Object.values(endpoints)[0].Properties as Record<string, unknown>;
      expect(props.Tags).toBeUndefined();
    });

    test('should not create a HarnessEndpoint when endpoint is unset', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'no-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-ep-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::BedrockAgentCore::HarnessEndpoint', 0);
    });

    test('should throw for a malformed endpoint targetVersion', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { targetVersion: 'v1' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-ep-harness-construct', constructProps);
      }).toThrow('Harness "endpoint.targetVersion" must match');
    });

    // Each endpoint field is validated independently. A function-wide `if (!targetVersion) return`
    // guard skipped description entirely whenever targetVersion was unset, so an over-long description
    // reached deploy and failed against the CFN 1-256 bound.
    test('should throw for an endpoint description over 256 characters, with no targetVersion set', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'long-desc-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', description: 'd'.repeat(257) },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'long-desc-ep-harness-construct', constructProps);
      }).toThrow('Harness "endpoint.description" must be 1-256 characters; received 257.');
    });

    test('should throw for a blank endpoint description', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'blank-desc-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', description: '' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'blank-desc-ep-harness-construct', constructProps);
      }).toThrow('Harness "endpoint.description" must be 1-256 characters');
    });

    // An empty string is falsy, so the old guard returned before the pattern check and `?? attrVersion`
    // preserved it (?? only falls back on null/undefined) - emitting TargetVersion: "" against the CFN
    // pattern. It must fail at synth instead.
    test('should throw for a present-but-blank endpoint targetVersion', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'blank-ver-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', targetVersion: '' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'blank-ver-ep-harness-construct', constructProps);
      }).toThrow('Harness "endpoint.targetVersion" must match');
    });

    test('should accept a 256-character endpoint description', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'max-desc-ep-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        endpoint: { name: 'prod', description: 'd'.repeat(256) },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'max-desc-ep-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::HarnessEndpoint', {
        Description: 'd'.repeat(256),
      });
    });
  });

  describe('Truncation', () => {
    test('should render a sliding_window truncation with messagesCount', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'trunc-sw-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SLIDING_WINDOW, messagesCount: 20 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'trunc-sw-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Truncation: {
          Strategy: 'sliding_window',
          Config: { SlidingWindow: { MessagesCount: 20 } },
        },
      });
    });

    test('should omit the sliding_window config block when messagesCount is unset (service default window)', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'trunc-sw-default-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SLIDING_WINDOW },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'trunc-sw-default-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // With no tuning field set, the strategy renders alone - no Config block (service default window).
      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Truncation: { Strategy: 'sliding_window', Config: Match.absent() },
      });
    });

    test('should omit the summarization config block when no tuning fields are set', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'trunc-sum-default-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SUMMARIZATION },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'trunc-sum-default-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Truncation: { Strategy: 'summarization', Config: Match.absent() },
      });
    });

    test('should render a summarization truncation with its tuning fields', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'trunc-sum-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: {
          strategy: HarnessTruncationStrategy.SUMMARIZATION,
          preserveRecentMessages: 5,
          summarizationSystemPrompt: 'Summarize the older turns.',
          summaryRatio: 0.5,
        },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'trunc-sum-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Truncation: {
          Strategy: 'summarization',
          Config: {
            Summarization: {
              PreserveRecentMessages: 5,
              SummarizationSystemPrompt: 'Summarize the older turns.',
              SummaryRatio: 0.5,
            },
          },
        },
      });
    });

    test('should render a none truncation with no config block', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'trunc-none-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.NONE },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'trunc-none-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', {
        Truncation: { Strategy: 'none', Config: Match.absent() },
      });
    });

    test('should omit Truncation when unset', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'no-trunc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'no-trunc-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Harness', { Truncation: Match.absent() });
    });

    test('should throw for a strategy outside the enum', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-trunc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: 'rolling' as HarnessTruncationStrategy },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-trunc-harness-construct', constructProps);
      }).toThrow('Harness "truncation.strategy" must be one of');
    });

    test('should throw when messagesCount is set on a non-sliding_window strategy', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'mismatch-trunc-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SUMMARIZATION, messagesCount: 10 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'mismatch-trunc-harness-construct', constructProps);
      }).toThrow('Harness "truncation.messagesCount" is only valid with strategy "sliding_window"');
    });

    test('should throw when summarization tuning is set on a non-summarization strategy', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'mismatch-sum-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SLIDING_WINDOW, summaryRatio: 0.5 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'mismatch-sum-harness-construct', constructProps);
      }).toThrow('summarization tuning');
    });

    test('should throw when summaryRatio is out of the (0, 1] range', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-ratio-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SUMMARIZATION, summaryRatio: 1.5 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-ratio-harness-construct', constructProps);
      }).toThrow('Harness "truncation.summaryRatio" must be in the range (0, 1]');
    });

    test('should throw when messagesCount is not a positive integer', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-msgcount-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SLIDING_WINDOW, messagesCount: 0 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-msgcount-harness-construct', constructProps);
      }).toThrow('Harness "truncation.messagesCount" must be an integer >= 1');
    });

    test('should throw when preserveRecentMessages is a negative integer', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-preserve-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SUMMARIZATION, preserveRecentMessages: -1 },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-preserve-harness-construct', constructProps);
      }).toThrow('Harness "truncation.preserveRecentMessages" must be an integer >= 0');
    });

    test('should throw when summarizationSystemPrompt is blank', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'bad-sumprompt-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        truncation: { strategy: HarnessTruncationStrategy.SUMMARIZATION, summarizationSystemPrompt: '   ' },
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'bad-sumprompt-harness-construct', constructProps);
      }).toThrow('Harness "truncation.summarizationSystemPrompt" must be a non-empty string when set.');
    });
  });

  describe('Execution Role - baseline permissions', () => {
    test('should include the baseline harness permission set (private-ECR harness image pull, X-Ray, logs, metrics, workload identity, browser, code-interpreter)', () => {
      const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
        harnessName: 'iam-baseline-harness',
        modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        systemPrompt: 'Be concise.',
        networkConfiguration: NET,
        kmsKey,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreHarnessL3Construct(testApp.testStack, 'iam-baseline-harness-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const harnessPolicy = Object.values(policies).find(policy =>
        (policy.Properties?.PolicyDocument?.Statement ?? []).some(
          (s: { Sid?: string }) => s.Sid === 'BedrockModelInvocation',
        ),
      );
      expect(harnessPolicy).toBeDefined();
      const sids = (harnessPolicy!.Properties.PolicyDocument.Statement as { Sid?: string }[]).map(s => s.Sid);
      expect(sids).toEqual(
        expect.arrayContaining([
          'BedrockModelInvocation',
          'XRayTracingAccess',
          'CloudWatchLogsGroup',
          'CloudWatchLogsDescribeGroups',
          'CloudWatchLogsStream',
          'CloudWatchLogsPutResourcePolicy',
          'CloudWatchMetricsPublish',
          'AgentCoreWorkloadIdentity',
          'AgentCoreBrowserDefault',
          'AgentCoreCodeInterpreterDefault',
          // No BYO container, so the AWS-managed image is pulled from the private harness-<region>
          // repo - the unified harness-image ECR grants must be present.
          'HarnessImageEcrPull',
          'HarnessImageEcrToken',
        ]),
      );

      // With no BYO container, the harness-image layer pull is scoped to the AWS-managed
      // harness-<region> repository (account wildcarded, since the AWS-owned managed-image registry
      // account is not knowable at synth).
      const managedImageStatements = harnessPolicy!.Properties.PolicyDocument.Statement as {
        Sid?: string;
        Resource?: unknown;
      }[];
      const managedImagePull = managedImageStatements.find(s => s.Sid === 'HarnessImageEcrPull');
      expect(managedImagePull).toBeDefined();
      expect(JSON.stringify(managedImagePull!.Resource)).toContain('repository/harness-');

      // logs:PutResourcePolicy is permission-management and DOES honor its resourceArn, so it must be
      // scoped to the harness's own AgentCore runtimes log-group prefix - never a bare '*', which would
      // let one harness role rewrite every log group's resource policy account-wide.
      const statements = harnessPolicy!.Properties.PolicyDocument.Statement as {
        Sid?: string;
        Resource?: unknown;
      }[];
      const putResourcePolicy = statements.find(s => s.Sid === 'CloudWatchLogsPutResourcePolicy');
      expect(putResourcePolicy).toBeDefined();
      const resourceJson = JSON.stringify(putResourcePolicy!.Resource);
      expect(resourceJson).toContain('log-group:/aws/bedrock-agentcore/runtimes/*');
      expect(putResourcePolicy!.Resource).not.toBe('*');

      // DenyRoleAssumption blocks the execution role from assuming any other role (an additionalParams
      // abuse path called out in the harness security guide). Must be an explicit Deny on sts:AssumeRole.
      const denyAssumeRole = (
        harnessPolicy!.Properties.PolicyDocument.Statement as {
          Sid?: string;
          Effect?: string;
          Action?: unknown;
        }[]
      ).find(s => s.Sid === 'DenyRoleAssumption');
      expect(denyAssumeRole).toBeDefined();
      expect(denyAssumeRole!.Effect).toBe('Deny');
      expect(denyAssumeRole!.Action).toBe('sts:AssumeRole');
    });
  });
});
