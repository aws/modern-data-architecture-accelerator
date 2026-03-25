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
import { MdaaSqsQueue, MdaaSqsDeadLetterQueue } from '@aws-mdaa/sqs-constructs';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaAuroraPgVector, MdaaAuroraPgVectorProps, MdaaRdsDataResource } from '@aws-mdaa/rds-constructs';
import {
  MdaaOpensearchServerlessCollection,
  MdaaOpensearchServerlessCollectionProps,
} from '@aws-mdaa/opensearch-constructs';
import {
  aws_bedrock as bedrock,
  aws_s3 as s3,
  aws_s3_notifications as s3n,
  CfnResource,
  Duration,
  Stack,
} from 'aws-cdk-lib';
import { IVpc, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { AuroraCapacityUnit } from 'aws-cdk-lib/aws-rds';
import { CfnDelivery, CfnDeliveryDestination, CfnDeliverySource, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { join } from 'path';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { resolveModelArn } from '@aws-mdaa/ai-helper';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { truncateResourceType } from './resource-type-utils';
import { CfnDataSource } from 'aws-cdk-lib/aws-bedrock';

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
  /** Parsing modality for multimodal data processing */
  readonly parsingModality?: ParsingModality;
}

export interface BedrockFoundationModelConfig {
  /** Foundation model ARN for document parsing */
  readonly modelArn: string;
  /** Custom parsing instructions for the foundation model */
  readonly parsingPromptText?: string;
  /** Parsing modality for multimodal foundation model processing */
  readonly parsingModality?: ParsingModality;
}

export interface ParsingConfiguration {
  /** Parsing strategy for document processing */
  readonly parsingStrategy: ParsingStrategy;
  /** Bedrock Data Automation configuration for automated parsing */
  readonly bedrockDataAutomationConfiguration?: BedrockDataAutomationConfig;
  /** Foundation model configuration for AI-powered parsing */
  readonly bedrockFoundationModelConfiguration?: BedrockFoundationModelConfig;
}

export interface CustomTransformationConfiguration {
  /** S3 bucket name for intermediate transformation storage */
  readonly intermediateStorageBucket: string;
  /** S3 prefix for intermediate storage organization */
  readonly intermediateStoragePrefix: string;
  /** Lambda function ARNs for custom document transformation */
  readonly transformLambdaArns: string[];
}

export interface FixedSizeChunking {
  /** Maximum token count per chunk */
  readonly maxTokens: number;
  /** Overlap percentage between adjacent chunks */
  readonly overlapPercentage: number;
}

export interface HierarchicalChunkingLevelConfig {
  /** Maximum token count for this hierarchical level */
  readonly maxTokens: number;
}

export interface HierarchicalChunking {
  /** Hierarchical chunking level configurations */
  readonly levelConfigurations: HierarchicalChunkingLevelConfig[];
  /** Token overlap between hierarchical chunks */
  readonly overlapTokens: number;
}

export interface SemanticChunking {
  /** Maximum token count per semantic chunk */
  readonly maxTokens: number;
  /** Buffer size for semantic context preservation */
  readonly bufferSize: number;
  /** Breakpoint percentile threshold for semantic boundary detection */
  readonly breakpointPercentileThreshold: number;
}

export interface ChunkingConfiguration {
  /** Chunking strategy for document processing */
  readonly chunkingStrategy: ChunkingStrategy;
  /** Fixed-size chunking configuration */
  readonly fixedSizeChunkingConfiguration?: FixedSizeChunking;
  /** Hierarchical chunking configuration */
  readonly hierarchicalChunkingConfiguration?: HierarchicalChunking;
  /** Semantic chunking configuration */
  readonly semanticChunkingConfiguration?: SemanticChunking;
}

export interface VectorIngestionConfiguration {
  /** Parsing configuration for content extraction */
  readonly parsingConfiguration?: ParsingConfiguration;
  /** Chunking configuration for content segmentation */
  readonly chunkingConfiguration?: ChunkingConfiguration;
  /** Custom transformation configuration for advanced processing */
  readonly customTransformationConfiguration?: CustomTransformationConfiguration;
}

export interface S3DataSource {
  /** S3 bucket name containing source documents */
  readonly bucketName: string;
  /** S3 object prefix for selective document ingestion */
  readonly prefix?: string;
  /** Vector ingestion configuration for document processing */
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
  /** Enable single-object automatic synchronization
   * @default false
   */
  readonly enableSync?: boolean;
  /** Enable multi-event batch synchronization
   * @default false
   */
  readonly enableMultiSync?: boolean;
  /** IAM role ARN for batch sync Lambda execution */
  readonly syncLambdaRoleArn?: string;
}

export interface SharepointDataSource {
  /** SharePoint data source configuration */
  readonly dataSource: SharepointDataSourceConfiguration;
  /** Vector ingestion configuration for SharePoint document processing */
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
}

export interface SharepointDataSourceConfiguration {
  /** Authentication type for SharePoint connectivity */
  readonly authType: string;
  /** Secrets Manager secret ARN for SharePoint credentials */
  readonly credentialsSecretArn: string;
  /** SharePoint domain for site connectivity */
  readonly domain: string;
  /** SharePoint host type (ONLINE) */
  readonly hostType?: string;
  /** SharePoint site URLs for document access */
  readonly siteUrls: string[];
  /** Microsoft 365 tenant ID */
  readonly tenantId: string;
}

/**
 * Configuration for an existing OpenSearch Serverless VPC endpoint.
 * When provided, the construct will use this existing VPC endpoint instead of creating a new one.
 */
export interface OssVpceConfig {
  /** The existing VPC endpoint ID */
  readonly vpceId: string;
  /** The security group ID associated with the VPC endpoint */
  readonly securityGroupId: string;
}

export interface BaseVectorStoreProps {
  /** Vector store type (AURORA_SERVERLESS or OPENSEARCH_SERVERLESS) */
  readonly vectorStoreType?: VectorStoreType;
  /** VPC ID for vector store network isolation */
  readonly vpcId: string;
  /** Subnet IDs for vector store deployment */
  readonly subnetIds: string[];
}

export interface AuroraServerlessPgVectorProps extends BaseVectorStoreProps {
  /** Database port for Aurora PostgreSQL connectivity */
  readonly port?: number;
  /** PostgreSQL engine version */
  readonly engineVersion?: string;
  /** Minimum Aurora Capacity Units for serverless scaling */
  readonly minCapacity?: AuroraCapacityUnit;
  /** Maximum Aurora Capacity Units for serverless scaling */
  readonly maxCapacity?: AuroraCapacityUnit;
}

export interface OpensearchServerlessProps extends BaseVectorStoreProps {
  /** Standby replica configuration (ENABLE or DISABLE) */
  readonly standbyReplicas: StandbyReplicas;
  /** Existing OpenSearch Serverless VPC endpoint configuration */
  readonly ossVpce?: OssVpceConfig;
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
/**
 * Named knowledge base configuration for policy creation.
 * Associates a knowledge base name with its configuration.
 */
export interface NamedKbConfig {
  /** The name of the knowledge base */
  readonly kbName: string;
  /** The knowledge base configuration */
  readonly kbConfig: BedrockKnowledgeBaseProps;
}

export interface BedrockKnowledgeBaseProps {
  /** SharePoint data sources for enterprise document integration */
  readonly sharepointDataSources?: NamedSharepointDataSources;
  /** S3 data sources for cloud document integration */
  readonly s3DataSources?: NamedS3DataSource;
  /** Vector store reference name */
  readonly vectorStore: string;
  /** Bedrock embedding model ID for vector generation */
  readonly embeddingModel: string;
  /** Vector field size for embedding dimensionality */
  readonly vectorFieldSize?: number;
  /** Supplemental S3 bucket for advanced parsing workflows */
  readonly supplementalBucketName?: string;
  /** IAM role reference for knowledge base execution */
  readonly role: MdaaRoleRef;
}

export interface NamedKnowledgeBaseProps {
  /** @jsii ignore */
  [knowledgeBaseName: string]: BedrockKnowledgeBaseProps;
}

/** Shared VPC endpoint details for OpenSearch Serverless collections */
export interface SharedVpcEndpointDetails {
  readonly vpcEndpointId: string;
  readonly securityGroupId: string;
  /** Optional reference to the VPC endpoint resource for dependency management */
  readonly vpcEndpointResource?: CfnResource;
}

export interface BedrockKnowledgeBaseL3ConstructProps extends MdaaL3ConstructProps {
  readonly kbName: string;
  readonly kbConfig: BedrockKnowledgeBaseProps;
  readonly vectorStoreConfig: AuroraServerlessPgVectorProps | OpensearchServerlessProps;
  readonly kmsKey: IKey;
  /** Optional map of VPC IDs to shared VPC endpoint details for OpenSearch Serverless collections */
  readonly sharedVpcEndpoints?: { [vpcId: string]: SharedVpcEndpointDetails };
  /** When true, skip per-KB policy creation for consolidation by BedrockKnowledgeBaseGroup later */
  readonly deferPolicyCreation?: boolean;
}

// ---------------------------------------------
// Bedrock Knowledge Bases L3 Construct
// ---------------------------------------------

export class BedrockKnowledgeBaseL3Construct extends MdaaL3Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  /** @jsii ignore */
  public readonly vectorStore: MdaaAuroraPgVector | MdaaOpensearchServerlessCollection;
  /** The execution role used by this knowledge base */
  public readonly kbRole: IRole;

  private vectorStoreSecurityGroup: MdaaSecurityGroup | undefined = undefined;
  public readonly props: BedrockKnowledgeBaseL3ConstructProps;
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
    BATCH_SYNC: 900, // 15 minutes for batch processing
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
  ): MdaaAuroraPgVector | MdaaOpensearchServerlessCollection {
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
  ): MdaaAuroraPgVector {
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

    return new MdaaAuroraPgVector(this, `pgvector-${vectorStoreName}`, pgVectorProps);
  }

  private createOpensearchServerlessVectorStore(
    vectorStoreName: string,
    vectorStoreConfig: OpensearchServerlessProps,
    readOnlyArns: string[],
    readWriteArns: string[],
    kmsKey: IKey,
  ): MdaaOpensearchServerlessCollection {
    // Get shared VPC endpoint details for this VPC
    const sharedVpcEndpoint = this.props.sharedVpcEndpoints?.[vectorStoreConfig.vpcId];
    if (!sharedVpcEndpoint) {
      throw new Error(
        `No shared VPC endpoint found for VPC ${vectorStoreConfig.vpcId}. ` +
          `This should have been created at the Bedrock builder level.`,
      );
    }

    // Import VPC reference
    const vpc = Vpc.fromVpcAttributes(this, `vpc-import-vectorstore-${vectorStoreName}`, {
      vpcId: vectorStoreConfig.vpcId,
      availabilityZones: ['a'],
      publicSubnetIds: ['a'],
    });

    // Import the shared security group for Lambda function use
    const importedSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      `${vectorStoreName}-imported-sg`,
      sharedVpcEndpoint.securityGroupId,
      { allowAllOutbound: true },
    );
    // Cast to MdaaSecurityGroup type for compatibility (it's just an interface)
    this.vectorStoreSecurityGroup = importedSecurityGroup as unknown as MdaaSecurityGroup;

    const opensearchServerlessCollectionProps: MdaaOpensearchServerlessCollectionProps = {
      name: vectorStoreName,
      collectionType: 'VECTORSEARCH',
      standByReplicas: vectorStoreConfig.standbyReplicas,
      encryptionKey: kmsKey,
      network: {
        vpc: vpc,
        subnetIds: vectorStoreConfig.subnetIds,
        securityGroupIds: [sharedVpcEndpoint.securityGroupId],
        vpcEndpointId: sharedVpcEndpoint.vpcEndpointId,
      },
      sourceServices: ['bedrock.amazonaws.com'],
      readWriteArns: readWriteArns,
      readOnlyArns: readOnlyArns,
      naming: this.props.naming,
    };

    return new MdaaOpensearchServerlessCollection(
      this,
      `opensearch-serverless-${vectorStoreName}`,
      opensearchServerlessCollectionProps,
    );
  }

  private createKnowledgeBase(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
    store: MdaaAuroraPgVector | MdaaOpensearchServerlessCollection,
  ): bedrock.CfnKnowledgeBase {
    const embeddingModelArn = resolveModelArn(kbConfig.embeddingModel, this.partition, this.region, this.account);

    let knowledgeBase: bedrock.CfnKnowledgeBase | undefined;
    if (store instanceof MdaaOpensearchServerlessCollection) {
      knowledgeBase = this.createKnowledgeBaseWithOpenSearch(kbName, kbConfig, embeddingModelArn, kmsKey, store);
    } else {
      knowledgeBase = this.createKnowledgeBaseWithAurora(kbName, kbConfig, embeddingModelArn, kmsKey, store);
    }

    // Only attach policies to KB role and update dependencies if not deferring policy creation
    // Otherwise managed policies will be consolidated from all kbs per the same execution role
    if (!this.props.deferPolicyCreation) {
      const foundationModelPolicy = this.createFoundationModelPolicyForKB(kbName, kbConfig, kmsKey);
      const dataSyncPolicy = this.createDataSyncPolicyForKB(kbName, knowledgeBase);
      const storePolicy = this.createVectorStorePolicyForKB(kbName, store, kmsKey);

      // update execution role
      this.kbRole.addManagedPolicy(storePolicy);
      this.kbRole.addManagedPolicy(foundationModelPolicy);
      this.kbRole.addManagedPolicy(dataSyncPolicy);

      // update dependencies, dataSyncPolicy is not added, because it's created after knowledge base
      this.setupKnowledgeBaseDependencies(knowledgeBase, [storePolicy, foundationModelPolicy]);
    }

    return knowledgeBase;
  }

  private createKnowledgeBaseWithAurora(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    embeddingModelArn: string,
    kmsKey: IKey,
    store: MdaaAuroraPgVector,
  ): bedrock.CfnKnowledgeBase {
    const dbConfig = this.prepareAuroraDbConfiguration(kbName);
    const { createDb, createTable } = this.setupAuroraDatabase(kbName, store, dbConfig);

    const knowledgeBase = this.createAuroraKnowledgeBaseResource(kbName, kbConfig, embeddingModelArn, store, dbConfig);

    // Finalize kb creation
    const dependencies: (MdaaRdsDataResource | MdaaCustomResource | CfnResource | ManagedPolicy)[] = [
      createDb,
      createTable,
    ];
    this.setupKnowledgeBaseDependencies(knowledgeBase, dependencies);
    this.createKnowledgeBaseLogging(kbName, knowledgeBase, kmsKey);
    this.createDataSources(kbConfig, knowledgeBase, kbName, kmsKey);
    this.createKnowledgeBaseOutput(knowledgeBase);
    return knowledgeBase;
  }

  private createKnowledgeBaseWithOpenSearch(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    embeddingModelArn: string,
    kmsKey: IKey,
    opensearchStore: MdaaOpensearchServerlessCollection,
  ): bedrock.CfnKnowledgeBase {
    const indexConfig = this.prepareOpenSearchIndexConfiguration();
    const createVectorIndex = this.setupOpenSearchIndex(kbName, opensearchStore, indexConfig);

    const knowledgeBase = this.createOpenSearchKnowledgeBaseResource(
      kbName,
      kbConfig,
      embeddingModelArn,
      opensearchStore,
      indexConfig,
    );

    // Finalize kb creation
    this.setupKnowledgeBaseDependencies(knowledgeBase, [createVectorIndex]);
    this.createKnowledgeBaseLogging(kbName, knowledgeBase, kmsKey);
    this.createDataSources(kbConfig, knowledgeBase, kbName, kmsKey);
    this.createKnowledgeBaseOutput(knowledgeBase);
    return knowledgeBase;
  }

  /**
   * Prepares OpenSearch Serverless vector store parameters
   * Uses prepareOpenSearchIndexConfiguration() to get the resourceType, ensuring
   * the Lambda role name in the data access policy matches the actual Lambda role
   */
  private prepareOpensearchVectorStoreParams() {
    const indexConfig = this.prepareOpenSearchIndexConfiguration();
    const roleName = `${indexConfig.resourceType}-handler`;
    const createIndexLambdaRoleName = this.props.naming.resourceName(roleName, 64);
    const readWriteArns = [this.kbRole.roleArn, `arn:aws:iam::${this.account}:role/${createIndexLambdaRoleName}`];

    return { vectorIndexName: indexConfig.vectorIndexName, readWriteArns };
  }

  /**
   * Generates a hash code for the given strings using a simple hash algorithm
   * Note: This is not cryptographically secure but sufficient for resource naming
   */
  private hashCodeHex(...strings: string[]): string {
    let hash = 0;
    const input = strings.join('');

    for (let i = 0; i < input.length; i++) {
      const char = input.codePointAt(i)!;
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Creates a foundation model policy for the knowledge base.
   * Delegates to the public static method with a single-element array.
   */
  private createFoundationModelPolicyForKB(
    kbName: string,
    kbConfig: BedrockKnowledgeBaseProps,
    kmsKey: IKey,
  ): MdaaManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createFoundationModelPolicy(
      this,
      this.props.naming,
      kbName,
      [{ kbName, kbConfig }],
      kmsKey,
    );
  }

  /**
   * Creates a foundation model policy for knowledge base(s).
   * Can be used for single KB (single-element arrays) or consolidated policies (multi-element arrays).
   * Creates a separate statement for each KB config.
   * @param scope - The construct scope
   * @param naming - The naming configuration
   * @param nameSuffix - Suffix for the policy name (e.g., KB name or role identifier)
   * @param namedKbConfigs - Array of named knowledge base configurations
   * @param kmsKey - KMS key for encryption
   * @returns The created managed policy
   */
  public static createFoundationModelPolicy(
    scope: Construct,
    naming: MdaaL3ConstructProps['naming'],
    nameSuffix: string,
    namedKbConfigs: NamedKbConfig[],
    kmsKey: IKey,
  ): MdaaManagedPolicy {
    const partition = Stack.of(scope).partition;
    const region = Stack.of(scope).region;
    const account = Stack.of(scope).account;

    const modelStatements: PolicyStatement[] = [];

    // Helper to sanitize SID - IAM SIDs only allow alphanumeric characters [0-9A-Za-z]*
    const sanitizeSid = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '');

    // Create a statement for each KB config
    namedKbConfigs.forEach(({ kbName, kbConfig }, index) => {
      const modelArns = new Set<string>();

      // Add embedding model ARN
      const embeddingModelArn = resolveModelArn(kbConfig.embeddingModel, partition, region, account);
      modelArns.add(embeddingModelArn);

      // Collect parsing model ARNs from S3 data sources
      Object.values(kbConfig.s3DataSources || {}).forEach(dsProps => {
        if (dsProps.vectorIngestionConfiguration?.parsingConfiguration) {
          const parsingConfig = dsProps.vectorIngestionConfiguration.parsingConfiguration;
          if (
            parsingConfig.parsingStrategy === 'BEDROCK_FOUNDATION_MODEL' &&
            parsingConfig.bedrockFoundationModelConfiguration?.modelArn
          ) {
            modelArns.add(
              resolveModelArn(parsingConfig.bedrockFoundationModelConfiguration.modelArn, partition, region, account),
            );
          }
        }
      });

      const foundationModelResources = Array.from(modelArns);
      const hasInferenceProfile = foundationModelResources.some(arn => arn.includes(':inference-profile/'));

      const modelActions = ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'];
      if (hasInferenceProfile) {
        modelActions.push('bedrock:GetInferenceProfile');
      }

      modelStatements.push(
        new PolicyStatement({
          sid: `InvokeFoundationModels${sanitizeSid(kbName)}${index}`,
          effect: Effect.ALLOW,
          resources: foundationModelResources,
          actions: modelActions,
        }),
      );
    });

    return new MdaaManagedPolicy(scope, `bedrock-kb-foundation-model-policy-${nameSuffix}`, {
      naming: naming,
      managedPolicyName: `kb-foundation-model-${nameSuffix}`,
      statements: [
        ...modelStatements,
        new PolicyStatement({
          sid: 'BedrockKms',
          effect: Effect.ALLOW,
          resources: [kmsKey.keyArn],
          actions: [...USER_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
        }),
      ],
    });
  }

  /**
   * Creates a vector store access policy for knowledge base(s).
   * Handles both Aurora PostgreSQL and OpenSearch Serverless vector stores.
   * Can be used for single store or consolidated policies for multiple stores.
   * @param scope - The construct scope
   * @param naming - The naming configuration
   * @param nameSuffix - Suffix for the policy name (e.g., KB name or role identifier)
   * @param stores - Array of vector stores (Aurora or OpenSearch)
   * @param kmsKey - KMS key for encryption (required for Aurora stores)
   * @returns The created managed policy
   */
  public static createVectorStorePolicy(
    scope: Construct,
    naming: MdaaL3ConstructProps['naming'],
    nameSuffix: string,
    stores: (MdaaAuroraPgVector | MdaaOpensearchServerlessCollection)[],
    kmsKey: IKey,
  ): MdaaManagedPolicy {
    const auroraStores: { secretArn: string; clusterArn: string }[] = [];
    const opensearchCollectionIds: string[] = [];

    for (const store of stores) {
      if (store instanceof MdaaOpensearchServerlessCollection) {
        opensearchCollectionIds.push(store.collection.attrId);
      } else {
        auroraStores.push({
          secretArn: store.rdsClusterSecret.secretArn,
          clusterArn: store.clusterArn,
        });
      }
    }

    const statements: PolicyStatement[] = [];

    // Add Aurora PostgreSQL permissions if needed
    if (auroraStores.length > 0) {
      const secretArns = auroraStores.map(s => s.secretArn);
      const clusterArns = auroraStores.map(s => s.clusterArn);

      statements.push(
        new PolicyStatement({
          sid: 'DBSecretAccess',
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: secretArns,
          effect: Effect.ALLOW,
        }),
        new PolicyStatement({
          sid: 'DBQuery',
          actions: ['rds-data:ExecuteStatement', 'rds-data:BatchExecuteStatement', 'rds:DescribeDBClusters'],
          resources: clusterArns,
          effect: Effect.ALLOW,
        }),
        new PolicyStatement({
          sid: 'KMSUsage',
          actions: USER_ACTIONS,
          resources: [kmsKey.keyArn],
          effect: Effect.ALLOW,
        }),
      );
    }

    // Add OpenSearch Serverless permissions if needed
    if (opensearchCollectionIds.length > 0) {
      const region = Stack.of(scope).region;
      const account = Stack.of(scope).account;
      const collectionArns = opensearchCollectionIds.map(
        collectionId => `arn:aws:aoss:${region}:${account}:collection/${collectionId}`,
      );

      statements.push(
        new PolicyStatement({
          sid: 'OpenSearchAccess',
          effect: Effect.ALLOW,
          actions: ['aoss:APIAccessAll'],
          resources: collectionArns,
        }),
      );
    }

    return new MdaaManagedPolicy(scope, `bedrock-kb-vectorstore-policy-${nameSuffix}`, {
      naming: naming,
      managedPolicyName: `kb-vectorstore-${nameSuffix}`,
      statements,
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

    // Create the data source
    let createdDataSource: CfnDataSource;
    if (vectorIngestionConfig) {
      const vectorIngestionConfigProp = this.createVectorIngestionConfiguration(vectorIngestionConfig);
      createdDataSource = new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, {
        ...baseDataSourceProps,
        vectorIngestionConfiguration: vectorIngestionConfigProp,
      });
    } else {
      createdDataSource = new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, baseDataSourceProps);
    }

    // Create the SSM param
    new MdaaParamAndOutput(this, {
      resourceType: 'dataSource',
      resourceId: dsName,
      name: 'id',
      value: createdDataSource.attrDataSourceId,
      ...this.props,
    });
    return createdDataSource;
  }

  private createS3DataSourceBatchSyncLambda(
    kbName: string,
    dsName: string,
    knowledgeBaseId: string,
    dataSourceId: string,
    dsProps: S3DataSource,
    kmsKey: IKey,
    roleArn: string,
  ): void {
    // Shorten names to avoid conflicts: first 5 chars of KB + first 5 chars of DS + sync-dlq + unique suffix
    const shortKbName = kbName.substring(0, 5);
    const shortDsName = dsName.substring(0, 5);
    const uniqueSuffix = this.node.addr.substring(0, 8);

    const dlq = new MdaaSqsDeadLetterQueue(this, `${kbName}-${dsName}-sync-dlq`, {
      queueName: `${shortKbName}-${shortDsName}-sync-dlq-${uniqueSuffix}`,
      encryptionMasterKey: kmsKey,
      retentionPeriod: Duration.days(14),
      naming: this.props.naming,
    });

    const syncQueue = new MdaaSqsQueue(this, `${kbName}-${dsName}-sync-queue`, {
      queueName: `${shortKbName}-${shortDsName}-sync-queue-${uniqueSuffix}`,
      encryptionMasterKey: kmsKey,
      visibilityTimeout: Duration.minutes(15),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
      naming: this.props.naming,
    });
    // Create Lambda function
    const syncFunctionProps: FunctionProps = {
      functionName: `${kbName}-${dsName}-sync`,
      description: `Batch sync data source ${dsName} for knowledge base ${kbName}`,
      srcDir: join(__dirname, 'lambda-functions/datasource'),
      handler: 'datasource_batch_sync.lambda_handler',
      runtime: 'python3.13',
      roleArn: roleArn,
      timeoutSeconds: BedrockKnowledgeBaseL3Construct.LAMBDA_TIMEOUT.BATCH_SYNC, // 15 minutes
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID: dataSourceId,
      },
    };

    const lambdaConstruct = new LambdaFunctionL3Construct(this, `${kbName}-${dsName}-sync-lambda`, {
      kmsArn: kmsKey.keyArn,
      roleHelper: this.props.roleHelper,
      naming: this.props.naming,
      functions: [syncFunctionProps],
      overrideScope: true,
    });

    // Add SQS trigger to the Lambda function
    const lambdaFunction = lambdaConstruct.functionsMap[syncFunctionProps.functionName];
    if (lambdaFunction) {
      lambdaFunction.addEventSource(
        new SqsEventSource(syncQueue, {
          batchSize: 25,
          maxBatchingWindow: Duration.minutes(5), // Max 300 seconds (5 minutes)
          reportBatchItemFailures: true,
        }),
      );
    }

    // Configure S3 bucket notification to SQS
    const bucket = s3.Bucket.fromBucketName(this, `${kbName}-${dsName}-sync-bucket`, dsProps.bucketName);

    // Add SQS permissions for S3 to send messages
    syncQueue.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowS3ToSendMessage',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('s3.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [syncQueue.queueArn],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': bucket.bucketArn,
          },
        },
      }),
    );

    // Add S3 event notification
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(syncQueue),
      dsProps.prefix ? { prefix: dsProps.prefix } : {},
    );
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
      } else if (dsProps.enableMultiSync) {
        if (!dsProps.syncLambdaRoleArn) {
          throw new Error(`syncLambdaRoleArn is required when enableMultiSync is true for data source ${dsName}`);
        }
        this.createS3DataSourceBatchSyncLambda(
          kbName,
          dsName,
          knowledgeBase.attrKnowledgeBaseId,
          dataSource.attrDataSourceId,
          dsProps,
          kmsKey,
          dsProps.syncLambdaRoleArn,
        );
      }
    });

    Object.entries(kbConfig.sharepointDataSources || {}).forEach(([dsName, dsProps]) => {
      this.createSharepointDataSource(knowledgeBase.attrKnowledgeBaseId, kbName, dsName, dsProps, kmsKey);
    });
  }

  private createDataSyncPolicyForKB(kbName: string, knowledgeBase: bedrock.CfnKnowledgeBase): ManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createDataSyncPolicy(this, this.props.naming, kbName, [
      knowledgeBase.attrKnowledgeBaseId,
    ]);
  }

  private createVectorStorePolicyForKB(
    kbName: string,
    store: MdaaAuroraPgVector | MdaaOpensearchServerlessCollection,
    kmsKey: IKey,
  ): ManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createVectorStorePolicy(this, this.props.naming, kbName, [store], kmsKey);
  }

  /**
   * Creates a data sync policy for knowledge base(s).
   * Can be used for single KB (single-element arrays) or consolidated policies (multi-element arrays).
   * @param scope - The construct scope
   * @param naming - The naming configuration
   * @param nameSuffix - Identifier for the policy name (e.g., KB name or role identifier)
   * @param kbIds - Array of knowledge base IDs
   * @returns The created managed policy
   */
  public static createDataSyncPolicy(
    scope: Construct,
    naming: MdaaL3ConstructProps['naming'],
    nameSuffix: string,
    kbIds: string[],
  ): MdaaManagedPolicy {
    const partition = Stack.of(scope).partition;
    const region = Stack.of(scope).region;
    const account = Stack.of(scope).account;

    const kbResources = kbIds.map(kbId => `arn:${partition}:bedrock:${region}:${account}:knowledge-base/${kbId}/*`);

    const policy = new MdaaManagedPolicy(scope, `bedrock-kb-datasync-policy-${nameSuffix}`, {
      naming: naming,
      managedPolicyName: `kb-datasync-${nameSuffix}`,
      statements: [
        new PolicyStatement({
          sid: 'DataSourceSync',
          effect: Effect.ALLOW,
          resources: kbResources,
          actions: ['bedrock:StartIngestionJob', 'bedrock:GetIngestionJob', 'bedrock:ListIngestionJobs'],
        }),
      ],
    });

    // Add NAG suppression for the wildcard in data source path (knowledge-base/{id}/*)
    MdaaNagSuppressions.addCodeResourceSuppressions(
      policy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Permissions scoped to data sources within specific knowledge bases for this execution role',
        },
      ],
      true,
    );

    return policy;
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
    // Compute resourceType once here and reuse it for both the custom resource and the data access policy
    // This ensures the Lambda role name is consistent across both places
    const rawResourceType = `create-index-${this.props.kbName}-${vectorIndexName}`;
    const resourceType = truncateResourceType(rawResourceType);

    return {
      vectorIndexName,
      resourceType,
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

  private setupOpenSearchIndex(
    kbName: string,
    opensearchStore: MdaaOpensearchServerlessCollection,
    indexConfig: {
      vectorIndexName: string;
      resourceType: string;
      fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES;
    },
  ): MdaaCustomResource {
    const lambdaLayers = this.createLambdaLayers();
    const createIndexProps = this.buildOpenSearchIndexProps(opensearchStore, indexConfig, lambdaLayers);

    const createVectorIndex = new MdaaCustomResource(this, `create-index-${kbName}`, createIndexProps);
    createVectorIndex.node.addDependency(opensearchStore);

    // Add CloudFormation-level dependency on VPC endpoint resource if available to ensure the endpoint
    // is fully operational before the custom resource Lambda tries to access the OpenSearch collection.
    // Using CfnResource.addDependency() ensures the dependency appears in the CloudFormation template's
    // DependsOn clause, not just in the CDK construct tree.
    const vectorStoreConfig = this.props.vectorStoreConfig as OpensearchServerlessProps;
    const sharedVpcEndpoint = this.props.sharedVpcEndpoints?.[vectorStoreConfig.vpcId];
    if (sharedVpcEndpoint?.vpcEndpointResource) {
      const cfnCustomResource = createVectorIndex.node.defaultChild as CfnResource;
      cfnCustomResource.addDependency(sharedVpcEndpoint.vpcEndpointResource);
    }

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
    indexConfig: {
      vectorIndexName: string;
      resourceType: string;
      fieldNames: typeof BedrockKnowledgeBaseL3Construct.OPENSEARCH_FIELD_NAMES;
    },
    layers: {
      boto3: MdaaBoto3LayerVersion;
      awsauth: MdaaAwsAuthLayerVersion;
      opensearchPy: MdaaOpensearchPyLayerVersion;
    },
  ): MdaaCustomResourceProps {
    // Use resourceType from indexConfig to ensure consistency with the data access policy
    return {
      resourceType: indexConfig.resourceType,
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
