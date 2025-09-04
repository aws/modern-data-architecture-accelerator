/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockAgentL3Construct, BedrockAgentL3ConstructProps, BedrockAgentProps } from '../lib';
import { resolveModelArn } from '@aws-mdaa/ai-helper';

// Mock the resolveModelArn utility function
jest.mock('@aws-mdaa/ai-helper', () => ({
  resolveModelArn: jest.fn(),
}));

const mockedResolveModelArn = resolveModelArn as jest.MockedFunction<typeof resolveModelArn>;

describe('Bedrock Agent L3 Construct Tests', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockedResolveModelArn.mockReset();

    // Default mock implementation that returns the input as-is for basic tests
    mockedResolveModelArn.mockImplementation((modelIdentifier: string) => {
      // For ARNs, return as-is
      if (modelIdentifier.startsWith('arn:')) {
        return modelIdentifier;
      }
      // For model IDs, return a mock ARN
      return `arn:aws:bedrock:us-east-1::foundation-model/${modelIdentifier}`;
    });
  });
  const agentExecutionRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/agent-execution-role',
    name: 'agent-execution-role',
  };

  const basicAgent: BedrockAgentProps = {
    role: agentExecutionRoleRef,
    autoPrepare: false,
    description: 'Test Agent',
    instruction: 'Test agent instructions',
    foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    agentAliasName: 'test-alias',
    actionGroups: [
      {
        actionGroupExecutor: {
          lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        },
        actionGroupName: 'test-action-group',
        description: 'test-action-group-description',
      },
    ],
  };

  test('Test Basic Agent Creation', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent',
      agentConfig: basicAgent,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify resolveModelArn was called with the correct parameters
    // see @mdaa-utilities/mdaa-testing/test-app for the values
    expect(mockedResolveModelArn).toHaveBeenCalledWith(
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'test-partition',
      'test-region',
      'test-account',
    );

    template.hasResourceProperties('AWS::Bedrock::Agent', {
      AgentName: 'test-org-test-env-test-domain-test-module-test-agent',
      AutoPrepare: false,
      Description: 'Test Agent',
      FoundationModel: 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
      IdleSessionTTLInSeconds: 3600,
    });
  });

  test('Test Agent with Knowledge Base', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const agentWithKB: BedrockAgentProps = {
      ...basicAgent,
      knowledgeBases: [
        {
          id: 'kb-12345',
          description: 'Test Knowledge Base',
          knowledgeBaseState: 'ENABLED',
        },
      ],
    };

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-kb',
      agentConfig: agentWithKB,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-kb-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {},
          {},
          {
            Sid: 'AllowBedrockKnowledgeBase',
            Effect: 'Allow',
            Action: 'bedrock:Retrieve',
          },
        ],
      },
    });
  });

  test('Test Agent with Guardrail', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const agentWithGuardrail: BedrockAgentProps = {
      ...basicAgent,
      guardrail: {
        id: 'guardrail-67890',
        version: '1',
      },
    };

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-guardrail',
      agentConfig: agentWithGuardrail,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-guardrail-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {},
          {},
          {
            Sid: 'AllowApplyBedrockGuardrail',
            Effect: 'Allow',
            Action: 'bedrock:ApplyGuardrail',
          },
        ],
      },
    });
  });

  test('Test Lambda Permission Creation', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-lambda',
      agentConfig: basicAgent,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-lambda-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'bedrock.amazonaws.com',
    });
  });

  test('Test Agent with Inference Profile ID', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const agentWithInferenceProfile: BedrockAgentProps = {
      ...basicAgent,
      foundationModel: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', // Inference profile ID
    };

    // Mock resolveModelArn to return an inference profile ARN
    mockedResolveModelArn.mockReturnValueOnce(
      'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    );

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-inference-profile',
      agentConfig: agentWithInferenceProfile,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-inference-profile-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify resolveModelArn was called with the correct parameters
    expect(mockedResolveModelArn).toHaveBeenCalledWith(
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'test-partition',
      'test-region',
      'test-account',
    );

    // Verify the agent is created with the resolved ARN
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      FoundationModel:
        'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    });

    // Verify the IAM policy includes GetInferenceProfile permission
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {},
          {
            Sid: 'InvokeFoundationModel',
            Effect: 'Allow',
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
          },
        ],
      },
    });
  });

  test('Test Agent with Full Model ARN', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const fullArn =
      'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0';
    const agentWithFullArn: BedrockAgentProps = {
      ...basicAgent,
      foundationModel: fullArn,
    };

    // Mock resolveModelArn to return the ARN as-is (passthrough behavior)
    mockedResolveModelArn.mockReturnValueOnce(fullArn);

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-full-arn',
      agentConfig: agentWithFullArn,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockAgentL3Construct(testApp.testStack, 'test-agent-full-arn-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify resolveModelArn was called with the correct parameters
    expect(mockedResolveModelArn).toHaveBeenCalledWith(fullArn, 'test-partition', 'test-region', 'test-account');

    // Verify the agent is created with the full ARN (passthrough)
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      FoundationModel: fullArn,
    });
  });

  test('Test Invalid Model ARN Throws Error', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const invalidArn = 'arn:aws:bedrock:us-east-1:123456789012:invalid-resource-type/model-id';
    const agentWithInvalidArn: BedrockAgentProps = {
      ...basicAgent,
      foundationModel: invalidArn,
    };

    // Mock resolveModelArn to throw an error for invalid ARN
    mockedResolveModelArn.mockImplementationOnce(() => {
      throw new Error('Invalid Bedrock model ARN format');
    });

    const constructProps: BedrockAgentL3ConstructProps = {
      agentName: 'test-agent-invalid',
      agentConfig: agentWithInvalidArn,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockAgentL3Construct(testApp.testStack, 'test-agent-invalid-construct', constructProps);
    }).toThrow('Invalid Bedrock model ARN format');

    // Verify resolveModelArn was called with the invalid ARN
    expect(mockedResolveModelArn).toHaveBeenCalledWith(invalidArn, 'test-partition', 'test-region', 'test-account');
  });
});
