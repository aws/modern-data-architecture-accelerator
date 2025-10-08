/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { AuroraCapacityUnit } from 'aws-cdk-lib/aws-rds';
import {
  BedrockKnowledgeBaseL3Construct,
  BedrockKnowledgeBaseL3ConstructProps,
  BedrockKnowledgeBaseProps,
  AuroraServerlessPgVectorProps,
  OpensearchServerlessProps,
} from '../lib';

// Mock the resolveModelArn function
jest.mock('@aws-mdaa/ai-helper', () => ({
  resolveModelArn: jest.fn((modelIdentifier: string, partition: string, region: string, account: string) =>
    modelIdentifier.startsWith('arn:')
      ? modelIdentifier
      : modelIdentifier.startsWith('us.')
      ? `arn:${partition}:bedrock:${region}:${account}:inference-profile/${modelIdentifier}`
      : `arn:${partition}:bedrock:${region}::foundation-model/${modelIdentifier}`,
  ),
}));

describe('Bedrock Knowledge Base L3 Construct Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const kbRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/kb-execution-role',
    name: 'kb-execution-role',
  };

  const vectorStoreConfig: AuroraServerlessPgVectorProps = {
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
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'test-org-test-env-test-domain-test-module-kb-foundatio--387a8141',
      PolicyDocument: {
        Statement: [
          {
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Effect: 'Allow',
            Resource: 'arn:test-partition:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
            Sid: 'InvokeFoundationModels',
          },
          {},
        ],
      },
    });
  });

  test('Test Knowledge Base Creation with ARN', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb',
      kbConfig: {
        ...basicKnowledgeBase,
        embeddingModel: 'arn:aws:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
      },
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
          EmbeddingModelArn: 'arn:aws:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
        },
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

  test('Test Knowledge Base with Batch Sync Lambda', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithBatchSync: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        testBatchSync: {
          bucketName: 'test-docs-bucket',
          prefix: 'test-prefix/',
          enableMultiSync: true,
          syncLambdaRoleArn: 'arn:test-partition:iam::test-account:role/batch-sync-lambda-role',
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-batch-sync',
      kbConfig: kbWithBatchSync,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-batch-sync-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'datasource_batch_sync.lambda_handler',
      Runtime: 'python3.13',
      Role: 'arn:test-partition:iam::test-account:role/batch-sync-lambda-role',
    });

    // Verify SQS queue is created
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 900,
      ReceiveMessageWaitTimeSeconds: 20,
    });

    // Verify Dead Letter Queue is created
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 1209600, // 14 days
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

    template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
      Name: 'test-org-test-env-test-domain-test-module-test-kb-chunking',
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
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'test-org-test-env-test-domain-test-module-kb-foundation--5ffcdc1',
      PolicyDocument: {
        Statement: [
          {
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Effect: 'Allow',
            Resource: [
              'arn:test-partition:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
              'arn:test-partition:bedrock:test-region::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
            ],
            Sid: 'InvokeFoundationModels',
          },
          {},
        ],
      },
    });
  });

  test('Test Custom Transformation and Parsing Prompt using Inference', () => {
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
                modelArn: 'us.anthropic.claude-3-sonnet-20240229-v1:0',
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
            ModelArn:
              'arn:test-partition:bedrock:test-region:test-account:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
          },
        },
      },
    });
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'test-org-test-env-test-domain-test-module-kb-foundation--5ffcdc1',
      PolicyDocument: {
        Statement: [
          {
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
            Effect: 'Allow',
            Resource: [
              'arn:test-partition:bedrock:test-region::foundation-model/amazon.titan-embed-text-v2:0',
              'arn:test-partition:bedrock:test-region:test-account:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
            ],
            Sid: 'InvokeFoundationModels',
          },
          {},
        ],
      },
    });
  });

  test('Test Knowledge Base with Multiple Transform Lambda ARNs', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithMultipleTransforms: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        multiTransformSource: {
          bucketName: 'multi-transform-bucket',
          vectorIngestionConfiguration: {
            customTransformationConfiguration: {
              intermediateStorageBucket: 'transform-bucket',
              intermediateStoragePrefix: 'transform-prefix',
              transformLambdaArns: [
                'arn:aws:lambda:us-east-1:123456789012:function:transform1',
                'arn:aws:lambda:us-east-1:123456789012:function:transform2',
              ],
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-multi-transform',
      kbConfig: kbWithMultipleTransforms,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-multi-transform-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      VectorIngestionConfiguration: {
        CustomTransformationConfiguration: {
          Transformations: [
            {
              StepToApply: 'POST_CHUNKING',
              TransformationFunction: {
                TransformationLambdaConfiguration: {
                  LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:transform1',
                },
              },
            },
            {
              StepToApply: 'POST_CHUNKING',
              TransformationFunction: {
                TransformationLambdaConfiguration: {
                  LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:transform2',
                },
              },
            },
          ],
        },
      },
    });
  });

  test('Test Knowledge Base Parameter and Output Creation', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-params',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-params-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    // Verify SSM parameter is created for knowledge base ID
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Type: 'String',
    });

    // Verify CloudFormation output is created
    const outputs = template.findOutputs('*');
    expect(Object.keys(outputs).length).toBeGreaterThan(0);
  });

  test('Test OpenSearch Serverless Vector Store', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const opensearchConfig: OpensearchServerlessProps = {
      vpcId: 'test-vpc-id',
      subnetIds: ['test-subnet-1', 'test-subnet-2'],
      vectorStoreType: 'OPENSEARCH_SERVERLESS' as const,
      standbyReplicas: 'ENABLE' as const,
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-opensearch',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig: opensearchConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-opensearch-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
      Type: 'VECTORSEARCH',
    });
  });

  test('Test SharePoint Data Source', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithSharePoint: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      sharepointDataSources: {
        sharePointSource: {
          dataSource: {
            authType: 'OAUTH2_CLIENT_CREDENTIALS',
            credentialsSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:sharepoint-creds',
            domain: 'example.sharepoint.com',
            siteUrls: ['https://example.sharepoint.com/sites/test'],
            tenantId: '12345678-1234-1234-1234-123456789012',
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-sharepoint',
      kbConfig: kbWithSharePoint,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-sharepoint-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      Name: 'sharePointSource',
      DataSourceConfiguration: {
        Type: 'SHAREPOINT',
      },
    });
  });

  test('Test Knowledge Base with Inference Profile Model', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithInferenceProfile: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      embeddingModel: 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile',
      vectorFieldSize: 1024,
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-inference',
      kbConfig: kbWithInferenceProfile,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-inference-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:GetInferenceProfile'],
            Effect: 'Allow',
            Resource: 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile',
            Sid: 'InvokeFoundationModels',
          },
        ]),
      },
    });
  });

  test('Test Chunking Configuration Validation Errors', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithInvalidFixedSize: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      s3DataSources: {
        invalidSource: {
          bucketName: 'test-bucket',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'FIXED_SIZE',
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-invalid',
      kbConfig: kbWithInvalidFixedSize,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-invalid-construct', constructProps);
    }).toThrow('fixedSizeChunkingConfiguration is required when chunkingStrategy is FIXED_SIZE');
  });

  test('Test Invalid Vector Store Type Error', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const invalidVectorStoreConfig = {
      ...vectorStoreConfig,
      vectorStoreType: 'INVALID_TYPE' as unknown as string,
    } as AuroraServerlessPgVectorProps | OpensearchServerlessProps;

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-invalid-store',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig: invalidVectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-invalid-store-construct', constructProps);
    }).toThrow('Invalid vector store type: INVALID_TYPE');
  });

  test('Test Knowledge Base Logging Configuration', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-logging',
      kbConfig: basicKnowledgeBase,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-logging-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: Match.stringLikeRegexp('/aws/vendedlogs/bedrock/knowledge-base/.*'),
    });

    template.hasResourceProperties('AWS::Logs::DeliverySource', {
      LogType: 'APPLICATION_LOGS',
    });

    template.hasResourceProperties('AWS::Logs::DeliveryDestination', {});
    template.hasResourceProperties('AWS::Logs::Delivery', {});
  });

  test('Test Multiple Embedding Models Vector Field Size', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const testCases = [
      { model: 'cohere.embed-english-v3', expectedSize: 1024 },
      { model: 'amazon.titan-embed-text-v2:0', expectedSize: 1024 },
    ];

    testCases.forEach(({ model, expectedSize }, index) => {
      const kbWithModel: BedrockKnowledgeBaseProps = {
        ...basicKnowledgeBase,
        embeddingModel: model,
      };

      const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
        kbName: `test-kb-model-${index}`,
        kbConfig: kbWithModel,
        vectorStoreConfig,
        kmsKey,
        roleHelper,
        naming: testApp.naming,
      };

      const construct = new BedrockKnowledgeBaseL3Construct(
        testApp.testStack,
        `test-kb-model-construct-${index}`,
        constructProps,
      );

      expect((construct as unknown as { cachedVectorFieldSize: number })['cachedVectorFieldSize']).toBe(expectedSize);
    });
  });

  test('Test Unknown Embedding Model Error', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const kbWithUnknownModel: BedrockKnowledgeBaseProps = {
      ...basicKnowledgeBase,
      embeddingModel: 'unknown.embedding-model',
      vectorFieldSize: undefined, // Remove vectorFieldSize to trigger error
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-unknown-model',
      kbConfig: kbWithUnknownModel,
      vectorStoreConfig,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-unknown-model-construct', constructProps);
    }).toThrow('Unable to determine vector field size from Embedding Model ID : unknown.embedding-model. ');
  });

  test('Should throw error when syncLambdaRoleArn is missing for enableMultiSync', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');
    const kbWithMissingRoleArn: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      embeddingModel: 'amazon.titan-embed-text-v2:0',
      s3DataSources: {
        testSource: {
          bucketName: 'test-bucket',
          enableMultiSync: true,
          // syncLambdaRoleArn is missing
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-missing-role',
      kbConfig: kbWithMissingRoleArn,
      vectorStoreConfig,
      kmsKey,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-missing-role-construct', constructProps);
    }).toThrow('syncLambdaRoleArn is required when enableMultiSync is true for data source testSource');
  });

  test('Should throw error when hierarchicalChunkingConfiguration is missing', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');
    const kbWithMissingHierarchical: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      embeddingModel: 'amazon.titan-embed-text-v2:0',
      s3DataSources: {
        testSource: {
          bucketName: 'test-bucket',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'HIERARCHICAL',
              // hierarchicalChunkingConfiguration is missing
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-missing-hierarchical',
      kbConfig: kbWithMissingHierarchical,
      vectorStoreConfig,
      kmsKey,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-missing-hierarchical-construct', constructProps);
    }).toThrow('hierarchicalChunkingConfiguration is required when chunkingStrategy is HIERARCHICAL');
  });

  test('Should throw error when semanticChunkingConfiguration is missing', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');
    const kbWithMissingSemantic: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      embeddingModel: 'amazon.titan-embed-text-v2:0',
      s3DataSources: {
        testSource: {
          bucketName: 'test-bucket',
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'SEMANTIC',
              // semanticChunkingConfiguration is missing
            },
          },
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-missing-semantic',
      kbConfig: kbWithMissingSemantic,
      vectorStoreConfig,
      kmsKey,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-missing-semantic-construct', constructProps);
    }).toThrow('semanticChunkingConfiguration is required when chunkingStrategy is SEMANTIC');
  });

  test('Should handle prefix in data source configuration', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');
    const kbWithPrefix: BedrockKnowledgeBaseProps = {
      role: kbRoleRef,
      vectorStore: 'test-vector-store',
      embeddingModel: 'amazon.titan-embed-text-v2:0',
      s3DataSources: {
        testSource: {
          bucketName: 'test-bucket',
          prefix: 'test-prefix/',
        },
      },
    };

    const constructProps: BedrockKnowledgeBaseL3ConstructProps = {
      kbName: 'test-kb-prefix',
      kbConfig: kbWithPrefix,
      vectorStoreConfig,
      kmsKey,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new BedrockKnowledgeBaseL3Construct(testApp.testStack, 'test-kb-prefix-construct', constructProps);
    }).not.toThrow();
  });
});
