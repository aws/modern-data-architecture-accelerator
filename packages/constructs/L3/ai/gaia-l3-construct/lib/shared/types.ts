import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';

export type ModelProvider = 'sagemaker' | 'bedrock' | 'openai';

export enum SupportedSageMakerModels {
  FALCON_LITE = 'FalconLite',
  LLAMA2_13B_CHAT = 'Llama2_13b_Chat',
  MISTRAL7B_INSTRUCT2 = 'Mistral7b_Instruct2',
}

export enum SupportedAuthTypes {
  EMAIL_PASSWORD = 'email_pass',
  ACTIVE_DIRECTORY = 'ad',
  EXISTING_POOL = 'existing',
}

export enum SupportedRegion {
  AF_SOUTH_1 = 'af-south-1',
  AP_EAST_1 = 'ap-east-1',
  AP_NORTHEAST_1 = 'ap-northeast-1',
  AP_NORTHEAST_2 = 'ap-northeast-2',
  AP_NORTHEAST_3 = 'ap-northeast-3',
  AP_SOUTH_1 = 'ap-south-1',
  AP_SOUTH_2 = 'ap-south-2',
  AP_SOUTHEAST_1 = 'ap-southeast-1',
  AP_SOUTHEAST_2 = 'ap-southeast-2',
  AP_SOUTHEAST_3 = 'ap-southeast-3',
  AP_SOUTHEAST_4 = 'ap-southeast-4',
  CA_CENTRAL_1 = 'ca-central-1',
  EU_CENTRAL_1 = 'eu-central-1',
  EU_CENTRAL_2 = 'eu-central-2',
  EU_NORTH_1 = 'eu-north-1',
  EU_SOUTH_1 = 'eu-south-1',
  EU_SOUTH_2 = 'eu-south-2',
  EU_WEST_1 = 'eu-west-1',
  EU_WEST_2 = 'eu-west-2',
  EU_WEST_3 = 'eu-west-3',
  IL_CENTRAL_1 = 'il-central-1',
  ME_CENTRAL_1 = 'me-central-1',
  ME_SOUTH_1 = 'me-south-1',
  SA_EAST_1 = 'sa-east-1',
  US_EAST_1 = 'us-east-1',
  US_EAST_2 = 'us-east-2',
  US_WEST_1 = 'us-west-1',
  US_WEST_2 = 'us-west-2',
}

export enum ModelInterface {
  LANG_CHAIN = 'langchain',
}

export enum Modality {
  TEXT = 'TEXT',
  EMBEDDING = 'EMBEDDING',
}

export enum Direction {
  IN = 'IN',
  OUT = 'OUT',
}

/**
 * VPC networking configuration for GAIA GenAI infrastructure deployment.
 * Defines network isolation boundaries with separate app and data tiers for secure AI workload hosting.
 *
 * Use cases: GenAI network isolation; Multi-tier VPC deployment; Secure AI workload hosting; Network segmentation for chatbot infrastructure
 *
 * AWS: Amazon VPC with app/data subnet tiers and security groups
 *
 * Validation: Required; All IDs must reference existing VPC resources
 */
export interface VpcProps {
  /**
   * VPC identifier for hosting GAIA GenAI application components.
   * All Lambda functions, databases, and endpoints will be deployed within this VPC.
   *
   * Use cases: GenAI network isolation; VPC-bound AI workloads; Secure chatbot deployment; Network boundary definition
   *
   * AWS: Amazon VPC
   *
   * Validation: Required; Must be valid VPC ID (vpc-xxx format)
   */
  readonly vpcId: string;
  /**
   * Subnet IDs for the data tier hosting databases (Aurora, DynamoDB) and backend AI services.
   * These subnets should have no direct internet access for data security.
   *
   * Use cases: Database subnet placement; Backend AI service networking; Data processing isolation; Secure data handling
   *
   * AWS: Amazon VPC subnets for data tier
   *
   * Validation: Required; Array of valid subnet IDs; must be in the specified VPC
   */
  readonly dataSubnets: string[];
  /**
   * Security group ID controlling network access to data tier components (databases, storage).
   *
   * Use cases: Database access control; Backend service security; Data processing network rules
   *
   * AWS: Amazon EC2 Security Group
   *
   * Validation: Required; Must be valid security group ID (sg-xxx format)
   */
  readonly dataSecurityGroupId: string;
  /**
   * Subnet IDs for the application tier hosting Lambda functions, API handlers, and user-facing services.
   *
   * Use cases: Lambda function placement; API handler networking; Application tier isolation; User-facing AI services
   *
   * AWS: Amazon VPC subnets for application tier
   *
   * Validation: Required; Array of valid subnet IDs; must be in the specified VPC
   */
  readonly appSubnets: string[];
  /**
   * Security group ID controlling network access for application tier components (Lambda, API handlers).
   *
   * Use cases: Application tier security; API handler access control; Lambda function networking
   *
   * AWS: Amazon EC2 Security Group
   *
   * Validation: Required; Must be valid security group ID (sg-xxx format)
   */
  readonly appSecurityGroupId: string;
}
/**
 * Custom code override paths for GAIA Lambda functions, layers, and batch jobs.
 * Allows replacing default implementations with custom code for specialized GenAI requirements.
 *
 * Use cases: Custom REST API logic; Custom RAG inference; Custom WebSocket handlers; Custom data ingestion workflows
 *
 * AWS: Lambda function/layer code paths and Docker file paths for AWS Batch
 *
 * Validation: Optional; All paths must be valid relative file/directory paths when provided
 */
export interface CodeOverwritesProps {
  /**
   * Custom code path for the REST API handler Lambda replacing default CRUD operations for workspaces, models, and search.
   *
   * Use cases: Custom API business logic; Specialized endpoint behavior; Custom GenAI API features
   *
   * AWS: Lambda function code for API Gateway REST handler
   *
   * Validation: Optional; Must be valid directory path containing Lambda handler code
   */
  readonly restApiHandlerCodePath?: string;
  /**
   * Custom code path for RAG engines inference Lambda for specialized document retrieval and AI response generation.
   *
   * Use cases: Custom RAG logic; Specialized inference behavior; Custom embedding/retrieval pipelines
   *
   * AWS: Lambda function code for RAG inference
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly ragEnginesInferenceCodePath?: string;
  /**
   * Custom ZIP path for common libraries Lambda layer shared across multiple GAIA Lambda functions.
   *
   * Use cases: Shared library deployment; Custom dependency management; Common utility code
   *
   * AWS: Lambda layer ZIP for shared dependencies
   *
   * Validation: Optional; Must be valid ZIP file path
   */
  readonly commonLibsLayerCodeZipPath?: string;
  /**
   * Custom code path for GenAI core Lambda layer containing shared AI clients and service functionality.
   *
   * Use cases: Custom AI core logic; Model integration customization; Shared AI service clients
   *
   * AWS: Lambda layer code for GenAI core functionality
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly genAiCoreLayerCodePath?: string;
  /**
   * Custom code path for Aurora pgVector database setup Lambda for specialized vector store initialization.
   *
   * Use cases: Custom vector database schema; Specialized pgVector configuration; Custom metadata setup
   *
   * AWS: Lambda function code for Aurora pgVector setup
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly pgVectorDbSetupCodePath?: string;
  /**
   * Custom code path for Aurora workspace creation Lambda for specialized workspace provisioning.
   *
   * Use cases: Custom workspace creation logic; Aurora provisioning customization; Workspace configuration
   *
   * AWS: Lambda function code for Aurora workspace creation
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly createAuroraWorkspaceCodePath?: string;
  /**
   * Custom code path for data import upload handler Lambda for specialized data ingestion orchestration.
   *
   * Use cases: Custom data ingestion; Upload processing customization; Custom Step Functions triggering
   *
   * AWS: Lambda function code for S3 upload/SQS ingestion handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly dataImportUploadHandlerCodePath?: string;
  /**
   * Custom code path for website parser Lambda for specialized web crawling and content extraction.
   *
   * Use cases: Custom web parsing; Advanced website crawling; Specialized content extraction
   *
   * AWS: Lambda function code for website crawling workflow
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly websiteParserCodePath?: string;
  /**
   * Custom Dockerfile path for file import AWS Batch job container for specialized batch processing.
   *
   * Use cases: Custom batch processing containers; Specialized file processing; Custom Unstructured.io configuration
   *
   * AWS: Dockerfile for AWS Batch job container
   *
   * Validation: Optional; Must be valid Dockerfile path
   */
  readonly fileImportBatchJobDockerFilePath?: string;
  /**
   * Custom code path for workspace deletion handler Lambda for specialized cleanup and resource management.
   *
   * Use cases: Custom workspace cleanup; Resource management; Custom deletion workflows
   *
   * AWS: Lambda function code for workspace deletion handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly deleteWorkspaceHandlerCodePath?: string;
  /**
   * Custom code path for WebSocket connection handler Lambda for specialized real-time connection management.
   *
   * Use cases: Custom WebSocket connection logic; Advanced session handling; Custom connection management
   *
   * AWS: Lambda function code for WebSocket connection handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly webSocketConnectionHandlerCodePath?: string;
  /**
   * Custom code path for WebSocket authorizer Lambda for specialized authentication and authorization.
   * Default verifies tokens from query parameters with authentication only; override for custom authorization logic.
   *
   * Use cases: Custom WebSocket authorization; Advanced token validation; Custom access control
   *
   * AWS: Lambda function code for WebSocket custom authorizer
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly webSocketAuthorizerFunctionCodePath?: string;
  /**
   * Custom code path for WebSocket incoming message handler Lambda for specialized message routing.
   *
   * Use cases: Custom message processing; Advanced routing logic; Custom model interface selection
   *
   * AWS: Lambda function code for WebSocket incoming message handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly webSocketIncomingMessageHandlerCodePath?: string;
  /**
   * Custom code path for WebSocket outgoing message handler Lambda for specialized response delivery.
   *
   * Use cases: Custom message delivery; Response vetting; Custom broadcasting logic
   *
   * AWS: Lambda function code for WebSocket outgoing message handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly webSocketOutgoingMessageHandlerCodePath?: string;
  /**
   * Custom code path for LangChain interface handler Lambda for specialized AI chain orchestration.
   *
   * Use cases: Custom LangChain integration; Custom AI agent workflows; Specialized chain orchestration
   *
   * AWS: Lambda function code for LangChain model interface handler
   *
   * Validation: Optional; Must be valid directory path
   */
  readonly langchainInterfaceHandlerCodePath?: string;
}
/**
 * Authentication configuration for GAIA GenAI platform user access.
 * Supports email/password, Active Directory, or existing Cognito User Pool integration.
 *
 * Use cases: Email/password authentication; AD enterprise SSO; Existing Cognito pool integration; Branded auth domains
 *
 * AWS: Amazon Cognito User Pools with optional AD identity provider
 *
 * Validation: Required; authType must be a valid SupportedAuthTypes value
 */
export interface AuthProps {
  /**
   * Authentication method for the GAIA platform.
   * Determines identity provider: email/password (Cognito-managed), Active Directory (SAML), or existing Cognito pool.
   *
   * Use cases: Email/password signup; AD enterprise SSO; Reusing existing Cognito infrastructure
   *
   * AWS: Amazon Cognito User Pool authentication mode
   *
   * Validation: Required; Must be 'email_pass', 'ad', or 'existing' (SupportedAuthTypes enum)
   */
  readonly authType: SupportedAuthTypes;
  /**
   * Custom Cognito User Pool domain for branded authentication URLs. Must be globally unique.
   * Required when authType is 'ad'.
   *
   * Use cases: Branded sign-in experience; Custom authentication URLs; AD integration domain
   *
   * AWS: Amazon Cognito User Pool domain
   *
   * Validation: Optional; Must be globally unique domain name
   */
  readonly cognitoDomain?: string;
  readonly idpSamlMetadataUrlOrFileParamPath?: string;
  readonly idpSamlEmailClaimParamPath?: string;
  readonly oAuthRedirectUrl?: string;
  /**
   * Existing Cognito User Pool ID for integrating GAIA with a pre-existing user pool.
   * Required when authType is 'existing'.
   *
   * Use cases: Existing user pool integration; Shared authentication infrastructure; Multi-app Cognito reuse
   *
   * AWS: Amazon Cognito User Pool ID
   *
   * Validation: Optional; Required when authType is 'existing'; Must be valid User Pool ID format
   */
  readonly existingPoolId?: string;
  /**
   * Existing Cognito User Pool app client ID for integrating GAIA with a pre-existing app client.
   * Used when authType is 'existing'.
   *
   * Use cases: Existing app client reuse; Shared client configuration; Multi-app authentication
   *
   * AWS: Amazon Cognito User Pool App Client ID
   *
   * Validation: Optional; Must be valid Cognito app client ID format
   */
  readonly existingPoolClientId?: string;
  readonly existingPoolDomain?: string;
}
/**
 * Amazon Bedrock integration configuration for GAIA GenAI foundation model access.
 * Controls Bedrock enablement, region selection, and optional cross-account access.
 *
 * Use cases: Bedrock foundation model enablement; Cross-region model access; Cross-account Bedrock integration; Regional compliance
 *
 * AWS: Amazon Bedrock with optional cross-account IAM role
 *
 * Validation: Optional; When provided, enabled and region are required
 */
export interface BedrockProps {
  /**
   * Enables or disables Amazon Bedrock foundation model integration.
   * When true, configures IAM permissions and resources for Bedrock model access.
   *
   * Use cases: Foundation model enablement; Bedrock service activation; AI capability toggle
   *
   * AWS: Amazon Bedrock service enablement
   *
   * Validation: Required; boolean
   */
  readonly enabled: boolean;
  /**
   * AWS region for Bedrock foundation model access. Supports cross-region access.
   * Consult regulatory restrictions before using out-of-region models.
   *
   * Use cases: Regional model access; Data residency compliance; Cross-region Bedrock usage
   *
   * AWS: AWS region for Amazon Bedrock API calls
   *
   * Validation: Required; Must be valid SupportedRegion enum value
   */
  readonly region: SupportedRegion;
  /**
   * IAM role ARN for cross-account or custom Bedrock access when default permissions are insufficient.
   *
   * Use cases: Cross-account Bedrock access; Custom IAM role for model invocation; Advanced permission management
   *
   * AWS: IAM role ARN for Bedrock STS AssumeRole
   *
   * Validation: Optional; Must be valid IAM role ARN format
   */
  readonly roleArn?: string;
}
/**
 * SageMaker-hosted LLM model configuration with auto-scaling for GAIA chatbot backends.
 * Supports Falcon, Mistral, and Llama2 models with configurable instance types and scaling.
 *
 * Use cases: SageMaker LLM deployment; Auto-scaling chatbot backends; Custom instance sizing; Production LLM hosting
 *
 * AWS: Amazon SageMaker real-time inference endpoints with auto-scaling
 *
 * Validation: Required model field; instance counts must satisfy min <= initial <= max when provided
 */
export interface SagemakerLlmModelConfig {
  /**
   * SageMaker LLM model to deploy for conversational AI.
   *
   * Use cases: LLM model selection; Chatbot backend model; Text generation endpoint
   *
   * AWS: Amazon SageMaker hosted LLM model
   *
   * Validation: Required; Must be valid SupportedSageMakerModels enum value (FalconLite, Llama2_13b_Chat, Mistral7b_Instruct2)
   */
  readonly model: SupportedSageMakerModels;
  /**
   * SageMaker instance type for LLM hosting.
   *
   * Use cases: Compute resource sizing; Performance optimization; Cost management
   *
   * AWS: Amazon SageMaker endpoint instance type
   *
   * Validation: Optional; Must be valid SageMaker instance type (e.g., ml.g5.2xlarge)
   */
  readonly instanceType?: string;
  /**
   * Initial number of instances for the LLM endpoint.
   *
   * Use cases: Initial capacity planning; Baseline availability; Deployment sizing
   *
   * AWS: SageMaker endpoint initial instance count
   *
   * Validation: Optional; Positive integer; Should be between min and max counts
   */
  readonly initialInstanceCount?: number;
  /**
   * Minimum instance count for LLM endpoint auto-scaling.
   *
   * Use cases: Cost optimization; Minimum availability guarantee; Auto-scaling lower bound
   *
   * AWS: SageMaker endpoint auto-scaling minimum
   *
   * Validation: Optional; Positive integer; Must be <= initial and max counts
   */
  readonly minimumInstanceCount?: number;
  /**
   * Maximum instance count for LLM endpoint auto-scaling.
   *
   * Use cases: Peak capacity control; Cost limits; Auto-scaling upper bound
   *
   * AWS: SageMaker endpoint auto-scaling maximum
   *
   * Validation: Optional; Positive integer; Must be >= initial and min counts
   */
  readonly maximumInstanceCount?: number;
}
export interface LlmsProps {
  readonly huggingFaceApiToken?: string;
  readonly sagemaker: SagemakerLlmModelConfig[];
}
export interface AuroraEngineProps {
  /** Create separate security group for Aurora */
  readonly createSeparateSecurityGroup?: boolean;
  /** Minimum Aurora Serverless capacity units */
  readonly minCapacity?: number;
  /** Maximum Aurora Serverless capacity units */
  readonly maxCapacity?: number;
}
export interface KendraExternalProps {
  readonly name: string;
  readonly kendraId: string;
  readonly region?: SupportedRegion;
  readonly roleArn?: string;
}
export interface KendraS3DataSourceConfigProps {
  readonly bucketName: string;
  readonly kmsKeyArn: string;
  readonly includedDirectories: string[];
  readonly metadataDirectory?: string;
}
export interface KendraEngineProps {
  /** Whether to create a new Kendra index */
  readonly createIndex: boolean;
  /** S3 data source configuration for Kendra index */
  readonly s3DataSourceConfig?: KendraS3DataSourceConfigProps;
  /** External Kendra index configurations */
  readonly external?: KendraExternalProps[];
}
export interface SagemakerRagProps {
  readonly instanceType?: string;
  readonly minInstanceCount?: number;
  readonly maxInstanceCount?: number;
  readonly initialInstanceCount?: number;
}
export interface ExternalKnowledgeBaseProps {
  readonly name: string;
  readonly kbId: string;
  readonly region?: SupportedRegion;
  readonly roleArn?: string;
}
export interface KnowledgeBaseProps {
  readonly external?: ExternalKnowledgeBaseProps[];
}
export interface EngineProps {
  readonly sagemaker?: SagemakerRagProps;
  readonly aurora?: AuroraEngineProps;
  readonly kendra?: KendraEngineProps;
  readonly knowledgeBase?: KnowledgeBaseProps;
}
export interface ModelProps {
  /** Model provider (sagemaker, bedrock, openai) */
  readonly provider: ModelProvider;
  /** Model name identifier */
  readonly name: string;
  /** Vector embedding dimensions */
  readonly dimensions: number;
  /** Whether this is the default model */
  readonly isDefault?: boolean;
}
export interface CrossEncoderModelProps {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly isDefault?: boolean;
}
export interface RagProps {
  /** Retrieval engine configuration */
  readonly engines: EngineProps;
  /** Embedding models for vector processing */
  readonly embeddingsModels: ModelProps[];
  /** Cross-encoder models for document ranking */
  readonly crossEncoderModels: CrossEncoderModelProps[];
}
export interface BackendApisProps {
  /** Custom domain name for REST API */
  readonly restApiDomainName: string;
  /** Route53 hosted zone name for DNS */
  readonly hostedZoneName: string;
  /** Custom domain name for WebSocket API */
  readonly socketApiDomainName: string;
}
export interface ConcurrencyProps {
  readonly modelInterfaceConcurrentLambdas?: number;
  readonly restApiConcurrentLambdas?: number;
  readonly websocketConcurrentLambdas?: number;
}
export interface SystemConfig {
  readonly prefix: string;
  readonly mainDomain?: string;
  readonly vpc: VpcProps;
  readonly auth: AuthProps;
  readonly bedrock?: BedrockProps;
  readonly llms: LlmsProps;
  readonly rag?: RagProps;
  /** Backend API configuration for REST and WebSocket domains */
  readonly api?: BackendApisProps;
  readonly concurrency?: ConcurrencyProps;
  readonly powertoolsDevLogging?: 'true' | 'false';
  readonly setApiGateWayAccountCloudwatchRole?: boolean;
  readonly skipApiGatewayDefaultWaf?: boolean;
  readonly codeOverwrites?: CodeOverwritesProps;
}

export interface SageMakerLLMEndpoint {
  readonly name: string;
  readonly endpoint: sagemaker.CfnEndpoint;
}

export interface SageMakerModelEndpoint {
  readonly name: string;
  readonly endpoint: sagemaker.CfnEndpoint;
  readonly responseStreamingSupported: boolean;
  readonly inputModalities: Modality[];
  readonly outputModalities: Modality[];
  readonly modelInterface: ModelInterface;
  readonly ragSupported: boolean;
}
