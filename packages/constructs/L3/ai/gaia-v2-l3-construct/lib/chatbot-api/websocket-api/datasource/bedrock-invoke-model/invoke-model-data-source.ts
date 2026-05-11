import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, LayerVersion, Runtime, RuntimeFamily } from 'aws-cdk-lib/aws-lambda';
import { CHAT_HISTORY_ATTRIBUTES } from '../../../chat-history/chat-history';
import { EventApi } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { Effect, ManagedPolicy, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { ISecurityGroup, ISubnet, IVpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction } from '@aws-mdaa/lambda-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import * as path from 'node:path';
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

export interface InvokeModelDataSourceProps {
  /** Bedrock model ID to invoke (e.g., 'anthropic.claude-3-sonnet-20240229-v1:0') */
  readonly modelId: string;
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
}

interface InvokeModelDataSourceConstructProps extends InvokeModelDataSourceProps, MdaaL3ConstructProps {
  /** AppSync Event API for WebSocket communication */
  readonly eventApi: EventApi;
  /** DynamoDB table for chat sessions */
  readonly sessionsTable: dynamodb.Table;
  /** Chat retention period in minutes for dynamodb*/
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
 * Bedrock Invoke Model Data Source construct for direct LLM interactions.
 *
 * This construct creates:
 * - AppSync data source for Bedrock model invocation
 * - Lambda function that handles direct Bedrock API calls
 * - IAM roles and policies for Bedrock access
 * - WebSocket integration for real-time responses
 * - Service interruption handling
 *
 * The data source provides:
 * - Direct access to Bedrock foundation models
 * - Streaming responses via invokeModelWithResponseStream
 * - Real-time chat capabilities through WebSocket
 * - Session management and chat history storage
 * - Service interruption awareness and fallback handling
 */
export class InvokeModelDataSource extends MdaaL3Construct {
  private readonly props: InvokeModelDataSourceConstructProps;

  constructor(scope: Construct, id: string, props: InvokeModelDataSourceConstructProps) {
    super(scope, id, props);
    this.props = props;

    const functionName = 'bedrock-invoke-model';

    // Create AppSync data source for Bedrock model invocation
    const dataSource = props.eventApi.addLambdaDataSource(
      'bedrock-invoke-model-ds',
      this.createInvokeModelDataSourceLambda(functionName, props.eventApi),
      {
        name: 'Bedrock_Invoke_Model',
        description:
          "A specialized data source that leverages Amazon Bedrock's invokeModelWithResponseStream capability to retrieve relevant information directly from bedrock",
      },
    );

    // Apply CDK Nag suppressions for AppSync role
    addNagSuppressionsRuleForAppSyncRole(dataSource);

    // Add data source to AppSync channel namespace for WebSocket routing
    addDataSourceToChannelNamespace('bedrock-invoke-model', props.eventApi, dataSource, 'bedrock-invoke-model');
  }

  /**
   * Creates the Lambda function that handles Bedrock model invocation
   */
  private createInvokeModelDataSourceLambda(functionName: string, eventApi: EventApi) {
    // Resolve IAM role reference for Lambda execution
    const lambdaRoleResolved = this.props.roleHelper.resolveRoleRefWithRefId(
      this.props.lambdaRole,
      'bedrock-invoke-model-role',
    );
    const apiHandlerRole = Role.fromRoleArn(this, 'bedrock-invoke-model-lambda-role', lambdaRoleResolved.arn());

    // Add VPC access permissions for Lambda in VPC
    // IMPORTANT: Resource '*' is required per AWS documentation. These EC2 actions do not support
    // resource-level permissions because the ENI ARN is not known until Lambda creates it at runtime.
    // This matches the AWS managed policy AWSLambdaVPCAccessExecutionRole which also uses Resource: '*'.
    // We add ec2:Vpc condition to scope permissions to the specific VPC as a security mitigation.
    // @see https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-permissions
    // @see https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
    const vpcArn = getVpcArn(this, this.props.vpc, this.props.vpcOwnerAccountId);

    const vpcAccessPolicy = new ManagedPolicy(this, 'BedrockInvokeModelLambdaVpcAccessPolicy', {
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
    apiHandlerRole.addManagedPolicy(vpcAccessPolicy);

    // Add CloudWatch logging permissions
    const cloudWatchAccessPolicy = new ManagedPolicy(this, 'BedrockInvokeModelLambdaCloudWatchAccessPolicy', {
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
    apiHandlerRole.addManagedPolicy(cloudWatchAccessPolicy);

    // Add AWS Marketplace permissions for Bedrock model access
    // Required for automatic model approval on first invocation
    const marketplaceAccessPolicy = new ManagedPolicy(this, 'BedrockInvokeModelLambdaMarketplaceAccessPolicy', {
      statements: [createBedrockMarketplacePermissions()],
    });
    apiHandlerRole.addManagedPolicy(marketplaceAccessPolicy);

    // Build environment configuration with conditional properties extracted for readability
    const chatRetentionConfig = this.props.chatRetentionInMinutes && {
      TTL_COLUMN_NAME: CHAT_HISTORY_ATTRIBUTES.TTL,
      CHAT_RETENTION_IN_MINUTES: this.props.chatRetentionInMinutes.toString(),
    };

    // Create Lambda function for Bedrock model invocation
    const websocketHandler = new MdaaLambdaFunction(this, 'BedrockRagHandler', {
      functionName: functionName,
      naming: this.props.naming,
      role: apiHandlerRole,
      createParams: true,
      createOutputs: false,
      code: lambda.Code.fromAsset(path.join(__dirname, './function')),
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

        // Bedrock model configuration
        MODEL_ID: this.props.modelId,

        // Service interruption configuration
        SERVICE_INTERRUPTION_TABLE_NAME: this.props.serviceInterruptionTable.tableName,
        INTERRUPTION_CACHE_TTL: DEFAULT_INTERRUPTION_CACHE_TTL_SECONDS,
        SERVICE_INTERRUPTION_FALLBACK_ENABLED: DEFAULT_INTERRUPTION_FALLBACK_ENABLED,
        SERVICE_INTERRUPTION_FALLBACK_MESSAGE: DEFAULT_INTERRUPTION_FALLBACK_MESSAGE,

        // Logging configuration
        LOG_LEVEL: this.props.lambdaLogLevel ?? 'WARNING',
      },
    });

    // Grant DynamoDB permissions
    this.props.sessionsTable.grantReadWriteData(apiHandlerRole);
    this.props.serviceInterruptionTable.grantReadData(apiHandlerRole);

    // Apply CDK Nag suppressions
    addNagSuppressionsRuleForDataSourceLambdaFunction(websocketHandler, this.props.reservedConcurrentExecutions);
    addNagSuppressionsForDataSource(this);

    // Configure provisioned concurrency if specified
    if (this.props.provisionedConcurrentExecutions === undefined) {
      return websocketHandler;
    }

    return new lambda.Alias(this, 'WebsocketHandlerAlias', {
      aliasName: 'live',
      version: websocketHandler.currentVersion,
      provisionedConcurrentExecutions: this.props.provisionedConcurrentExecutions,
    });
  }
}
