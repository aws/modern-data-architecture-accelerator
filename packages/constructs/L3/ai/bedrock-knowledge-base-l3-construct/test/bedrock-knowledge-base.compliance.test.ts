/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { AuroraCapacityUnit } from 'aws-cdk-lib/aws-rds';
import {
  BedrockKnowledgeBaseL3Construct,
  BedrockKnowledgeBaseL3ConstructProps,
  BedrockKnowledgeBaseProps,
  VectorStoreProps,
} from '../lib';

describe('Bedrock Knowledge Base L3 Construct Tests', () => {
  const kbRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/kb-execution-role',
    name: 'kb-execution-role',
  };

  const vectorStoreConfig: VectorStoreProps = {
    vpcId: 'test-vpc-id',
    subnetIds: ['test-subnet-1', 'test-subnet-2'],
    minCapacity: AuroraCapacityUnit.ACU_2,
    maxCapacity: AuroraCapacityUnit.ACU_16,
  };

  const basicKnowledgeBase: BedrockKnowledgeBaseProps = {
    role: kbRoleRef,
    vectorStore: 'test-vector-store',
    s3DataSources: {
      testSource: {
        bucketName: 'test-docs-bucket',
        prefix: 'test-prefix/',
      },
    },
    embeddingModel: 'amazon.titan-embed-text-v2:0',
    vectorFieldSize: 1024,
    supplementalBucketName: 'test-supplemental-bucket',
  };

  test('Test Basic Knowledge Base Creation', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
      Name: 'test-org-test-env-test-domain-test-module-test-kb',
      KnowledgeBaseConfiguration: {
        Type: 'VECTOR',
        VectorKnowledgeBaseConfiguration: {
          EmbeddingModelArn: 'arn:test-partition:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
        },
      },
      StorageConfiguration: {
        Type: 'RDS',
      },
    });
  });

  test('Test Knowledge Base with Vector Ingestion Configuration', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithIngestion: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
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
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-ingestion',
      kbConfig: kbWithIngestion,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-ingestion-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

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

  test('Test Knowledge Base with Sync Lambda', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithSync: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        testSync: {
          bucketName: 'test-docs-bucket',
          prefix: 'test-prefix/',
          enableSync: true,
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-sync',
      kbConfig: kbWithSync,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-sync-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'datasource_sync.lambda_handler',
      Runtime: 'python3.13',
    });
  });

  test('Test RDS Aurora Cluster Creation', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-rds',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-rds-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
    });
  });

  test('Test Error for Unknown Embedding Model', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithUnknownModel: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      embeddingModel: 'unknown.model',
      vectorFieldSize: undefined, // Remove vectorFieldSize to trigger error
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-error',
      kbConfig: kbWithUnknownModel,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-error-construct', constructProps);
    }).toThrow('Unable to determine vector field size from Embedding Model ID : unknown.model');
  });

  test('Test Data Source Without Vector Ingestion', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithSimpleDataSource: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        simpleSource: {
          bucketName: 'simple-bucket',
          prefix: 'simple-prefix/',
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-simple',
      kbConfig: kbWithSimpleDataSource,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-simple-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      Name: 'simpleSource',
    });
  });

  test('Test Hierarchical and Semantic Chunking', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithAdvancedChunking: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        hierarchicalSource: {
          bucketName: 'test-bucket',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'HIERARCHICAL',
              hierarchicalChunkingConfiguration: {
                levelConfigurations: [{ maxTokens: 1000 }, { maxTokens: 500 }],
                overlapTokens: 50,
              },
            },
          },
        },
        semanticSource: {
          bucketName: 'test-bucket-2',
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
        noneChunking: {
          bucketName: 'test-bucket-3',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'NONE',
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-chunking',
      kbConfig: kbWithAdvancedChunking,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-chunking-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      Name: 'hierarchicalSource',
      VectorIngestionConfiguration: {
        ChunkingConfiguration: {
          ChunkingStrategy: 'HIERARCHICAL',
          HierarchicalChunkingConfiguration: {
            LevelConfigurations: [{ MaxTokens: 1000 }, { MaxTokens: 500 }],
            OverlapTokens: 50,
          },
        },
      },
    });

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      Name: 'semanticSource',
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

  test('Test Custom Transformation and Parsing Prompt', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithCustomConfig: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        customSource: {
          bucketName: 'custom-bucket',
          vectorIngestionConfiguration: {
            parsingConfiguration: {
              parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
              bedrockFoundationModelConfiguration: {
                modelArn: 'anthropic.claude-3-sonnet-20240229-v1:0',
                parsingPromptText: 'Extract key information',
                parsingModality: 'MULTIMODAL',
              },
            },
            customTransformationConfiguration: {
              intermediateStorageBucket: 'transform-bucket',
              intermediateStoragePrefix: 'transform-prefix',
              transformLambdaArns: ['arn:aws:lambda:us-east-1:123456789012:function:transform'],
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-custom',
      kbConfig: kbWithCustomConfig,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-custom-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      VectorIngestionConfiguration: {
        ParsingConfiguration: {
          ParsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
          BedrockFoundationModelConfiguration: {
            ParsingPrompt: {
              ParsingPromptText: 'Extract key information',
            },
          },
        },
        CustomTransformationConfiguration: {
          IntermediateStorage: {
            S3Location: {
              URI: 's3://transform-bucket/transform-prefix/',
            },
          },
          Transformations: [
            {
              StepToApply: 'POST_CHUNKING',
              TransformationFunction: {
                TransformationLambdaConfiguration: {
                  LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:transform',
                },
              },
            },
          ],
        },
      },
    });
  });
});
