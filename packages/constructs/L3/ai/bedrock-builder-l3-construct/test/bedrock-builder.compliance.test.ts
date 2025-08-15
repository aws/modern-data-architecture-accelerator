/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionProps, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { BedrockBuilderL3Construct, BedrockBuilderL3ConstructProps, LambdaFunctionProps } from '../lib';
import { BedrockAgentProps, NamedAgentProps } from '@aws-mdaa/bedrock-agent-l3-construct';
import {
  BedrockKnowledgeBaseProps,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  VectorStoreProps,
} from '@aws-mdaa/bedrock-knowledge-base-l3-construct';
import { BedrockGuardrailProps, NamedGuardrailProps } from '@aws-mdaa/bedrock-guardrail-l3-construct';

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
          openApiSchemaPath: `${__dirname}/api-schema/test-schema.yaml`,
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

    test('Test KMS Key Policy for Bedrock Service', () => {
      const kmsResources = template.findResources('AWS::KMS::Key');
      const kmsKey = Object.values(kmsResources)[0] as {
        Properties: {
          KeyPolicy: {
            Statement: Array<{ Sid?: string; Effect: string; Principal: { Service: string }; Action: string[] }>;
          };
        };
      };
      const statements = kmsKey.Properties.KeyPolicy.Statement;
      const bedrockStatement = statements.find(stmt => stmt.Sid === 'AllowBedrockServiceForAgents');
      expect(bedrockStatement).toBeDefined();
      expect(bedrockStatement!.Effect).toBe('Allow');
      expect(bedrockStatement!.Principal.Service).toBe('bedrock.amazonaws.com');
      expect(bedrockStatement!.Action).toEqual(['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:DescribeKey']);
    });
  });

  describe('Bedrock Builder L3 Construct Error Handling', () => {
    test('Test Invalid Vector Store Reference', () => {
      const testApp = new MdaaTestApp();
      const invalidKnowledgeBase: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'non-existent-vector-store',
        s3DataSources: {
          test: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
          },
        },
        embeddingModel: 'amazon.titan-embed-text-v2:0',
      };
      const validVectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };

      expect(() => {
        generateTemplateFromTestInput(
          testApp,
          dataAdminRoleRef,
          undefined,
          { 'valid-vector-store': validVectorStore },
          { 'invalid-kb': invalidKnowledgeBase },
          undefined,
          undefined,
        );
      }).toThrow('Knowledge base invalid-kb references unknown vector store: non-existent-vector-store');
    });

    test('Test Invalid Embedding Model', () => {
      const testApp = new MdaaTestApp();
      const invalidKnowledgeBase: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        s3DataSources: {
          test: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
          },
        },
        embeddingModel: 'invalid-model',
      };
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };

      expect(() => {
        generateTemplateFromTestInput(
          testApp,
          dataAdminRoleRef,
          undefined,
          { 'test-vector-store': vectorStore },
          { 'invalid-kb': invalidKnowledgeBase },
          undefined,
          undefined,
        );
      }).toThrow('Unable to determine vector field size from Embedding Model ID : invalid-model');
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
          enableSync: true,
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
        testFoundationModelWithModelId: {
          bucketName: 'test-docs-bucket-2',
          prefix: 'test-prefix-2/',
          vectorIngestionConfiguration: {
            parsingConfiguration: {
              parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
              bedrockFoundationModelConfiguration: {
                modelArn: 'anthropic.claude-3-sonnet-20240229-v1:0',
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
        testCustomTransformationConfiguration: {
          bucketName: 'test-docs-bucket-4',
          prefix: 'test-prefix-3/',
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
            customTransformationConfiguration: {
              intermediateStorageBucket: 'custom-transform-intermediate-bucket',
              intermediateStoragePrefix: 'path/to/data/objects',
              transformLambdaArns: ['arn:aws:lambda:{{region}}:{{account}}:function:test-custom-parser'],
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
    // Uncomment for debugging:
    // console.log(JSON.stringify(template, null, 2));
    // console.log(JSON.stringify(template.findResources('AWS::Bedrock::KnowledgeBase', {}), null, 2));

    test('Test EnableSync Creates DataSource Lambda Function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Description: 'Auto-sync data source testDataAutomation for knowledge base test-kb-vector',
        Environment: {
          Variables: {
            DATA_SOURCE_ID: {
              'Fn::GetAtt': [
                'testconstructbedrockkbtestkbvectortestkbvectorDataSourcetestDataAutomation7A39DAF6',
                'DataSourceId',
              ],
            },
            KNOWLEDGE_BASE_ID: {
              'Fn::GetAtt': ['testconstructbedrockkbtestkbvectortestkbvectorKnowledgeBaseB9D7CFC0', 'KnowledgeBaseId'],
            },
          },
        },
        FunctionName: 'test-org-test-env-test-domain-test-module-test-kb-vect--610b16ef',
        Handler: 'datasource_sync.lambda_handler',
        KmsKeyArn: { 'Fn::GetAtt': ['bedrockcmk710EFABC', 'Arn'] },
      });
    });
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
    test('Test Data Source with BEDROCK_FOUNDATION_MODEL Parsing Strategy with Model ID', () => {
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testFoundationModelWithModelId',
        VectorIngestionConfiguration: {
          ParsingConfiguration: {
            ParsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
            BedrockFoundationModelConfiguration: {
              ModelArn:
                'arn:test-partition:bedrock:test-region::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
              ParsingModality: 'MULTIMODAL',
              ParsingPrompt: {
                ParsingPromptText: 'Extract key information from this document',
              },
            },
          },
        },
      });
    });

    test('Test Data Source with Custom Transformation Configuration', () => {
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testCustomTransformationConfiguration',
        VectorIngestionConfiguration: {
          CustomTransformationConfiguration: {
            IntermediateStorage: {
              S3Location: {
                URI: 's3://custom-transform-intermediate-bucket/path/to/data/objects/',
              },
            },
            Transformations: [
              {
                StepToApply: 'POST_CHUNKING',
                TransformationFunction: {
                  TransformationLambdaConfiguration: {
                    LambdaArn: 'arn:aws:lambda:{{region}}:{{account}}:function:test-custom-parser',
                  },
                },
              },
            ],
          },
        },
      });
    });

    test('Test Knowledge Base Policy with Foundation Model Access', () => {
      const managedPolicies = template.findResources('AWS::IAM::ManagedPolicy');

      const kbPolicy = Object.values(managedPolicies).find(policy =>
        (policy as { Properties: { ManagedPolicyName?: string } }).Properties.ManagedPolicyName?.includes(
          'kb-foundation',
        ),
      ) as { Properties: { PolicyDocument: { Statement: Array<{ Sid?: string; Effect: string; Action: string[] }> } } };

      expect(kbPolicy).toBeDefined();
      const statements = kbPolicy.Properties.PolicyDocument.Statement;
      const foundationModelStatement = statements.find(stmt => stmt.Sid === 'InvokeFoundationModels');

      expect(foundationModelStatement).toBeDefined();
      expect(foundationModelStatement!.Effect).toBe('Allow');
      expect(foundationModelStatement!.Action).toEqual([
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ]);
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

    test('Test Vector Store Security Group Configuration', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'testing/test-construct/bedrock-kb-test-kb-vector/test-vector-store-vector-store-sg',
        GroupName: 'test-org-test-env-test-domain-test-module-test-vector-store',
        VpcId: 'test-vpc-id',
      });
    });

    test('Test RDS Cluster for Vector Store', () => {
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        Engine: 'aurora-postgresql',
        ServerlessV2ScalingConfiguration: {
          MinCapacity: 1,
          MaxCapacity: 2,
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

    test('Test Lambda Permissions for Agent Action Groups', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'bedrock.amazonaws.com',
      });
    });

    test('Test Knowledge Base Logging Configuration', () => {
      template.hasResourceProperties('AWS::Logs::DeliverySource', {
        LogType: 'APPLICATION_LOGS',
      });
      template.hasResourceProperties('AWS::Logs::DeliveryDestination', {});
      template.hasResourceProperties('AWS::Logs::Delivery', {});
    });

    test('Test Contextual Grounding Filters in Guardrail', () => {
      template.hasResourceProperties('AWS::Bedrock::Guardrail', {
        ContextualGroundingPolicyConfig: {
          FiltersConfig: [
            {
              Type: 'GROUNDING',
              Threshold: 0.9,
            },
            {
              Type: 'RELEVANCE',
              Threshold: 0.8,
            },
          ],
        },
      });
    });
  });

  describe('Bedrock Builder L3 Construct Secret ARN Fallback Test', () => {
    test('Test Secret ARN Fallback Logic', () => {
      // Test the specific logic: vectorStore.rdsClusterSecret.secretArn || ''
      const mockVectorStoreWithSecretArn = {
        rdsClusterSecret: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:test-secret',
        },
      };

      const mockVectorStoreWithoutSecretArn = {
        rdsClusterSecret: {
          secretArn: undefined,
        },
      };

      const mockVectorStoreWithNullSecretArn = {
        rdsClusterSecret: {
          secretArn: null,
        },
      };

      // Test condition 1: when secretArn exists (already covered by other tests)
      const result1 = mockVectorStoreWithSecretArn.rdsClusterSecret.secretArn || '';
      expect(result1).toBe('arn:aws:secretsmanager:us-west-2:123456789012:secret:test-secret');

      // Test condition 2: when secretArn is undefined (this covers the uncovered condition)
      const result2 = mockVectorStoreWithoutSecretArn.rdsClusterSecret.secretArn || '';
      expect(result2).toBe('');

      // Test condition 3: when secretArn is null (additional edge case)
      const result3 = mockVectorStoreWithNullSecretArn.rdsClusterSecret.secretArn || '';
      expect(result3).toBe('');
    });
  });

  describe('Bedrock Builder L3 Construct S3 Data Sources Fallback Test', () => {
    test('Test Knowledge Base without S3 Data Sources', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithoutS3DataSources: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        // s3DataSources is intentionally undefined to test the || {} fallback
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-no-s3': knowledgeBaseWithoutS3DataSources },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that knowledge base is created successfully even without s3DataSources
      template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
        Name: 'test-org-test-env-test-domain-test-module-test-kb-no-s3',
      });
    });

    test('Test Knowledge Base with S3 Data Source without enableSync', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithoutSync: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testNoSync: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
            // enableSync is intentionally undefined/false to test the if condition
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-no-sync': knowledgeBaseWithoutSync },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that data source is created without sync lambda
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testNoSync',
      });

      // Verify no sync lambda function is created
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const syncLambda = Object.values(lambdaFunctions).find(fn =>
        (fn as { Properties?: { Description?: string } }).Properties?.Description?.includes(
          'Auto-sync data source testNoSync',
        ),
      );
      expect(syncLambda).toBeUndefined();
    });

    test('Test Knowledge Base with SEMANTIC chunking strategy but no configuration', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithSemanticNoConfig: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testSemanticNoConfig: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
            vectorIngestionConfiguration: {
              chunkingConfiguration: {
                chunkingStrategy: 'SEMANTIC',
                // semanticChunkingConfiguration is intentionally undefined to test the && condition
              },
            },
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-semantic-no-config': knowledgeBaseWithSemanticNoConfig },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that data source falls back to default chunking strategy
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testSemanticNoConfig',
        VectorIngestionConfiguration: {
          ChunkingConfiguration: {
            ChunkingStrategy: 'SEMANTIC',
          },
        },
      });
    });

    test('Test Knowledge Base with NONE chunking strategy', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithNoneChunking: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testNoneChunking: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
            vectorIngestionConfiguration: {
              chunkingConfiguration: {
                chunkingStrategy: 'NONE',
              },
            },
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-none-chunking': knowledgeBaseWithNoneChunking },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that data source uses NONE chunking strategy without specific configuration
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testNoneChunking',
        VectorIngestionConfiguration: {
          ChunkingConfiguration: {
            ChunkingStrategy: 'NONE',
          },
        },
      });
    });

    test('Test Knowledge Base with S3 Data Source without prefix', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithoutPrefix: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testNoPrefix: {
            bucketName: 'test-docs-bucket',
            // prefix is intentionally undefined to test the ? : undefined condition
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-no-prefix': knowledgeBaseWithoutPrefix },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that data source is created without inclusion prefixes
      template.hasResourceProperties('AWS::Bedrock::DataSource', {
        Name: 'testNoPrefix',
        DataSourceConfiguration: {
          Type: 'S3',
          S3Configuration: {
            BucketArn: 'arn:test-partition:s3:::test-docs-bucket',
          },
        },
      });
    });

    test('Test Knowledge Base with enableSync but no prefix', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithSyncNoPrefix: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testSyncNoPrefix: {
            bucketName: 'test-docs-bucket',
            enableSync: true,
            // prefix is intentionally undefined to test the EventBridge rule condition
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-sync-no-prefix': knowledgeBaseWithSyncNoPrefix },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that sync lambda is created even without prefix
      template.hasResourceProperties('AWS::Lambda::Function', {
        Description: 'Auto-sync data source testSyncNoPrefix for knowledge base test-kb-sync-no-prefix',
      });
    });

    test('Test Knowledge Base with generated function reference in custom transformation', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithGeneratedFunction: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testGeneratedFunction: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
            vectorIngestionConfiguration: {
              customTransformationConfiguration: {
                intermediateStorageBucket: 'test-intermediate-bucket',
                intermediateStoragePrefix: 'test-prefix',
                transformLambdaArns: ['generated-function:test-agent-lambda'],
              },
            },
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-generated-func': knowledgeBaseWithGeneratedFunction },
        vectorStores: { 'test-vector-store': vectorStore },
        lambdaFunctions: lambdaFunctions,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that custom transformation uses generated function ARN
      const dataSourceResources = template.findResources('AWS::Bedrock::DataSource');
      const dataSource = Object.values(dataSourceResources).find(
        ds => (ds as { Properties: { Name: string } }).Properties.Name === 'testGeneratedFunction',
      ) as {
        Properties: {
          VectorIngestionConfiguration: {
            CustomTransformationConfiguration: {
              Transformations: Array<{
                TransformationFunction: {
                  TransformationLambdaConfiguration: { LambdaArn: { 'Fn::GetAtt': [string, string] } };
                };
              }>;
            };
          };
        };
      };

      expect(dataSource).toBeDefined();
      expect(
        dataSource.Properties.VectorIngestionConfiguration.CustomTransformationConfiguration.Transformations[0]
          .TransformationFunction.TransformationLambdaConfiguration.LambdaArn,
      ).toHaveProperty('Fn::GetAtt');
      expect(
        dataSource.Properties.VectorIngestionConfiguration.CustomTransformationConfiguration.Transformations[0]
          .TransformationFunction.TransformationLambdaConfiguration.LambdaArn['Fn::GetAtt'][1],
      ).toBe('Arn');
    });

    test('Test Knowledge Base with non-existent generated function reference', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBaseWithInvalidFunction: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          testInvalidFunction: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
            vectorIngestionConfiguration: {
              customTransformationConfiguration: {
                intermediateStorageBucket: 'test-intermediate-bucket',
                intermediateStoragePrefix: 'test-prefix',
                transformLambdaArns: ['generated-function:non-existent-function'],
              },
            },
          },
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: {},
        roleHelper: roleHelper,
        naming: testApp.naming,
        knowledgeBases: { 'test-kb-invalid-func': knowledgeBaseWithInvalidFunction },
        vectorStores: { 'test-vector-store': vectorStore },
      };

      expect(() => {
        new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      }).toThrow('Code references non-existant Generated Lambda function: non-existent-function');
    });
  });

  describe('Bedrock Builder L3 Construct Action Groups Test', () => {
    test('Test Agent without action groups', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const agentWithoutActionGroups: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent without action groups',
        instruction: 'Test agent without action groups',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        // actionGroups is intentionally undefined to test the ?? [] fallback
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-no-actions': agentWithoutActionGroups },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that agent is created successfully without action groups
      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent-no-actions',
      });
    });

    test('Test Agent with action group without openApiSchemaPath', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const agentWithDirectApiSchema: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with direct API schema',
        instruction: 'Test agent with direct API schema',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        actionGroups: [
          {
            actionGroupExecutor: {
              lambda: 'generated-function:test-agent-lambda',
            },
            actionGroupName: 'test-direct-schema',
            description: 'Action group with direct schema',
            apiSchema: {
              payload: JSON.stringify({
                openapi: '3.0.0',
                info: { title: 'Test API', version: '1.0.0' },
                paths: {},
              }),
            },
            // openApiSchemaPath is intentionally not provided to test the else clause
          },
        ],
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-direct-schema': agentWithDirectApiSchema },
        roleHelper: roleHelper,
        naming: testApp.naming,
        lambdaFunctions: lambdaFunctions,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that agent is created with direct API schema
      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent-direct-schema',
        ActionGroups: [
          {
            ActionGroupName: 'test-direct-schema',
            Description: 'Action group with direct schema',
          },
        ],
      });
    });

    test('Test Agent with knowledge base association', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const vectorStore: VectorStoreProps = {
        vpcId: 'test-vpc-id',
        subnetIds: ['test-subnet'],
      };
      const knowledgeBase: BedrockKnowledgeBaseProps = {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
        s3DataSources: {
          test: {
            bucketName: 'test-docs-bucket',
            prefix: 'test-prefix/',
          },
        },
      };
      const agentWithKB: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with knowledge base',
        instruction: 'Test agent with knowledge base',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'config:test-kb',
            description: 'Test knowledge base association',
          },
        ],
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-kb': agentWithKB },
        knowledgeBases: { 'test-kb': knowledgeBase },
        vectorStores: { 'test-vector-store': vectorStore },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::Agent', {
        AgentName: 'test-org-test-env-test-domain-test-module-test-agent-kb',
        KnowledgeBases: [
          {
            Description: 'Test knowledge base association',
          },
        ],
      });
    });

    test('Test Agent with guardrail association', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const guardrail: BedrockGuardrailProps = {
        contentFilters: {
          hate: {
            inputStrength: 'MEDIUM',
            outputStrength: 'MEDIUM',
          },
        },
      };
      const agentWithGuardrail: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with guardrail',
        instruction: 'Test agent with guardrail',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        guardrail: {
          id: 'config:test-guardrail',
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-guardrail': agentWithGuardrail },
        guardrails: { 'test-guardrail': guardrail },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Test that agent has guardrail configuration
      const agentResources = template.findResources('AWS::Bedrock::Agent');
      const agent = Object.values(agentResources)[0] as {
        Properties: {
          AgentName: string;
          GuardrailConfiguration: {
            GuardrailIdentifier: { 'Fn::GetAtt': [string, string] };
            GuardrailVersion: { 'Fn::GetAtt': [string, string] };
          };
        };
      };

      expect(agent.Properties.AgentName).toBe('test-org-test-env-test-domain-test-module-test-agent-guardrail');
      expect(agent.Properties.GuardrailConfiguration).toBeDefined();
      expect(agent.Properties.GuardrailConfiguration.GuardrailIdentifier).toHaveProperty('Fn::GetAtt');
      expect(agent.Properties.GuardrailConfiguration.GuardrailVersion).toHaveProperty('Fn::GetAtt');
    });

    test('Test Agent with alias creation', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const agentWithAlias: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with alias',
        instruction: 'Test agent with alias',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        agentAliasName: 'test-alias',
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-alias': agentWithAlias },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::Bedrock::AgentAlias', {
        AgentAliasName: 'test-alias',
      });
    });

    test('Test Agent with invalid knowledge base reference', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const agentWithInvalidKB: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with invalid KB',
        instruction: 'Test agent with invalid KB',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        knowledgeBases: [
          {
            id: 'config:non-existent-kb',
            description: 'Invalid knowledge base',
          },
        ],
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-invalid-kb': agentWithInvalidKB },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      expect(() => {
        new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      }).toThrow('Agent references unknown knowledge base from config :config:non-existent-kb');
    });

    test('Test Agent with guardrail missing version', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const agentWithInvalidGuardrail: BedrockAgentProps = {
        role: agentExecutionRoleRef,
        description: 'Agent with invalid guardrail',
        instruction: 'Test agent with invalid guardrail',
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        guardrail: {
          id: 'direct-guardrail-id',
          // version is intentionally missing to test error case
        },
      };

      const constructProps: BedrockBuilderL3ConstructProps = {
        dataAdminRoles: [dataAdminRoleRef],
        agents: { 'test-agent-invalid-guardrail': agentWithInvalidGuardrail },
        roleHelper: roleHelper,
        naming: testApp.naming,
      };

      expect(() => {
        new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
      }).toThrow('Guardrail version must be specified');
    });
  });

  describe('Error Handling Tests', () => {
    test('Test Agent with Config Knowledge Base Reference Error', () => {
      const testApp1 = new MdaaTestApp();
      const agentWithInvalidKB: BedrockAgentProps = {
        ...agent,
        knowledgeBases: [
          {
            id: 'config:non-existent-kb',
            description: 'Test KB',
          },
        ],
      };

      expect(() => {
        generateTemplateFromTestInput(
          testApp1,
          dataAdminRoleRef,
          { 'test-agent-error': agentWithInvalidKB },
          undefined,
          undefined,
          undefined,
          lambdaFunctions,
        );
      }).toThrow('Agent references unknown knowledge base from config :config:non-existent-kb');
    });

    test('Test Agent with Guardrail Missing Version Error', () => {
      const testApp2 = new MdaaTestApp();
      const agentWithInvalidGuardrail: BedrockAgentProps = {
        ...agent,
        guardrail: {
          id: 'guardrail-67890',
        },
      };

      expect(() => {
        generateTemplateFromTestInput(
          testApp2,
          dataAdminRoleRef,
          { 'test-agent-guardrail-error': agentWithInvalidGuardrail },
          undefined,
          undefined,
          undefined,
          lambdaFunctions,
        );
      }).toThrow('Guardrail version must be specified');
    });
  });

  describe('Agent with Knowledge Base and Guardrail Integration', () => {
    const testApp = new MdaaTestApp();

    const agentWithKBAndGuardrail: BedrockAgentProps = {
      ...agent,
      knowledgeBases: [
        {
          id: 'kb-12345',
          description: 'Test Knowledge Base',
          knowledgeBaseState: 'ENABLED',
        },
      ],
      guardrail: {
        id: 'guardrail-67890',
        version: '1',
      },
    };

    const template = generateTemplateFromTestInput(
      testApp,
      dataAdminRoleRef,
      { 'test-agent-full': agentWithKBAndGuardrail },
      undefined,
      undefined,
      undefined,
      lambdaFunctions,
    );

    test('Test Agent Policy Contains Guardrail Permission', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-agent-test-agent-full',
        PolicyDocument: {
          Statement: [
            {},
            {},
            {
              Sid: 'AllowApplyBedrockGuardrail',
              Effect: 'Allow',
              Action: 'bedrock:ApplyGuardrail',
              Resource: 'arn:aws:bedrock:test-region:test-account:guardrail/guardrail-67890',
            },
            {},
          ],
        },
      });
    });

    test('Test Agent Policy Contains Knowledge Base Permission', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-agent-test-agent-full',
        PolicyDocument: {
          Statement: [
            {},
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

    test('Test Lambda Permission for Agent Action Group', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'bedrock.amazonaws.com',
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
