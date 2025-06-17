/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionProps, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BedrockAgentProps,
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  BedrockGuardrailProps,
  BedrockKnowledgeBaseProps,
  LambdaFunctionProps,
  NamedAgentProps,
  NamedGuardrailProps,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  VectorStoreProps,
} from '../lib';

describe('Bedrock Builder Compliance Stack Tests', () => {
  const layerProps: LayerProps = {
    layerName: 'test-layer',
    src: './test/lambda/test',
    description: 'layer testing',
  };

  const functionProps: FunctionProps = {
    functionName: 'test-agent-lambda',
    srcDir: './test/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.13',
    generatedLayerNames: ['test-layer'],
  };

  // Role References
  const agentExecutionRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/agent-execution-role',
    name: 'agent-execution-role',
  };

  const kbRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/kb-execution-role',
    name: 'kb-execution-role',
  };

  const dataAdminRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/test-role',
    name: 'test-role',
  };

  const lambdaFunctions: LambdaFunctionProps = {
    functions: [functionProps],
    layers: [layerProps],
  };

  // Agent Properties
  const agent: BedrockAgentProps = {
    role: agentExecutionRoleRef,
    autoPrepare: false,
    description: 'Sample Agent',
    instruction: 'Agent Test Instructions',
    foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    agentAliasName: 'test-alias',
    guardrail: {
      id: 'test-guardrail-id',
      version: 'DRAFT',
    },
    actionGroups: [
      {
        actionGroupExecutor: {
          lambda: 'generated-function:test-agent-lambda',
        },
        actionGroupName: 'test-action-group',
        description: 'test-action-group-description',
        apiSchema: {
          openApiSchemaPath: '../test/api-schema/test-schema.yaml',
        },
      },
    ],
  };

  // Guardrail Properties
  const guardrail: BedrockGuardrailProps = {
    description: 'Test guardrail for content filtering',
    contentFilters: {
      hate: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM',
      },
      sexual: {
        inputStrength: 'HIGH',
        outputStrength: 'HIGH',
      },
      violence: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM',
      },
    },
    contextualGroundingFilters: {
      grounding: 0.9,
      relevance: 0.8,
    },
  };

  describe('Bedrock Builder L3 Construct Basic Tests', () => {
    const testApp = new MdaaTestApp();
    // Knowledge Base Properties
    const vectorStore: VectorStoreProps = {
      vpcId: 'test-vpc-id',
      subnetIds: ['test-subnet'],
    };
    const knowledgeBase: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      s3DataSources: {
        test: {
          bucketName: 'test-docs-bucket',
          prefix: 'test-prefix/',
        },
      },

      embeddingModel: 'arn:aws:bedrock::aws:foundation-model/amazon.titan-embed-text-v2:0',
      vectorFieldSize: 1024,
    };
    const template = generateTemplateFromTestInput(
      testApp,
      dataAdminRoleRef,
      { 'test-agent-1': agent },
      { 'test-vector-store': vectorStore },
      { 'test-kb-1': knowledgeBase },
      { 'test-guardrail-1': guardrail },

      lambdaFunctions,
    );
    // console.log(JSON.stringify(template, undefined, 2));
    test('Test Bedrock Agent Resource', () => {
      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent-1',
        AgentResourceRoleArn: 'arn:test-partition:iam::test-account:role/agent-execution-role',
        AutoPrepare: false,
        Description: 'Sample Agent',
        FoundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        IdleSessionTTLInSeconds: 3600,
      });
    });

    test('Test Bedrock Knowledge Base Resource', () => {
      template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
        Name: 'test-org-test-env-test-domain-test-module-test-kb-1',
        KnowledgeBaseConfiguration: {
          Type: 'VECTOR',
          VectorKnowledgeBaseConfiguration: {
            EmbeddingModelArn: 'arn:aws:bedrock::aws:foundation-model/amazon.titan-embed-text-v2:0',
          },
        },
        StorageConfiguration: {
          Type: 'RDS',
        },
      });
    });

    test('Test Bedrock Guardrail Resource', () => {
      template.hasResourceProperties('AWS::Bedrock::Guardrail', {
        Name: 'test-org-test-env-test-domain-test-modul--3f712ad5',
        Description: 'Test guardrail for content filtering',
        ContentPolicyConfig: {
          FiltersConfig: [
            {
              InputStrength: 'MEDIUM',
              OutputStrength: 'MEDIUM',
              Type: 'HATE',
            },
            {
              InputStrength: 'HIGH',
              OutputStrength: 'HIGH',
              Type: 'SEXUAL',
            },
            {
              InputStrength: 'MEDIUM',
              OutputStrength: 'MEDIUM',
              Type: 'VIOLENCE',
            },
          ],
        },
      });
    });

    test('Test CMK Generation', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
        Enabled: true,
      });
    });

    test('Test RDS Aurora Serverless Cluster', () => {
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        Engine: 'aurora-postgresql',
      });
    });
  });

  describe('Bedrock Builder L3 Construct with Existing KMS Key', () => {
    const kmsKeyArn = 'arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab';
    const testApp = new MdaaTestApp();
    // Knowledge Base Properties
    const vectorStore: VectorStoreProps = {
      vpcId: 'test-vpc-id',
      subnetIds: ['test-subnet'],
    };
    const knowledgeBase: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      s3DataSources: {
        testS3Source: {
          bucketName: 'test-docs-bucket',
          prefix: 'test-prefix/',
        },
      },

      embeddingModel: 'amazon.titan-embed-text-v2:0',
    };
    const template = generateTemplateFromTestInput(
      testApp,
      dataAdminRoleRef,
      { 'test-agent-2': agent },
      { 'test-vector-store': vectorStore },
      { 'test-kb-2': knowledgeBase },
      { 'test-guardrail-2': guardrail },
      lambdaFunctions,
      kmsKeyArn,
    );

    test('Test Using Existing KMS Key', () => {
      template.hasResourceProperties('AWS::Bedrock::Guardrail', {
        KmsKeyArn: kmsKeyArn,
      });
    });
  });

  describe('Bedrock Builder L3 Construct with Agents Only', () => {
    const testApp = new MdaaTestApp();

    const template = generateTemplateFromTestInput(
      testApp,
      dataAdminRoleRef,
      { 'test-agent-3': agent },
      undefined,
      undefined,
      undefined,
      lambdaFunctions,
    );

    test('Test Agent Created Without Knowledge Bases or Guardrails', () => {
      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent-3',
      });

      // Verify no Knowledge Base or Guardrail resources are created
      const resources = template.findResources('AWS::Bedrock::KnowledgeBase', {});
      expect(Object.keys(resources).length).toBe(0);

      const guardrailResources = template.findResources('AWS::Bedrock::Guardrail', {});
      expect(Object.keys(guardrailResources).length).toBe(0);
    });
  });

  describe('Bedrock Builder L3 Construct with Vector Ingestion Configuration', () => {
    const testApp = new MdaaTestApp();
    // Knowledge Base Properties with Vector Ingestion Configuration
    const vectorStore: VectorStoreProps = {
      vpcId: 'test-vpc-id',
      subnetIds: ['test-subnet'],
    };

    const knowledgeBase: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      supplementalBucketName: 'test-supplemental-bucket',
      s3DataSources: {
        testDataAutomation: {
          bucketName: 'test-docs-bucket-1',
          prefix: 'test-prefix-1/',
          vectorIngestionConfiguration: {
            parsingConfiguration: {
              parsingStrategy: 'BEDROCK_DATA_AUTOMATION',
              bedrockDataAutomationConfiguration: {
                parsingModality: 'MULTIMODAL',
              },
            },
            chunkingConfiguration: {
              chunkingStrategy: 'FIXED_SIZE',
              fixedSizeChunkingConfiguration: {
                maxTokens: 500,
                overlapPercentage: 20,
              },
            },
          },
        },
        testFoundationModel: {
          bucketName: 'test-docs-bucket-2',
          prefix: 'test-prefix-2/',
          vectorIngestionConfiguration: {
            parsingConfiguration: {
              parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
              bedrockFoundationModelConfiguration: {
                modelArn: 'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
                parsingModality: 'MULTIMODAL',
                parsingPromptText: 'Extract key information from this document',
              },
            },
            chunkingConfiguration: {
              chunkingStrategy: 'HIERARCHICAL',
              hierarchicalChunkingConfiguration: {
                levelConfigurations: [{ maxTokens: 1000 }],
                overlapTokens: 50,
              },
            },
          },
        },
        testSemanticChunking: {
          bucketName: 'test-docs-bucket-3',
          prefix: 'test-prefix-3/',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'SEMANTIC',
              semanticChunkingConfiguration: {
                maxTokens: 800,
                bufferSize: 5,
                breakpointPercentileThreshold: 0.5,
              },
            },
          },
        },
      },
      embeddingModel: 'amazon.titan-embed-text-v2:0',
      vectorFieldSize: 1024,
    };

    const template = generateTemplateFromTestInput(
      testApp,
      dataAdminRoleRef,
      { 'test-agent-vector': agent },
      { 'test-vector-store': vectorStore },
      { 'test-kb-vector': knowledgeBase },
      { 'test-guardrail-vector': guardrail },
      lambdaFunctions,
    );
    console.log(JSON.stringify(template.findResources('AWS::Bedrock::KnowledgeBase', {}), null, 2));

    test('Test Data Source with BEDROCK_DATA_AUTOMATION Parsing Strategy', () => {
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testDataAutomation',
        VectorIngestionConfiguration: {
          ParsingConfiguration: {
            ParsingStrategy: 'BEDROCK_DATA_AUTOMATION',
            BedrockDataAutomationConfiguration: {
              ParsingModality: 'MULTIMODAL',
            },
          },
          ChunkingConfiguration: {
            ChunkingStrategy: 'FIXED_SIZE',
            FixedSizeChunkingConfiguration: {
              MaxTokens: 500,
              OverlapPercentage: 20,
            },
          },
        },
      });
    });

    test('Test Data Source with BEDROCK_FOUNDATION_MODEL Parsing Strategy', () => {
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testFoundationModel',
        VectorIngestionConfiguration: {
          ParsingConfiguration: {
            ParsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
            BedrockFoundationModelConfiguration: {
              ModelArn: 'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
              ParsingModality: 'MULTIMODAL',
              ParsingPrompt: {
                ParsingPromptText: 'Extract key information from this document',
              },
            },
          },
          ChunkingConfiguration: {
            ChunkingStrategy: 'HIERARCHICAL',
            HierarchicalChunkingConfiguration: {
              LevelConfigurations: [{ MaxTokens: 1000 }],
              OverlapTokens: 50,
            },
          },
        },
      });
    });

    test('Test Knowledge Base with Supplemental Data Storage Configuration', () => {
      template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
        KnowledgeBaseConfiguration: {
          Type: 'VECTOR',
          VectorKnowledgeBaseConfiguration: {
            EmbeddingModelArn: 'arn:test-partition:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
            SupplementalDataStorageConfiguration: {
              SupplementalDataStorageLocations: [
                {
                  SupplementalDataStorageLocationType: 'S3',
                  S3Location: {
                    URI: 's3://test-supplemental-bucket',
                  },
                },
              ],
            },
          },
        },
      });
    });

    test('Test Data Source with SEMANTIC Chunking Strategy', () => {
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testSemanticChunking',
        VectorIngestionConfiguration: {
          ChunkingConfiguration: {
            ChunkingStrategy: 'SEMANTIC',
            SemanticChunkingConfiguration: {
              MaxTokens: 800,
              BufferSize: 5,
              BreakpointPercentileThreshold: 0.5,
            },
          },
        },
      });
    });
  });
});

function generateTemplateFromTestInput(
  testApp: MdaaTestApp,
  dataAdminRoleRef: MdaaRoleRef,
  agents?: NamedAgentProps,
  vectorStores?: NamedVectorStoreProps,
  knowledgeBases?: NamedKnowledgeBaseProps,
  guardrails?: NamedGuardrailProps,
  lambdaFunctions?: LambdaFunctionProps,
  kmsKeyArn?: string,
) {
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: BedrockBuilderL3ConstructProps = {
    dataAdminRoles: [dataAdminRoleRef],
    agents: agents || {},
    roleHelper: roleHelper,
    naming: testApp.naming,
    knowledgeBases: knowledgeBases,
    guardrails: guardrails,
    lambdaFunctions: lambdaFunctions,
    kmsKeyArn: kmsKeyArn,
    vectorStores: vectorStores,
  };

  new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  return Template.fromStack(testApp.testStack);
}
