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
import {
  aws_bedrock as bedrock,
  aws_s3 as s3,
  aws_sqs as sqs,
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
   * Q-ENHANCED-PROPERTY
   * Optional parsing modality specification for multimodal data processing enabling content extraction from text and image sources. Enables parsing of both textual and visual content within documents for enhanced knowledge base capabilities and information extraction.
   *
   * Use cases: Multimodal document processing; Image content extraction; data parsing; Visual information retrieval
   *
   * AWS: Bedrock Data Automation parsing modality for multimodal content extraction and processing
   *
   * Validation: Must be MULTIMODAL if provided; enables text and image content extraction capabilities
   *   **/
  readonly parsingModality?: ParsingModality;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for Bedrock foundation model used in knowledge base parsing providing model specification and parsing customization. Defines foundation model settings for document parsing including model selection and parsing instructions for optimized content extraction.
 *
 * Use cases: Foundation model configuration; Document parsing; Model selection; Parsing optimization
 *
 * AWS: Amazon Bedrock foundation model for knowledge base document parsing and content extraction
 *
 * Validation: modelArn is required; parsingPromptText and parsingModality are optional customization options
 */
export interface BedrockFoundationModelConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required foundation model ARN for document parsing operations enabling AI-powered content extraction and processing. Specifies the Bedrock foundation model that will be used for parsing documents and extracting content for knowledge base ingestion.
   *
   * Use cases: Model specification; AI-powered parsing; Content extraction; Document processing
   *
   * AWS: Bedrock foundation model ARN for document parsing and AI-powered content extraction
   *
   * Validation: Must be valid foundation model ARN; required for document parsing and content extraction
   **/
  readonly modelArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional parsing instructions for foundation model customization enabling tailored content extraction and processing behavior. Provides custom instructions to guide the foundation model's parsing behavior for specific document types and content extraction requirements.
   *
   * Use cases: Custom parsing instructions; Tailored extraction; Processing customization; Model guidance
   *
   * AWS: Bedrock foundation model parsing instructions for customized content extraction and processing
   *
   * Validation: Must be valid instruction text if provided; enables custom parsing behavior and content extraction
   **/
  readonly parsingPromptText?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional parsing modality specification for multimodal foundation model processing enabling content extraction from text and image sources. Enables foundation model-based parsing of both textual and visual content within documents for enhanced knowledge base capabilities and AI-powered information extraction.
   *
   * Use cases: AI-powered multimodal processing; Foundation model content extraction; document parsing; Visual and textual information retrieval
   *
   * AWS: Bedrock foundation model parsing modality for AI-powered multimodal content extraction and processing
   *
   * Validation: Must be MULTIMODAL if provided; enables AI-powered text and image content extraction capabilities
   *   **/
  readonly parsingModality?: ParsingModality;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for document parsing strategies providing parsing options and AI-powered content extraction. Defines parsing strategy selection and configuration for knowledge base document processing including automation and foundation model approaches.
 *
 * Use cases: Document parsing strategy; Content extraction; AI-powered processing; Parsing configuration
 *
 * AWS: Amazon Bedrock parsing configuration for knowledge base document processing and content extraction
 *
 * Validation: parsingStrategy is required; configuration objects required based on strategy selection
 */
export interface ParsingConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Required parsing strategy specification for document processing workflow enabling selection between automated and AI-powered parsing approaches. Defines the parsing method for document content extraction including Bedrock Data Automation for streamlined processing or foundation model-based parsing for advanced AI-powered content extraction.
   *
   * Use cases: Document processing strategy; Parsing method selection; Content extraction approach; AI-powered vs automated processing
   *
   * AWS: Bedrock parsing strategy for document processing and content extraction workflow configuration
   *
   * Validation: Must be BEDROCK_DATA_AUTOMATION or BEDROCK_FOUNDATION_MODEL; required for document parsing configuration
   *   **/
  readonly parsingStrategy: ParsingStrategy;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Bedrock Data Automation configuration for automated document parsing enabling streamlined content extraction and processing. Provides configuration for Bedrock Data Automation when using automated parsing strategy for document processing.
   *
   * Use cases: Automated parsing; Streamlined processing; Data automation; Content extraction automation
   *
   * AWS: Bedrock Data Automation configuration for automated document parsing and content extraction
   *
   * Validation: Must be valid BedrockDataAutomationConfig if provided; optional when using BEDROCK_DATA_AUTOMATION strategy
   **/
  readonly bedrockDataAutomationConfiguration?: BedrockDataAutomationConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional foundation model configuration for AI-powered document parsing enabling customized content extraction and processing. Provides foundation model configuration when using foundation model strategy for document parsing and content extraction.
   *
   * Use cases: AI-powered parsing; Custom extraction; Foundation model processing; Tailored content extraction
   *
   * AWS: Bedrock foundation model configuration for AI-powered document parsing and content extraction
   *
   * Validation: Must be valid BedrockFoundationModelConfig if provided; required when using BEDROCK_FOUNDATION_MODEL strategy
   **/
  readonly bedrockFoundationModelConfiguration?: BedrockFoundationModelConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for custom transformation processing with Lambda-based document transformation and intermediate storage. Defines custom transformation workflow for advanced document processing and content manipulation before knowledge base ingestion.
 *
 * Use cases: Custom document transformation; Advanced processing; Lambda-based transformation; Content manipulation
 *
 * AWS: Custom transformation configuration for advanced document processing and content manipulation
 *
 * Validation: intermediateS3Location and transformationLambda are required for custom transformation workflow
 */
export interface CustomTransformationConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Required intermediate S3 bucket name for custom transformation workflow enabling document processing and Lambda function integration. Provides temporary storage for input documents before Lambda processing and output documents after transformation for advanced document processing workflows.
   *
   * Use cases: Document transformation; Lambda processing; Intermediate storage; Custom processing workflows
   *
   * AWS: S3 bucket for Bedrock knowledge base custom transformation intermediate storage and processing
   *
   * Validation: Must be valid S3 bucket name; required for custom transformation workflow and Lambda processing
   **/
  readonly intermediateStorageBucket: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix for intermediate storage organization enabling structured document processing and workflow management. Provides organized storage structure for input and output documents during custom transformation processing with clear separation and management.
   *
   * Use cases: Storage organization; Document workflow; Processing structure; File management
   *
   * AWS: S3 prefix for Bedrock knowledge base custom transformation storage organization and workflow management
   *
   * Validation: Must be valid S3 prefix string; required for organized intermediate storage and processing workflow
   **/
  readonly intermediateStoragePrefix: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Lambda function ARNs for custom document transformation enabling advanced processing and content manipulation. Provides Lambda functions for custom document processing, content transformation, and advanced manipulation before knowledge base ingestion.
   *
   * Use cases: Custom document processing; Content transformation; Advanced manipulation; Lambda-based processing
   *
   * AWS: Lambda function ARNs for Bedrock knowledge base custom transformation and document processing
   *
   * Validation: Must be array of valid Lambda function ARNs; required for custom transformation and processing capabilities
   **/
  readonly transformLambdaArns: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Fixed size chunking configuration interface for Bedrock knowledge bases providing document segmentation and chunk management capabilities. Defines fixed size chunking properties for knowledge base document processing including chunk size configuration, document segmentation, and content chunking for optimized AI knowledge retrieval.
 *
 * Use cases: Document segmentation; Chunk management; Content chunking; Document processing; AI knowledge retrieval; Chunk optimization
 *
 * AWS: Amazon Bedrock fixed size chunking configuration with document segmentation and chunk management
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface FixedSizeChunking {
  /**
   * Q-ENHANCED-PROPERTY
   * Required maximum token count per document chunk for fixed-size chunking strategy enabling consistent chunk sizing and optimized knowledge retrieval. Defines the maximum number of tokens that each document chunk can contain for balanced processing and effective vector embedding generation.
   *
   * Use cases: Chunk size control; Token management; Processing optimization; Embedding generation
   *
   * AWS: Bedrock knowledge base fixed-size chunking maximum tokens for document segmentation and processing
   *
   * Validation: Must be positive integer; required for fixed-size chunking configuration and document processing
   **/
  readonly maxTokens: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required overlap percentage between adjacent document chunks for fixed-size chunking strategy enabling context preservation and improved retrieval accuracy. Defines the percentage of content overlap between consecutive chunks to maintain context continuity and enhance information retrieval.
   *
   * Use cases: Context preservation; Retrieval accuracy; Content continuity; Information overlap
   *
   * AWS: Bedrock knowledge base fixed-size chunking overlap percentage for context preservation and retrieval optimization
   *
   * Validation: Must be percentage value between 0-100; required for chunk overlap configuration and context preservation
   **/
  readonly overlapPercentage: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Hierarchical chunking level configuration interface for Bedrock knowledge bases providing multi-level document processing and hierarchical segmentation capabilities. Defines hierarchical chunking level properties for knowledge base document processing including level configuration, hierarchical segmentation, and multi-level content organization for advanced AI knowledge management.
 *
 * Use cases: Multi-level document processing; Hierarchical segmentation; Level configuration; Advanced knowledge management; Content organization; Hierarchical chunking
 *
 * AWS: Amazon Bedrock hierarchical chunking level configuration with multi-level document processing and hierarchical segmentation
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface HierarchicalChunkingLevelConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required maximum token count for hierarchical chunking level enabling multi-level document segmentation and structured content organization. Defines the token limit for this specific hierarchical level to create structured document chunks with varying granularity for optimized knowledge retrieval and hierarchical information access.
   *
   * Use cases: Hierarchical segmentation; Multi-level chunking; Structured organization; Granular content control
   *
   * AWS: Bedrock knowledge base hierarchical chunking level token limit for structured document segmentation
   *
   * Validation: Must be positive integer; required for hierarchical chunking level configuration and multi-level processing
   **/
  readonly maxTokens: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for hierarchical chunking strategy in Bedrock knowledge bases enabling multi-level document segmentation. Defines hierarchical chunking with multiple token levels and overlap settings for sophisticated document processing and enhanced AI knowledge understanding.
 *
 * Use cases: Multi-level document chunking; Hierarchical text segmentation; Advanced knowledge base document processing
 *
 * AWS: Configures AWS Bedrock knowledge base hierarchical chunking strategy for vector ingestion
 *
 * Validation: levelConfigurations array is required with valid HierarchicalChunkingLevelConfig objects; overlapTokens must be non-negative integer
 */
export interface HierarchicalChunking {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of hierarchical chunking level configurations enabling multi-level document segmentation with varying granularity. Provides level-specific configurations for hierarchical document processing with different token limits per level for structured content organization and optimized knowledge retrieval.
   *
   * Use cases: Multi-level segmentation; Hierarchical organization; Structured chunking; Granular content control
   *
   * AWS: Bedrock knowledge base hierarchical chunking level configurations for multi-level document processing
   *
   * Validation: Must be array of valid HierarchicalChunkingLevelConfig objects; required for hierarchical chunking strategy
   **/
  readonly levelConfigurations: HierarchicalChunkingLevelConfig[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required token overlap count between hierarchical chunks enabling context preservation across chunk boundaries and improved information continuity. Defines the number of tokens that overlap between adjacent chunks to maintain context flow and enhance retrieval accuracy in hierarchical processing.
   *
   * Use cases: Context preservation; Information continuity; Chunk boundary management; Retrieval accuracy
   *
   * AWS: Bedrock knowledge base hierarchical chunking token overlap for context preservation and continuity
   *
   * Validation: Must be non-negative integer; required for hierarchical chunk overlap configuration and context management
   **/
  readonly overlapTokens: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Semantic chunking configuration interface for Bedrock knowledge bases providing semantic document processing and intelligent segmentation capabilities. Defines semantic chunking properties for knowledge base document processing including semantic analysis, intelligent segmentation, and meaning-based content organization for enhanced AI knowledge understanding.
 *
 * Use cases: Semantic document processing; Intelligent segmentation; Semantic analysis; Meaning-based organization; Enhanced AI understanding; Semantic content processing
 *
 * AWS: Amazon Bedrock semantic chunking configuration with intelligent document processing and semantic content organization
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface SemanticChunking {
  /**
   * Q-ENHANCED-PROPERTY
   * Required maximum token count per semantic chunk enabling intelligent document segmentation based on meaning and context. Defines the token limit for semantic chunks while preserving semantic coherence and meaning-based boundaries for optimized knowledge retrieval and contextual understanding.
   *
   * Use cases: Semantic segmentation; Meaning preservation; Intelligent chunking; Context-aware processing
   *
   * AWS: Bedrock knowledge base semantic chunking maximum tokens for intelligent document segmentation
   *
   * Validation: Must be positive integer; required for semantic chunking configuration and meaning-based processing
   **/
  readonly maxTokens: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required buffer size specification for semantic context preservation enabling enhanced semantic boundary detection and improved content coherence. Defines the number of surrounding sentences to consider for semantic analysis and boundary determination in intelligent document segmentation.
   *
   * Use cases: Context preservation; Semantic boundary detection; Content coherence; Intelligent analysis
   *
   * AWS: Bedrock knowledge base semantic chunking buffer size for context preservation and boundary detection
   *
   * Validation: Must be positive integer; required for semantic chunking buffer configuration and context analysis
   **/
  readonly bufferSize: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required breakpoint percentile threshold for semantic boundary detection enabling intelligent chunk separation based on semantic similarity analysis. Defines the percentile threshold for determining semantic breakpoints in document content for optimal chunk boundaries and meaning preservation.
   *
   * Use cases: Semantic boundary detection; Intelligent separation; Similarity analysis; Optimal chunking
   *
   * AWS: Bedrock knowledge base semantic chunking breakpoint threshold for intelligent boundary detection
   *
   * Validation: Must be valid percentile value (0-100); required for semantic breakpoint detection and boundary analysis
   **/
  readonly breakpointPercentileThreshold: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Chunking configuration interface for Bedrock knowledge bases providing document chunking strategy and content segmentation capabilities. Defines chunking configuration properties for knowledge base document processing including chunking strategies, segmentation methods, and content organization for optimized AI knowledge retrieval and processing.
 *
 * Use cases: Document chunking strategies; Content segmentation; Chunking methods; AI knowledge retrieval optimization; Content organization; Document processing
 *
 * AWS: Amazon Bedrock chunking configuration providing document segmentation and content organization strategies
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface ChunkingConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Required chunking strategy specification for document processing workflow enabling selection between different segmentation approaches. Defines the chunking method for document content segmentation including fixed-size, hierarchical, semantic, or no chunking strategies for optimized knowledge base processing and retrieval.
   *
   * Use cases: Chunking strategy selection; Document segmentation; Processing workflow; Content organization
   *
   * AWS: Bedrock knowledge base chunking strategy for document segmentation and content processing workflow
   *
   * Validation: Must be FIXED_SIZE, HIERARCHICAL, SEMANTIC, or NONE; required for chunking configuration and processing strategy
   *   **/
  readonly chunkingStrategy: ChunkingStrategy;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional fixed-size chunking configuration for consistent document segmentation enabling uniform chunk sizes and predictable processing. Provides configuration for fixed-size chunking strategy with token limits and overlap settings for consistent document processing and retrieval optimization.
   *
   * Use cases: Consistent segmentation; Uniform chunk sizes; Predictable processing; Fixed-size strategy
   *
   * AWS: Bedrock knowledge base fixed-size chunking configuration for consistent document segmentation
   *
   * Validation: Must be valid FixedSizeChunking if provided; required when using FIXED_SIZE chunking strategy
   *   **/
  readonly fixedSizeChunkingConfiguration?: FixedSizeChunking;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional hierarchical chunking configuration for multi-level document segmentation enabling structured content organization with varying granularity. Provides configuration for hierarchical chunking strategy with level-based processing and structured content organization for advanced knowledge management.
   *
   * Use cases: Multi-level segmentation; Structured organization; Hierarchical processing; Advanced knowledge management
   *
   * AWS: Bedrock knowledge base hierarchical chunking configuration for multi-level document processing
   *
   * Validation: Must be valid HierarchicalChunking if provided; required when using HIERARCHICAL chunking strategy
   *   **/
  readonly hierarchicalChunkingConfiguration?: HierarchicalChunking;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional semantic chunking configuration for intelligent document segmentation enabling meaning-based content organization and context preservation. Provides configuration for semantic chunking strategy with AI-powered boundary detection and semantic coherence for enhanced knowledge understanding.
   *
   * Use cases: Intelligent segmentation; Meaning-based organization; Context preservation; Semantic coherence
   *
   * AWS: Bedrock knowledge base semantic chunking configuration for intelligent document segmentation
   *
   * Validation: Must be valid SemanticChunking if provided; required when using SEMANTIC chunking strategy
   *   **/
  readonly semanticChunkingConfiguration?: SemanticChunking;
}

/**
 * Q-ENHANCED-INTERFACE
 * Vector ingestion configuration interface for Bedrock knowledge bases providing vector processing and embedding management capabilities. Defines vector ingestion properties for knowledge base vector processing including embedding generation, vector storage, and ingestion workflows for AI-powered semantic search and retrieval.
 *
 * Use cases: Vector processing; Embedding generation; Vector storage; Semantic search; AI retrieval; Vector ingestion workflows
 *
 * AWS: Amazon Bedrock vector ingestion configuration with embedding generation and vector processing for semantic search
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface VectorIngestionConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional document parsing configuration for content extraction and processing enabling document analysis and content preparation. Provides parsing configuration for document content extraction including parsing strategies and processing methods for knowledge base ingestion and vector generation.
   *
   * Use cases: Document parsing; Content extraction; Processing configuration; Content preparation
   *
   * AWS: Bedrock knowledge base parsing configuration for document content extraction and processing
   *
   * Validation: Must be valid ParsingConfiguration if provided; enables document parsing and content extraction capabilities
   **/
  readonly parsingConfiguration?: ParsingConfiguration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional document chunking configuration for content segmentation and organization enabling optimized vector processing and retrieval. Provides chunking configuration for document content segmentation including chunking strategies and processing methods for enhanced knowledge base performance.
   *
   * Use cases: Content segmentation; Document organization; Vector processing; Retrieval optimization
   *
   * AWS: Bedrock knowledge base chunking configuration for document segmentation and vector processing
   *
   * Validation: Must be valid ChunkingConfiguration if provided; enables document chunking and content segmentation capabilities
   **/
  readonly chunkingConfiguration?: ChunkingConfiguration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom transformation configuration for advanced document processing enabling Lambda-based content manipulation and custom processing workflows. Provides custom transformation configuration for advanced document processing including Lambda functions and custom processing pipelines for specialized content handling.
   *
   * Use cases: Custom processing; Advanced transformation; Lambda-based processing; Specialized content handling
   *
   * AWS: Bedrock knowledge base custom transformation configuration for advanced document processing and manipulation
   *
   * Validation: Must be valid CustomTransformationConfiguration if provided; enables custom processing and transformation capabilities
   **/
  readonly customTransformationConfiguration?: CustomTransformationConfiguration;
}

/**
 * Q-ENHANCED-INTERFACE
 * S3 data source configuration interface for Bedrock knowledge bases providing S3 integration and data source management capabilities. Defines S3 data source properties for knowledge base data ingestion including S3 bucket configuration, data source management, and content ingestion for AI knowledge base population from S3 storage.
 *
 * Use cases: S3 data integration; Data source management; Content ingestion; Knowledge base population; S3 bucket configuration; AI data sources
 *
 * AWS: Amazon Bedrock S3 data source configuration with S3 integration and automated content ingestion for knowledge bases
 *
 * Validation: Configuration must be valid for Bedrock knowledge base deployment; properties must conform to AWS Bedrock and AI service requirements
 */
export interface S3DataSource {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name containing source documents for knowledge base ingestion enabling centralized document storage and automated content processing. Provides the S3 bucket that contains documents to be processed and ingested into the knowledge base for AI-powered search and retrieval capabilities.
   *
   * Use cases: Document storage; Content ingestion; Centralized data source; Knowledge base population
   *
   * AWS: S3 bucket name for Bedrock knowledge base data source and automated document ingestion
   *
   * Validation: Must be valid S3 bucket name; required for S3 data source configuration and document ingestion
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 object prefix for selective document ingestion enabling targeted content processing and organized data source management. Provides prefix-based filtering to limit which objects in the bucket are included in knowledge base processing for focused content ingestion and management.
   *
   * Use cases: Selective ingestion; Content filtering; Organized processing; Targeted data source management
   *
   * AWS: S3 object prefix for Bedrock knowledge base selective document ingestion and content filtering
   *
   * Validation: Must be valid S3 prefix if provided; enables selective document processing and content organization
   **/
  readonly prefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional vector ingestion configuration for document processing and embedding generation enabling customized content processing and vector optimization. Provides vector ingestion settings for document parsing, chunking, and transformation to optimize knowledge base performance and retrieval accuracy.
   *
   * Use cases: Document processing; Embedding generation; Vector optimization; Content customization
   *
   * AWS: Bedrock knowledge base vector ingestion configuration for document processing and embedding optimization
   *
   * Validation: Must be valid VectorIngestionConfiguration if provided; enables customized document processing and vector generation
   **/
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional automatic synchronization flag for real-time document processing enabling single object processing and sequential knowledge base updates. Enables automatic processing of new or updated S3 objects one at a time for controlled knowledge base synchronization and sequential content ingestion.
   *
   * Use cases: Single object processing; Sequential updates; Controlled synchronization; One-at-a-time processing
   *
   * AWS: Bedrock knowledge base automatic sync for single object S3 document processing and sequential updates
   *
   * Validation: Boolean value; defaults to false; enables single object automatic synchronization and sequential processing
   * @default false
   */
  readonly enableSync?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional comprehensive multi-event synchronization flag for batch document processing enabling simultaneous multiple object processing and parallel knowledge base updates. Enables automatic processing of multiple S3 objects simultaneously with comprehensive event handling (CREATE, PUT, POST, DELETE) for efficient batch synchronization.
   *
   * Use cases: Batch processing; Multiple object handling; Parallel updates; Comprehensive event processing
   *
   * AWS: Bedrock knowledge base multi-event sync for simultaneous multiple object processing and batch updates
   *
   * Validation: Boolean value; defaults to false; enables multiple object simultaneous processing and batch synchronization
   * @default false
   */
  readonly enableMultiSync?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for batch sync Lambda function execution enabling multi-object processing and comprehensive S3 event handling. Provides execution role for batch synchronization Lambda functions when enableMultiSync is enabled, requiring specific permissions for CloudWatch Logs, SQS, Bedrock ingestion jobs, and KMS operations.
   *
   * Use cases: Batch processing; Multi-object sync; Lambda execution; Comprehensive event handling
   *
   * AWS: IAM role ARN for Bedrock knowledge base batch sync Lambda function execution and multi-object processing
   *
   * Validation: Must be valid IAM role ARN when enableMultiSync is true; role must have lambda.amazonaws.com trust policy and required permissions
   */
  readonly syncLambdaRoleArn?: string;
}

export interface SharepointDataSource {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SharePoint data source configuration for enterprise document integration enabling SharePoint connectivity and content ingestion. Provides SharePoint-specific configuration including authentication, site access, and document retrieval for enterprise knowledge base population from SharePoint repositories.
   *
   * Use cases: Enterprise document integration; SharePoint connectivity; Corporate content ingestion; Enterprise knowledge management
   *
   * AWS: Bedrock knowledge base SharePoint data source configuration for enterprise document integration and content ingestion
   *
   * Validation: Must be valid SharepointDataSourceConfiguration; required for SharePoint integration and document access
   **/
  readonly dataSource: SharepointDataSourceConfiguration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional vector ingestion configuration for SharePoint document processing enabling customized content extraction and embedding generation. Provides vector ingestion settings for SharePoint document parsing, chunking, and transformation to optimize knowledge base performance with enterprise content.
   *
   * Use cases: SharePoint document processing; Enterprise content optimization; Vector generation; Content customization
   *
   * AWS: Bedrock knowledge base vector ingestion configuration for SharePoint document processing and optimization
   *
   * Validation: Must be valid VectorIngestionConfiguration if provided; enables customized SharePoint document processing and vector generation
   **/
  readonly vectorIngestionConfiguration?: VectorIngestionConfiguration;
}

export interface SharepointDataSourceConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Required authentication type for SharePoint connectivity enabling secure access to SharePoint sites and document repositories. Specifies the OAuth2 authentication method for connecting to SharePoint including client credentials or SharePoint app-only authentication for enterprise document access.
   *
   * Use cases: SharePoint authentication; Secure connectivity; Enterprise access; OAuth2 integration
   *
   * AWS: Bedrock knowledge base SharePoint authentication type for secure site connectivity and document access
   *
   * Validation: Must be OAUTH2_CLIENT_CREDENTIALS or OAUTH2_SHAREPOINT_APP_ONLY_CLIENT_CREDENTIALS; required for SharePoint authentication
   **/
  readonly authType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS Secrets Manager secret ARN containing SharePoint authentication credentials enabling secure credential management and access control. Provides the secret that stores SharePoint authentication credentials for secure and managed access to SharePoint sites and documents.
   *
   * Use cases: Credential management; Secure authentication; Access control; Secret management
   *
   * AWS: AWS Secrets Manager secret ARN for Bedrock knowledge base SharePoint authentication credentials
   *
   * Validation: Must be valid Secrets Manager ARN; required for SharePoint authentication and credential management
   **/
  readonly credentialsSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required SharePoint domain specification for site connectivity enabling targeted SharePoint instance access and domain-specific configuration. Provides the SharePoint domain or site URL for establishing connectivity to the specific SharePoint instance containing target documents.
   *
   * Use cases: Domain connectivity; Site targeting; Instance specification; SharePoint access
   *
   * AWS: Bedrock knowledge base SharePoint domain for site connectivity and instance targeting
   *
   * Validation: Must be valid SharePoint domain or URL; required for SharePoint site connectivity and access
   **/
  readonly domain: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SharePoint host type specification for deployment environment targeting enabling cloud or on-premises SharePoint connectivity. Specifies whether the SharePoint instance is online/cloud-based or server/on-premises for appropriate connectivity configuration.
   *
   * Use cases: Deployment targeting; Environment specification; Connectivity configuration; SharePoint type
   *
   * AWS: Bedrock knowledge base SharePoint host type for deployment environment and connectivity configuration
   *
   * Validation: Must be ONLINE if provided; defaults to ONLINE for cloud-based SharePoint connectivity
   **/
  readonly hostType?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of SharePoint site URLs for multi-site document access enabling SharePoint content ingestion. Provides the specific SharePoint site URLs that contain documents to be ingested into the knowledge base for enterprise content coverage.
   *
   * Use cases: Multi-site access; ingestion; Site targeting; Enterprise content coverage
   *
   * AWS: Bedrock knowledge base SharePoint site URLs for multi-site document access and content ingestion
   *
   * Validation: Must be array of valid SharePoint site URLs; required for SharePoint site access and document ingestion
   **/
  readonly siteUrls: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required Microsoft 365 tenant identifier for enterprise SharePoint access enabling tenant-specific authentication and authorization. Provides the unique tenant ID for Microsoft 365 SharePoint access ensuring proper tenant isolation and security for enterprise document access.
   *
   * Use cases: Tenant identification; Enterprise access; Security isolation; M365 integration
   *
   * AWS: Bedrock knowledge base Microsoft 365 tenant ID for SharePoint enterprise access and tenant isolation
   *
   * Validation: Must be valid UUID format; required for Microsoft 365 tenant identification and SharePoint access
   **/
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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional vector store type specification for storage backend selection enabling choice between Aurora Serverless and OpenSearch Serverless. Defines the vector storage backend type for knowledge base vector storage with different performance and cost characteristics.
   *
   * Use cases: Storage backend selection; Performance optimization; Cost management; Technology choice
   *
   * AWS: Bedrock knowledge base vector store type for storage backend and technology selection
   *
   * Validation: Must be AURORA_SERVERLESS or OPENSEARCH_SERVERLESS if provided; enables storage backend selection
   *   **/
  readonly vectorStoreType?: VectorStoreType;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier for vector store network isolation enabling secure deployment and network control. Provides the VPC where the vector store will be deployed for network isolation, security controls, and private connectivity within the specified network environment.
   *
   * Use cases: Network isolation; Security deployment; VPC connectivity; Private networking
   *
   * AWS: VPC ID for Bedrock knowledge base vector store network deployment and isolation
   *
   * Validation: Must be valid VPC ID; required for vector store network deployment and security isolation
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet identifiers for vector store deployment enabling multi-AZ deployment and network distribution. Provides the subnets where vector store components will be deployed for high availability, fault tolerance, and distributed network access.
   *
   * Use cases: Multi-AZ deployment; High availability; Network distribution; Fault tolerance
   *
   * AWS: Subnet IDs for Bedrock knowledge base vector store multi-AZ deployment and network distribution
   *
   * Validation: Must be array of valid subnet IDs; required for vector store deployment and high availability
   **/
  readonly subnetIds: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Aurora Serverless PostgreSQL vector store properties interface for Bedrock knowledge bases providing database configuration and vector storage capabilities. Extends base vector store properties with Aurora-specific configuration including database connectivity, engine settings, and capacity management for scalable vector storage.
 *
 * Use cases: Aurora vector storage; PostgreSQL configuration; Serverless database; Vector database management
 *
 * AWS: Aurora Serverless PostgreSQL configuration for Bedrock knowledge base vector storage and database management
 *
 * Validation: Extends BaseVectorStoreProps validation; Aurora-specific properties are optional with sensible defaults
 */
export interface AuroraServerlessPgVectorProps extends BaseVectorStoreProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database port specification for Aurora PostgreSQL connectivity enabling custom port configuration and network access control. Defines the port number for Aurora PostgreSQL database connections with default PostgreSQL port if not specified.
   *
   * Use cases: Port configuration; Network access; Database connectivity; Custom networking
   *
   * AWS: Aurora PostgreSQL port for Bedrock knowledge base database connectivity and network configuration
   *
   * Validation: Must be valid port number if provided; defaults to standard PostgreSQL port for database connectivity
   **/
  readonly port?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional PostgreSQL engine version specification for Aurora database configuration enabling version control and feature compatibility. Defines the PostgreSQL engine version for Aurora Serverless with specific feature sets and compatibility requirements for vector operations.
   *
   * Use cases: Version control; Feature compatibility; Engine configuration; Database capabilities
   *
   * AWS: Aurora PostgreSQL engine version for Bedrock knowledge base database configuration and feature compatibility
   *
   * Validation: Must be valid PostgreSQL version if provided; enables version-specific features and compatibility
   **/
  readonly engineVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum capacity specification for Aurora Serverless scaling enabling cost optimization and performance baseline. Defines the minimum Aurora Capacity Units (ACUs) for serverless scaling to ensure baseline performance while optimizing costs during low-usage periods.
   *
   * Use cases: Cost optimization; Performance baseline; Scaling configuration; Resource management
   *
   * AWS: Aurora Serverless minimum capacity for Bedrock knowledge base cost optimization and performance baseline
   *
   * Validation: Must be valid AuroraCapacityUnit if provided; enables minimum capacity configuration and cost control
   *   **/
  readonly minCapacity?: AuroraCapacityUnit;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum capacity specification for Aurora Serverless scaling enabling performance limits and cost control. Defines the maximum Aurora Capacity Units (ACUs) for serverless scaling to ensure performance limits and prevent unexpected costs during high-usage periods.
   *
   * Use cases: Performance limits; Cost control; Scaling boundaries; Resource management
   *
   * AWS: Aurora Serverless maximum capacity for Bedrock knowledge base performance limits and cost control
   *
   * Validation: Must be valid AuroraCapacityUnit if provided; enables maximum capacity configuration and cost management
   *   **/
  readonly maxCapacity?: AuroraCapacityUnit;
}

/**
 * Q-ENHANCED-INTERFACE
 * OpenSearch Serverless vector store properties interface for Bedrock knowledge bases providing search configuration and vector storage capabilities. Extends base vector store properties with OpenSearch-specific configuration including replica management and serverless search capabilities for scalable vector operations.
 *
 * Use cases: OpenSearch vector storage; Serverless search; Vector operations; Search configuration
 *
 * AWS: OpenSearch Serverless configuration for Bedrock knowledge base vector storage and search capabilities
 *
 * Validation: Extends BaseVectorStoreProps validation; standbyReplicas is required for replica configuration
 */
export interface OpensearchServerlessProps extends BaseVectorStoreProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required standby replica configuration for OpenSearch Serverless high availability enabling fault tolerance and performance optimization. Defines whether to enable or disable standby replicas for the OpenSearch Serverless collection with permanent configuration that cannot be changed after creation.
   *
   * Use cases: High availability; Fault tolerance; Performance optimization; Replica management
   *
   * AWS: OpenSearch Serverless standby replicas for Bedrock knowledge base high availability and fault tolerance
   *
   * Validation: Must be ENABLE or DISABLE; required for replica configuration and cannot be changed after collection creation
   *   **/
  readonly standbyReplicas: StandbyReplicas;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing OpenSearch Serverless VPC endpoint configuration for reusing pre-existing VPC endpoints enabling deployment flexibility and avoiding duplicate endpoint creation. When provided, the construct will use the existing VPC endpoint instead of creating a new one, preventing deployment failures when a VPC endpoint already exists for the specified VPC.
   *
   * Use cases: Reuse existing endpoints; Avoid duplicate creation; Deployment flexibility; Cost optimization
   *
   * AWS: Existing OpenSearch Serverless VPC endpoint configuration for Bedrock knowledge base network connectivity
   *
   * Validation: If provided, both vpceId and securityGroupId must be specified
   **/
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

/**
 * Q-ENHANCED-INTERFACE
 * Comprehensive Bedrock knowledge base properties interface with complete RAG configuration including data sources, vector storage, and embedding management. Defines knowledge base configuration for document ingestion, vector processing, and intelligent retrieval with support for multiple data sources and advanced AI capabilities.
 *
 * Use cases: RAG implementation; Knowledge management; Document retrieval; AI-powered search; Enterprise knowledge bases
 *
 * AWS: Amazon Bedrock knowledge base configuration for RAG implementation and intelligent document retrieval
 *
 * Validation: vectorStore, embeddingModel, and role are required; data sources and advanced features are optional
 */
export interface BedrockKnowledgeBaseProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SharePoint data sources configuration for enterprise document integration enabling SharePoint content ingestion and knowledge base population. Provides SharePoint-specific data source configurations for enterprise document repositories and corporate knowledge management.
   *
   * Use cases: Enterprise document integration; SharePoint connectivity; Corporate knowledge management; Enterprise content ingestion
   *
   * AWS: Bedrock knowledge base SharePoint data sources for enterprise document integration and corporate content ingestion
   *
   * Validation: Must be valid NamedSharepointDataSources if provided; enables SharePoint integration and enterprise document access
   *   **/
  readonly sharepointDataSources?: NamedSharepointDataSources;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 data sources configuration for cloud document integration enabling scalable document ingestion and knowledge base population. Provides S3-specific data source configurations for cloud document repositories with bucket and prefix-based organization for flexible content management.
   *
   * Use cases: Cloud document integration; S3 connectivity; Scalable ingestion; Flexible content management
   *
   * AWS: Bedrock knowledge base S3 data sources for cloud document integration and scalable content ingestion
   *
   * Validation: Must be valid NamedS3DataSource if provided; enables S3 integration and cloud document access
   *   **/
  readonly s3DataSources?: NamedS3DataSource;
  /**
   * Q-ENHANCED-PROPERTY
   * Required vector store reference for knowledge base vector storage enabling semantic search and retrieval capabilities. Specifies the vector store configuration that will be used for storing and retrieving document embeddings for AI-powered semantic search and intelligent document retrieval.
   *
   * Use cases: Vector storage; Semantic search; Document retrieval; AI-powered search
   *
   * AWS: Bedrock knowledge base vector store reference for semantic search and intelligent document retrieval
   *
   * Validation: Must be valid vector store name; required for knowledge base vector storage and retrieval capabilities
   **/
  readonly vectorStore: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required embedding model specification for vector generation enabling semantic understanding and similarity matching. Defines the Bedrock embedding model used for generating document vectors with specific dimensionality and semantic capabilities for optimal knowledge retrieval performance.
   *
   * Use cases: Vector generation; Semantic understanding; Similarity matching; Embedding optimization
   *
   * AWS: Bedrock embedding model for knowledge base vector generation and semantic understanding
   *
   * Validation: Must be valid Bedrock embedding model ID; required for vector generation and semantic processing
   **/
  readonly embeddingModel: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional vector field size specification for embedding dimensionality enabling vector storage optimization and performance tuning. Defines the dimensionality of vector embeddings for storage optimization and retrieval performance with model-specific requirements and storage efficiency.
   *
   * Use cases: Vector optimization; Storage efficiency; Performance tuning; Dimensionality control
   *
   * AWS: Bedrock knowledge base vector field size for embedding dimensionality and storage optimization
   *
   * Validation: Must be positive integer matching embedding model dimensions if provided; enables vector storage optimization
   **/
  readonly vectorFieldSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional supplemental S3 bucket name for advanced parsing workflows enabling enhanced document processing and AI-powered content extraction. Required when using advanced parsing strategies like Bedrock Data Automation or foundation model parsing for sophisticated document analysis and content extraction.
   *
   * Use cases: Advanced parsing; Enhanced processing; AI-powered extraction; Sophisticated document analysis
   *
   * AWS: S3 bucket for Bedrock knowledge base advanced parsing workflows and enhanced document processing
   *
   * Validation: Must be valid S3 bucket name if provided; required when using BEDROCK_DATA_AUTOMATION or BEDROCK_FOUNDATION_MODEL parsing
   **/
  readonly supplementalBucketName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role reference for knowledge base execution enabling secure access to AWS services and data sources. Provides the execution role for knowledge base operations with required permissions for Bedrock services, S3 data access, and optional Lambda sync functionality for knowledge base management.
   *
   * Use cases: Execution permissions; Service access; Data source connectivity; Security management
   *
   * AWS: IAM role for Bedrock knowledge base execution and secure service access
   *
   * Validation: Must be valid MdaaRoleRef with Bedrock trust policy; required for knowledge base execution and service access
   **/
  readonly role: MdaaRoleRef;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named knowledge base collection interface for managing multiple Bedrock Knowledge Bases with string-based naming for organized RAG application deployment. Enables configuration of multiple knowledge bases with unique identifiers, supporting multi-domain knowledge management and organized document retrieval systems for complex AI applications.
 * Use cases: Multi-domain knowledge bases; Named knowledge base collections; Organized RAG architecture; Knowledge base management; Domain-specific AI assistants
 * AWS: Multiple Amazon Bedrock Knowledge Bases with organized naming for multi-domain RAG applications and knowledge management
 * Validation: Knowledge base names must be valid identifiers; each BedrockKnowledgeBaseProps must be valid knowledge base configuration; names must be unique within collection
 */
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

    // Always create policy for handler's role if it exists, because all handlers are independent
    const handlerRole = createTable.handlerFunction.role;
    let storeAccessPolicy: ManagedPolicy | undefined;
    if (handlerRole) {
      storeAccessPolicy = this.createVectorStorePolicyForKB(`${kbName}-handler`, store, kmsKey);
      handlerRole.addManagedPolicy(storeAccessPolicy);
    }

    const knowledgeBase = this.createAuroraKnowledgeBaseResource(kbName, kbConfig, embeddingModelArn, store, dbConfig);

    // Finalize kb creation
    const dependencies: (MdaaRdsDataResource | MdaaCustomResource | CfnResource | ManagedPolicy)[] = [
      createDb,
      createTable,
    ];
    if (storeAccessPolicy) {
      dependencies.push(storeAccessPolicy);
    }
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
      const char = input.charCodeAt(i);
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

    if (vectorIngestionConfig) {
      const vectorIngestionConfigProp = this.createVectorIngestionConfiguration(vectorIngestionConfig);
      return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, {
        ...baseDataSourceProps,
        vectorIngestionConfiguration: vectorIngestionConfigProp,
      });
    }

    return new bedrock.CfnDataSource(this, `${kbName}-DataSource-${dsName}`, baseDataSourceProps);
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

    const dlq = new sqs.Queue(this, `${kbName}-${dsName}-sync-dlq`, {
      queueName: this.props.naming.resourceName(`${shortKbName}-${shortDsName}-sync-dlq-${uniqueSuffix}`, 80),
      encryptionMasterKey: kmsKey,
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });

    const syncQueue = new sqs.Queue(this, `${kbName}-${dsName}-sync-queue`, {
      queueName: this.props.naming.resourceName(`${shortKbName}-${shortDsName}-sync-queue-${uniqueSuffix}`, 80),
      encryptionMasterKey: kmsKey,
      visibilityTimeout: Duration.minutes(15),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
      enforceSSL: true,
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
