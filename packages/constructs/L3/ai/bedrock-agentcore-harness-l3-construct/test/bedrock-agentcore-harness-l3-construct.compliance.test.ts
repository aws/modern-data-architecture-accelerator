/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockAgentcoreHarnessL3Construct, BedrockAgentcoreHarnessL3ConstructProps } from '../lib';

// networkConfiguration is required (MDAA enforces VPC mode), so every compliance scenario supplies a
// minimal valid VPC config (the dedicated VPC scenario sets its own).
const NET = { securityGroups: ['sg-test'], subnets: ['subnet-test'] };

describe('BedrockAgentcoreHarnessL3Construct Compliance Tests', () => {
  // Every other scenario uses a plain foundation-model id, so none of them emits the
  // BedrockInferenceProfileModelInvocation statement — meaning its region-wildcarded destination
  // foundation-model ARN (an AwsSolutions-IAM5 finding) was never evaluated by cdk-nag here. This
  // scenario exists so that wildcard is actually exercised and its suppression stays justified.
  describe('Harness with a cross-region inference profile model', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'inference-profile-harness',
      modelId: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'inference-profile-harness-construct', constructProps);

    // Guard that this scenario really does emit the wildcard it exists to cover — otherwise the nag
    // pass below would be vacuous for it.
    test('emits the region-wildcarded destination foundation-model grant', () => {
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockInferenceProfileModelInvocation',
              Resource: Match.stringLikeRegexp('^arn:.*:bedrock:\\*::foundation-model/'),
            }),
          ]),
        },
      });
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Minimal harness', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'compliant-harness-construct', constructProps);

    // The two headline always-on controls — CMK log encryption and the PII masking floor — are
    // applied to the service-created log groups through the Custom::AgentCoreLogProtection resource,
    // which cdk-nag does not inspect. The nag pass below would therefore stay green if either were
    // dropped, so assert them directly. The floor is spelled out rather than derived from
    // BUILTIN_DATA_IDENTIFIERS, and each identifier is matched as its fully-qualified
    // `data-identifier/<Name>"` token (closing quote included) so that deleting ANY one fails here.
    // A bare-name match would not: `Address` is a substring of both `EmailAddress` and `IpAddress`, so
    // `.*Address.*` would still pass with `Address` removed — the `data-identifier/` prefix and closing
    // `"` pin each token to its own ARN element.
    test('applies the always-on CMK log encryption and PII masking floor', () => {
      const template = Template.fromStack(stack);
      template.resourceCountIs('Custom::AgentCoreLogProtection', 1);
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        kmsKeyArn: Match.anyValue(),
        dataProtectionPolicy: Match.stringLikeRegexp(
          '.*data-identifier/EmailAddress".*data-identifier/CreditCardNumber".*data-identifier/Ssn-US".*' +
            'data-identifier/Name".*data-identifier/Address".*data-identifier/PhoneNumber-US".*' +
            'data-identifier/IpAddress".*',
        ),
      });
    });

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with JWT authorizer', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'jwt-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      authorizerConfiguration: {
        customJwt: {
          discoveryUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test/.well-known/openid-configuration',
          allowedAudience: ['client-id'],
        },
      },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'jwt-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with inline_function tool', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'inline-fn-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      tools: {
        get_weather: {
          inlineFunction: {
            description: 'Returns the current weather for a city',
            inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
          },
        },
      },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'inline-fn-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with guardrail', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'guardrail-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      guardrail: { id: 'abc123', version: '1' },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'guardrail-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with agentcore_gateway tool', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'gateway-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      tools: {
        gateway_tools: {
          agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gw' },
        },
      },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'gateway-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with supplied role reference', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'ref-role-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      role: { arn: 'arn:aws:iam::123456789012:role/existing-role' },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'ref-role-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with VPC network configuration', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'vpc-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: {
        securityGroups: ['sg-0123456789abcdef0'],
        subnets: ['subnet-0123456789abcdef0'],
      },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'vpc-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Harness with custom container image (ECR pull grant)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'container-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      networkConfiguration: NET,
      container: { containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-harness:latest' },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'container-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  // Worst-case execution-role policy: every config-conditional grant fires at once (guardrail +
  // agentcore_gateway tool + custom container image). The functional suite asserts this scenario's
  // statement set and size; this confirms the largest emitted policy is also CDK-Nag-clean.
  describe('Harness with all conditional grants (guardrail + gateway + container)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'max-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      guardrail: { id: 'abc123', version: '1' },
      tools: {
        gateway_tools: {
          agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gw' },
        },
      },
      container: { containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-harness:latest' },
      networkConfiguration: NET,
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'max-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });
  describe('Harness with MDAA-managed VPC endpoints', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreHarnessL3ConstructProps = {
      harnessName: 'vpce-compliant-harness',
      modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
      systemPrompt: 'You are a helpful assistant.',
      // A gateway tool plus S3 route tables exercise the widest endpoint set: the always-created
      // interface endpoints, the gateway endpoint, and the policied S3 gateway endpoint.
      tools: {
        gateway_tools: {
          agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gw' },
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-0123456789abcdef0'],
        subnets: ['subnet-0123456789abcdef0'],
        vpcId: 'vpc-0123456789abcdef0',
        vpcEndpoints: { s3RouteTableIds: ['rtb-0123456789abcdef0'] },
      },
      kmsKey: new Key(stack, 'TestKmsKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreHarnessL3Construct(stack, 'vpce-compliant-harness-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });
});
