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
 * Q-ENHANCED-INTERFACE
 * VPC configuration interface for GAIA GenAI infrastructure with network isolation and security capabilities. Defines VPC properties for GenAI application deployment including network configuration, subnet management, and security group configuration for secure AI workload isolation.
 *
 * Use cases: GenAI network isolation; VPC security configuration; AI workload networking; Secure GenAI deployment; Network segmentation
 *
 * AWS: VPC configuration for GAIA GenAI infrastructure with network isolation and security for AI workloads
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface VpcProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier for GAIA GenAI infrastructure deployment enabling network isolation and security boundaries. Defines the Virtual Private Cloud that will host the GAIA GenAI application components providing network-level security and isolation for AI workloads and data processing.
   *
   * Use cases: GenAI network isolation; VPC-based security; AI workload networking; Secure GenAI deployment; Network boundaries
   *
   * AWS: Amazon VPC identifier for GAIA GenAI infrastructure deployment with network isolation and security
   *
   * Validation: Must be valid VPC identifier; required for VPC-based GAIA deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of data subnet identifiers for GAIA GenAI data processing components enabling data tier network segmentation. Defines the specific subnets within the VPC that will host data processing components including databases, data storage, and backend AI services for secure data handling.
   *
   * Use cases: Data tier networking; Database subnet placement; Backend service networking; Data processing isolation; Secure data handling
   *
   * AWS: Amazon VPC subnet identifiers for GAIA GenAI data tier components and data processing services
   *
   * Validation: Must be array of valid subnet identifiers; required for data tier deployment; subnets must be in specified VPC
   **/
  readonly dataSubnets: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group identifier for GAIA GenAI data tier components enabling data access control and network security. Defines the security group that will control network access to data processing components including databases, storage services, and backend AI infrastructure.
   *
   * Use cases: Data tier security; Database access control; Backend service security; Data processing security; Network access control
   *
   * AWS: Amazon EC2 security group identifier for GAIA GenAI data tier network access control and security
   *
   * Validation: Must be valid security group identifier; required for data tier security configuration
   **/
  readonly dataSecurityGroupId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of application subnet identifiers for GAIA GenAI application components enabling application tier network segmentation. Defines the specific subnets within the VPC that will host application components including web servers, API gateways, and frontend AI services for user-facing GenAI functionality.
   *
   * Use cases: Application tier networking; Web server subnet placement; API gateway networking; Frontend service networking; User-facing AI services
   *
   * AWS: Amazon VPC subnet identifiers for GAIA GenAI application tier components and user-facing services
   *
   * Validation: Must be array of valid subnet identifiers; required for application tier deployment; subnets must be in specified VPC
   **/
  readonly appSubnets: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group identifier for GAIA GenAI application tier components enabling application access control and network security. Defines the security group that will control network access to application components including web servers, API gateways, and frontend AI services.
   *
   * Use cases: Application tier security; Web server access control; API gateway security; Frontend service security; User access control
   *
   * AWS: Amazon EC2 security group identifier for GAIA GenAI application tier network access control and security
   *
   * Validation: Must be valid security group identifier; required for application tier security configuration
   **/
  readonly appSecurityGroupId: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Code overwrite configuration interface for GAIA GenAI customization with application code modification capabilities. Defines code overwrite properties for GenAI application customization including custom code deployment and application modification for tailored AI solutions.
 *
 * Use cases: GenAI application customization; Custom code deployment; AI solution tailoring; Application modification; Custom GenAI features
 *
 * AWS: GAIA GenAI application code customization with custom code deployment and application modification
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface CodeOverwritesProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for REST API handler Lambda function enabling customized API endpoint behavior and business logic. Provides ability to override default REST API handling with custom implementation for specialized GenAI API requirements and custom business logic integration.
   *
   * Use cases: Custom API logic; Specialized endpoint behavior; Business logic integration; API customization; Custom GenAI API features
   *
   * AWS: Lambda function code path for custom REST API Gateway handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for API customization
   **/
  readonly restApiHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for RAG engines inference Lambda function enabling customized retrieval-augmented generation logic. Provides ability to override default RAG inference behavior with custom implementation for specialized document retrieval and AI response generation.
   *
   * Use cases: Custom RAG logic; Specialized inference behavior; Document retrieval customization; AI response generation; Custom RAG engines
   *
   * AWS: Lambda function code path for custom RAG engines inference implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for RAG customization
   **/
  readonly ragEnginesInferenceCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom ZIP file path for common libraries Lambda layer enabling shared code deployment and dependency management. Provides ability to deploy custom shared libraries and dependencies across multiple Lambda functions for consistent code reuse and dependency management.
   *
   * Use cases: Shared library deployment; Dependency management; Code reuse; Lambda layer customization; Common utilities
   *
   * AWS: Lambda layer ZIP file path for shared libraries and dependencies deployment
   *
   * Validation: Must be valid ZIP file path if provided; optional for shared library deployment
   **/
  readonly commonLibsLayerCodeZipPath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for GenAI core Lambda layer enabling customized AI core functionality and model integration. Provides ability to override default GenAI core behavior with custom implementation for specialized AI model integration and core GenAI functionality.
   *
   * Use cases: Custom AI core logic; Model integration customization; GenAI functionality modification; AI service customization; Core AI features
   *
   * AWS: Lambda layer code path for custom GenAI core functionality implementation
   *
   * Validation: Must be valid file path to Lambda layer code if provided; optional for GenAI core customization
   **/
  readonly genAiCoreLayerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for PostgreSQL vector database setup Lambda function enabling customized vector database initialization. Provides ability to override default pgVector database setup with custom implementation for specialized vector database configuration and initialization.
   *
   * Use cases: Custom vector database setup; Database initialization customization; pgVector configuration; Vector database optimization; Custom database schema
   *
   * AWS: Lambda function code path for custom PostgreSQL vector database setup implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for database setup customization
   **/
  readonly pgVectorDbSetupCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for Aurora workspace creation Lambda function enabling customized workspace provisioning logic. Provides ability to override default Aurora workspace creation with custom implementation for specialized workspace configuration and provisioning requirements.
   *
   * Use cases: Custom workspace creation; Aurora provisioning customization; Workspace configuration; Database workspace setup; Custom provisioning logic
   *
   * AWS: Lambda function code path for custom Aurora workspace creation implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for workspace creation customization
   **/
  readonly createAuroraWorkspaceCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for data import upload handler Lambda function enabling customized data ingestion and processing logic. Provides ability to override default data import handling with custom implementation for specialized data processing and ingestion requirements.
   *
   * Use cases: Custom data ingestion; Upload processing customization; Data import logic; File processing; Custom data handling
   *
   * AWS: Lambda function code path for custom data import upload handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for data import customization
   **/
  readonly dataImportUploadHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for website parser Lambda function enabling customized web content parsing and extraction logic. Provides ability to override default website parsing with custom implementation for specialized web content extraction and processing requirements.
   *
   * Use cases: Custom web parsing; Content extraction customization; Website processing; Web scraping logic; Custom content parsing
   *
   * AWS: Lambda function code path for custom website parser implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for website parsing customization
   **/
  readonly websiteParserCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom Docker file path for file import batch job enabling customized batch processing container configuration. Provides ability to override default batch job container with custom Docker implementation for specialized file processing and batch operation requirements.
   *
   * Use cases: Custom batch processing; Container customization; File processing jobs; Batch operation logic; Custom Docker containers
   *
   * AWS: Docker file path for custom AWS Batch job container implementation
   *
   * Validation: Must be valid Docker file path if provided; optional for batch job customization
   **/
  readonly fileImportBatchJobDockerFilePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for workspace deletion handler Lambda function enabling customized workspace cleanup and resource management logic. Provides ability to override default workspace deletion with custom implementation for specialized cleanup and resource management requirements.
   *
   * Use cases: Custom workspace cleanup; Resource management; Deletion logic customization; Workspace lifecycle; Custom cleanup procedures
   *
   * AWS: Lambda function code path for custom workspace deletion handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for workspace deletion customization
   **/
  readonly deleteWorkspaceHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for WebSocket connection handler Lambda function enabling customized real-time connection management and session handling. Provides ability to override default WebSocket connection handling with custom implementation for specialized real-time communication requirements.
   *
   * Use cases: Custom WebSocket handling; Real-time connection management; Session handling customization; WebSocket logic; Custom real-time features
   *
   * AWS: Lambda function code path for custom WebSocket connection handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for WebSocket customization
   **/
  readonly webSocketConnectionHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for WebSocket authorizer Lambda function enabling customized authentication and authorization for real-time connections. Provides ability to override default WebSocket authorization with custom implementation for specialized security and access control requirements.
   *
   * Use cases: Custom WebSocket authorization; Real-time authentication; Connection security; Access control customization; WebSocket security
   *
   * AWS: Lambda function code path for custom WebSocket authorizer implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for WebSocket authorization customization
   **/
  readonly webSocketAuthorizerFunctionCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for WebSocket incoming message handler Lambda function enabling customized message processing and routing logic. Provides ability to override default incoming message handling with custom implementation for specialized message processing requirements.
   *
   * Use cases: Custom message processing; Incoming message handling; Message routing customization; WebSocket message logic; Custom message features
   *
   * AWS: Lambda function code path for custom WebSocket incoming message handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for message handling customization
   **/
  readonly webSocketIncomingMessageHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for WebSocket outgoing message handler Lambda function enabling customized message delivery and broadcasting logic. Provides ability to override default outgoing message handling with custom implementation for specialized message delivery requirements.
   *
   * Use cases: Custom message delivery; Outgoing message handling; Message broadcasting; WebSocket delivery logic; Custom delivery features
   *
   * AWS: Lambda function code path for custom WebSocket outgoing message handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for message delivery customization
   **/
  readonly webSocketOutgoingMessageHandlerCodePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom code path for LangChain interface handler Lambda function enabling customized AI framework integration and chain orchestration. Provides ability to override default LangChain handling with custom implementation for specialized AI framework integration and chain management requirements.
   *
   * Use cases: Custom LangChain integration; AI framework customization; Chain orchestration; LangChain logic; Custom AI framework features
   *
   * AWS: Lambda function code path for custom LangChain interface handler implementation
   *
   * Validation: Must be valid file path to Lambda function code if provided; optional for LangChain customization
   **/
  readonly langchainInterfaceHandlerCodePath?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Authentication configuration interface for GAIA GenAI providing user authentication and authorization capabilities. Defines authentication properties for GenAI applications including user management, access control, and security configuration for secure AI application access.
 *
 * Use cases: GenAI user authentication; Access control; Security configuration; User management; AI application security; Identity management
 *
 * AWS: GAIA GenAI authentication configuration with user management and access control for secure AI applications
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface AuthProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required authentication type for GAIA GenAI application user access controlling the identity provider and authentication method. Determines how users authenticate to the GenAI platform, supporting email/password, Active Directory, or existing Cognito User Pool integration.
   *
   * Use cases: User authentication method; Identity provider selection; GenAI access control; Authentication strategy
   * AWS: GAIA GenAI authentication type configuration for Cognito User Pool and identity provider integration
   * Validation: Must be one of SupportedAuthTypes enum values: EMAIL_PASSWORD, ACTIVE_DIRECTORY, or EXISTING_POOL
   *   */
  readonly authType: SupportedAuthTypes;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Cognito User Pool domain name for GAIA GenAI application authentication providing custom domain for user sign-in and authentication flows. Enables branded authentication experience with custom domain for GenAI application user access.
   *
   * Use cases: Custom authentication domain; Branded user experience; Authentication URL customization; User sign-in customization
   * AWS: Amazon Cognito User Pool domain configuration for custom authentication endpoints
   * Validation: Must be valid domain name format if provided; optional for authentication customization
   *   */
  readonly cognitoDomain?: string;
  readonly idpSamlMetadataUrlOrFileParamPath?: string;
  readonly idpSamlEmailClaimParamPath?: string;
  readonly oAuthRedirectUrl?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing Cognito User Pool ID for GAIA GenAI application authentication enabling integration with pre-existing user pools. Allows reuse of existing user management infrastructure instead of creating new Cognito resources for GenAI application access.
   *
   * Use cases: Existing user pool integration; User management reuse; Infrastructure consolidation; Centralized authentication
   * AWS: Amazon Cognito User Pool ID reference for existing user pool integration
   * Validation: Must be valid Cognito User Pool ID format if provided; optional for existing pool integration
   *   */
  readonly existingPoolId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing Cognito User Pool app client ID for GAIA GenAI application authentication enabling integration with pre-existing app clients. Allows reuse of existing app client configuration instead of creating new client for GenAI application access.
   *
   * Use cases: Existing app client integration; Client configuration reuse; Authentication consolidation; Centralized app management
   * AWS: Amazon Cognito User Pool app client ID reference for existing client integration
   * Validation: Must be valid Cognito app client ID format if provided; optional for existing client integration
   *   */
  readonly existingPoolClientId?: string;
  readonly existingPoolDomain?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Amazon Bedrock configuration interface for GAIA GenAI with foundation model integration and AI service capabilities. Defines Bedrock properties for GenAI applications including foundation model access, AI service configuration, and model management for enterprise AI solutions.
 *
 * Use cases: Foundation model integration; AI service configuration; Model management; Enterprise AI solutions; Bedrock model access; GenAI capabilities
 *
 * AWS: Amazon Bedrock configuration for GAIA GenAI with foundation model integration and AI service management
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface BedrockProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required boolean flag to enable or disable Amazon Bedrock integration for GAIA GenAI foundation model access. Controls whether Bedrock foundation models will be available for AI workloads and determines if Bedrock-specific resources and permissions will be configured.
   *
   * Use cases: Foundation model enablement; Bedrock service activation; AI capability control; Service integration toggle
   *
   * AWS: Amazon Bedrock service enablement for foundation model access and AI service integration
   *
   * Validation: Must be boolean value; required for Bedrock service configuration
   **/
  readonly enabled: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS region specification for Amazon Bedrock foundation model access and service deployment. Defines the specific AWS region where Bedrock models will be accessed ensuring proper regional model availability and compliance with data residency requirements.
   *
   * Use cases: Regional model access; Data residency compliance; Service region specification; Foundation model availability
   *
   * AWS: AWS region for Amazon Bedrock foundation model access and service deployment
   *
   * Validation: Must be valid SupportedRegion enum value; required for regional Bedrock service access
   **/
  readonly region: SupportedRegion;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for cross-account or cross-region Amazon Bedrock access enabling flexible service integration. Provides custom role specification for Bedrock service access when default service roles are insufficient or when cross-account access is required.
   *
   * Use cases: Cross-account Bedrock access; Custom IAM role specification; Advanced permission management; Cross-region service access
   *
   * AWS: IAM role ARN for Amazon Bedrock service access and cross-account integration
   *
   * Validation: Must be valid IAM role ARN format if provided; optional for custom role specification
   **/
  readonly roleArn?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * GAIA SageMaker LLM model configuration interface for large language model deployment with auto-scaling and instance management. Defines LLM deployment properties including model selection, instance type specification, and auto-scaling configuration for production-ready conversational AI and text generation services in GAIA GenAI applications.
 *
 * Use cases: Production LLM deployment; Auto-scaling LLM services; Conversational AI backends; Text generation endpoints; Custom LLM hosting; GAIA chatbot infrastructure
 *
 * AWS: SageMaker LLM endpoints with auto-scaling configuration for GAIA GenAI large language model hosting with production-grade scaling capabilities
 *
 * Validation: model must be valid SupportedSageMakerModels; instanceType must be valid SageMaker instance type; instance counts must be positive integers with minimum <= initial <= maximum
 */
export interface SagemakerLlmModelConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SageMaker LLM model specification for GAIA GenAI large language model deployment enabling specific model selection and capabilities. Defines the specific large language model that will be deployed on SageMaker for conversational AI, text generation, and natural language processing within the GAIA GenAI application.
   *
   * Use cases: LLM model selection; Conversational AI; Text generation; Natural language processing; Model-specific capabilities; GAIA chatbot backend
   *
   * AWS: Amazon SageMaker LLM model for GAIA GenAI large language model deployment and hosting
   *
   * Validation: Must be valid SupportedSageMakerModels enum value; required for LLM model deployment
   **/
  readonly model: SupportedSageMakerModels;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SageMaker instance type for LLM model hosting enabling compute resource specification and performance optimization. Defines the EC2 instance type that will host the large language model, allowing optimization for model size, performance requirements, and cost considerations.
   *
   * Use cases: Compute resource specification; Performance optimization; Cost optimization; Instance sizing; LLM hosting optimization
   *
   * AWS: Amazon SageMaker instance type for LLM model hosting and compute resource specification
   *
   * Validation: Must be valid SageMaker instance type if provided; optional for instance type specification
   **/
  readonly instanceType?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional initial instance count for SageMaker LLM endpoint enabling deployment scaling and availability configuration. Defines the number of instances that will be initially deployed for the LLM endpoint, providing baseline capacity for conversational AI and text generation workloads.
   *
   * Use cases: Initial capacity planning; Deployment scaling; Availability configuration; Baseline capacity; LLM endpoint sizing
   *
   * AWS: Amazon SageMaker LLM endpoint initial instance count for deployment scaling and capacity planning
   *
   * Validation: Must be positive integer if provided; must be between minimum and maximum instance counts; optional for initial capacity
   **/
  readonly initialInstanceCount?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum instance count for SageMaker LLM endpoint auto-scaling enabling cost optimization and scaling boundaries. Defines the minimum number of instances that will be maintained during auto-scaling operations, providing cost control and minimum availability guarantees.
   *
   * Use cases: Cost optimization; Auto-scaling boundaries; Minimum availability; Scaling limits; Cost control
   *
   * AWS: Amazon SageMaker LLM endpoint minimum instance count for auto-scaling cost optimization and availability control
   *
   * Validation: Must be positive integer if provided; must be less than or equal to initial and maximum counts; optional for auto-scaling configuration
   **/
  readonly minimumInstanceCount?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum instance count for SageMaker LLM endpoint auto-scaling enabling performance scaling and capacity limits. Defines the maximum number of instances that can be deployed during auto-scaling operations, providing performance scaling capabilities while controlling maximum costs.
   *
   * Use cases: Performance scaling; Capacity limits; Auto-scaling configuration; Maximum capacity; Cost control
   *
   * AWS: Amazon SageMaker LLM endpoint maximum instance count for auto-scaling performance optimization and capacity control
   *
   * Validation: Must be positive integer if provided; must be greater than or equal to initial and minimum counts; optional for auto-scaling configuration
   **/
  readonly maximumInstanceCount?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * Large Language Model configuration interface for GAIA GenAI providing LLM integration and management capabilities. Defines LLM properties for GenAI applications including model selection, configuration, and integration for AI-powered conversational and text generation capabilities.
 *
 * Use cases: LLM integration; AI text generation; Conversational AI; Model selection; GenAI capabilities; Language model management
 *
 * AWS: Large Language Model configuration for GAIA GenAI with LLM integration and text generation capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface LlmsProps {
  readonly huggingFaceApiToken?: string;
  readonly sagemaker: SagemakerLlmModelConfig[];
}
/**
 * Q-ENHANCED-INTERFACE
 * Aurora database engine configuration interface for GAIA GenAI with vector database and knowledge storage capabilities. Defines Aurora properties for GenAI applications including vector storage, knowledge base management, and database configuration for AI data persistence and retrieval.
 *
 * Use cases: Vector database storage; Knowledge base management; AI data persistence; Vector search; GenAI data storage; Database configuration
 *
 * AWS: Aurora database configuration for GAIA GenAI with vector storage and knowledge base management capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface AuroraEngineProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to create separate security group for Aurora database in GAIA GenAI deployment enabling isolated network access control. Controls whether Aurora database gets dedicated security group for enhanced network isolation and security management in GenAI vector database operations.
   *
   * Use cases: Network isolation; Security group separation; Database access control; Network security; Aurora isolation
   * AWS: Aurora database security group configuration for network isolation and access control
   * Validation: Boolean value; optional flag defaulting to shared security group if not specified
   *   */
  readonly createSeparateSecurityGroup?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum Aurora Serverless capacity units for GAIA GenAI vector database enabling auto-scaling lower bound control. Defines the minimum compute capacity for Aurora Serverless database to ensure baseline performance for GenAI vector operations and knowledge base queries.
   *
   * Use cases: Auto-scaling configuration; Minimum performance guarantee; Cost optimization; Database capacity management
   * AWS: Aurora Serverless minimum capacity configuration for auto-scaling and performance management
   * Validation: Must be valid Aurora Serverless capacity unit value if provided; optional for auto-scaling configuration
   *   */
  readonly minCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum Aurora Serverless capacity units for GAIA GenAI vector database enabling auto-scaling upper bound control. Defines the maximum compute capacity for Aurora Serverless database to control costs while supporting peak GenAI vector operations and knowledge base queries.
   *
   * Use cases: Auto-scaling configuration; Cost control; Maximum performance limit; Database capacity management
   * AWS: Aurora Serverless maximum capacity configuration for auto-scaling and cost control
   * Validation: Must be valid Aurora Serverless capacity unit value if provided; optional for auto-scaling configuration
   *   */
  readonly maxCapacity?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * Amazon Kendra external configuration interface for GAIA GenAI with enterprise search and knowledge discovery capabilities. Defines Kendra external properties for GenAI applications including external search integration, knowledge discovery, and document search for AI-powered information retrieval.
 *
 * Use cases: Enterprise search integration; Knowledge discovery; Document search; AI information retrieval; External search sources; GenAI search capabilities
 *
 * AWS: Amazon Kendra external configuration for GAIA GenAI with enterprise search and knowledge discovery integration
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface KendraExternalProps {
  readonly name: string;
  readonly kendraId: string;
  readonly region?: SupportedRegion;
  readonly roleArn?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Kendra S3 data source configuration interface for GAIA GenAI with document indexing and search capabilities. Defines Kendra S3 data source properties for GenAI applications including S3 document indexing, search configuration, and content discovery for AI-powered document search.
 *
 * Use cases: S3 document indexing; Document search; Content discovery; AI document retrieval; Search configuration; GenAI document management
 *
 * AWS: Kendra S3 data source configuration for GAIA GenAI with document indexing and search capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface KendraS3DataSourceConfigProps {
  readonly bucketName: string;
  readonly kmsKeyArn: string;
  readonly includedDirectories: string[];
  readonly metadataDirectory?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Kendra search engine configuration interface for GAIA GenAI with intelligent search and knowledge retrieval capabilities. Defines Kendra engine properties for GenAI applications including search configuration, knowledge base integration, and intelligent document retrieval for AI-powered search solutions.
 *
 * Use cases: Intelligent search; Knowledge retrieval; Document search; AI search capabilities; Search engine configuration; GenAI knowledge management
 *
 * AWS: Kendra search engine configuration for GAIA GenAI with intelligent search and knowledge retrieval capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface KendraEngineProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required boolean flag to enable creation of new Kendra index for GAIA GenAI intelligent search capabilities. Controls whether a new Kendra search index will be created for document indexing and intelligent search functionality within the GenAI application.
   *
   * Use cases: Search index creation; Document indexing; Intelligent search setup; Knowledge base creation; Search capability enablement
   *
   * AWS: Amazon Kendra index creation for GAIA GenAI intelligent search and document retrieval capabilities
   *
   * Validation: Must be boolean value; required for Kendra index creation control
   **/
  readonly createIndex: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 data source configuration for Kendra index enabling document ingestion from S3 buckets. Defines S3-based data source settings for automatic document indexing and search capability from S3 storage locations within the GenAI knowledge management system.
   *
   * Use cases: S3 document ingestion; Automatic indexing; Document data sources; Knowledge base population; S3-based search content
   *
   * AWS: Amazon Kendra S3 data source configuration for document ingestion and automatic indexing from S3 storage
   *
   * Validation: Must be valid KendraS3DataSourceConfigProps if provided; optional for S3 data source configuration
   **/
  readonly s3DataSourceConfig?: KendraS3DataSourceConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of external Kendra index configurations for GAIA GenAI enabling integration with existing search indexes. Defines external Kendra indexes that will be integrated with the GenAI application for expanded search capabilities and knowledge retrieval from existing enterprise search infrastructure.
   *
   * Use cases: External index integration; Enterprise search integration; Existing index reuse; Multi-index search; Knowledge federation
   *
   * AWS: Amazon Kendra external index integration for expanded search capabilities and enterprise knowledge federation
   *
   * Validation: Must be array of valid KendraExternalProps if provided; optional for external index integration
   **/
  readonly external?: KendraExternalProps[];
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker RAG configuration interface for GAIA GenAI with Retrieval-Augmented Generation and knowledge integration capabilities. Defines SageMaker RAG properties for GenAI applications including knowledge retrieval, context augmentation, and RAG model configuration for enhanced AI responses.
 *
 * Use cases: Retrieval-Augmented Generation; Knowledge integration; Context augmentation; Enhanced AI responses; RAG model configuration; GenAI knowledge enhancement
 *
 * AWS: SageMaker RAG configuration for GAIA GenAI with Retrieval-Augmented Generation and knowledge integration
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface SagemakerRagProps {
  readonly instanceType?: string;
  readonly minInstanceCount?: number;
  readonly maxInstanceCount?: number;
  readonly initialInstanceCount?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * External knowledge base configuration interface for GAIA GenAI with third-party knowledge integration and external data source capabilities. Defines external knowledge base properties for GenAI applications including external data integration, knowledge source configuration, and third-party knowledge access for AI knowledge.
 *
 * Use cases: External knowledge integration; Third-party data sources; Knowledge source configuration; External data access; AI knowledge; GenAI data integration
 *
 * AWS: External knowledge base configuration for GAIA GenAI with third-party knowledge integration and external data sources
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface ExternalKnowledgeBaseProps {
  readonly name: string;
  readonly kbId: string;
  readonly region?: SupportedRegion;
  readonly roleArn?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Knowledge base configuration interface for GAIA GenAI providing knowledge management and AI knowledge integration capabilities. Defines knowledge base properties for GenAI applications including knowledge storage, retrieval configuration, and AI knowledge management for intelligent information access.
 *
 * Use cases: Knowledge management; AI knowledge integration; Knowledge storage; Information retrieval; Intelligent knowledge access; GenAI knowledge systems
 *
 * AWS: Knowledge base configuration for GAIA GenAI providing knowledge management and AI integration
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface KnowledgeBaseProps {
  readonly external?: ExternalKnowledgeBaseProps[];
}
/**
 * Q-ENHANCED-INTERFACE
 * AI engine configuration interface for GAIA GenAI providing AI processing and model orchestration capabilities. Defines engine properties for GenAI applications including AI model configuration, processing engines, and orchestration for scalable AI solution deployment.
 *
 * Use cases: AI model orchestration; Processing engines; Scalable AI solutions; Model configuration; AI processing capabilities; GenAI engine management
 *
 * AWS: AI engine configuration for GAIA GenAI with model orchestration and processing capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface EngineProps {
  readonly sagemaker?: SagemakerRagProps;
  readonly aurora?: AuroraEngineProps;
  readonly kendra?: KendraEngineProps;
  readonly knowledgeBase?: KnowledgeBaseProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * AI model configuration interface for GAIA GenAI providing model management and deployment capabilities. Defines model properties for GenAI applications including model selection, configuration parameters, and deployment settings for AI model integration and management.
 *
 * Use cases: AI model management; Model deployment; Model configuration; AI model integration; Model selection; GenAI model orchestration
 *
 * AWS: AI model configuration for GAIA GenAI providing model management and deployment capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface ModelProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required model provider specification for GAIA GenAI model deployment enabling provider-specific model integration. Defines the AI model provider that will be used for model deployment and inference, supporting various AI service providers and model ecosystems within the GenAI application.
   *
   * Use cases: Model provider selection; Provider-specific integration; Model ecosystem choice; AI service provider configuration; Model deployment strategy
   *
   * AWS: AI model provider configuration for GAIA GenAI model deployment and provider-specific integration
   *
   * Validation: Must be valid ModelProvider enum value; required for model provider specification
   **/
  readonly provider: ModelProvider;
  /**
   * Q-ENHANCED-PROPERTY
   * Required model name identifier for GAIA GenAI model deployment enabling specific model selection and configuration. Defines the specific AI model that will be deployed and used for inference within the GenAI application, providing model-specific capabilities and performance characteristics.
   *
   * Use cases: Model selection; Specific model deployment; Model identification; AI capability configuration; Model-specific features
   *
   * AWS: AI model name for GAIA GenAI model deployment and specific model selection
   *
   * Validation: Must be valid model name string; required for model identification and deployment
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required vector dimensions specification for GAIA GenAI model embedding configuration enabling vector-based AI operations. Defines the dimensionality of vector embeddings produced by the model for semantic search, similarity matching, and vector-based AI operations within the GenAI application.
   *
   * Use cases: Vector embedding configuration; Semantic search setup; Similarity matching; Vector operations; Embedding dimensionality; AI vector processing
   *
   * AWS: AI model vector dimensions for GAIA GenAI embedding configuration and vector-based operations
   *
   * Validation: Must be positive integer; required for vector embedding configuration
   **/
  readonly dimensions: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to designate this model as the default for GAIA GenAI operations enabling default model selection. Controls whether this model will be used as the default choice for AI operations when no specific model is requested, providing fallback model configuration.
   *
   * Use cases: Default model selection; Fallback model configuration; Primary model designation; Model prioritization; Default AI operations
   *
   * AWS: AI model default designation for GAIA GenAI default model selection and fallback configuration
   *
   * Validation: Must be boolean value if provided; optional for default model designation
   **/
  readonly isDefault?: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * Cross-encoder model configuration interface for GAIA GenAI with semantic similarity and ranking capabilities. Defines cross-encoder model properties for GenAI applications including similarity scoring, document ranking, and semantic matching for enhanced AI search and retrieval.
 *
 * Use cases: Semantic similarity; Document ranking; Similarity scoring; Semantic matching; AI search enhancement; GenAI retrieval optimization
 *
 * AWS: Cross-encoder model configuration for GAIA GenAI with semantic similarity and ranking capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface CrossEncoderModelProps {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly isDefault?: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * RAG configuration interface for GAIA GenAI with Retrieval-Augmented Generation and knowledge integration capabilities. Defines RAG properties for GenAI applications including retrieval engines, embedding models, and knowledge augmentation for enhanced AI response generation.
 *
 * Use cases: Retrieval-Augmented Generation; Knowledge augmentation; Enhanced AI responses; Retrieval engines; Embedding models; GenAI knowledge enhancement
 *
 * AWS: RAG configuration for GAIA GenAI with Retrieval-Augmented Generation and knowledge integration
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface RagProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required retrieval engine configuration for GAIA GenAI RAG implementation enabling knowledge retrieval and document search capabilities. Defines the retrieval engines that will be used for knowledge augmentation including search engines, vector databases, and knowledge bases for enhanced AI response generation.
   *
   * Use cases: Knowledge retrieval; Document search; Retrieval engine configuration; Knowledge augmentation; RAG implementation; Search capabilities
   *
   * AWS: Retrieval engine configuration for GAIA GenAI RAG with knowledge retrieval and document search capabilities
   *
   * Validation: Must be valid EngineProps configuration; required for RAG retrieval engine setup
   **/
  readonly engines: EngineProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of embedding models for GAIA GenAI RAG vector processing enabling semantic search and similarity matching. Defines the embedding models that will be used for converting text to vector representations for semantic search, document similarity, and knowledge retrieval operations.
   *
   * Use cases: Vector embeddings; Semantic search; Document similarity; Text vectorization; Knowledge matching; RAG vector processing
   *
   * AWS: Embedding models for GAIA GenAI RAG vector processing and semantic search capabilities
   *
   * Validation: Must be array of valid ModelProps; required for RAG embedding model configuration
   **/
  readonly embeddingsModels: ModelProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of cross-encoder models for GAIA GenAI RAG semantic similarity and ranking capabilities. Defines cross-encoder models that will be used for document ranking, relevance scoring, and semantic similarity assessment to improve retrieval quality and response accuracy.
   *
   * Use cases: Document ranking; Relevance scoring; Semantic similarity; Retrieval quality; Response accuracy; RAG ranking optimization
   *
   * AWS: Cross-encoder models for GAIA GenAI RAG semantic similarity and document ranking capabilities
   *
   * Validation: Must be array of valid CrossEncoderModelProps; required for RAG cross-encoder model configuration
   **/
  readonly crossEncoderModels: CrossEncoderModelProps[];
}
/**
 * Q-ENHANCED-INTERFACE
 * Backend API configuration interface for GAIA GenAI providing API management and service integration capabilities. Defines backend API properties for GenAI applications including REST API configuration, WebSocket management, and domain configuration for scalable AI service deployment.
 *
 * Use cases: API management; Service integration; REST API configuration; WebSocket management; Scalable AI services; GenAI backend orchestration
 *
 * AWS: Backend API configuration for GAIA GenAI providing API management and service integration
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
export interface BackendApisProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required custom domain name for the GAIA REST API endpoint enabling branded API access and professional service deployment. Defines the fully qualified domain name that will be used for REST API Gateway custom domain configuration providing consistent API endpoint branding.
   *
   * Use cases: Custom API branding; Professional API endpoints; Domain-based API access; REST API Gateway configuration
   *
   * AWS: API Gateway custom domain name for REST API endpoint configuration and Route53 DNS management
   *
   * Validation: Must be valid fully qualified domain name; required for custom domain API configuration
   **/
  readonly restApiDomainName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Route53 hosted zone name for DNS management and domain resolution of GAIA API endpoints. Defines the hosted zone that will manage DNS records for both REST and WebSocket API custom domains enabling proper domain resolution and SSL certificate validation.
   *
   * Use cases: DNS management; Domain resolution; SSL certificate validation; Route53 hosted zone configuration
   *
   * AWS: Route53 hosted zone name for DNS record management and domain resolution
   *
   * Validation: Must be valid hosted zone name; required for DNS management and domain resolution
   **/
  readonly hostedZoneName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required custom domain name for the GAIA WebSocket API endpoint enabling real-time communication and interactive AI experiences. Defines the fully qualified domain name for WebSocket API Gateway custom domain configuration supporting real-time GenAI interactions.
   *
   * Use cases: Real-time AI communication; WebSocket API branding; Interactive GenAI experiences; WebSocket API Gateway configuration
   *
   * AWS: API Gateway WebSocket custom domain name for real-time communication endpoint configuration
   *
   * Validation: Must be valid fully qualified domain name; required for WebSocket custom domain configuration
   **/
  readonly socketApiDomainName: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Concurrency configuration interface for GAIA GenAI providing performance optimization and scaling capabilities. Defines concurrency properties for GenAI applications including Lambda concurrency limits, API throttling, and performance tuning for scalable AI workload management.
 *
 * Use cases: Performance optimization; Scaling capabilities; Lambda concurrency; API throttling; Performance tuning; GenAI workload management
 *
 * AWS: Concurrency configuration for GAIA GenAI with performance optimization and scaling capabilities
 *
 * Validation: Configuration must be valid for GenAI deployment; properties must conform to GAIA and AWS AI service requirements
 */
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
  /**
   * Q-ENHANCED-PROPERTY
   * Backend API configuration for GAIA GenAI with REST API and WebSocket domain management. Defines API endpoint configuration including custom domain names and hosted zone settings for scalable GenAI service deployment with professional domain management.
   *
   * Use cases: Custom API domains; Professional GenAI endpoints; Domain management; API Gateway configuration; Branded AI services
   *
   * AWS: AWS API Gateway custom domain configuration and Route53 hosted zone management
   *
   * Validation: Must be valid BackendApisProps configuration; domain names must be valid DNS names; optional configuration
   **/
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
