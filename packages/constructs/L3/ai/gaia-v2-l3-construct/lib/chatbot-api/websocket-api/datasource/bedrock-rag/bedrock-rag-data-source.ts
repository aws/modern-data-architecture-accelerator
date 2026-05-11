import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, LayerVersion, Runtime, RuntimeFamily } from 'aws-cdk-lib/aws-lambda';
import { CHAT_HISTORY_ATTRIBUTES } from '../../../chat-history/chat-history';
import { EventApi } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { Effect, IRole, ManagedPolicy, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { ISecurityGroup, ISubnet, IVpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction } from '@aws-mdaa/lambda-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  addDataSourceToChannelNamespace,
  addNagSuppressionsForDataSource,
  addNagSuppressionsRuleForAppSyncRole,
  addNagSuppressionsRuleForDataSourceLambdaFunction,
} from '../utils/utils';
import { createBedrockMarketplacePermissions } from '../../../../utils/bedrock-marketplace-permissions';
import {
  DEFAULT_INTERRUPTION_CACHE_TTL_SECONDS,
  DEFAULT_INTERRUPTION_FALLBACK_ENABLED,
  DEFAULT_INTERRUPTION_FALLBACK_MESSAGE,
  DEFAULT_LAMBDA_MEMORY_SIZE_MB,
  DEFAULT_LAMBDA_TIMEOUT_SECONDS,
} from '../../../../constants';
import { getVpcArn } from '../../../../utils/vpc-utils';

/**
 * RAG data source using Bedrock Knowledge Base for document-based question
 * answering with citation support. Configures the foundation model used to
 * generate answers, the Lambda role that executes the namespace handler, and
 * retrieval-time parameters such as the number of knowledge base results and
 * the prompt and orchestration templates.
 */
export interface BedrockRagDataSourceProps {
  /** Bedrock model ID for generation (e.g., 'anthropic.claude-3-sonnet-20240229-v1:0') */
  readonly modelId: string;
  /** Custom prompt template for generation */
  readonly promptTemplate?: string;
  /** Maximum tokens for inference */
  readonly inferenceMaxTokens?: number;
  /** Temperature for inference (0.0-1.0) */
  readonly inferenceTemperature?: number;
  /** Top-p for inference (0.0-1.0) */
  readonly inferenceTopP?: number;
  /** Number of results to retrieve from knowledge base */
  readonly kbNumberOfResults?: number;
  /** Bedrock Guardrail ID for content filtering */
  readonly guardrailId?: string;
  /** KMS key ARN for Guardrail encryption */
  readonly guardrailKmsKeyArn?: string;
  /** Guardrail version to use */
  readonly guardrailVersion?: string;
  /** Whether to display inline citations in responses */
  readonly displayInlineCitations?: boolean;
  /** Timeout for the Lambda function in seconds. If unspecified, 10 minutes is used (600 seconds) */
  readonly lambdaTimeoutInSeconds?: number;
  /** Memory allocation for the Lambda function in MB. If undefined, 1024MB is used. */
  readonly lambdaMemorySize?: number;
  /** Lambda architecture (ARM64 or x86_64). If undefined, Architecture.X86_64 is used */
  readonly lambdaArchitecture?: 'ARM_64' | 'X86_64';
  /** Python runtime version. If undefined, Runtime.PYTHON_3_13 is used. */
  readonly pythonRuntime?: string;
  /** Reserved concurrent executions for Lambda */
  readonly reservedConcurrentExecutions?: number;
  /** Provisioned concurrent executions for Lambda */
  readonly provisionedConcurrentExecutions?: number;
  /** IAM role reference for Lambda execution */
  readonly lambdaRole: MdaaRoleRef;

  // Orchestration-specific configuration for advanced RAG workflows
  /** Maximum tokens for orchestration inference */
  readonly orchestrationInferenceMaxTokens?: number;
  /** Temperature for orchestration inference */
  readonly orchestrationInferenceTemperature?: number;
  /** Top-p for orchestration inference */
  readonly orchestrationInferenceTopP?: number;
  /** Stop sequences for orchestration inference */
  readonly orchestrationInferenceStopSequences?: string[];
  /** Performance vs latency trade-off setting. (e.g. : standard | optimized)  */
  readonly orchestrationPerformanceLatency?: string;
  /** Custom orchestration prompt template */
  readonly orchestrationPromptTemplate?: string;
  /** Query transformation type for orchestration. (e.g. : QUERY_DECOMPOSITION) */
  readonly orchestrationQueryTransformationType?: string;
}

interface BedrockRagDataSourceConstructProps extends BedrockRagDataSourceProps, MdaaL3ConstructProps {
  /** AppSync Event API for WebSocket communication */
  readonly eventApi: EventApi;
  /** Bedrock Knowledge Base ID for RAG retrieval */
  readonly knowledgeBaseId: string;
  /** DynamoDB table for chat sessions */
  readonly sessionsTable: dynamodb.Table;
  /** Chat retention period in minutes for dynamodb  */
  readonly chatRetentionInMinutes?: number;
  /** VPC for Lambda deployment */
  readonly vpc: IVpc;
  /** Application subnets for Lambda deployment */
  readonly appSubnets: ISubnet[];
  /** Security group for Lambda functions */
  readonly appSecurityGroup: ISecurityGroup;
  /** AWS account ID that owns the VPC. Required when using AWS RAM shared VPCs from a different account. */
  readonly vpcOwnerAccountId?: string;
  /** Lambda layers for dependencies */
  readonly layers: [LayerVersion];
  /** Service interruption table for status management */
  readonly serviceInterruptionTable: MdaaDDBTable;
  /** Lambda handler log level (ERROR, WARNING, INFO, DEBUG). Defaults to WARNING. */
  readonly lambdaLogLevel?: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
}

/**
 * Bedrock RAG Data Source construct for Retrieval-Augmented Generation.
 *
 * This construct creates:
 * - AppSync data source for Bedrock RAG operations
 * - Lambda function that handles RetrieveAndGenerate API calls
 * - IAM roles and policies for Bedrock and Knowledge Base access
 * - Custom prompt template handling and deployment
 * - Guardrail integration for content filtering
 * - WebSocket integration for real-time responses
 *
 * The data source provides:
 * - RAG capabilities using Bedrock Knowledge Bases
 * - Custom prompt templates for generation
 * - Configurable inference parameters
 * - Citation support for source attribution
 * - Guardrail integration for responsible AI
 * - Advanced orchestration for complex workflows
 *
 * Use cases:
 * - Document-based question answering
 * - Knowledge base search and summarization
 * - Context-aware conversations with citations
 * - Enterprise knowledge retrieval
 */
export class BedrockRagDataSource extends MdaaL3Construct {
  private readonly props: BedrockRagDataSourceConstructProps;

  constructor(scope: Construct, id: string, props: BedrockRagDataSourceConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Warn if no guardrail is configured - recommended for production deployments
    if (!props.guardrailId) {
      cdk.Annotations.of(this).addWarningV2(
        '@aws-mdaa/gaia-v2:noGuardrailConfigured',
        'No Bedrock Guardrail configured for RAG data source. ' +
          'Guardrails provide content filtering and PII protection. ' +
          'Consider configuring a guardrail via the bedrock-builder module for production deployments.',
      );
    }

    const functionName = 'bedrock-rag-handler';

    // Create AppSync data source for Bedrock RAG operations
    const dataSource = props.eventApi.addLambdaDataSource(
      'bedrock-rag-ds',
      this.createBedrockRagDataSource(functionName, props.eventApi, props.knowledgeBaseId),
      {
        name: 'Bedrock_RAG_DataSource',
        description:
          "A specialized data source that leverages Amazon Bedrock's RetrieveAndGenerate capability to retrieve relevant information from knowledge bases and generate\n" +
          'appropriate AI responses based on the retrieved content.',
      },
    );

    // Apply CDK Nag suppressions for AppSync role
    addNagSuppressionsRuleForAppSyncRole(dataSource);

    // Add data source to AppSync channel namespace for WebSocket routing
    addDataSourceToChannelNamespace('bedrock-rag', props.eventApi, dataSource, 'bedrock-rag');
  }

  /**
   * Creates Lambda deployment package with conditional custom prompt templates
   * This method handles the dynamic inclusion of custom templates in the Lambda package
   *
   * Uses CDK's bundling feature to inject custom templates at synthesis time,
   * ensuring the asset is properly staged regardless of when synthesis occurs.
   */
  private createLambdaCodeWithConditionalTemplates(props: BedrockRagDataSourceProps): lambda.Code {
    const hasCustomPrompts = props.promptTemplate || props.orchestrationPromptTemplate;
    const originalCodePath = path.join(__dirname, './function');

    if (!hasCustomPrompts) {
      // No custom templates - use original code directly
      return lambda.Code.fromAsset(originalCodePath);
    }

    // Use CDK's bundling to inject custom templates at synthesis time
    // This ensures the asset is created correctly regardless of when synthesis happens
    return lambda.Code.fromAsset(originalCodePath, {
      bundling: {
        // Use local bundling to copy files and add templates
        local: {
          tryBundle(outputDir: string): boolean {
            // Copy all original function files to output directory
            fs.cpSync(originalCodePath, outputDir, { recursive: true });

            // Add custom prompt template if provided
            if (props.promptTemplate) {
              fs.writeFileSync(path.join(outputDir, 'prompt_template.txt'), props.promptTemplate, 'utf8');
            }

            // Add custom orchestration prompt template if provided
            if (props.orchestrationPromptTemplate) {
              fs.writeFileSync(
                path.join(outputDir, 'orchestration_prompt_template.txt'),
                props.orchestrationPromptTemplate,
                'utf8',
              );
            }

            return true;
          },
        },
        // Fallback Docker image (required by CDK but won't be used since local bundling succeeds)
        image: cdk.DockerImage.fromRegistry('alpine'),
      },
    });
  }

  /**
   * Creates the main Bedrock RAG data source with all necessary permissions and configurations
   */
  private createBedrockRagDataSource(functionName: string, eventApi: EventApi, kbId: string) {
    // Resolve IAM role and configure permissions
    const apiHandlerRole = this.resolveAndConfigureLambdaRole(functionName, kbId);

    // Create the Lambda function with all configurations
    const websocketHandler = this.createBedrockRagDataSourceLambda(functionName, apiHandlerRole, eventApi, kbId);

    // Grant DynamoDB permissions
    this.props.sessionsTable.grantReadWriteData(apiHandlerRole);
    this.props.serviceInterruptionTable.grantReadData(apiHandlerRole);

    // Apply CDK Nag suppressions
    addNagSuppressionsRuleForDataSourceLambdaFunction(websocketHandler, this.props.reservedConcurrentExecutions);
    addNagSuppressionsForDataSource(this);

    // Configure provisioned concurrency if specified
    return this.configureProvisionedConcurrency(websocketHandler);
  }

  /**
   * Resolves the Lambda execution role and attaches all required IAM policies
   */
  private resolveAndConfigureLambdaRole(functionName: string, kbId: string): IRole {
    const lambdaRoleResolved = this.props.roleHelper.resolveRoleRefWithRefId(this.props.lambdaRole, 'bedrock-rag-role');
    const apiHandlerRole = Role.fromRoleArn(this, 'bedrock-rag-lambda-role', lambdaRoleResolved.arn());

    this.addVpcAccessPolicy(apiHandlerRole);
    this.addCloudWatchLoggingPolicy(apiHandlerRole, functionName);
    this.addGuardrailPolicyIfConfigured(apiHandlerRole);
    this.addKnowledgeBaseAccessPolicy(apiHandlerRole, kbId);
    this.addMarketplaceAccessPolicy(apiHandlerRole);

    return apiHandlerRole;
  }

  /**
   * Adds VPC access permissions for Lambda ENI management.
   * Resource '*' is required per AWS documentation - ENI ARN is not known until runtime.
   * @see https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-permissions
   * @see https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
   */
  private addVpcAccessPolicy(role: IRole): void {
    const vpcArn = getVpcArn(this, this.props.vpc, this.props.vpcOwnerAccountId);

    const vpcAccessPolicy = new ManagedPolicy(this, 'BedrockRagLambdaVpcAccessPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface'],
          resources: ['*'],
          effect: Effect.ALLOW,
          conditions: {
            StringEquals: {
              'ec2:Vpc': vpcArn,
            },
          },
        }),
        // DescribeNetworkInterfaces does not support condition keys, must be separate statement
        new PolicyStatement({
          actions: ['ec2:DescribeNetworkInterfaces'],
          resources: ['*'],
          effect: Effect.ALLOW,
        }),
      ],
    });
    role.addManagedPolicy(vpcAccessPolicy);
  }

  /**
   * Adds CloudWatch Logs permissions for Lambda function logging
   */
  private addCloudWatchLoggingPolicy(role: IRole, functionName: string): void {
    const cloudWatchAccessPolicy = new ManagedPolicy(this, 'BedrockRagLambdaCloudWatchAccessPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:CreateLogGroup'],
          resources: [
            `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${
              Stack.of(this).account
            }:log-group:/aws/lambda/${this.props.naming.resourceName(functionName)}*`,
          ],
          effect: Effect.ALLOW,
        }),
      ],
    });
    role.addManagedPolicy(cloudWatchAccessPolicy);
  }

  /**
   * Adds Bedrock Guardrail permissions if a guardrail is configured
   */
  private addGuardrailPolicyIfConfigured(role: IRole): void {
    if (this.props.guardrailId === undefined) {
      return;
    }

    const bedrockGuardrailAccessPolicy = new ManagedPolicy(this, 'BedrockRagLambdaGuardRailAccessPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['bedrock:ApplyGuardrail'],
          resources: [
            `arn:${Stack.of(this).partition}:bedrock:${Stack.of(this).region}:${Stack.of(this).account}:guardrail/${
              this.props.guardrailId
            }`,
          ],
          effect: Effect.ALLOW,
        }),
        // Add KMS permissions for Guardrail if KMS key is specified
        ...(this.props.guardrailKmsKeyArn
          ? [
              new PolicyStatement({
                actions: ['kms:Decrypt'],
                resources: [this.props.guardrailKmsKeyArn],
                effect: Effect.ALLOW,
              }),
            ]
          : []),
      ],
    });
    role.addManagedPolicy(bedrockGuardrailAccessPolicy);
  }

  /**
   * Adds Knowledge Base access permissions for RAG operations
   */
  private addKnowledgeBaseAccessPolicy(role: IRole, kbId: string): void {
    const knowledgeBaseAccessPolicy = new ManagedPolicy(this, 'BedrockRagLambdaKnowledgeBaseAccessPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
          resources: [
            `arn:${Stack.of(this).partition}:bedrock:${Stack.of(this).region}:${
              Stack.of(this).account
            }:knowledge-base/${kbId}`,
          ],
          effect: Effect.ALLOW,
        }),
      ],
    });
    role.addManagedPolicy(knowledgeBaseAccessPolicy);
  }

  /**
   * Adds AWS Marketplace permissions for Bedrock model access (required for automatic model approval)
   */
  private addMarketplaceAccessPolicy(role: IRole): void {
    const marketplaceAccessPolicy = new ManagedPolicy(this, 'BedrockRagLambdaMarketplaceAccessPolicy', {
      statements: [createBedrockMarketplacePermissions()],
    });
    role.addManagedPolicy(marketplaceAccessPolicy);
  }

  /**
   * Configures provisioned concurrency for the Lambda function if specified
   */
  private configureProvisionedConcurrency(handler: MdaaLambdaFunction): MdaaLambdaFunction | lambda.Alias {
    if (this.props.provisionedConcurrentExecutions === undefined) {
      return handler;
    }

    return new lambda.Alias(this, 'WebsocketHandlerAlias', {
      aliasName: 'live',
      version: handler.currentVersion,
      provisionedConcurrentExecutions: this.props.provisionedConcurrentExecutions,
    });
  }

  /**
   * Creates the Lambda function for Bedrock RAG processing with comprehensive configuration
   */
  private createBedrockRagDataSourceLambda(
    functionName: string,
    apiHandlerRole: IRole,
    eventApi: EventApi,
    kbId: string,
  ) {
    // Build environment configuration with conditional properties extracted for readability
    const chatRetentionConfig = this.props.chatRetentionInMinutes && {
      TTL_COLUMN_NAME: CHAT_HISTORY_ATTRIBUTES.TTL,
      CHAT_RETENTION_IN_MINUTES: this.props.chatRetentionInMinutes.toString(),
    };

    const inferenceConfig = {
      ...(this.props.inferenceMaxTokens && { INFERENCE_MAX_TOKENS: this.props.inferenceMaxTokens.toString() }),
      ...(this.props.inferenceTemperature && { INFERENCE_TEMPERATURE: this.props.inferenceTemperature.toString() }),
      ...(this.props.inferenceTopP && { INFERENCE_TOP_P: this.props.inferenceTopP.toString() }),
      ...(this.props.kbNumberOfResults && { KB_NUMBER_OF_RESULTS: this.props.kbNumberOfResults.toString() }),
    };

    const guardrailConfig = {
      ...(this.props.guardrailId && { GUARDRAIL_ID: this.props.guardrailId }),
      ...(this.props.guardrailVersion && { GUARDRAIL_VERSION: this.props.guardrailVersion }),
    };

    const orchestrationConfig = {
      ...(this.props.orchestrationInferenceMaxTokens && {
        ORCHESTRATION_INFERENCE_MAX_TOKENS: this.props.orchestrationInferenceMaxTokens.toString(),
      }),
      ...(this.props.orchestrationInferenceTemperature && {
        ORCHESTRATION_INFERENCE_TEMPERATURE: this.props.orchestrationInferenceTemperature.toString(),
      }),
      ...(this.props.orchestrationInferenceTopP && {
        ORCHESTRATION_INFERENCE_TOP_P: this.props.orchestrationInferenceTopP.toString(),
      }),
      ...(this.props.orchestrationInferenceStopSequences && {
        ORCHESTRATION_INFERENCE_STOP_SEQUENCES: JSON.stringify(this.props.orchestrationInferenceStopSequences),
      }),
      ...(this.props.orchestrationPerformanceLatency && {
        ORCHESTRATION_PERFORMANCE_LATENCY: this.props.orchestrationPerformanceLatency,
      }),
      ...(this.props.orchestrationQueryTransformationType && {
        ORCHESTRATION_QUERY_TRANSFORMATION_TYPE: this.props.orchestrationQueryTransformationType,
      }),
    };

    return new MdaaLambdaFunction(this, 'BedrockRagHandler', {
      functionName: functionName,
      naming: this.props.naming,
      role: apiHandlerRole,
      createParams: true,
      createOutputs: false,
      code: this.createLambdaCodeWithConditionalTemplates(this.props),
      handler: 'index.handler',
      runtime: this.props.pythonRuntime
        ? new Runtime(this.props.pythonRuntime, RuntimeFamily.PYTHON)
        : Runtime.PYTHON_3_13,
      architecture: this.props.lambdaArchitecture === 'ARM_64' ? Architecture.ARM_64 : Architecture.X86_64,
      timeout: cdk.Duration.seconds(this.props.lambdaTimeoutInSeconds ?? DEFAULT_LAMBDA_TIMEOUT_SECONDS),
      memorySize: this.props.lambdaMemorySize ?? DEFAULT_LAMBDA_MEMORY_SIZE_MB,
      tracing: lambda.Tracing.ACTIVE,
      vpc: this.props.vpc,
      securityGroups: [this.props.appSecurityGroup],
      vpcSubnets: { subnets: this.props.appSubnets },
      reservedConcurrentExecutions: this.props.reservedConcurrentExecutions,
      layers: this.props.layers,
      environment: {
        // WebSocket and session configuration
        WEB_SOCKET_URL: `https://${eventApi.httpDns}/event`,
        SESSION_TABLE_NAME: this.props.sessionsTable.tableName,
        ...chatRetentionConfig,

        // Model and Knowledge Base configuration
        MODEL_ID: this.props.modelId,
        KNOWLEDGE_BASE_ID: kbId,
        HAS_CUSTOM_PROMPT_TEMPLATE: String(!!this.props.promptTemplate),
        HAS_CUSTOM_ORCHESTRATION_PROMPT_TEMPLATE: String(!!this.props.orchestrationPromptTemplate),

        // Optional configurations
        ...inferenceConfig,
        ...guardrailConfig,
        DISPLAY_INLINE_CITATIONS: String(this.props.displayInlineCitations ?? false),
        ...orchestrationConfig,

        // Service interruption configuration
        SERVICE_INTERRUPTION_TABLE_NAME: this.props.serviceInterruptionTable.tableName,
        INTERRUPTION_CACHE_TTL: DEFAULT_INTERRUPTION_CACHE_TTL_SECONDS,
        SERVICE_INTERRUPTION_FALLBACK_ENABLED: DEFAULT_INTERRUPTION_FALLBACK_ENABLED,
        SERVICE_INTERRUPTION_FALLBACK_MESSAGE: DEFAULT_INTERRUPTION_FALLBACK_MESSAGE,

        // Logging configuration
        LOG_LEVEL: this.props.lambdaLogLevel ?? 'WARNING',
      },
    });
  }
}
