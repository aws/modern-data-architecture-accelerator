/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup, MdaaLogGroupProps } from '@aws-mdaa/cloudwatch-constructs';
import { FunctionProps, LambdaFunctionL3Construct } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaManagedPolicyProps } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  MdaaAuroraPgVector,
  MdaaAuroraPgVectorProps,
  MdaaRdsDataResource,
  MdaaRdsDataResourceProps,
} from '@aws-mdaa/rds-constructs';
import { aws_bedrock as bedrock, aws_s3 as s3, CfnResource } from 'aws-cdk-lib';
import { Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { AuroraCapacityUnit } from 'aws-cdk-lib/aws-rds';
import {
  CfnDelivery,
  CfnDeliveryDestination,
  CfnDeliveryDestinationProps,
  CfnDeliveryProps,
  CfnDeliverySource,
  CfnDeliverySourceProps,
  RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { join } from 'path';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';

// ---------------------------------------------
// Knowledge Base Interfaces and Types
// ---------------------------------------------

export interface BedrockDataAutomationConfig {
  /**
   * Specifies whether to enable parsing of multimodal data, including both text and/or images.
   * Allowed value: MULTIMODAL
   */
  readonly parsingModality?: 'MULTIMODAL';
}

export interface BedrockFoundationModelConfig {
  /**
   * The ARN of the foundation model to use for parsing
   */
  readonly modelArn: string;
  /**
   * Optional parsing instructions for the foundation model
   */
  readonly parsingPromptText?: string;
  /**
   * Specifies whether to enable parsing of multimodal data, including both text and/or images.
   * Allowed value: MULTIMODAL
   */
  readonly parsingModality?: 'MULTIMODAL';
}

export interface ParsingConfiguration {
  /**
   * The parsing strategy to use for processing documents
   * BEDROCK_DATA_AUTOMATION - Use Bedrock Data Automation for parsing
   * BEDROCK_FOUNDATION_MODEL - Use foundation model for parsing
   */
  readonly parsingStrategy: 'BEDROCK_DATA_AUTOMATION' | 'BEDROCK_FOUNDATION_MODEL';
  /**
   * Configuration for Bedrock Data Automation parsing
   * Optional when parsingStrategy is BEDROCK_DATA_AUTOMATION
   */
  readonly bedrockDataAutomationConfiguration?: BedrockDataAutomationConfig;
  /**
   * Configuration for foundation model parsing
   * Required when parsingStrategy is BEDROCK_FOUNDATION_MODEL
   */
  readonly bedrockFoundationModelConfiguration?: BedrockFoundationModelConfig;
}

export interface CustomTransformationConfiguration {
  /**
   * Intermediate bucket to store input documents to run custom Lambda function on and to also store the output of the documents
   */
  readonly intermediateStorageBucket: string;
  /**
   * Intermediate bucket S3 prefix to store input documents to run custom Lambda function on and to also store the output of the documents
   */
  readonly intermediateStoragePrefix: string;
  /**
   * List of ARNs of Custom Transformation Lambda functions
   */
  readonly transformLambdaArns: string[];
}

export interface FixedSizeChunking {
  /**
   * Maximum tokens per chunk
   */
  readonly maxTokens: number;
  /**
   * Percentage of overlap between chunks
   */
  readonly overlapPercentage: number;
}

export interface HierarchicalChunkingLevelConfig {
  /**
   * Maximum tokens for this level
   */
  readonly maxTokens: number;
}

export interface HierarchicalChunking {
  /**
   * Level configurations for hierarchical chunking
   */
  readonly levelConfigurations: HierarchicalChunkingLevelConfig[];
  /**
   * Number of tokens to overlap between chunks
   */
  readonly overlapTokens: number;
}

export interface SemanticChunking {
  /**
   * Maximum tokens per chunk
   */
  readonly maxTokens: number;
  /**
   * Buffer size (number of surrounding sentences)
   */
  readonly bufferSize: number;
  /**
   * Breakpoint percentile threshold
   */
  readonly breakpointPercentileThreshold: number;
}

export interface ChunkingConfiguration {
  /**
   * The chunking strategy to use for processing documents
   * FIXED_SIZE - Split documents into chunks of specified size
   * HIERARCHICAL - Split documents into parent and child chunks
   * SEMANTIC - Split documents based on semantic meaning
   * NONE - Treat each file as a single chunk
   */
  readonly chunkingStrategy: 'FIXED_SIZE' | 'HIERARCHICAL' | 'SEMANTIC' | 'NONE';
  /**
   * Configuration for fixed-size chunking
   */
  readonly fixedSizeChunkingConfiguration?: FixedSizeChunking;
  /**
   * Configuration for hierarchical chunking
   */
  readonly hierarchicalChunkingConfiguration?: HierarchicalChunking;
  /**
   * Configuration for semantic chunking
   */
  readonly semanticChunkingConfiguration?: SemanticChunking;
}

export interface VectorIngestionConfiguration {
  /**
   * Configuration for document parsing
   */
  readonly parsingConfiguration?: ParsingConfiguration;
  /**
   * Configuration for document chunking
   */
  readonly chunkingConfiguration?: ChunkingConfiguration;
  /**
   * Configuration for custom transformation
   */
  readonly customTransformationConfiguration?: CustomTransformationConfiguration;
}

export interface S3DataSource {
  /**
   * The name of the S3 bucket containing the data
   */
  readonly bucketName: string;
  /**
   * Optional prefix to limit which objects in the bucket are included
   */
  readonly prefix?: string;
  /**
   * Vector ingestion configuration for this data source
   */
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
  /**
   * Enable automatic sync when S3 objects are created/updated
   * @default false
   */
  readonly enableSync?: boolean;
}

export interface VectorStoreProps {
  /**
   * VPC where the vector store will be deployed
   */
  readonly vpcId: string;
  /**
   * subnet selection for the vector store
   */
  readonly subnetIds: string[];
  /**
   * Optional port number for the database connection (default: 5432)
   */
  readonly port?: number;
  /**
   * Optional Aurora PostgreSQL engine version
   */
  readonly engineVersion?: string;
  /**
   * Optional minimum Aurora Capacity Units
   */
  readonly minCapacity?: AuroraCapacityUnit;
  /**
   * Optional maximum Aurora Capacity Units
   */
  readonly maxCapacity?: AuroraCapacityUnit;
}

export interface NamedS3DataSource {
  /** @jsii ignore */
  [dsName: string]: S3DataSource;
}

export interface NamedVectorStoreProps {
  /** @jsii ignore */
  [storeName: string]: VectorStoreProps;
}

export interface BedrockKnowledgeBaseProps {
  /**
   * Array of S3 data sources to be used for the knowledge base
   * Each data source specifies a bucket and optional prefix
   */
  readonly s3DataSources?: NamedS3DataSource;
  /**
   * Configuration for the vector store database
   */
  readonly vectorStore: string;
  /**
   * Embedding model ID to use for generating vector embeddings.
   * Example: "amazon.titan-embed-text-v1"
   */
  readonly embeddingModel: string;
  /**
   * Field size where the vector embeddings will be stored
   */
  readonly vectorFieldSize?: number;
  /**
   * Name of the S3 bucket for supplemental data storage.
   * Required when using advanced parsing strategies like BEDROCK_DATA_AUTOMATION or BEDROCK_FOUNDATION_MODEL.
   */
  readonly supplementalBucketName?: string;
  /**
   * Reference to role which will be used as execution role on knowledge base.
   * The role must have assume role trust with bedrock.amazonaws.com
   * The role must have access to S3 data sources granted within MDAA bucket config
   * Optionally:
   * a) Role must have assume role trust with lambda.amazonaws.com to enable sync functionality for datasources
   * b) If datasource is configured with BedrockDataAutomation or Foundation Model Parsing, Role must have access to the Root of a supplementalBucket
   */
  readonly role: MdaaRoleRef;
}

export interface NamedKnowledgeBaseProps {
  /** @jsii ignore */
  [knowledgeBaseName: string]: BedrockKnowledgeBaseProps;
}

export interface BedrockKnowledgeBaseL3ConstructProps extends MdaaL3ConstructProps {
  readonly kbName: string;
  readonly kbConfig: BedrockKnowledgeBaseProps;
  readonly vectorStoreConfig: VectorStoreProps;
  readonly kmsKey: IKey;
}

// ---------------------------------------------
// Bedrock Knowledge Bases L3 Construct
// ---------------------------------------------

export class BedrockKnowledgeBaseL3Construct extends MdaaL3Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  /** @jsii ignore */
  public readonly vectorStore: [MdaaAuroraPgVector, ManagedPolicy];
  protected readonly props: BedrockKnowledgeBaseL3ConstructProps;

  private static EMBEDDING_MODEL_VECTOR_SIZE: { [model: string]: number } = {
    'amazon.titan-embed-text-v2': 1024,
    'amazon.titan-embed-image-v1': 1024,
    'cohere.embed-english-v3': 1024,
    'cohere.embed-multilingual-v3': 1024,
  };

  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Create vector store first
    this.vectorStore = this.createVectorStore(props.kbConfig.vectorStore, props.vectorStoreConfig, props.kmsKey);

    this.knowledgeBase = this.createKnowledgeBase(props.kbName, props.kbConfig, props.kmsKey, this.vectorStore);
  }

  private createVectorStore(
    vectorStoreName: string,
    vectorStoreConfig: VectorStoreProps,
    kmsKey: IKey,
  ): [MdaaAuroraPgVector, ManagedPolicy] {
    const vpc = Vpc.fromVpcAttributes(this, `vpc-import-vectorstore-${vectorStoreName}`, {
      vpcId: vectorStoreConfig.vpcId,
      availabilityZones: ['a'],
      publicSubnetIds: ['a'],
    });
    const vectorStoreSg = new MdaaSecurityGroup(this, `${vectorStoreName}-vector-store-sg`, {
      naming: this.props.naming,
      securityGroupName: vectorStoreName,
      vpc: vpc,
      allowAllOutbound: true,
      addSelfReferenceRule: true,
    });

    const subnets = vectorStoreConfig.subnetIds.map(id =>
      Subnet.fromSubnetId(this, `kb-import-subnet-${vectorStoreName}-${id}`, id),
    );

    const pgVectorProps: MdaaAuroraPgVectorProps = {
      region: this.region,
      partition: this.partition,
      vpc: vpc,
      subnets: { subnets: subnets },
      dbSecurityGroup: vectorStoreSg,
      encryptionKey: kmsKey,
      minCapacity: vectorStoreConfig.minCapacity,
      maxCapacity: vectorStoreConfig.maxCapacity,
      naming: this.props.naming,
      enableDataApi: true,
      clusterIdentifier: vectorStoreName,
    };

    const pgVectorStore = new MdaaAuroraPgVector(this, `pgvector-${vectorStoreName}`, pgVectorProps);
    const managedPolicy = new MdaaManagedPolicy(this, `bedrock-knowledge-base-access-${vectorStoreName}`, {
      naming: this.props.naming,
      managedPolicyName: `kb-access-${vectorStoreName}`,
      statements: [
        new PolicyStatement({
          sid: 'DBSecretAccess',
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: [pgVectorStore.rdsClusterSecret.secretArn],
          effect: Effect.ALLOW,
        }),
        new PolicyStatement({
          sid: 'DBQuery',
          actions: ['rds-data:ExecuteStatement', 'rds-data:BatchExecuteStatement', 'rds:DescribeDBClusters'],
          resources: [pgVectorStore.clusterArn],
          effect: Effect.ALLOW,
        }),
        new PolicyStatement({
          sid: 'KMSUsage',
          actions: USER_ACTIONS,
          resources: [kmsKey.keyArn],
          effect: Effect.ALLOW,
        }),
      ],
    });
    return [pgVectorStore, managedPolicy];
  }

  private createKnowledgeBase(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
    vectorStore: [MdaaAuroraPgVector, ManagedPolicy],
  ): bedrock.CfnKnowledgeBase {
    const [pgVectorStore, vectorStorePolicy] = vectorStore;
    const databaseName = kbName.replace(/[^a-zA-Z0-9]/g, '_');
    const embeddingModelBase = kbConfig.embeddingModel.replace(/:.*/, '');
    const embeddingModelHash = this.hashCodeHex(kbConfig.embeddingModel);
    const vectorFieldSize =
      kbConfig.vectorFieldSize || BedrockKnowledgeBaseL3Construct.EMBEDDING_MODEL_VECTOR_SIZE[embeddingModelBase];

    if (!vectorFieldSize) {
      throw new Error(`Unable to determine vector field size from Embedding Model ID : ${kbConfig.embeddingModel}`);
    }

    const tableName = `embeddings_${embeddingModelHash.slice(-8)}_${vectorFieldSize}`;
    const metadataField = 'metadata';
    const customMetadataField = 'custom_metadata';
    const primaryKeyField = 'id';
    const textField = 'content';
    const vectorField = `embedding`;

    const createDbProps: MdaaRdsDataResourceProps = {
      rdsCluster: pgVectorStore,
      onCreateSqlStatements: [`CREATE DATABASE ${databaseName}`],
      naming: this.props.naming,
    };
    const createDb = new MdaaRdsDataResource(this, `create-db-${kbName}`, createDbProps);

    const createTableProps: MdaaRdsDataResourceProps = {
      rdsCluster: pgVectorStore,
      databaseName: databaseName,
      onCreateSqlStatements: [
        'CREATE EXTENSION IF NOT EXISTS vector',
        this.generateCreateTableSql(
          tableName,
          primaryKeyField,
          textField,
          metadataField,
          vectorField,
          vectorFieldSize,
          customMetadataField,
        ),
        ...this.generateCreateIndexesSql(tableName, textField, vectorField, customMetadataField),
      ],
      naming: this.props.naming,
    };
    const createTable = new MdaaRdsDataResource(this, `create-table-${kbName}-${tableName}`, createTableProps);
    createTable.node.addDependency(createDb);

    const kbRole = this.props.roleHelper
      .resolveRoleRefWithRefId(kbConfig.role, `bedrock-knowledge-base-role-${kbName}`)
      .role(`bedrock-knowledge-base-role-${kbName}`);

    kbRole.addManagedPolicy(vectorStorePolicy);
    createTable.handlerFunction.role?.addManagedPolicy(vectorStorePolicy);

    const embeddingModelArn = kbConfig.embeddingModel.startsWith('arn:')
      ? kbConfig.embeddingModel
      : `arn:${this.partition}:bedrock:${this.region}::foundation-model/${kbConfig.embeddingModel}`;

    // Collect foundation model ARNs used in parsing configurations
    const parsingModelArns = new Set<string>();
    Object.values(kbConfig.s3DataSources || {}).forEach(dsProps => {
      if (dsProps.vectorIngestionConfiguration?.parsingConfiguration) {
        const parsingConfig = dsProps.vectorIngestionConfiguration.parsingConfiguration;
        if (
          parsingConfig.parsingStrategy === 'BEDROCK_FOUNDATION_MODEL' &&
          parsingConfig.bedrockFoundationModelConfiguration?.modelArn
        ) {
          parsingModelArns.add(
            parsingConfig.bedrockFoundationModelConfiguration.modelArn.startsWith('arn')
              ? parsingConfig.bedrockFoundationModelConfiguration.modelArn
              : `arn:${this.partition}:bedrock:${this.region}::foundation-model/${parsingConfig.bedrockFoundationModelConfiguration.modelArn}`,
          );
        }
      }
    });

    // Create foundation model policy before knowledge base creation
    const foundationModelResources = [embeddingModelArn, ...Array.from(parsingModelArns)];
    const modelActions = ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'];

    // Add additional permissions for inference profiles
    const hasInferenceProfile = foundationModelResources.some(arn => arn.includes(':inference-profile/'));
    if (hasInferenceProfile) {
      modelActions.push('bedrock:GetInferenceProfile');
    }

    const foundationModelPolicy = new MdaaManagedPolicy(this, `bedrock-kb-foundation-model-policy-${kbName}`, {
      naming: this.props.naming,
      managedPolicyName: `kb-foundation-model-${kbName}`,
      roles: [kbRole],
      statements: [
        new PolicyStatement({
          sid: 'InvokeFoundationModels',
          effect: Effect.ALLOW,
          resources: foundationModelResources,
          actions: modelActions,
        }),
        new PolicyStatement({
          sid: 'BedrockKms',
          effect: Effect.ALLOW,
          resources: [kmsKey.keyArn],
          actions: [...USER_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
          conditions: {
            StringLike: {
              'kms:ViaService': `bedrock.${this.region}.amazonaws.com`,
            },
          },
        }),
      ],
    });

    // Create the Bedrock Knowledge Base
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, `${kbName}-KnowledgeBase`, {
      name: this.props.naming.resourceName(kbName),
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: embeddingModelArn,
          ...(kbConfig.supplementalBucketName && {
            supplementalDataStorageConfiguration: {
              supplementalDataStorageLocations: [
                {
                  supplementalDataStorageLocationType: 'S3',
                  s3Location: {
                    uri: `s3://${kbConfig.supplementalBucketName}`,
                  },
                },
              ],
            },
          }),
        },
      },
      storageConfiguration: {
        type: 'RDS',
        rdsConfiguration: {
          credentialsSecretArn: pgVectorStore.rdsClusterSecret.secretArn || '',
          databaseName: databaseName,
          resourceArn: pgVectorStore.clusterArn,
          tableName: tableName,
          fieldMapping: {
            metadataField: metadataField,
            primaryKeyField: primaryKeyField,
            textField: textField,
            vectorField: vectorField,
            customMetadataField: customMetadataField,
          },
        },
      },
    });

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'knowledgeBase',
        resourceId: kbName,
        name: 'id',
        value: knowledgeBase.attrKnowledgeBaseId,
        ...this.props,
      },
      this,
    );

    knowledgeBase.node.addDependency(createDb);
    knowledgeBase.node.addDependency(createTable);
    knowledgeBase.node.addDependency(vectorStorePolicy);
    knowledgeBase.node.addDependency(foundationModelPolicy.node.defaultChild as CfnResource);

    const kbLogGroupProps: MdaaLogGroupProps = {
      encryptionKey: kmsKey,
      logGroupNamePathPrefix: '/aws/vendedlogs/bedrock/knowledge-base/',
      logGroupName: kbName,
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
    };
    const kbLogGroup = new MdaaLogGroup(this, `kb-loggroup-${kbName}`, kbLogGroupProps);

    const kbLogSourceProps: CfnDeliverySourceProps = {
      name: this.props.naming.resourceName(kbName, 60),
      logType: 'APPLICATION_LOGS',
      resourceArn: knowledgeBase.attrKnowledgeBaseArn,
    };
    const kbLogSource = new CfnDeliverySource(this, `kb-logsource-${kbName}`, kbLogSourceProps);

    const kbLogDestinationProps: CfnDeliveryDestinationProps = {
      name: this.props.naming.resourceName(kbName, 60),
      destinationResourceArn: kbLogGroup.logGroupArn,
    };
    const kbLogDestination = new CfnDeliveryDestination(this, `kb-logdestination-${kbName}`, kbLogDestinationProps);

    const kbLogDeliveryProps: CfnDeliveryProps = {
      deliveryDestinationArn: kbLogDestination.attrArn,
      deliverySourceName: kbLogSource.name,
    };
    const cfnDelivery = new CfnDelivery(this, `kb-logdelivery-${kbName}`, kbLogDeliveryProps);
    cfnDelivery.addDependency(kbLogSource);

    // Create data sources for the knowledge base
    Object.entries(kbConfig.s3DataSources || {}).forEach(([dsName, dsProps]) => {
      const dataSource = this.createBedrockDataSource(
        knowledgeBase.attrKnowledgeBaseId,
        kbName,
        dsName,
        dsProps,
        kmsKey,
      );
      if (dsProps.enableSync) {
        this.createDataSourceSyncLambda(
          kbName,
          dsName,
          knowledgeBase.attrKnowledgeBaseId,
          dataSource.attrDataSourceId,
          dsProps,
          kbRole.roleArn,
          kmsKey,
        );
      }
    });

    // Create DataSource sync policy (after knowledge base creation)
    const dataSyncPolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: `kb-datasync-${kbName}`,
      roles: [kbRole],
      statements: [
        new PolicyStatement({
          sid: 'DataSourceSync',
          effect: Effect.ALLOW,
          resources: [
            `arn:${this.partition}:bedrock:${this.region}:${this.account}:knowledge-base/${knowledgeBase.attrKnowledgeBaseId}/*`,
          ],
          actions: ['bedrock:StartIngestionJob', 'bedrock:GetIngestionJob', 'bedrock:ListIngestionJobs'],
        }),
      ],
    };

    const kbManagedPolicy = new MdaaManagedPolicy(
      this,
      `bedrock-knowledge-base-datasync-policy-${kbName}`,
      dataSyncPolicyProps,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      kbManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Permissions scoped to datasources restricted to specific Knowledgebase for sync acitvity',
        },
      ],
      true,
    );

    return knowledgeBase;
  }

  private hashCodeHex(...strings: string[]) {
    let h = 0;
    strings.forEach(s => {
      for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    });
    return h.toString(16);
  }

  private generateCreateTableSql(
    tableName: string,
    primaryKeyField: string,
    textField: string,
    metadataField: string,
    vectorField: string,
    vectorFieldSize: number,
    customMetadataField: string,
  ): string {
    const columns: string[] = [
      `${primaryKeyField} UUID PRIMARY KEY`,
      `${textField} TEXT NOT NULL`,
      `${metadataField} JSON`,
      `${customMetadataField} JSONB`,
      `${vectorField} VECTOR(${vectorFieldSize})`,
    ];

    return `
      CREATE TABLE IF NOT EXISTS ${tableName}
      (
        ${columns.join(',\n      ')}
      );
    `;
  }

  private generateCreateIndexesSql(
    tableName: string,
    textField: string,
    vectorField: string,
    customMetadataField: string,
  ): string[] {
    return [
      `CREATE INDEX IF NOT EXISTS idx_${vectorField}_vector ON ${tableName} USING hnsw (${vectorField} vector_cosine_ops) WITH (ef_construction=256);`,
      `CREATE INDEX IF NOT EXISTS idx_${textField} ON ${tableName} USING gin (to_tsvector('simple', ${textField}))`,
      `CREATE INDEX IF NOT EXISTS idx_${customMetadataField} ON ${tableName} USING gin (${customMetadataField});`,
    ];
  }

  private createBedrockDataSource(
    knowledgeBaseId: string,
    kbName: string,
    dsName: string,
    dsProps: S3DataSource,
    kmsKey: IKey,
  ): bedrock.CfnDataSource {
    const bucket = s3.Bucket.fromBucketName(this, `${kbName}-ImportBucket-${dsName}`, dsProps.bucketName);

    const dataSourceConfig: bedrock.CfnDataSource.DataSourceConfigurationProperty = {
      type: 'S3',
      s3Configuration: {
        bucketArn: bucket.bucketArn,
        inclusionPrefixes: dsProps.prefix ? [dsProps.prefix] : undefined,
      },
    };

    const baseDataSourceProps: bedrock.CfnDataSourceProps = {
      knowledgeBaseId: knowledgeBaseId,
      name: dsName,
      dataSourceConfiguration: dataSourceConfig,
      serverSideEncryptionConfiguration: {
        kmsKeyArn: kmsKey.keyArn,
      },
    };

    if (dsProps.vectorIngestionConfiguration) {
      const vectorIngestionConfig = this.createVectorIngestionConfiguration(dsProps.vectorIngestionConfiguration);
      return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, {
        ...baseDataSourceProps,
        vectorIngestionConfiguration: vectorIngestionConfig,
      });
    }

    return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, baseDataSourceProps);
  }

  private createDataSourceSyncLambda(
    kbName: string,
    dsName: string,
    knowledgeBaseId: string,
    dataSourceId: string,
    dsProps: S3DataSource,
    roleArn: string,
    kmsKey: IKey,
  ): void {
    const syncFunctionProps: FunctionProps = {
      functionName: `${kbName}-${dsName}-sync`,
      description: `Auto-sync data source ${dsName} for knowledge base ${kbName}`,
      srcDir: join(__dirname, 'lambda-functions/datasource'),
      handler: 'datasource_sync.lambda_handler',
      runtime: 'python3.13',
      roleArn: roleArn,
      timeoutSeconds: 300,
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID: dataSourceId,
      },
      eventBridge: {
        retryAttempts: 3,
        maxEventAgeSeconds: 3600,
        s3EventBridgeRules: {
          [`${kbName}-${dsName}-sync-rule`]: {
            buckets: [dsProps.bucketName],
            prefixes: dsProps.prefix ? [dsProps.prefix] : undefined,
          },
        },
      },
    };

    new LambdaFunctionL3Construct(this, `${kbName}-${dsName}-sync-lambda`, {
      kmsArn: kmsKey.keyArn,
      roleHelper: this.props.roleHelper,
      naming: this.props.naming,
      functions: [syncFunctionProps],
      overrideScope: true,
    });
  }

  private createVectorIngestionConfiguration(
    config: VectorIngestionConfiguration,
  ): bedrock.CfnDataSource.VectorIngestionConfigurationProperty {
    const result: bedrock.CfnDataSource.VectorIngestionConfigurationProperty = {};
    return {
      ...result,
      ...(config.chunkingConfiguration && {
        chunkingConfiguration: this.createChunkingConfigurationProperty(config.chunkingConfiguration),
      }),
      ...(config.parsingConfiguration && {
        parsingConfiguration: this.createParsingConfigurationProperty(config.parsingConfiguration),
      }),
      ...(config.customTransformationConfiguration && {
        customTransformationConfiguration: this.createCustomTransformationConfiguration(
          config.customTransformationConfiguration,
        ),
      }),
    };
  }

  private createChunkingConfigurationProperty(
    config: ChunkingConfiguration,
  ): bedrock.CfnDataSource.ChunkingConfigurationProperty {
    if (config.chunkingStrategy === 'FIXED_SIZE' && config.fixedSizeChunkingConfiguration) {
      return {
        chunkingStrategy: config.chunkingStrategy,
        fixedSizeChunkingConfiguration: {
          maxTokens: config.fixedSizeChunkingConfiguration.maxTokens,
          overlapPercentage: config.fixedSizeChunkingConfiguration.overlapPercentage,
        },
      };
    } else if (config.chunkingStrategy === 'HIERARCHICAL' && config.hierarchicalChunkingConfiguration) {
      return {
        chunkingStrategy: config.chunkingStrategy,
        hierarchicalChunkingConfiguration: {
          levelConfigurations: config.hierarchicalChunkingConfiguration.levelConfigurations,
          overlapTokens: config.hierarchicalChunkingConfiguration.overlapTokens,
        },
      };
    } else if (config.chunkingStrategy === 'SEMANTIC' && config.semanticChunkingConfiguration) {
      return {
        chunkingStrategy: config.chunkingStrategy,
        semanticChunkingConfiguration: {
          maxTokens: config.semanticChunkingConfiguration.maxTokens,
          bufferSize: config.semanticChunkingConfiguration.bufferSize,
          breakpointPercentileThreshold: config.semanticChunkingConfiguration.breakpointPercentileThreshold,
        },
      };
    } else {
      return {
        chunkingStrategy: config.chunkingStrategy,
      };
    }
  }

  private createCustomTransformationConfiguration(
    customTransformationConfig: CustomTransformationConfiguration,
  ): bedrock.CfnDataSource.CustomTransformationConfigurationProperty {
    const customTransformations = customTransformationConfig.transformLambdaArns.map(arn => ({
      stepToApply: 'POST_CHUNKING',
      transformationFunction: {
        transformationLambdaConfiguration: {
          lambdaArn: arn,
        },
      },
    }));

    return {
      intermediateStorage: {
        s3Location: {
          uri: `s3://${customTransformationConfig.intermediateStorageBucket}/${customTransformationConfig.intermediateStoragePrefix}/`,
        },
      },
      transformations: customTransformations,
    };
  }

  private createParsingConfigurationProperty(
    parsingConfig: ParsingConfiguration,
  ): bedrock.CfnDataSource.ParsingConfigurationProperty {
    if (
      parsingConfig.parsingStrategy === 'BEDROCK_DATA_AUTOMATION' &&
      parsingConfig.bedrockDataAutomationConfiguration
    ) {
      return {
        parsingStrategy: parsingConfig.parsingStrategy,
        bedrockDataAutomationConfiguration: {
          parsingModality: parsingConfig.bedrockDataAutomationConfiguration.parsingModality,
        },
      };
    }

    if (
      parsingConfig.parsingStrategy === 'BEDROCK_FOUNDATION_MODEL' &&
      parsingConfig.bedrockFoundationModelConfiguration
    ) {
      const modelArn: string = parsingConfig.bedrockFoundationModelConfiguration.modelArn.startsWith('arn:')
        ? parsingConfig.bedrockFoundationModelConfiguration.modelArn
        : `arn:${this.partition}:bedrock:${this.region}::foundation-model/${parsingConfig.bedrockFoundationModelConfiguration.modelArn}`;
      return {
        parsingStrategy: parsingConfig.parsingStrategy,
        bedrockFoundationModelConfiguration: {
          modelArn: modelArn,
          parsingModality: parsingConfig.bedrockFoundationModelConfiguration.parsingModality,
          ...(parsingConfig.bedrockFoundationModelConfiguration.parsingPromptText && {
            parsingPrompt: {
              parsingPromptText: parsingConfig.bedrockFoundationModelConfiguration.parsingPromptText,
            },
          }),
        },
      };
    }

    return {
      parsingStrategy: parsingConfig.parsingStrategy,
    };
  }
}
