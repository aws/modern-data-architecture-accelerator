/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockAgentL3Construct, BedrockAgentL3ConstructProps, BedrockAgentProps } from '../lib';

describe('Bedrock Agent L3 Construct Tests', () => {
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

    template.hasResourceProperties('AWS::Bedrock::Agent', {
      AgentName: 'test-org-test-env-test-domain-test-module-test-agent',
      AutoPrepare: false,
      Description: 'Test Agent',
      FoundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
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
});
