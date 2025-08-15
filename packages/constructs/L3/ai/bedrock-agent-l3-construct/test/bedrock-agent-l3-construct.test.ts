/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CfnGuardrail, CfnKnowledgeBase } from 'aws-cdk-lib/aws-bedrock';
import { Key } from 'aws-cdk-lib/aws-kms';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { BedrockAgentL3Construct, BedrockAgentL3ConstructProps, BedrockAgentProps } from '../lib';

describe('BedrockAgentL3Construct Unit Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;
  let kmsKey: Key;

  const agentExecutionRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/agent-execution-role',
    name: 'agent-execution-role',
  };

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    kmsKey = new Key(testApp.testStack, 'TestKey');
  });

  describe('Basic Agent Creation', () => {
    test('should create basic agent with minimal configuration', () => {
      const basicAgent: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test agent instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'test-agent',
        agentConfig: basicAgent,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      const construct = new BedrockAgentL3Construct(testApp.testStack, 'test-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      expect(construct.agent).toBeDefined();
      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent',
        AutoPrepare: false,
        Instruction: 'Test agent instructions',
        FoundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        IdleSessionTTLInSeconds: 3600,
      });
    });

    test('should create agent with all optional properties', () => {
      const fullAgent: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        autoPrepare: true,
        description: 'Test Agent Description',
        instruction: 'Test agent instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        idleSessionTtlInSeconds: 7200,
        agentAliasName: 'test-alias',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'full-agent',
        agentConfig: fullAgent,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'full-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AutoPrepare: true,
        Description: 'Test Agent Description',
        IdleSessionTTLInSeconds: 7200,
      });

      template.hasResourceProperties('AWS::Bedrock::AgentAlias', {
        AgentAliasName: 'test-alias',
      });
    });

    test('should handle foundation model as full ARN', () => {
      const agentWithModelArn: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'arn-agent',
        agentConfig: agentWithModelArn,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'arn-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {},
            {
              Sid: 'InvokeFoundationModel',
              Effect: 'Allow',
              Resource: 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            },
          ],
        },
      });
    });
  });

  describe('Action Groups', () => {
    test('should create agent with lambda action group', () => {
      const agentWithActionGroup: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'test-action-group',
            description: 'Test action group',
            actionGroupState: 'ENABLED',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'action-agent',
        agentConfig: agentWithActionGroup,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'action-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        ActionGroups: [
          {
            ActionGroupName: 'test-action-group',
            Description: 'Test action group',
            ActionGroupState: 'ENABLED',
            ActionGroupExecutor: {
              Lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            },
          },
        ],
      });

      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        FunctionName: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        Principal: 'bedrock.amazonaws.com',
      });
    });

    test('should create agent with function schema action group', () => {
      const agentWithFunctionSchema: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'function-schema-group',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            },
            functionSchema: {
              functions: [
                {
                  name: 'testFunction',
                  description: 'Test function',
                  parameters: {
                    param1: {
                      type: 'string',
                      description: 'Test parameter',
                      required: true,
                    },
                  },
                },
              ],
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'function-agent',
        agentConfig: agentWithFunctionSchema,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'function-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        ActionGroups: [
          {
            ActionGroupName: 'function-schema-group',
            FunctionSchema: {
              Functions: [
                {
                  Name: 'testFunction',
                  Description: 'Test function',
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe('API Schema from File', () => {
    beforeAll(() => {
      // Create test schema file
      const testDir = resolve(__dirname, 'test-schemas');
      mkdirSync(testDir, { recursive: true });

      const testSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              summary: 'Test endpoint',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      };

      writeFileSync(resolve(testDir, 'test-schema.yaml'), JSON.stringify(testSchema));
    });

    test('should load API schema from file', () => {
      const agentWithApiSchema: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'api-schema-group',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            },
            apiSchema: {
              openApiSchemaPath: '../test/test-schemas/test-schema.yaml',
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'api-schema-agent',
        agentConfig: agentWithApiSchema,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'api-schema-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        ActionGroups: [
          {
            ActionGroupName: 'api-schema-group',
            ApiSchema: {
              Payload: Match.anyValue(),
            },
          },
        ],
      });

      // Verify the payload contains the expected content
      const agentResource = template.findResources('AWS::Bedrock::Agent');
      const agentProps = Object.values(agentResource)[0].Properties;
      expect(agentProps.ActionGroups[0].ApiSchema.Payload).toContain('openapi: 3.0.0');
    });

    test('should use direct API schema when no file path provided', () => {
      const agentWithDirectSchema: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'direct-schema-group',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            },
            apiSchema: {
              payload: 'direct schema payload',
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'direct-schema-agent',
        agentConfig: agentWithDirectSchema,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'direct-schema-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        ActionGroups: [
          {
            ActionGroupName: 'direct-schema-group',
            ApiSchema: {
              Payload: 'direct schema payload',
            },
          },
        ],
      });
    });
  });

  describe('Knowledge Base Associations', () => {
    test('should create agent with direct knowledge base ID', () => {
      const agentWithKB: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'kb-12345',
            description: 'Test Knowledge Base',
            knowledgeBaseState: 'ENABLED',
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'kb-agent',
        agentConfig: agentWithKB,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'kb-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        KnowledgeBases: [
          {
            Description: 'Test Knowledge Base',
            KnowledgeBaseId: 'kb-12345',
            KnowledgeBaseState: 'ENABLED',
          },
        ],
      });

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {},
            {},
            {
              Sid: 'AllowBedrockKnowledgeBase',
              Effect: 'Allow',
              Action: 'bedrock:Retrieve',
              Resource: 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/kb-12345',
            },
          ],
        },
      });
    });

    test('should create agent with config reference knowledge base', () => {
      const mockKnowledgeBase = {
        attrKnowledgeBaseId: 'kb-config-67890',
      } as CfnKnowledgeBase;

      const agentWithConfigKB: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'config:test-kb',
            description: 'Config Knowledge Base',
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'config-kb-agent',
        agentConfig: agentWithConfigKB,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
        knowledgeBases: {
          'test-kb': mockKnowledgeBase,
        },
      };

      new BedrockAgentL3Construct(testApp.testStack, 'config-kb-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        KnowledgeBases: [
          {
            Description: 'Config Knowledge Base',
            KnowledgeBaseId: 'kb-config-67890',
          },
        ],
      });
    });

    test('should throw error for unknown config knowledge base', () => {
      const agentWithUnknownKB: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'config:unknown-kb',
            description: 'Unknown KB',
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'unknown-kb-agent',
        agentConfig: agentWithUnknownKB,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      expect(() => {
        new BedrockAgentL3Construct(testApp.testStack, 'unknown-kb-agent-construct', constructProps);
      }).toThrow('Agent references unknown knowledge base from config :config:unknown-kb');
    });
  });

  describe('Guardrail Associations', () => {
    test('should create agent with direct guardrail ID', () => {
      const agentWithGuardrail: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        guardrail: {
          id: 'guardrail-12345',
          version: '1',
        },
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'guardrail-agent',
        agentConfig: agentWithGuardrail,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'guardrail-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        GuardrailConfiguration: {
          GuardrailIdentifier: 'guardrail-12345',
          GuardrailVersion: '1',
        },
      });

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {},
            {},
            {
              Sid: 'AllowApplyBedrockGuardrail',
              Effect: 'Allow',
              Action: 'bedrock:ApplyGuardrail',
              Resource: 'arn:aws:bedrock:test-region:test-account:guardrail/guardrail-12345',
            },
          ],
        },
      });
    });

    test('should create agent with config reference guardrail', () => {
      const mockGuardrail = {
        attrGuardrailId: 'guardrail-config-67890',
        attrVersion: '2',
      } as CfnGuardrail;

      const agentWithConfigGuardrail: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        guardrail: {
          id: 'config:test-guardrail',
        },
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'config-guardrail-agent',
        agentConfig: agentWithConfigGuardrail,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
        guardrails: {
          'test-guardrail': mockGuardrail,
        },
      };

      new BedrockAgentL3Construct(testApp.testStack, 'config-guardrail-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        GuardrailConfiguration: {
          GuardrailIdentifier: 'guardrail-config-67890',
          GuardrailVersion: '2',
        },
      });
    });

    test('should throw error when guardrail version is missing', () => {
      const agentWithNoVersion: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        guardrail: {
          id: 'guardrail-12345',
        },
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'no-version-agent',
        agentConfig: agentWithNoVersion,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      expect(() => {
        new BedrockAgentL3Construct(testApp.testStack, 'no-version-agent-construct', constructProps);
      }).toThrow('Guardrail version must be specified');
    });
  });

  describe('Inference Profiles', () => {
    test('should handle inference profile foundation model', () => {
      const agentWithInferenceProfile: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel:
          'arn:aws:bedrock:us-east-1:123456789012:inference-profile/anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'inference-profile-agent',
        agentConfig: agentWithInferenceProfile,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'inference-profile-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {},
            {
              Sid: 'InvokeFoundationModel',
              Effect: 'Allow',
              Resource:
                'arn:aws:bedrock:us-east-1:123456789012:inference-profile/anthropic.claude-3-sonnet-20240229-v1:0',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
            },
          ],
        },
      });
    });
  });

  describe('Policy Creation', () => {
    test('should create policy with KMS permissions', () => {
      const basicAgent: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'policy-agent',
        agentConfig: basicAgent,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'policy-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-agent-policy-agent',
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:ReEncryptFrom',
                'kms:ReEncryptTo',
                'kms:GenerateDataKey',
                'kms:GenerateDataKeyWithoutPlaintext',
                'kms:GenerateDataKeyPair',
                'kms:GenerateDataKeyPairWithoutPlaintext',
              ],
            },
            {
              Sid: 'InvokeFoundationModel',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            },
          ],
        },
      });
    });

    test('should create comprehensive policy with all features', () => {
      const mockKnowledgeBase = {
        attrKnowledgeBaseId: 'kb-comprehensive',
      } as CfnKnowledgeBase;

      const mockGuardrail = {
        attrGuardrailId: 'guardrail-comprehensive',
        attrVersion: '1',
      } as CfnGuardrail;

      const comprehensiveAgent: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel:
          'arn:aws:bedrock:us-east-1:123456789012:inference-profile/anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'config:test-kb',
            description: 'Test KB',
          },
        ],
        guardrail: {
          id: 'config:test-guardrail',
        },
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'comprehensive-agent',
        agentConfig: comprehensiveAgent,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
        knowledgeBases: {
          'test-kb': mockKnowledgeBase,
        },
        guardrails: {
          'test-guardrail': mockGuardrail,
        },
      };

      new BedrockAgentL3Construct(testApp.testStack, 'comprehensive-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:ReEncryptFrom',
                'kms:ReEncryptTo',
                'kms:GenerateDataKey',
                'kms:GenerateDataKeyWithoutPlaintext',
                'kms:GenerateDataKeyPair',
                'kms:GenerateDataKeyPairWithoutPlaintext',
              ],
            },
            {
              Sid: 'InvokeFoundationModel',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
            },
            {
              Sid: 'AllowApplyBedrockGuardrail',
              Effect: 'Allow',
              Action: 'bedrock:ApplyGuardrail',
              Resource: 'arn:aws:bedrock:test-region:test-account:guardrail/guardrail-comprehensive',
            },
            {
              Sid: 'AllowBedrockKnowledgeBase',
              Effect: 'Allow',
              Action: 'bedrock:Retrieve',
              Resource: 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/kb-comprehensive',
            },
          ],
        },
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty action groups array', () => {
      const agentWithEmptyActionGroups: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'empty-actions-agent',
        agentConfig: agentWithEmptyActionGroups,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      expect(() => {
        new BedrockAgentL3Construct(testApp.testStack, 'empty-actions-agent-construct', constructProps);
      }).not.toThrow();
    });

    test('should handle action group without lambda ARN', () => {
      const agentWithNonLambdaExecutor: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'non-lambda-group',
            actionGroupExecutor: {
              customControl: 'RETURN_CONTROL',
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'non-lambda-agent',
        agentConfig: agentWithNonLambdaExecutor,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'non-lambda-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Should not create Lambda permission
      template.resourceCountIs('AWS::Lambda::Permission', 0);
    });

    test('should handle multiple action groups with mixed executors', () => {
      const agentWithMixedActionGroups: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupName: 'lambda-group',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-1',
            },
          },
          {
            actionGroupName: 'control-group',
            actionGroupExecutor: {
              customControl: 'RETURN_CONTROL',
            },
          },
          {
            actionGroupName: 'another-lambda-group',
            actionGroupExecutor: {
              lambda: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-2',
            },
          },
        ],
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'mixed-agent',
        agentConfig: agentWithMixedActionGroups,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'mixed-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Should create 2 Lambda permissions (for the 2 lambda executors)
      template.resourceCountIs('AWS::Lambda::Permission', 2);
    });

    test('should not create alias when agentAliasName is not provided', () => {
      const agentWithoutAlias: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'no-alias-agent',
        agentConfig: agentWithoutAlias,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'no-alias-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::Bedrock::AgentAlias', 0);
    });

    test('should handle empty knowledge bases and guardrails maps', () => {
      const basicAgent: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'empty-maps-agent',
        agentConfig: basicAgent,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
        knowledgeBases: {},
        guardrails: {},
      };

      expect(() => {
        new BedrockAgentL3Construct(testApp.testStack, 'empty-maps-agent-construct', constructProps);
      }).not.toThrow();
    });

    test('should handle prompt override configuration', () => {
      const agentWithPromptOverride: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        instruction: 'Test instructions',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        promptOverrideConfiguration: {
          promptConfigurations: [
            {
              promptType: 'PRE_PROCESSING',
              promptState: 'ENABLED',
              basePromptTemplate: 'Custom pre-processing prompt',
              inferenceConfiguration: {
                temperature: 0.7,
                topP: 0.9,
                topK: 50,
                maximumLength: 1000,
              },
            },
          ],
        },
      };

      const constructProps: BedrockAgentL3ConstructProps = {
        agentName: 'prompt-override-agent',
        agentConfig: agentWithPromptOverride,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      new BedrockAgentL3Construct(testApp.testStack, 'prompt-override-agent-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        PromptOverrideConfiguration: {
          PromptConfigurations: [
            {
              PromptType: 'PRE_PROCESSING',
              PromptState: 'ENABLED',
              BasePromptTemplate: 'Custom pre-processing prompt',
            },
          ],
        },
      });
    });
  });
});
