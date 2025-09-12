/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import {
  MdaaBoto3LayerVersion,
  MdaaAwsAuthLayerVersion,
  MdaaOpensearchPyLayerVersion,
} from '@aws-mdaa/lambda-constructs';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FunctionProps, LambdaFunctionL3Construct } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaAuroraPgVector, MdaaAuroraPgVectorProps, MdaaRdsDataResource } from '@aws-mdaa/rds-constructs';
import {
  MdaaOpensearchServerlessCollection,
  MdaaOpensearchServerlessCollectionProps,
} from '@aws-mdaa/opensearch-constructs';
import { aws_bedrock as bedrock, aws_s3 as s3, CfnResource, Duration } from 'aws-cdk-lib';
import { IVpc, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { AuroraCapacityUnit } from 'aws-cdk-lib/aws-rds';
import { CfnDelivery, CfnDeliveryDestination, CfnDeliverySource, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { join } from 'path';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { resolveModelArn } from '@aws-mdaa/ai-helper';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';

// ---------------------------------------------
// Knowledge Base Interfaces and Types
// ---------------------------------------------

/** Supported parsing modality for multimodal data */
type ParsingModality = 'MULTIMODAL';

/** Supported vector store types */
type VectorStoreType = 'AURORA_SERVERLESS' | 'OPENSEARCH_SERVERLESS';

/** Supported parsing strategies */
type ParsingStrategy = 'BEDROCK_DATA_AUTOMATION' | 'BEDROCK_FOUNDATION_MODEL';

/** Supported chunking strategies */
type ChunkingStrategy = 'FIXED_SIZE' | 'HIERARCHICAL' | 'SEMANTIC' | 'NONE';

/** Supported standby replicas flag values for vector store */
type StandbyReplicas = 'ENABLE' | 'DISABLE';
export interface BedrockDataAutomationConfig {
  /**
   * Specifies whether to enable parsing of multimodal data, including both text and/or images.
   */
  readonly parsingModality?: ParsingModality;
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
   */
  readonly parsingModality?: ParsingModality;
}

export interface ParsingConfiguration {
  /**
   * The parsing strategy to use for processing documents
   */
  readonly parsingStrategy: ParsingStrategy;
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
   */
  readonly chunkingStrategy: ChunkingStrategy;
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

export interface SharepointDataSource {
  readonly dataSource: SharepointDataSourceConfiguration;
  /**
   * Vector ingestion configuration for this data source
   */
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
}

export interface SharepointDataSourceConfiguration {
  /** The supported authentication type to authenticate and connect to your SharePoint site/sites.
   *  Valid values: OAUTH2_CLIENT_CREDENTIALS, OAUTH2_SHAREPOINT_APP_ONLY_CLIENT_CREDENTIALS
   */
  readonly authType: string;
  /** The Amazon Resource Name of an AWS Secrets Manager secret that stores your authentication credentials for your SharePoint site/sites. */
  readonly credentialsSecretArn: string;
  /** The domain of your SharePoint instance or site URL/URLs.
   *  Valid Pattern: ^arn:aws(|-cn|-us-gov):secretsmanager:[a-z0-9-]{1,20}:([0-9]{12}|):secret:[a-zA-Z0-9!/_+=.@-]{1,512}$
   */
  readonly domain: string;
  /** The supported host type, whether online/cloud or server/on-premises.
   *  Valid values: ONLINE
   *  Default: ONLINE
   */
  readonly hostType?: string;
  /** A list of one or more SharePoint site URLs. */
  readonly siteUrls: string[];
  /** The identifier of your Microsoft 365 tenant.
   *  Valid Pattern: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  readonly tenantId: string;
}
interface BaseVectorStoreProps {
  readonly vectorStoreType?: VectorStoreType;
  readonly vpcId: string;
  readonly subnetIds: string[];
}

export interface AuroraServerlessPgVectorProps extends BaseVectorStoreProps {
  readonly port?: number;
  readonly engineVersion?: string;
  readonly minCapacity?: AuroraCapacityUnit;
  readonly maxCapacity?: AuroraCapacityUnit;
}

export interface OpensearchServerlessProps extends BaseVectorStoreProps {
  /**
   * Enable or Disable standby replicas
   * This cannot be changed after creation of the Opensearch Serverless Collection
   */
  readonly standbyReplicas: StandbyReplicas;
}
/** Named collection of SharePoint data sources for configuration mapping */
export interface NamedSharepointDataSources {
  /** @jsii ignore */
  [dsName: string]: SharepointDataSource;
}

/** Named collection of S3 data sources for configuration mapping */
export interface NamedS3DataSource {
  /** @jsii ignore */
  [dsName: string]: S3DataSource;
}

/** Named collection of vector store configurations for mapping */
export interface NamedVectorStoreProps {
  /** @jsii ignore */
  [storeName: string]: AuroraServerlessPgVectorProps | OpensearchServerlessProps;
}

export interface BedrockKnowledgeBaseProps {
  /**
   * List of Sharepoint data sources to be used for ingestion into knowledge base
   */
  readonly sharepointDataSources?: NamedSharepointDataSources;
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
   * The role must have assume-role trust with bedrock.amazonaws.com
   * The role must have access to S3 data sources granted within MDAA bucket config
   * Optionally:
   * a) Role must have assume-role trust with lambda.amazonaws.com to enable sync functionality for datasources
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
  readonly vectorStoreConfig: AuroraServerlessPgVectorProps | OpensearchServerlessProps;
  readonly kmsKey: IKey;
}

// ---------------------------------------------
// Bedrock Knowledge Bases L3 Construct
// ---------------------------------------------

export class BedrockKnowledgeBaseL3Construct extends MdaaL3Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  /** @jsii ignore */
  public readonly vectorStore: [MdaaAuroraPgVector | MdaaOpensearchServerlessCollection, ManagedPolicy];

  private vectorStoreSecurityGroup: MdaaSecurityGroup | undefined = undefined;
  protected readonly props: BedrockKnowledgeBaseL3ConstructProps;
  private readonly kbRole: IRole;
  private cachedVectorFieldSize!: number;
  private cachedEmbeddingModelHash!: string;

  private static readonly EMBEDDING_MODEL_VECTOR_SIZE = new Map<string, number>([
    ['amazon.titan-embed-text-v1', 1536],
    ['amazon.titan-embed-text-v2', 1024],
    ['amazon.titan-embed-image-v1', 1024],
    ['cohere.embed-english-v3', 1024],
    ['cohere.embed-multilingual-v3', 1024],
    ['amazon.titan-embed-g1-text-02', 1536],
  ]);

  private static readonly DB_FIELD_NAMES = {
    METADATA: 'metadata',
    CUSTOM_METADATA: 'custom_metadata',
    PRIMARY_KEY: 'id',
    TEXT: 'content',
    VECTOR: 'embedding',
  } as const;

  private static readonly OPENSEARCH_FIELD_NAMES = {
    METADATA: 'metadata',
    TEXT: 'content',
    VECTOR: 'embedding',
  } as const;

  private static readonly LAMBDA_TIMEOUT = {
    MIN: 1,
    MAX: 900,
    DEFAULT: 300,
  } as const;

  /**
   * Gets the vector field size for the given embedding model
   * @param embeddingModelBase The base embedding model identifier
   * @returns The vector field size for the model
   * @throws Error if vector field size cannot be determined
   */
  private getVectorFieldSize(embeddingModelBase: string): number {
    const vectorFieldSize =
      this.props.kbConfig.vectorFieldSize ||
      BedrockKnowledgeBaseL3Construct.EMBEDDING_MODEL_VECTOR_SIZE.get(embeddingModelBase);

    if (!vectorFieldSize) {
      throw new Error(`Unable to determine vector field size from Embedding Model ID : ${embeddingModelBase}. `);
    }

    return vectorFieldSize;
  }

  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.initializeCachedValues();
    this.kbRole = this.resolveKnowledgeBaseRole();
    this.vectorStore = this.createVectorStore(props.kbConfig.vectorStore, props.vectorStoreConfig, props.kmsKey);
    this.knowledgeBase = this.createKnowledgeBase(props.kbName, props.kbConfig, props.kmsKey, this.vectorStore);
  }

  private initializeCachedValues(): void {
    const embeddingModelBase = this.props.kbConfig.embeddingModel.replace(/:.*/, '');
    this.cachedVectorFieldSize = this.getVectorFieldSize(embeddingModelBase);
    this.cachedEmbeddingModelHash = this.hashCodeHex(this.props.kbConfig.embeddingModel);
  }

  private resolveKnowledgeBaseRole(): IRole {
    const roleId = `bedrock-knowledge-base-role-${this.props.kbName}`;
    return this.props.roleHelper.resolveRoleRefWithRefId(this.props.kbConfig.role, roleId).role(roleId);
  }

  private createVectorStore(
    vectorStoreName: string,
    vectorStoreConfig: AuroraServerlessPgVectorProps | OpensearchServerlessProps,
    kmsKey: IKey,
  ): [MdaaAuroraPgVector | MdaaOpensearchServerlessCollection, ManagedPolicy] {
    const vectorStoreType = vectorStoreConfig.vectorStoreType || 'AURORA_SERVERLESS';

    if (vectorStoreType === 'AURORA_SERVERLESS') {
      return this.createAuroraServerlessPgVectorStore(
        vectorStoreName,
        vectorStoreConfig as AuroraServerlessPgVectorProps,
        kmsKey,
      );
    } else if (vectorStoreType === 'OPENSEARCH_SERVERLESS') {
      const opensearchParams = this.prepareOpensearchVectorStoreParams();
      return this.createOpensearchServerlessVectorStore(
        vectorStoreName,
        vectorStoreConfig as OpensearchServerlessProps,
        [],
        opensearchParams.readWriteArns,
        kmsKey,
      );
    } else {
      throw new Error(
        `Invalid vector store type: ${vectorStoreType}. Valid vector store types: AURORA_SERVERLESS, OPENSEARCH_SERVERLESS`,
      );
    }
  }

  private createVpcAndSecurityGroup(vectorStoreName: string, vpcId: string): [IVpc, MdaaSecurityGroup] {
    const vpc = Vpc.fromVpcAttributes(this, `vpc-import-vectorstore-${vectorStoreName}`, {
      vpcId,
      availabilityZones: ['a'],
      publicSubnetIds: ['a'],
    });
    const vectorStoreSg = new MdaaSecurityGroup(this, `${vectorStoreName}-vector-store-sg`, {
      naming: this.props.naming,
      securityGroupName: vectorStoreName,
      vpc,
      allowAllOutbound: true,
      addSelfReferenceRule: true,
    });
    this.vectorStoreSecurityGroup = vectorStoreSg;
    return [vpc, vectorStoreSg];
  }

  private createAuroraServerlessPgVectorStore(
    vectorStoreName: string,
    vectorStoreConfig: AuroraServerlessPgVectorProps,
    kmsKey: IKey,
  ): [MdaaAuroraPgVector, ManagedPolicy] {
    const [vpc, vectorStoreSg] = this.createVpcAndSecurityGroup(vectorStoreName, vectorStoreConfig.vpcId);

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

  private createOpensearchServerlessVectorStore(
    vectorStoreName: string,
    vectorStoreConfig: OpensearchServerlessProps,
    readOnlyArns: string[],
    readWriteArns: string[],
    kmsKey: IKey,
  ): [MdaaOpensearchServerlessCollection, ManagedPolicy] {
    const [vpc, vectorStoreSg] = this.createVpcAndSecurityGroup(vectorStoreName, vectorStoreConfig.vpcId);

    const opensearchServerlessCollectionProps: MdaaOpensearchServerlessCollectionProps = {
      name: vectorStoreName,
      collectionType: 'VECTORSEARCH',
      standByReplicas: vectorStoreConfig.standbyReplicas,
      encryptionKey: kmsKey,
      vpc: vpc,
      subnetIds: vectorStoreConfig.subnetIds,
      securityGroupIds: [vectorStoreSg.securityGroupId],
      sourceServices: ['bedrock.amazonaws.com'],
      readWriteArns: readWriteArns,
      readOnlyArns: readOnlyArns,
      naming: this.props.naming,
    };
    const opensearchServerlessVectorStore: MdaaOpensearchServerlessCollection = new MdaaOpensearchServerlessCollection(
      this,
      `opensearch-serverless-${vectorStoreName}`,
      opensearchServerlessCollectionProps,
    );

    const managedPolicy = new MdaaManagedPolicy(this, `bedrock-knowledge-base-access-${vectorStoreName}`, {
      naming: this.props.naming,
      managedPolicyName: `kb-access-${vectorStoreName}`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['aoss:APIAccessAll'],
          resources: [
            `arn:aws:aoss:${this.region}:${this.account}:collection/${opensearchServerlessVectorStore.collection.attrId}`,
          ],
        }),
      ],
    });
    return [opensearchServerlessVectorStore, managedPolicy];
  }

  private createKnowledgeBase(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
    vectorStore: [MdaaAuroraPgVector | MdaaOpensearchServerlessCollection, ManagedPolicy],
  ): bedrock.CfnKnowledgeBase {
    const [store, policy] = vectorStore;

    if (store instanceof MdaaOpensearchServerlessCollection) {
      return this.createKnowledgeBaseWithOpenSearch(kbName, kbConfig, kmsKey, store, policy);
    } else {
      return this.createKnowledgeBaseWithAurora(kbName, kbConfig, kmsKey, store, policy);
    }
  }

  private createKnowledgeBaseWithAurora(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
    pgVectorStore: MdaaAuroraPgVector,
    vectorStorePolicy: ManagedPolicy,
  ): bedrock.CfnKnowledgeBase {
    const dbConfig = this.prepareAuroraDbConfiguration(kbName);
    const { createDb, createTable } = this.setupAuroraDatabase(kbName, pgVectorStore, dbConfig);

    this.attachPoliciesToRole(vectorStorePolicy, createTable.handlerFunction.role);

    const embeddingModelArn = resolveModelArn(kbConfig.embeddingModel, this.partition, this.region, this.account);
    const foundationModelPolicy = this.createFoundationModelPolicy(kbName, kbConfig, embeddingModelArn, kmsKey);
    this.kbRole.addManagedPolicy(foundationModelPolicy);

    const knowledgeBase = this.createAuroraKnowledgeBaseResource(
      kbName,
      kbConfig,
      embeddingModelArn,
      pgVectorStore,
      dbConfig,
    );

    this.setupKnowledgeBaseDependencies(knowledgeBase, [
      createDb,
      createTable,
      vectorStorePolicy,
      foundationModelPolicy,
    ]);
    this.finalizeKnowledgeBaseSetup(kbName, kbConfig, knowledgeBase, kmsKey);

    return knowledgeBase;
  }

  private createKnowledgeBaseWithOpenSearch(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
    opensearchStore: MdaaOpensearchServerlessCollection,
    vectorStorePolicy: ManagedPolicy,
  ): bedrock.CfnKnowledgeBase {
    const indexConfig = this.prepareOpenSearchIndexConfiguration();
    const createVectorIndex = this.setupOpenSearchIndex(kbName, opensearchStore, indexConfig);

    this.kbRole.addManagedPolicy(vectorStorePolicy);

    const embeddingModelArn = resolveModelArn(kbConfig.embeddingModel, this.partition, this.region, this.account);
    const foundationModelPolicy = this.createFoundationModelPolicy(kbName, kbConfig, embeddingModelArn, kmsKey);
    this.kbRole.addManagedPolicy(foundationModelPolicy);

    const knowledgeBase = this.createOpenSearchKnowledgeBaseResource(
      kbName,
      kbConfig,
      embeddingModelArn,
      opensearchStore,
      indexConfig,
    );

    this.setupKnowledgeBaseDependencies(knowledgeBase, [createVectorIndex, vectorStorePolicy, foundationModelPolicy]);
    this.finalizeKnowledgeBaseSetup(kbName, kbConfig, knowledgeBase, kmsKey);

    return knowledgeBase;
  }

  /**
   * Prepares OpenSearch Serverless vector store parameters
   */
  private prepareOpensearchVectorStoreParams() {
    // build vector index name with an 8 character hash for uniqueness
    const vectorIndexName = `embeddings_${this.cachedEmbeddingModelHash.slice(-8)}_${this.cachedVectorFieldSize}`;
    const resourceType = `create-index-${vectorIndexName}`;
    const roleName = `${resourceType}-handler`;
    const createIndexLambdaRoleName = this.props.naming.resourceName(roleName, 64);
    const readWriteArns = [this.kbRole.roleArn, `arn:aws:iam::${this.account}:role/${createIndexLambdaRoleName}`];

    return { vectorIndexName, readWriteArns };
  }

  /**
   * Generates a hash code for the given strings using a simple hash algorithm
   * Note: This is not cryptographically secure but sufficient for resource naming
   */
  private hashCodeHex(...strings: string[]): string {
    let hash = 0;
    const input = strings.join('');

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Creates a foundation model policy for the knowledge base
   */
  private createFoundationModelPolicy(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    embeddingModelArn: string,
    kmsKey: IKey,
  ): MdaaManagedPolicy {
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
            resolveModelArn(
              parsingConfig.bedrockFoundationModelConfiguration.modelArn,
              this.partition,
              this.region,
              this.account,
            ),
          );
        }
      }
    });

    // Create foundation model policy
    const foundationModelResources = [embeddingModelArn, ...Array.from(parsingModelArns)];
    const modelActions = ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'];

    // Add additional permissions for inference profiles
    const hasInferenceProfile = foundationModelResources.some(arn => arn.includes(':inference-profile/'));
    if (hasInferenceProfile) {
      modelActions.push('bedrock:GetInferenceProfile');
    }

    return new MdaaManagedPolicy(this, `bedrock-kb-foundation-model-policy-${kbName}`, {
      naming: this.props.naming,
      managedPolicyName: `kb-foundation-model-${kbName}`,
      roles: [this.kbRole],
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
        }),
      ],
    });
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
    const columnDefinitions = [
      { name: primaryKeyField, type: 'UUID PRIMARY KEY' },
      { name: textField, type: 'TEXT NOT NULL' },
      { name: metadataField, type: 'JSON' },
      { name: customMetadataField, type: 'JSONB' },
      { name: vectorField, type: `VECTOR(${vectorFieldSize})` },
    ];

    const columns = columnDefinitions.map(col => `${col.name} ${col.type}`);

    return `
      CREATE TABLE IF NOT EXISTS ${tableName}
      (
        ${columns.join(',\n        ')}
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
      `CREATE INDEX IF NOT EXISTS idx_${textField} ON ${tableName} USING gin (to_tsvector('simple', ${textField}));`,
      `CREATE INDEX IF NOT EXISTS idx_${customMetadataField} ON ${tableName} USING gin (${customMetadataField});`,
    ];
  }

  private createS3DataSource(
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

    return this.createDataSourceWithConfig(
      knowledgeBaseId,
      kbName,
      dsName,
      dataSourceConfig,
      dsProps.vectorIngestionConfiguration,
      kmsKey,
    );
  }
  private createSharepointDataSource(
    knowledgeBaseId: string,
    kbName: string,
    dsName: string,
    dsProps: SharepointDataSource,
    kmsKey: IKey,
  ): bedrock.CfnDataSource {
    const dataSourceConfig: bedrock.CfnDataSource.DataSourceConfigurationProperty = {
      type: 'SHAREPOINT',
      sharePointConfiguration: {
        sourceConfiguration: {
          authType: dsProps.dataSource.authType,
          credentialsSecretArn: dsProps.dataSource.credentialsSecretArn,
          domain: dsProps.dataSource.domain,
          hostType: dsProps.dataSource.hostType || 'ONLINE',
          siteUrls: dsProps.dataSource.siteUrls,
          tenantId: dsProps.dataSource.tenantId,
        },
      },
    };

    return this.createDataSourceWithConfig(
      knowledgeBaseId,
      kbName,
      dsName,
      dataSourceConfig,
      dsProps.vectorIngestionConfiguration,
      kmsKey,
    );
  }

  /**
   * Common method to create data sources with configuration
   */
  private createDataSourceWithConfig(
    knowledgeBaseId: string,
    kbName: string,
    dsName: string,
    dataSourceConfig: bedrock.CfnDataSource.DataSourceConfigurationProperty,
    vectorIngestionConfig?: VectorIngestionConfiguration,
    kmsKey?: IKey,
  ): bedrock.CfnDataSource {
    const baseDataSourceProps: bedrock.CfnDataSourceProps = {
      knowledgeBaseId,
      name: dsName,
      dataSourceConfiguration: dataSourceConfig,
      ...(kmsKey && {
        serverSideEncryptionConfiguration: {
          kmsKeyArn: kmsKey.keyArn,
        },
      }),
    };

    if (vectorIngestionConfig) {
      const vectorIngestionConfigProp = this.createVectorIngestionConfiguration(vectorIngestionConfig);
      return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, {
        ...baseDataSourceProps,
        vectorIngestionConfiguration: vectorIngestionConfigProp,
      });
    }

    return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, baseDataSourceProps);
  }

  private createS3DataSourceSyncLambda(
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
      timeoutSeconds: BedrockKnowledgeBaseL3Construct.LAMBDA_TIMEOUT.DEFAULT,
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
    return {
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

  private createKnowledgeBaseLogging(kbName: string, knowledgeBase: bedrock.CfnKnowledgeBase, kmsKey: IKey): void {
    const kbLogGroup = new MdaaLogGroup(this, `kb-loggroup-${kbName}`, {
      encryptionKey: kmsKey,
      logGroupNamePathPrefix: '/aws/vendedlogs/bedrock/knowledge-base/',
      logGroupName: kbName,
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
    });

    const kbLogSource = new CfnDeliverySource(this, `kb-logsource-${kbName}`, {
      name: this.props.naming.resourceName(kbName, 60),
      logType: 'APPLICATION_LOGS',
      resourceArn: knowledgeBase.attrKnowledgeBaseArn,
    });

    const kbLogDestination = new CfnDeliveryDestination(this, `kb-logdestination-${kbName}`, {
      name: this.props.naming.resourceName(kbName, 60),
      destinationResourceArn: kbLogGroup.logGroupArn,
    });

    const cfnDelivery = new CfnDelivery(this, `kb-logdelivery-${kbName}`, {
      deliveryDestinationArn: kbLogDestination.attrArn,
      deliverySourceName: kbLogSource.name,
    });
    cfnDelivery.addDependency(kbLogSource);
  }

  private createDataSources(
    kbConfig: BedrockKnowledgeBaseProps,
    knowledgeBase: bedrock.CfnKnowledgeBase,
    kbName: string,
    kmsKey: IKey,
  ): void {
    Object.entries(kbConfig.s3DataSources || {}).forEach(([dsName, dsProps]) => {
      const dataSource = this.createS3DataSource(knowledgeBase.attrKnowledgeBaseId, kbName, dsName, dsProps, kmsKey);
      if (dsProps.enableSync) {
        this.createS3DataSourceSyncLambda(
          kbName,
          dsName,
          knowledgeBase.attrKnowledgeBaseId,
          dataSource.attrDataSourceId,
          dsProps,
          this.kbRole.roleArn,
          kmsKey,
        );
      }
    });

    Object.entries(kbConfig.sharepointDataSources || {}).forEach(([dsName, dsProps]) => {
      this.createSharepointDataSource(knowledgeBase.attrKnowledgeBaseId, kbName, dsName, dsProps, kmsKey);
    });
  }

  private createDataSyncPolicy(kbName: string, knowledgeBase: bedrock.CfnKnowledgeBase): void {
    const kbManagedPolicy = new MdaaManagedPolicy(this, `bedrock-knowledge-base-datasync-policy-${kbName}`, {
      naming: this.props.naming,
      managedPolicyName: `kb-datasync-${kbName}`,
      roles: [this.kbRole],
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
    });
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
  }

  private prepareAuroraDbConfiguration(kbName: string) {
    const databaseName = kbName.replace(/[^a-zA-Z0-9]/g, '_');
    // build vector index name with an 8 character hash for uniqueness
    const tableName = `embeddings_${this.cachedEmbeddingModelHash.slice(-8)}_${this.cachedVectorFieldSize}`;

    return {
      databaseName,
      tableName,
      fieldNames: BedrockKnowledgeBaseL3Construct.DB_FIELD_NAMES,
    };
  }

  private prepareOpenSearchIndexConfiguration() {
    // build vector index name with an 8 character hash for uniqueness
    const vectorIndexName = `embeddings_${this.cachedEmbeddingModelHash.slice(-8)}_${this.cachedVectorFieldSize}`;

    return {
      vectorIndexName,
      fieldNames: BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES,
    };
  }

  private setupAuroraDatabase(
    kbName: string,
    pgVectorStore: MdaaAuroraPgVector,
    dbConfig: {
      databaseName: string;
      tableName: string;
      fieldNames: typeof BedrockKnowledgeBaseL3Construct.DB_FIELD_NAMES;
    },
  ) {
    const createDb = new MdaaRdsDataResource(this, `create-db-${kbName}`, {
      rdsCluster: pgVectorStore,
      onCreateSqlStatements: [`CREATE DATABASE ${dbConfig.databaseName}`],
      naming: this.props.naming,
    });

    const createTable = new MdaaRdsDataResource(this, `create-table-${kbName}-${dbConfig.tableName}`, {
      rdsCluster: pgVectorStore,
      databaseName: dbConfig.databaseName,
      onCreateSqlStatements: [
        'CREATE EXTENSION IF NOT EXISTS vector',
        this.generateCreateTableSql(
          dbConfig.tableName,
          dbConfig.fieldNames.PRIMARY_KEY,
          dbConfig.fieldNames.TEXT,
          dbConfig.fieldNames.METADATA,
          dbConfig.fieldNames.VECTOR,
          this.cachedVectorFieldSize,
          dbConfig.fieldNames.CUSTOM_METADATA,
        ),
        ...this.generateCreateIndexesSql(
          dbConfig.tableName,
          dbConfig.fieldNames.TEXT,
          dbConfig.fieldNames.VECTOR,
          dbConfig.fieldNames.CUSTOM_METADATA,
        ),
      ],
      naming: this.props.naming,
    });

    createTable.node.addDependency(createDb);
    return { createDb, createTable };
  }

  private attachPoliciesToRole(vectorStorePolicy: ManagedPolicy, handlerRole?: IRole): void {
    this.kbRole.addManagedPolicy(vectorStorePolicy);
    handlerRole?.addManagedPolicy(vectorStorePolicy);
  }

  private createAuroraKnowledgeBaseResource(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    embeddingModelArn: string,
    pgVectorStore: MdaaAuroraPgVector,
    dbConfig: {
      databaseName: string;
      tableName: string;
      fieldNames: typeof BedrockKnowledgeBaseL3Construct.DB_FIELD_NAMES;
    },
  ): bedrock.CfnKnowledgeBase {
    return new bedrock.CfnKnowledgeBase(this, `${kbName}-KnowledgeBase`, {
      name: this.props.naming.resourceName(kbName),
      roleArn: this.kbRole.roleArn,
      knowledgeBaseConfiguration: this.createVectorKnowledgeBaseConfiguration(kbConfig, embeddingModelArn),
      storageConfiguration: {
        type: 'RDS',
        rdsConfiguration: {
          credentialsSecretArn: pgVectorStore.rdsClusterSecret.secretArn || '',
          databaseName: dbConfig.databaseName,
          resourceArn: pgVectorStore.clusterArn,
          tableName: dbConfig.tableName,
          fieldMapping: {
            metadataField: dbConfig.fieldNames.METADATA,
            primaryKeyField: dbConfig.fieldNames.PRIMARY_KEY,
            textField: dbConfig.fieldNames.TEXT,
            vectorField: dbConfig.fieldNames.VECTOR,
            customMetadataField: dbConfig.fieldNames.CUSTOM_METADATA,
          },
        },
      },
    });
  }

  private createOpenSearchKnowledgeBaseResource(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    embeddingModelArn: string,
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: { vectorIndexName: string; fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES },
  ): bedrock.CfnKnowledgeBase {
    return new bedrock.CfnKnowledgeBase(this, `${kbName}-KnowledgeBase`, {
      name: this.props.naming.resourceName(kbName),
      roleArn: this.kbRole.roleArn,
      knowledgeBaseConfiguration: this.createVectorKnowledgeBaseConfiguration(kbConfig, embeddingModelArn),
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: opensearchStore.collection.attrArn,
          vectorIndexName: indexConfig.vectorIndexName,
          fieldMapping: {
            metadataField: indexConfig.fieldNames.METADATA,
            textField: indexConfig.fieldNames.TEXT,
            vectorField: indexConfig.fieldNames.VECTOR,
          },
        },
      },
    });
  }

  private createVectorKnowledgeBaseConfiguration(kbConfig: BedrockKnowledgeBaseProps, embeddingModelArn: string) {
    return {
      type: 'VECTOR',
      vectorKnowledgeBaseConfiguration: {
        embeddingModelArn,
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
    };
  }

  private setupKnowledgeBaseDependencies(
    knowledgeBase: bedrock.CfnKnowledgeBase,
    dependencies: (CfnResource | ManagedPolicy | MdaaRdsDataResource | MdaaCustomResource)[],
  ): void {
    dependencies.forEach(dep => {
      if (dep?.node) {
        knowledgeBase.node.addDependency((dep.node.defaultChild as CfnResource) || dep);
      } else {
        knowledgeBase.node.addDependency(dep);
      }
    });

    this.createKnowledgeBaseOutput(knowledgeBase);
  }

  private createKnowledgeBaseOutput(knowledgeBase: bedrock.CfnKnowledgeBase): void {
    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'knowledgeBase',
        resourceId: this.props.kbName,
        name: 'id',
        value: knowledgeBase.attrKnowledgeBaseId,
        ...this.props,
      },
      this,
    );
  }

  private finalizeKnowledgeBaseSetup(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    knowledgeBase: bedrock.CfnKnowledgeBase,
    kmsKey: IKey,
  ): void {
    this.createKnowledgeBaseLogging(kbName, knowledgeBase, kmsKey);
    this.createDataSources(kbConfig, knowledgeBase, kbName, kmsKey);
    this.createDataSyncPolicy(kbName, knowledgeBase);
  }

  private setupOpenSearchIndex(
    kbName: string,
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: { vectorIndexName: string; fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES },
  ): MdaaCustomResource {
    const lambdaLayers = this.createLambdaLayers();
    const createIndexProps = this.buildOpenSearchIndexProps(opensearchStore, indexConfig, lambdaLayers);

    const createVectorIndex = new MdaaCustomResource(this, `create-index-${kbName}`, createIndexProps);
    createVectorIndex.node.addDependency(opensearchStore);

    return createVectorIndex;
  }

  private createLambdaLayers() {
    return {
      boto3: new MdaaBoto3LayerVersion(this, 'boto3-layer', {
        naming: this.props.naming,
        createParams: false,
        createOutputs: false,
      }),
      awsauth: new MdaaAwsAuthLayerVersion(this, 'awsauth-layer', {
        naming: this.props.naming,
        createParams: false,
        createOutputs: false,
      }),
      opensearchPy: new MdaaOpensearchPyLayerVersion(this, 'opensearchpy-layer', {
        naming: this.props.naming,
        createParams: false,
        createOutputs: false,
      }),
    };
  }

  private buildOpenSearchIndexProps(
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: { vectorIndexName: string; fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES },
    layers: {
      boto3: MdaaBoto3LayerVersion;
      awsauth: MdaaAwsAuthLayerVersion;
      opensearchPy: MdaaOpensearchPyLayerVersion;
    },
  ): MdaaCustomResourceProps {
    return {
      resourceType: `create-index-${indexConfig.vectorIndexName}`,
      naming: this.props.naming,
      code: Code.fromAsset(join(__dirname, '..', 'src', 'python', 'create-index-aoss')),
      runtime: Runtime.PYTHON_3_13,
      handler: 'create_index_aoss.lambda_handler',
      handlerLayers: [layers.boto3, layers.opensearchPy, layers.awsauth],
      handlerTimeout: Duration.seconds(BedrockKnowledgeBaseL3Construct.LAMBDA_TIMEOUT.MAX),
      handlerRolePolicyStatements: this.createOpenSearchPolicyStatements(opensearchStore),
      handlerPolicySuppressions: this.createOpenSearchPolicySuppressions(),
      handlerProps: this.createOpenSearchHandlerProps(opensearchStore, indexConfig),
      environment: this.createOpenSearchEnvironment(opensearchStore, indexConfig),
      vpc: this.createVpcReference(indexConfig.vectorIndexName),
      subnet: this.createSubnetReference(indexConfig.vectorIndexName),
      securityGroup: this.vectorStoreSecurityGroup,
    };
  }

  private createOpenSearchPolicyStatements(opensearchStore: MdaaOpensearchServerlessCollection): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        // APIAccessAll permission required to access the collection.
        // Refer https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html#:~:text=If%20the%20user%20creates%20a%20data%20access%20policy
        actions: ['aoss:APIAccessAll'],
        resources: [`arn:aws:aoss:${this.region}:${this.account}:collection/${opensearchStore.collection.attrId}`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
          'ec2:AttachNetworkInterface',
          'ec2:DetachNetworkInterface',
        ],
        // Lambda requires wildcard permissions for EC2 network interface operations in VPC as resource names not known in advance.
        // Refer nag suppression comments in createOpenSearchPolicySuppressions function.
        resources: ['*'],
      }),
    ];
  }

  private createOpenSearchPolicySuppressions() {
    return [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Lambda requires wildcard permissions for EC2 network interface operations in VPC as resource names not known in advance.',
        appliesTo: ['Resource::*'],
      },
      {
        id: 'AwsSolutions-IAM5',
        // APIAccessAll permission required to access the collection.
        // Refer https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html#:~:text=If%20the%20user%20creates%20a%20data%20access%20policy
        reason: 'Lambda requires APIAccessAll permission for OpenSearch Serverless operations. ',
        appliesTo: ['Action::aoss:APIAccessAll'],
      },
    ];
  }

  private createOpenSearchHandlerProps(
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: { vectorIndexName: string; fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES },
  ) {
    return {
      CollectionId: opensearchStore.collection.attrId,
      CollectionEndpoint: opensearchStore.collection.attrCollectionEndpoint,
      IndexName: indexConfig.vectorIndexName,
      IndexBody: {
        mappings: {
          properties: {
            [indexConfig.fieldNames.TEXT]: { type: 'text' },
            [indexConfig.fieldNames.METADATA]: { type: 'object' },
            [indexConfig.fieldNames.VECTOR]: {
              type: 'knn_vector',
              dimension: this.cachedVectorFieldSize,
              // For details of HNSW parameters refer: https://opensearch.org/blog/a-practical-guide-to-selecting-hnsw-hyperparameters/
              method: {
                name: 'hnsw',
                space_type: 'cosinesimil',
                engine: 'nmslib',
                parameters: {
                  // Higher value improves search quality. Refer above blog for details.
                  ef_construction: 256,
                  m: 16,
                },
              },
            },
          },
        },
      },
    };
  }

  private createOpenSearchEnvironment(
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: { vectorIndexName: string; fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES },
  ) {
    return {
      LOG_LEVEL: 'INFO',
      COLLECTION_HOST: opensearchStore.collection.attrCollectionEndpoint,
      VECTOR_INDEX_NAME: indexConfig.vectorIndexName,
      VECTOR_FIELD_NAME: indexConfig.fieldNames.VECTOR,
      VECTOR_DIMENSION: this.cachedVectorFieldSize.toString(),
      REGION_NAME: this.region,
    };
  }

  private createVpcReference(vectorIndexName: string): IVpc {
    return Vpc.fromVpcAttributes(this, `kb-import-vpc-${vectorIndexName}`, {
      vpcId: this.props.vectorStoreConfig.vpcId,
      availabilityZones: ['a'],
      publicSubnetIds: ['a'],
    });
  }

  private createSubnetReference(vectorIndexName: string) {
    return {
      subnets: this.props.vectorStoreConfig.subnetIds.map(id =>
        Subnet.fromSubnetId(this, `kb-import-subnet-${vectorIndexName}-${id}`, id),
      ),
    };
  }

  private createChunkingConfigurationProperty(
    config: ChunkingConfiguration,
  ): bedrock.CfnDataSource.ChunkingConfigurationProperty {
    const strategyConfig = { chunkingStrategy: config.chunkingStrategy };

    switch (config.chunkingStrategy) {
      case 'FIXED_SIZE':
        if (!config.fixedSizeChunkingConfiguration) {
          throw new Error('fixedSizeChunkingConfiguration is required when chunkingStrategy is FIXED_SIZE');
        }
        return {
          ...strategyConfig,
          fixedSizeChunkingConfiguration: {
            maxTokens: config.fixedSizeChunkingConfiguration.maxTokens,
            overlapPercentage: config.fixedSizeChunkingConfiguration.overlapPercentage,
          },
        };
      case 'HIERARCHICAL':
        if (!config.hierarchicalChunkingConfiguration) {
          throw new Error('hierarchicalChunkingConfiguration is required when chunkingStrategy is HIERARCHICAL');
        }
        return {
          ...strategyConfig,
          hierarchicalChunkingConfiguration: {
            levelConfigurations: config.hierarchicalChunkingConfiguration.levelConfigurations,
            overlapTokens: config.hierarchicalChunkingConfiguration.overlapTokens,
          },
        };
      case 'SEMANTIC':
        if (!config.semanticChunkingConfiguration) {
          throw new Error('semanticChunkingConfiguration is required when chunkingStrategy is SEMANTIC');
        }
        return {
          ...strategyConfig,
          semanticChunkingConfiguration: {
            maxTokens: config.semanticChunkingConfiguration.maxTokens,
            bufferSize: config.semanticChunkingConfiguration.bufferSize,
            breakpointPercentileThreshold: config.semanticChunkingConfiguration.breakpointPercentileThreshold,
          },
        };
      case 'NONE':
      default:
        return strategyConfig;
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
      const modelArn: string = resolveModelArn(
        parsingConfig.bedrockFoundationModelConfiguration.modelArn,
        this.partition,
        this.region,
        this.account,
      );
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
