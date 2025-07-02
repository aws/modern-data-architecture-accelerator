/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup, MdaaLogGroupProps } from '@aws-mdaa/cloudwatch-constructs';
import { FunctionProps, LambdaFunctionL3Construct, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaManagedPolicyProps } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey, USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  MdaaAuroraPgVector,
  MdaaAuroraPgVectorProps,
  MdaaRdsDataResource,
  MdaaRdsDataResourceProps,
} from '@aws-mdaa/rds-constructs';
import { aws_bedrock as bedrock, IResolvable, aws_kms as kms, aws_s3 as s3 } from 'aws-cdk-lib';
import { CfnGuardrail, CfnKnowledgeBase } from 'aws-cdk-lib/aws-bedrock';
import { Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnPermission } from 'aws-cdk-lib/aws-lambda';
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
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse, stringify } from 'yaml';
import { MdaaParamAndOutput } from '@aws-mdaa/construct';

export interface LambdaFunctionProps {
  /**
   * List of layer definitions
   */
  readonly layers?: LayerProps[];
  /**
   * List of function definitions
   */
  readonly functions?: FunctionProps[];
}

export interface APISchemaProperty extends bedrock.CfnAgent.APISchemaProperty {
  /**
   * Provide relative path to JSON/YAML formatted OpenAPI schema
   */
  readonly openApiSchemaPath?: string;
}

export interface AgentActionGroupProperty {
  /**
   * Name of action group
   */
  readonly actionGroupName: string;
  /**
   * Specify whether the action group is available for the agent to invoke or not
   * @default ENABLED
   * Valid states: ENABLED | DISABLED
   */
  readonly actionGroupState?: string;
  /**
   * Description of action group
   * @default - No description.
   */
  readonly description?: string;
  /**
   * Action group executor
   */
  readonly actionGroupExecutor: bedrock.CfnAgent.ActionGroupExecutorProperty;
  /**
   * API Schema for action group
   */
  readonly apiSchema?: APISchemaProperty;
  /**
   * Functions that each define parameters that agent needs to invoke from the user
   */
  readonly functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty;
}

export interface AgentGuardrailAssociation {
  /**
   * The identifier for the guardrail.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-guardrailconfiguration.html#cfn-bedrock-agent-guardrailconfiguration-guardrailidentifier
   */
  readonly id: string;
  /**
   * The version of the guardrail.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-guardrailconfiguration.html#cfn-bedrock-agent-guardrailconfiguration-guardrailversion
   */
  readonly version?: string;
}

export interface AgentKnowledgeBaseAssociation {
  /**
   * The description of the association between the agent and the knowledge base.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-agentknowledgebase.html#cfn-bedrock-agent-agentknowledgebase-description
   */
  readonly description: string;
  /**
   * The unique identifier of the association between the agent and the knowledge base.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-agentknowledgebase.html#cfn-bedrock-agent-agentknowledgebase-knowledgebaseid
   */
  readonly id: string;
  /**
   * Specifies whether to use the knowledge base or not when sending an [InvokeAgent](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html) request.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-agentknowledgebase.html#cfn-bedrock-agent-agentknowledgebase-knowledgebasestate
   */
  readonly knowledgeBaseState?: string;
}

export interface BedrockAgentProps {
  /**
   * Specifies whether to automatically update the DRAFT version of the agent after making changes to the agent
   */
  readonly autoPrepare?: boolean;

  /**
   * The description of the agent
   */
  readonly description?: string;
  /**
   * The foundation model used for orchestration by the agent
   */
  readonly foundationModel: string;
  /**
   * The number of seconds for which Amazon Bedrock keeps information about a user's conversation with the agent
   */
  readonly idleSessionTtlInSeconds?: number;
  /**
   * Instructions that tell the agent what it should do and how it should interact with users
   */
  readonly instruction: string;
  /**
   * Contains configurations to override prompt templates in different parts of an agent sequence
   */
  readonly promptOverrideConfiguration?: bedrock.CfnAgent.PromptOverrideConfigurationProperty;
  /**
   * The knowledge bases associated with the agent.
   */
  readonly knowledgeBases?: AgentKnowledgeBaseAssociation[];
  /**
   * The action groups that belong to an agent
   */
  readonly actionGroups?: AgentActionGroupProperty[];
  /**
   * Configuration information for a guardrail that you use with the Converse operation
   * See also: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-guardrailconfiguration.html
   */
  readonly guardrail?: AgentGuardrailAssociation;

  /**
   * Name of Alias for Agent pointing to specific Agent Version
   */
  readonly agentAliasName?: string;
  /**
   * Reference to role which will be used as execution role on all agent(s).
   * The role must have assume role trust with bedrock.amazonaws.com.
   */
  readonly role: MdaaRoleRef;
}

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
   * and access to S3 data sources granted within MDAA bucket config
   */
  readonly role: MdaaRoleRef;
}

export type Strength = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ContentFilters {
  readonly sexual?: ContentFilterConfig;
  readonly violence?: ContentFilterConfig;
  readonly hate?: ContentFilterConfig;
  readonly insults?: ContentFilterConfig;
  readonly misconduct?: ContentFilterConfig;
  readonly promptAttack?: ContentFilterConfig;
}

export interface ContentFilterConfig {
  /**
   * The strength of the filter for user inputs (LOW, MEDIUM, HIGH)
   */
  readonly inputStrength: Strength;

  /**
   * The strength of the filter for model outputs (LOW, MEDIUM, HIGH)
   */
  readonly outputStrength: Strength;
}

export interface BedrockGuardrailProps {
  /**
   * Optional description for the guardrail
   */
  readonly description?: string;
  /**
   * Array of content filters to apply to the guardrail
   * Each filter specifies a type (e.g., HATE, SEXUAL, VIOLENCE) and strength settings
   */
  readonly contentFilters: ContentFilters;
  /**
   * Custom message to display when input is blocked by the guardrail
   * If not provided, a default message will be used
   */
  readonly blockedInputMessaging?: string;
  /**
   * Custom message to display when output is blocked by the guardrail
   * If not provided, a default message will be used
   */
  readonly blockedOutputsMessaging?: string;

  /**
   * Configuration for contextual grounding filters
   */
  readonly contextualGroundingFilters?: GroundingFilters;
}

export interface GroundingFilters {
  /**
   * Threshold for grounding (0.0 to 1.0)
   * Higher values enforce stricter grounding to source material
   */
  readonly grounding?: number;

  /**
   * Threshold for relevance (0.0 to 1.0)
   * Higher values enforce stricter relevance to the query
   */
  readonly relevance?: number;
}

export interface NamedAgentProps {
  /** @jsii ignore */
  [agentName: string]: BedrockAgentProps;
}

export interface NamedKnowledgeBaseProps {
  /** @jsii ignore */
  [knowledgeBaseName: string]: BedrockKnowledgeBaseProps;
}

export interface NamedGuardrailProps {
  /** @jsii ignore */
  [guardrailName: string]: BedrockGuardrailProps;
}

export interface BedrockBuilderL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Bedrock Agents configuration
   */
  readonly agents?: NamedAgentProps;
  /**
   * (Optional) The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the agent resources.
   * If not provided, a customer managed key will be created
   */
  readonly kmsKeyArn?: string;
  /**
   * (Optional) S3 Bucket Arn for the agent
   */
  readonly agentBucketArn?: string;
  /**
   * (Optional) Lambda Functions and associated layers Used By Agent Action Groups
   */
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * (Optional) Knowledge Bases Vector Store configs
   */
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * (Optional) Knowledge Bases configuration
   */
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * (Optional) Guardrails configuration
   */
  readonly guardrails?: NamedGuardrailProps;
}

// ---------------------------------------------
// Main Construct Class
// ---------------------------------------------

export class BedrockBuilderL3Construct extends MdaaL3Construct {
  protected readonly props: BedrockBuilderL3ConstructProps;

  private static EMBEDDING_MODEL_VECTOR_SIZE: { [model: string]: number } = {
    'amazon.titan-embed-text-v2': 1024,
    'amazon.titan-embed-image-v1': 1024,
    'cohere.embed-english-v3': 1024,
    'cohere.embed-multilingual-v3': 1024,
  };

  constructor(scope: Construct, id: string, props: BedrockBuilderL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const dataAdminRoles = props.roleHelper.resolveRoleRefsWithOrdinals(props.dataAdminRoles, 'DataAdmin');

    // Get or create KMS key for Bedrock
    const kmsKey = this.getOrCreateKmsKey(
      props,
      dataAdminRoles.map(x => x.id()),
    );

    const vectorStores = this.createVectorStores(props.vectorStores || {}, kmsKey);

    const knowledgeBases = this.createKnowledgeBases(props.knowledgeBases || {}, kmsKey, vectorStores);

    const guardrails = this.createGuardrails(props.guardrails || {}, kmsKey);

    // Only create agents and resolve roles if agents are defined
    if (props.agents && Object.keys(props.agents).length > 0) {
      // Create necessary Lambda Functions
      const generatedFunctions: { [name: string]: string } = {};
      if (props.lambdaFunctions) {
        const agentLambdas = new LambdaFunctionL3Construct(this, 'agent-lambda-functions', {
          kmsArn: kmsKey.keyArn,
          roleHelper: props.roleHelper,
          naming: this.props.naming,
          functions: props.lambdaFunctions?.functions,
          layers: props.lambdaFunctions?.layers,
        });

        // Create a map of function-name to function-arn for easy lookup
        Object.entries(agentLambdas.functionsMap).forEach(([name, lambda]) => {
          generatedFunctions[name] = lambda.functionArn;
        });
      }

      // Create Bedrock Agent(s)
      Object.fromEntries(
        Object.entries(props.agents).map(([agentName, agentConfig]) => {
          const agent = this.createBedrockAgent(
            agentName,
            agentConfig,
            kmsKey,
            generatedFunctions,
            knowledgeBases,
            guardrails,
          );
          return [agentName, agent];
        }),
      );
    }
  }

  // ---------------------------------------------
  // Common Methods
  // ---------------------------------------------

  private getOrCreateKmsKey(props: BedrockBuilderL3ConstructProps, dataAdminRoleIds: string[]): IKey {
    const kmsKey = props.kmsKeyArn
      ? kms.Key.fromKeyArn(this, `ImportedKmsKey`, props.kmsKeyArn)
      : new MdaaKmsKey(this.scope, 'bedrock-cmk', {
          naming: this.props.naming,
          keyAdminRoleIds: dataAdminRoleIds,
        });
    //Allow CloudWatch logs to us the key to encrypt/decrypt log data
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchLogsEncryption',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      resources: ['*'],
      //Limit access to use this key only for log groups within this account
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*`,
        },
      },
    });
    kmsKey.addToResourcePolicy(cloudwatchStatement);
    return kmsKey;
  }

  // ---------------------------------------------
  // Guardrail Methods
  // ---------------------------------------------
  private createGuardrails(
    guardrailsConfigs: NamedGuardrailProps,
    kmsKey: IKey,
  ): { [key: string]: bedrock.CfnGuardrail } {
    const contentTypeMap: { [contentType: string]: string } = {
      promptAttack: 'PROMPT_ATTACK',
    };

    const guardrails = Object.fromEntries(
      Object.entries(guardrailsConfigs).map(([guardrailName, config]) => {
        // Add content filters from the configuration

        const filtersConfig = Object.entries(config.contentFilters).map(([contentType, contentFilter]) => {
          const resolvedContentType = contentTypeMap[contentType]
            ? contentTypeMap[contentType]
            : contentType.toUpperCase();
          return {
            type: resolvedContentType,
            inputStrength: contentFilter.inputStrength,
            outputStrength: contentFilter.outputStrength,
          };
        });

        // Create the content policy configuration
        const contentPolicyConfig: bedrock.CfnGuardrail.ContentPolicyConfigProperty = {
          filtersConfig: filtersConfig,
        };

        // Build the contextual grounding configuration if specified
        let contextualGroundingConfig: bedrock.CfnGuardrail.ContextualGroundingPolicyConfigProperty | undefined;

        if (config.contextualGroundingFilters) {
          const groundingFilters: bedrock.CfnGuardrail.ContextualGroundingFilterConfigProperty[] = [];

          // Only add grounding filter if grounding threshold is specified
          if (config.contextualGroundingFilters.grounding !== undefined) {
            groundingFilters.push({
              type: 'GROUNDING',
              threshold: config.contextualGroundingFilters.grounding,
            });
          }

          // Only add relevance filter if relevance threshold is specified
          if (config.contextualGroundingFilters.relevance !== undefined) {
            groundingFilters.push({
              type: 'RELEVANCE',
              threshold: config.contextualGroundingFilters.relevance,
            });
          }

          // Only create the config if we have at least one filter
          if (groundingFilters.length > 0) {
            contextualGroundingConfig = {
              filtersConfig: groundingFilters,
            };
          }
        }

        // Create the guardrail with optional KMS key
        const guardrailProps: bedrock.CfnGuardrailProps = {
          name: this.props.naming.resourceName(guardrailName, 50),
          description: config.description,
          kmsKeyArn: kmsKey.keyArn,
          blockedInputMessaging: config.blockedInputMessaging || 'Your input contains content that is not allowed.',
          blockedOutputsMessaging:
            config.blockedOutputsMessaging || 'The response contains content that is not allowed.',
          contentPolicyConfig: contentPolicyConfig,
          contextualGroundingPolicyConfig: contextualGroundingConfig,
        };

        const guardrail = new bedrock.CfnGuardrail(this, `${guardrailName}-guardrail`, guardrailProps);

        // Store the guardrail reference
        return [guardrailName, guardrail];
      }),
    );
    return guardrails;
  }

  private createVectorStores(
    namedVectorStoreProps: NamedVectorStoreProps,
    kmsKey: IKey,
  ): { [name: string]: [MdaaAuroraPgVector, ManagedPolicy] } {
    return Object.fromEntries(
      Object.entries(namedVectorStoreProps).map(([vectoreStoreName, vectoreStoreProps]) => {
        const vpc = Vpc.fromVpcAttributes(this, `vpc-import-vectorestore-${vectoreStoreName}`, {
          vpcId: vectoreStoreProps.vpcId,
          availabilityZones: ['a'],
          publicSubnetIds: ['a'],
        });
        const vectorStoreSg = new MdaaSecurityGroup(this, `${vectoreStoreName}-vector-store-sg`, {
          naming: this.props.naming,
          securityGroupName: vectoreStoreName,
          vpc: vpc,
          allowAllOutbound: true,
          addSelfReferenceRule: true,
        });

        const subnets = vectoreStoreProps.subnetIds.map(id =>
          Subnet.fromSubnetId(this, `kb-import-subnet-${vectoreStoreName}-${id}`, id),
        );

        const pgVectorProps: MdaaAuroraPgVectorProps = {
          region: this.region,
          partition: this.partition,
          vpc: vpc,
          subnets: { subnets: subnets },
          dbSecurityGroup: vectorStoreSg,
          encryptionKey: kmsKey,
          naming: this.props.naming,
          enableDataApi: true,
          clusterIdentifier: vectoreStoreName,
        };

        const pgVectorStore = new MdaaAuroraPgVector(this, `pgvector-${vectoreStoreName}`, pgVectorProps);
        const managedPolicy = new MdaaManagedPolicy(this, `bedrock-knowledge-base-access-${vectoreStoreName}`, {
          naming: this.props.naming,
          managedPolicyName: `kb-access-${vectoreStoreName}`,
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
        return [vectoreStoreName, [pgVectorStore, managedPolicy]];
      }),
    );
  }

  private static hashCodeHex(...strings: string[]) {
    let h = 0;
    strings.forEach(s => {
      for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    });
    return h.toString(16);
  }

  private createKnowledgeBases(
    knowledgeBasesConfig: NamedKnowledgeBaseProps,
    kmsKey: IKey,
    vectorStores: { [name: string]: [MdaaAuroraPgVector, ManagedPolicy] },
  ): { [kbName: string]: bedrock.CfnKnowledgeBase } {
    const knowledgeBases = Object.fromEntries(
      Object.entries(knowledgeBasesConfig).map(([kbName, kbConfig]) => {
        const databaseName = kbName.replace(/[^a-zA-Z0-9]/g, '_');
        const embeddingModelBase = kbConfig.embeddingModel.replace(/:.*/, '');
        const embeddingModelHash = BedrockBuilderL3Construct.hashCodeHex(kbConfig.embeddingModel);
        const vectorFieldSize =
          kbConfig.vectorFieldSize || BedrockBuilderL3Construct.EMBEDDING_MODEL_VECTOR_SIZE[embeddingModelBase];

        if (!vectorFieldSize) {
          throw new Error(`Unable to determine vector field size from Embedding Model ID : ${kbConfig.embeddingModel}`);
        }

        const tableName = `embeddings_${embeddingModelHash.slice(-8)}_${vectorFieldSize}`;
        const metadataField = 'metadata';
        const customMetadataField = 'custom_metadata';
        const primaryKeyField = 'id';
        const textField = 'content';

        const vectorField = `embedding`;

        const [vectorStore, vectorStorePolicy] = vectorStores[kbConfig.vectorStore];

        if (!vectorStore) {
          throw new Error(`KnowledgeBase ${kbName} references invalid vectore store: ${kbConfig.vectorStore}`);
        }

        const createDbProps: MdaaRdsDataResourceProps = {
          rdsCluster: vectorStore,
          onCreateSqlStatements: [`CREATE DATABASE ${databaseName}`],
          naming: this.props.naming,
          // allowFailure: true,
        };
        const createDb = new MdaaRdsDataResource(this, `create-db-${kbName}`, createDbProps);

        const createTableProps: MdaaRdsDataResourceProps = {
          rdsCluster: vectorStore,
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
        const createTable = new MdaaRdsDataResource(this, `create-tableß-${kbName}-${tableName}`, createTableProps);
        createTable.node.addDependency(createDb);

        const kbRole = this.props.roleHelper
          .resolveRoleRefWithRefId(kbConfig.role, `bedrock-knowledge-base-role-${kbName}`)
          .role(`bedrock-knowledge-base-role-${kbName}`);

        kbRole.addManagedPolicy(vectorStorePolicy);
        createTable.handlerFunction.role?.addManagedPolicy(vectorStorePolicy);

        const embeddingModelArn = kbConfig.embeddingModel.startsWith('arn:')
          ? kbConfig.embeddingModel
          : `arn:${this.partition}:bedrock:${this.region}::foundation-model/${kbConfig.embeddingModel}`;

        // Create the Bedrock Knowledge Base
        const knowledgeBase = new bedrock.CfnKnowledgeBase(this, `${kbName}-KnowledgeBase`, {
          name: this.props.naming.resourceName(kbName),
          roleArn: kbRole.roleArn,
          knowledgeBaseConfiguration: {
            type: 'VECTOR',
            vectorKnowledgeBaseConfiguration: {
              embeddingModelArn: embeddingModelArn,
              // If Supplemental Data storage to multimodal data parsing strategies
              ...(kbConfig.supplementalBucketName && {
                supplementalDataStorageConfiguration: {
                  supplementalDataStorageLocations: [
                    {
                      supplementalDataStorageLocationType: 'S3',
                      s3Location: {
                        // The S3 URI for supplemental data storage does not support sub-folder(s)
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
              credentialsSecretArn: vectorStore.rdsClusterSecret.secretArn || '',
              databaseName: databaseName,
              resourceArn: vectorStore.clusterArn,
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
            ...{
              resourceType: 'knowledgeBase',
              resourceId: kbName,
              name: 'id',
              value: knowledgeBase.attrKnowledgeBaseId,
            },
            ...this.props,
          },
          this,
        );

        // Ensure the knowledge base depends on the table initialization
        knowledgeBase.node.addDependency(createDb);
        knowledgeBase.node.addDependency(createTable);
        knowledgeBase.node.addDependency(vectorStorePolicy);

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
          this.createBedrockDataSource(knowledgeBase.attrKnowledgeBaseId, kbName, dsName, dsProps, kmsKey);
        });

        const kbPolicyProps: MdaaManagedPolicyProps = {
          naming: this.props.naming,
          managedPolicyName: `kb-${kbName}`,
          roles: [kbRole],
          statements: [
            new PolicyStatement({
              sid: 'InvokeEmbeddingModel',
              effect: Effect.ALLOW,
              resources: [embeddingModelArn],
              actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            }),
          ],
        };

        new MdaaManagedPolicy(this, `bedrock-knowledge-base-policy-${kbName}`, kbPolicyProps);

        // Store the knowledge base in the class property
        return [kbName, knowledgeBase];
      }),
    );
    return knowledgeBases;
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
    // Define the required columns based on field mapping
    const columns: string[] = [
      `${primaryKeyField} UUID PRIMARY KEY`,
      `${textField} TEXT NOT NULL`,
      `${metadataField} JSON`,
      `${customMetadataField} JSONB`,
      `${vectorField} VECTOR(${vectorFieldSize})`,
    ];

    // Generate create table SQL
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
    const baseIndexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_${vectorField}_vector ON ${tableName} USING hnsw (${vectorField} vector_cosine_ops) WITH (ef_construction=256);`,
      `CREATE INDEX IF NOT EXISTS idx_${textField} ON ${tableName} USING gin (to_tsvector('simple', ${textField}))`,
      `CREATE INDEX IF NOT EXISTS idx_${customMetadataField} ON ${tableName} USING gin (${customMetadataField});`,
    ];
    return baseIndexStatements;
  }

  private createChunkingConfigurationProperty(
    config: ChunkingConfiguration,
  ): bedrock.CfnDataSource.ChunkingConfigurationProperty {
    let chunkingConfig: bedrock.CfnDataSource.ChunkingConfigurationProperty;

    if (config.chunkingStrategy === 'FIXED_SIZE' && config.fixedSizeChunkingConfiguration) {
      chunkingConfig = {
        chunkingStrategy: config.chunkingStrategy,
        fixedSizeChunkingConfiguration: {
          maxTokens: config.fixedSizeChunkingConfiguration.maxTokens,
          overlapPercentage: config.fixedSizeChunkingConfiguration.overlapPercentage,
        },
      };
    } else if (config.chunkingStrategy === 'HIERARCHICAL' && config.hierarchicalChunkingConfiguration) {
      chunkingConfig = {
        chunkingStrategy: config.chunkingStrategy,
        hierarchicalChunkingConfiguration: {
          levelConfigurations: config.hierarchicalChunkingConfiguration.levelConfigurations,
          overlapTokens: config.hierarchicalChunkingConfiguration.overlapTokens,
        },
      };
    } else if (config.chunkingStrategy === 'SEMANTIC' && config.semanticChunkingConfiguration) {
      chunkingConfig = {
        chunkingStrategy: config.chunkingStrategy,
        semanticChunkingConfiguration: {
          maxTokens: config.semanticChunkingConfiguration.maxTokens,
          bufferSize: config.semanticChunkingConfiguration.bufferSize,
          breakpointPercentileThreshold: config.semanticChunkingConfiguration.breakpointPercentileThreshold,
        },
      };
    } else {
      chunkingConfig = {
        chunkingStrategy: config.chunkingStrategy,
      };
    }

    return chunkingConfig;
  }

  /**
   * Creates a Bedrock data source for a knowledge base
   * @param knowledgeBaseId - The ID of the knowledge base
   * @param kbName - The name of the knowledge base
   * @param dsName - The name of the data source
   * @param dsProps - The data source properties
   * @param kmsKey - The KMS key for encryption
   */
  private createBedrockDataSource(
    knowledgeBaseId: string,
    kbName: string,
    dsName: string,
    dsProps: S3DataSource,
    kmsKey: IKey,
  ): bedrock.CfnDataSource {
    // Import the S3 bucket
    const bucket = s3.Bucket.fromBucketName(this, `${kbName}-ImportBucket-${dsName}`, dsProps.bucketName);

    // Prepare data source configuration
    const dataSourceConfig: bedrock.CfnDataSource.DataSourceConfigurationProperty = {
      type: 'S3',
      s3Configuration: {
        bucketArn: bucket.bucketArn,
        inclusionPrefixes: dsProps.prefix ? [dsProps.prefix] : undefined,
      },
    };

    // Prepare base CfnDataSource properties
    const baseDataSourceProps: bedrock.CfnDataSourceProps = {
      knowledgeBaseId: knowledgeBaseId,
      name: dsName,
      dataSourceConfiguration: dataSourceConfig,
      serverSideEncryptionConfiguration: {
        kmsKeyArn: kmsKey.keyArn,
      },
    };

    // Add vector ingestion configuration if provided
    if (dsProps.vectorIngestionConfiguration) {
      // Create vector ingestion configuration
      const vectorIngestionConfig = this.createVectorIngestionConfiguration(dsProps.vectorIngestionConfiguration);

      // Return data source with vector ingestion configuration
      return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, {
        ...baseDataSourceProps,
        vectorIngestionConfiguration: vectorIngestionConfig,
      });
    }

    // Return data source without vector ingestion configuration
    return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, baseDataSourceProps);
  }

  /**
   * Creates a vector ingestion configuration from the provided configuration
   * @param config - The vector ingestion configuration
   */
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

  /**
   * Creates a custom transformation configuration property from the provided configuration
   * @param customTransformationConfig - The custom transformation configuration
   */
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

  /**
   * Creates a parsing configuration property from the provided configuration
   * @param parsingConfig - The parsing configuration
   */
  private createParsingConfigurationProperty(
    parsingConfig: ParsingConfiguration,
  ): bedrock.CfnDataSource.ParsingConfigurationProperty {
    // Handle BEDROCK_DATA_AUTOMATION strategy
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

    // Handle BEDROCK_FOUNDATION_MODEL strategy
    if (
      parsingConfig.parsingStrategy === 'BEDROCK_FOUNDATION_MODEL' &&
      parsingConfig.bedrockFoundationModelConfiguration
    ) {
      return {
        parsingStrategy: parsingConfig.parsingStrategy,
        bedrockFoundationModelConfiguration: {
          modelArn: parsingConfig.bedrockFoundationModelConfiguration.modelArn,
          parsingModality: parsingConfig.bedrockFoundationModelConfiguration.parsingModality,
          ...(parsingConfig.bedrockFoundationModelConfiguration.parsingPromptText && {
            parsingPrompt: {
              parsingPromptText: parsingConfig.bedrockFoundationModelConfiguration.parsingPromptText,
            },
          }),
        },
      };
    }

    // Default case
    return {
      parsingStrategy: parsingConfig.parsingStrategy,
    };
  }

  // ---------------------------------------------
  // Agent Methods
  // ---------------------------------------------

  private getActionGroups(
    agentConfig: BedrockAgentProps,
    functionsArnMap: { [name: string]: string },
  ): bedrock.CfnAgent.AgentActionGroupProperty[] {
    // Check every actionGroup within props.agent.actionGroup and if actionGroup.apiSchema.openSchemaPath property is defined, read the yaml file and load it to payload
    // If not defined, push it to the agentActionGroups array
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = [];
    const actionGroups = agentConfig.actionGroups ?? [];
    actionGroups.forEach(actionGroup => {
      // Check if openApiSchemaPath is defined, if yes, read the schema from local file
      let apiSchema;
      if (actionGroup.apiSchema?.openApiSchemaPath) {
        const configFilePath = resolve(__dirname, actionGroup.apiSchema?.openApiSchemaPath);
        console.log('Reading config file from path' + configFilePath);
        const payload = parse(readFileSync(configFilePath, 'utf8'));
        apiSchema = { payload: stringify(payload) };
      } else {
        apiSchema = actionGroup?.apiSchema;
      }

      const ag: bedrock.CfnAgent.AgentActionGroupProperty = {
        actionGroupName: actionGroup.actionGroupName,
        apiSchema: apiSchema,
        functionSchema: actionGroup.functionSchema,
        description: actionGroup.description,
        actionGroupState: actionGroup.actionGroupState,
        actionGroupExecutor: this.processActionGroupExecutor(actionGroup.actionGroupExecutor, functionsArnMap),
      };
      agentActionGroups.push(ag);
    });

    return agentActionGroups;
  }

  private processActionGroupExecutor(
    executor: bedrock.CfnAgent.ActionGroupExecutorProperty,
    functionsArnMap: { [name: string]: string },
  ): bedrock.CfnAgent.ActionGroupExecutorProperty | undefined | IResolvable {
    if (!executor || !executor.lambda) {
      return executor;
    }
    // Check if props using generated Lambda Function.
    // If the executor property, starts with generated-function:<function-name>, then replace this with the Function ARN from the map

    if (executor.lambda.startsWith('generated-function:')) {
      const functionName = executor.lambda.split(':')[1];
      const lambdaArn = functionsArnMap[functionName.trim()];
      if (lambdaArn) {
        return {
          lambda: lambdaArn,
        };
      } else {
        throw new Error(`Code references non-existant Generated Lambda function: ${functionName} `);
      }
    }

    return executor;
  }

  private createAgentAlias(agentName: string, agentId: string, agentConfig: BedrockAgentProps) {
    if (agentConfig.agentAliasName) {
      new bedrock.CfnAgentAlias(this, `mdaa-bedrock-agent-${agentName}-alias`, {
        agentId: agentId,
        agentAliasName: agentConfig.agentAliasName,
      });
    }
  }

  private resolveAgentKnowledgeBaseAssociations(
    knowledgeBases: { [kbName: string]: CfnKnowledgeBase },
    knowledgeBaseAssociations?: AgentKnowledgeBaseAssociation[],
  ) {
    return knowledgeBaseAssociations?.map(kb => {
      const knowledgeBaseId = kb.id.startsWith('config:')
        ? knowledgeBases[kb.id.replace(/^config:\s*/, '')]?.attrKnowledgeBaseId
        : kb.id;

      if (!knowledgeBaseId) {
        throw new Error(`Agent references unknown knowledge base from config :${kb.id}`);
      }
      return {
        description: kb.description,
        knowledgeBaseState: kb.knowledgeBaseState,
        knowledgeBaseId: knowledgeBaseId,
      };
    });
  }

  private resolveGuardrailAssociation(
    guardrails: {
      [name: string]: bedrock.CfnGuardrail;
    },
    guardrailConfiguration?: AgentGuardrailAssociation,
  ): bedrock.CfnAgent.GuardrailConfigurationProperty | undefined {
    if (!guardrailConfiguration) {
      return undefined;
    }
    const guardrailId = guardrailConfiguration.id.startsWith('config:')
      ? guardrails[guardrailConfiguration.id.replace(/^config:\s*/, '')].attrGuardrailId
      : guardrailConfiguration.id;

    const resolvedGuardrailVersion = guardrailConfiguration.id.startsWith('config:')
      ? guardrails[guardrailConfiguration.id.replace(/^config:\s*/, '')].attrVersion
      : undefined;

    const guardrailVersion = guardrailConfiguration.version ? guardrailConfiguration.version : resolvedGuardrailVersion;

    if (!guardrailVersion) {
      throw new Error('Guardrail version must be specified');
    }

    return {
      guardrailIdentifier: guardrailId,
      guardrailVersion: guardrailVersion,
    };
  }

  private createBedrockAgent(
    agentName: string,
    agentConfig: BedrockAgentProps,
    kmsKey: kms.IKey,
    generatedFunctions: { [name: string]: string },
    knowledgeBases: { [kbName: string]: CfnKnowledgeBase },
    guardrails: { [name: string]: CfnGuardrail },
  ): bedrock.CfnAgent {
    // Prepare action group(s) for the Agent
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = this.getActionGroups(
      agentConfig,
      generatedFunctions,
    );

    const bedrockAgentRole = this.props.roleHelper
      .resolveRoleRefWithRefId(agentConfig.role, `bedrock-agent-role-${agentName}`)
      .role(`bedrock-agent-role-${agentName}`);

    const knowledgeBaseAssociations = this.resolveAgentKnowledgeBaseAssociations(
      knowledgeBases,
      agentConfig.knowledgeBases,
    );

    const knowledgeBaseArns = knowledgeBaseAssociations?.map(x => {
      return `arn:${this.partition}:bedrock:${this.region}:${this.account}:knowledge-base/${x.knowledgeBaseId}`;
    });

    const guardrailAssociation = this.resolveGuardrailAssociation(guardrails, agentConfig.guardrail);

    const guardrailArn = guardrailAssociation
      ? `arn:aws:bedrock:${this.region}:${this.account}:guardrail/${guardrailAssociation.guardrailIdentifier}`
      : undefined;

    const foundationModelArn = agentConfig.foundationModel.startsWith('arn:')
      ? agentConfig.foundationModel
      : `arn:${this.partition}:bedrock:${this.region}::foundation-model/${agentConfig.foundationModel}`;

    const agentManagedPolicy = this.createBedrockAgentPolicy(
      agentName,
      kmsKey,
      foundationModelArn,
      knowledgeBaseArns,
      guardrailArn,
    );
    agentManagedPolicy.attachToRole(bedrockAgentRole);

    // Create Bedrock Agent
    const agent = new bedrock.CfnAgent(this, `mdaa-bedrock-agent-${agentName}`, {
      agentName: this.props.naming.resourceName(agentName),
      autoPrepare: agentConfig.autoPrepare ?? false,
      customerEncryptionKeyArn: kmsKey.keyArn,
      description: agentConfig.description,
      foundationModel: agentConfig.foundationModel,
      idleSessionTtlInSeconds: agentConfig.idleSessionTtlInSeconds ?? 3600,
      instruction: agentConfig.instruction,
      promptOverrideConfiguration: agentConfig.promptOverrideConfiguration,
      agentResourceRoleArn: bedrockAgentRole.roleArn,
      knowledgeBases: knowledgeBaseAssociations,
      guardrailConfiguration: guardrailAssociation,
      actionGroups: agentActionGroups,
    });

    // Create an alias for the agent
    this.createAgentAlias(agentName, agent.attrAgentId, agentConfig);

    // Add Lambda Permission to allow Bedrock Service Principal to Invoke Lambda on behalf of Specific Agent
    if (agentActionGroups) {
      agentActionGroups?.forEach((ag, index) => {
        if (ag?.actionGroupExecutor && !('resolve' in ag.actionGroupExecutor)) {
          const lambdaArn = ag?.actionGroupExecutor?.lambda;
          if (lambdaArn) {
            // Create the permission for Bedrock to invoke Lambda
            new CfnPermission(this, `BedrockInvokePermission-${index}`, {
              action: 'lambda:InvokeFunction',
              functionName: lambdaArn,
              principal: 'bedrock.amazonaws.com',
              sourceArn: agent.attrAgentArn,
            });
          }
        }
      });
    }
    return agent;
  }

  private createBedrockAgentPolicy(
    agentName: string,
    kmsKey: kms.IKey,
    foundationModelArn: string,
    knowledgeBaseArns?: string[],
    guardrailArn?: string,
  ): ManagedPolicy {
    // Extract list of foundation models & guardrails for each agent.

    // Add a Policy to allow invoke access to the foundation model
    const agentManagedPolicy = new MdaaManagedPolicy(this, `agent-managed-pol-${agentName}`, {
      managedPolicyName: `agent-${agentName}`,
      naming: this.props.naming,
    });

    const kmsKeyStatement = new PolicyStatement({
      actions: USER_ACTIONS,
      resources: [kmsKey.keyArn],
      effect: Effect.ALLOW,
    });
    agentManagedPolicy.addStatements(kmsKeyStatement);

    // Allow access to the foundation model
    const invokeModelStatement = new PolicyStatement({
      sid: 'InvokeFoundationModel',
      effect: Effect.ALLOW,
      resources: [foundationModelArn],
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    });
    agentManagedPolicy.addStatements(invokeModelStatement);

    // Apply Guardrail policy if Guardrails is mentioned
    if (guardrailArn) {
      const guardrailStatement = new PolicyStatement({
        sid: 'AllowApplyBedrockGuardrail',
        effect: Effect.ALLOW,
        resources: [guardrailArn],
        actions: ['bedrock:ApplyGuardrail'],
      });
      agentManagedPolicy.addStatements(guardrailStatement);
    }
    // Apply Knowledge Base policy if Knowledge Bases is mentioned
    if (knowledgeBaseArns && knowledgeBaseArns.length > 0) {
      const knowledgeBaseStatement = new PolicyStatement({
        sid: 'AllowBedrockKnowledgeBase',
        effect: Effect.ALLOW,
        resources: [...knowledgeBaseArns],
        actions: ['bedrock:Retrieve'],
      });
      agentManagedPolicy.addStatements(knowledgeBaseStatement);
    }

    return agentManagedPolicy;
  }
}
