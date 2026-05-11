/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

describe('WebSocket API Infrastructure Tests', () => {
  const createConstruct = (webSocketApiConfig: object) => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: GAIAL3ConstructProps = {
      gaia: {
        waf: { skipGlobalDefaultWaf: true },
        dataAdminRoles: [{ name: 'test-admin' }],
        bedrock: { knowledgeBaseId: 'knowledgeBaseId' },
        webSocketApi: webSocketApiConfig,
        vpc: { vpcId: 'XXXXXXXX', appSubnets: ['subnet1'] },
        auth: {
          cognitoDomain: 'test-domain',
          entraIdOIDCConfiguration: {
            entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:123456789102:secret:oidc-secret-rkfLVz',
            attributeMapping: { fullname: 'name' },
          },
        },
        userFeedback: { reasons: ['accuracy'] },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
    return Template.fromStack(testApp.testStack);
  };

  describe('Bedrock RAG Data Source', () => {
    test('creates Bedrock RAG data source with guardrail', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          guardrailId: 'test-guardrail-id',
          guardrailKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });

    test('creates Bedrock RAG data source with custom inference parameters', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          inferenceMaxTokens: 4000,
          inferenceTemperature: 0.5,
          inferenceTopP: 0.8,
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });

    test('creates Bedrock RAG data source with knowledge base results config', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          kbNumberOfResults: 10,
          displayInlineCitations: true,
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });
  });

  describe('Invoke Model Data Source', () => {
    test('creates invoke model data source', () => {
      const template = createConstruct({
        invokeModelDataSource: {
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          lambdaRole: { id: 'generated-role-id:invoke-model' },
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });

    test('creates invoke model data source with guardrail', () => {
      const template = createConstruct({
        invokeModelDataSource: {
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          lambdaRole: { id: 'generated-role-id:invoke-model' },
          guardrailId: 'test-guardrail',
          guardrailKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });
  });

  describe('Custom Data Source', () => {
    test('creates custom data source with Lambda ARN', () => {
      const template = createConstruct({
        customDataSource: {
          lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:custom-handler',
        },
      });
      template.hasResource('AWS::AppSync::Api', {});
    });
  });

  describe('Bedrock RAG Custom Prompts', () => {
    test('creates Bedrock RAG data source with custom prompt template', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          promptTemplate: 'You are a helpful assistant. Answer the question: {question}',
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });

    test('creates Bedrock RAG data source with orchestration prompt template', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          orchestrationPromptTemplate: 'Orchestrate the following: {input}',
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });

    test('creates Bedrock RAG data source with both custom prompts', () => {
      const template = createConstruct({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
          promptTemplate: 'Custom prompt: {question}',
          orchestrationPromptTemplate: 'Custom orchestration: {input}',
        },
      });
      template.hasResource('AWS::Lambda::Function', {});
    });
  });

  describe('Cross-Account VPC (AWS RAM Shared VPC)', () => {
    const createConstructWithCrossAccountVpc = (webSocketApiConfig: object) => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      const networkAccountId = '222222222222'; // Network account that owns the VPC

      const constructProps: GAIAL3ConstructProps = {
        gaia: {
          waf: { skipGlobalDefaultWaf: true },
          dataAdminRoles: [{ name: 'test-admin' }],
          bedrock: { knowledgeBaseId: 'knowledgeBaseId' },
          webSocketApi: webSocketApiConfig,
          vpc: {
            vpcId: 'vpc-12345678',
            appSubnets: ['subnet-aaaaaaaa'],
            vpcOwnerAccountId: networkAccountId,
          },
          auth: {
            cognitoDomain: 'test-domain',
            entraIdOIDCConfiguration: {
              entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:111111111111:secret:oidc-secret-rkfLVz',
              attributeMapping: { fullname: 'name' },
            },
          },
          userFeedback: { reasons: ['accuracy'] },
        },
        roleHelper,
        naming: testApp.naming,
      };

      new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
      return { template: Template.fromStack(testApp.testStack), networkAccountId };
    };

    const findNetworkAccountInVpcArnCondition = (
      templateJson: Record<string, unknown>,
      networkAccountId: string,
    ): boolean => {
      const resources = templateJson.Resources as Record<
        string,
        { Type: string; Properties?: { PolicyDocument?: { Statement?: unknown[] } } }
      >;
      for (const resource of Object.values(resources)) {
        if (resource.Type === 'AWS::IAM::Policy' || resource.Type === 'AWS::IAM::ManagedPolicy') {
          const policyDoc = resource.Properties?.PolicyDocument;
          if (policyDoc?.Statement) {
            for (const statement of policyDoc.Statement as {
              Action?: string | string[];
              Condition?: {
                StringEquals?: { 'ec2:Vpc'?: unknown };
                StringEqualsIfExists?: { 'ec2:Vpc'?: unknown };
              };
            }[]) {
              const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
              if (actions.includes('ec2:CreateNetworkInterface')) {
                // Check both StringEquals and StringEqualsIfExists conditions
                const vpcCondition =
                  statement.Condition?.StringEquals?.['ec2:Vpc'] ||
                  statement.Condition?.StringEqualsIfExists?.['ec2:Vpc'];
                if (vpcCondition) {
                  const vpcConditionStr = JSON.stringify(vpcCondition);
                  if (vpcConditionStr.includes(networkAccountId)) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
      return false;
    };

    test('Bedrock RAG data source uses network account ID in VPC ARN condition for cross-account VPC', () => {
      const { template, networkAccountId } = createConstructWithCrossAccountVpc({
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
        },
      });

      const templateJson = template.toJSON();
      const foundNetworkAccountInVpcArn = findNetworkAccountInVpcArnCondition(templateJson, networkAccountId);

      expect(foundNetworkAccountInVpcArn).toBe(true);
    });

    test('Invoke Model data source uses network account ID in VPC ARN condition for cross-account VPC', () => {
      const { template, networkAccountId } = createConstructWithCrossAccountVpc({
        invokeModelDataSource: {
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          lambdaRole: { id: 'generated-role-id:invoke-model' },
        },
      });

      const templateJson = template.toJSON();
      const foundNetworkAccountInVpcArn = findNetworkAccountInVpcArnCondition(templateJson, networkAccountId);

      expect(foundNetworkAccountInVpcArn).toBe(true);
    });
  });
});
