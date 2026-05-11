import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { ChatHistory, ChatHistoryProps } from './chat-history/chat-history';
import { Construct } from 'constructs';
import { EventApi } from 'aws-cdk-lib/aws-appsync';
import { ISubnet, IVpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { RestApi, RestApiProps } from './rest-api/rest-api';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { UserFeedback, UserFeedbackProps } from './user-feedback/user-feedback';
import { WebSocketApi, WebSocketApiProps } from './websocket-api/websocket-api';

export interface ChatBotApiProps extends MdaaL3ConstructProps {
  /** Secret for X-Origin verification header */
  readonly xOriginVerifySecret: Secret;
  /**
   * Chat history storage configuration.
   * The chat history table is always created as it's required for core functionality.
   * This optional prop configures settings like retention time (TTL).
   * If undefined, chat history is retained indefinitely.
   */
  readonly chatHistory?: ChatHistoryProps;
  /** User feedback collection configuration */
  readonly userFeedback: UserFeedbackProps;
  /**
   * REST API configuration overrides.
   * The REST API is always created as it provides essential CRUD operations
   * for sessions, feedback, and service interruption management.
   * This optional prop allows customizing settings like throttling and domain configuration.
   */
  readonly restApi?: RestApiProps;
  /**
   * WebSocket API configuration overrides.
   * The WebSocket API is always created as it provides real-time chat functionality.
   * This optional prop allows customizing settings like WAF, log levels, and data source configurations.
   */
  readonly webSocketApi?: WebSocketApiProps;
  /** Cognito User Pool for authentication */
  readonly userPool: cognito.IUserPool;
  /** Cognito User Pool Client */
  readonly userPoolClient: cognito.IUserPoolClient;
  /** Bedrock Knowledge Base ID for RAG capabilities */
  readonly knowledgeBaseId?: string;
  /** KMS encryption key */
  readonly encryptionKey: MdaaKmsKey;
  /** VPC for Lambda deployment */
  readonly vpc: IVpc;
  /** Application subnets for Lambda deployment */
  readonly appSubnets: ISubnet[];
  /** AWS account ID that owns the VPC. Required when using AWS RAM shared VPCs from a different account. If not specified, defaults to the current account. */
  readonly vpcOwnerAccountId?: string;
  /**
   * Cognito group name for admin access to privileged endpoints.
   * If undefined, admin endpoints (bot management, viewing other users' sessions/feedback)
   * will return 501 Not Implemented. This is intentional - admin functionality is opt-in.
   * Users in this Cognito group will have access to admin-only REST API endpoints.
   */
  readonly adminGroup?: string;
}

/**
 * ChatBot API construct that orchestrates the complete API infrastructure for GAIA.
 *
 * This construct creates:
 * - REST API for CRUD operations (sessions, feedback)
 * - WebSocket API for real-time chat functionality
 * - DynamoDB tables for sessions, feedback, and service interruption
 * - Lambda functions for API handlers and chat processing
 * - Security groups and network configuration
 *
 * The APIs are integrated with Cognito for authentication and support
 * both client and admin operations with appropriate authorization.
 */
export class ChatBotApi extends MdaaL3Construct {
  /** REST API Gateway for CRUD operations */
  public readonly restApi: apigateway.RestApi;
  /** WebSocket Event API for real-time chat */
  public readonly webSocketEventApi: EventApi;
  /** DynamoDB table for chat sessions */
  public readonly sessionsTable: MdaaDDBTable;
  /** DynamoDB table for user feedback */
  public readonly feedbackTable: MdaaDDBTable;
  /** DynamoDB table for service interruption management */
  public readonly serviceInterruptionTable: MdaaDDBTable;

  constructor(scope: Construct, id: string, props: ChatBotApiProps) {
    super(scope, id, props);
    const { vpc, appSubnets } = props;

    // Create DynamoDB table for chat history and session management
    // This table is always created as it's required for WebSocket and REST API functionality.
    // The optional chatHistory prop only configures settings like retention time.
    const chatTables = new ChatHistory(this, 'ChatDynamoDBTables', {
      naming: props.naming,
      roleHelper: props.roleHelper,
      kmsKey: props.encryptionKey,
      ...props.chatHistory,
    });

    // Create user feedback collection infrastructure
    const userFeedback = new UserFeedback(this, 'UserFeedback', {
      naming: props.naming,
      roleHelper: props.roleHelper,
      kmsKey: props.encryptionKey,
      ...props.userFeedback,
    });

    // Create security group for Lambda functions.
    //
    // EGRESS REQUIREMENTS:
    // The Lambda functions require outbound HTTPS (443) access to:
    // - Amazon Bedrock (AI model invocation, RAG)
    // - AppSync Events API (WebSocket message publishing) - no VPC endpoint available
    // - DynamoDB (chat history, sessions, feedback)
    // - CloudWatch Logs (logging)
    // - SSM Parameter Store (configuration)
    // - KMS (encryption/decryption)
    // - STS (credential refresh)
    //
    // NETWORK PATH:
    // Since Bedrock and AppSync don't support VPC endpoints, traffic must route through
    // NAT Gateway to reach these public AWS endpoints. The Lambda functions are deployed
    // in private subnets (appSubnets), so all internet-bound traffic goes via NAT.
    //
    // RESTRICTING EGRESS:
    // Security groups cannot filter by DNS name, only by IP/CIDR (and other security group).
    // Since AWS service IPs are dynamic, restricting at the security group level is not
    // practical. To control egress more narrowly:
    //
    // 1. VPC Endpoints - Deploy VPC endpoints for services that support them (DynamoDB,
    //    CloudWatch Logs, SSM, KMS, STS) to keep that traffic within the VPC.
    //
    // 2. AWS Network Firewall - Deploy Network Firewall in the VPC to filter outbound
    //    traffic by domain name. Allow only:
    //    - *.api.bedrock.{region}.amazonaws.com (Bedrock)
    //    - *.appsync-api.{region}.amazonaws.com (AppSync)
    //
    // 3. NAT Gateway routing - Ensure NAT Gateway is in a subnet with Network Firewall
    //    inspection, or use a proxy/firewall appliance for domain-based filtering.
    //
    const chatbotSecurityGroup = new MdaaSecurityGroup(this, `chatbot-api-sg`, {
      naming: props.naming,
      securityGroupName: 'chatbot-api-sg',
      description: 'Security group used by the lambdas of the chatbot API',
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // Create WebSocket API for real-time chat functionality.
    // This is always created as it's core to the chatbot - handles connection management,
    // message routing, and AI model integration. The optional webSocketApi prop provides
    // configuration overrides (WAF, log levels, data sources), not conditional creation.
    // chatRetentionInMinutes may be undefined, in which case TTL is not enabled on the sessions table.
    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      roleHelper: props.roleHelper,
      userPool: props.userPool,
      sessionsTable: chatTables.sessionsTable,
      knowledgeBaseId: props.knowledgeBaseId,
      vpc,
      appSubnets,
      appSecurityGroup: chatbotSecurityGroup,
      vpcOwnerAccountId: props.vpcOwnerAccountId,
      chatRetentionInMinutes: props.chatHistory?.chatRetentionInMinutes,
      ...props.webSocketApi,
    });

    // Create REST API for administrative and CRUD operations.
    // This is always created as it provides essential endpoints for session management,
    // feedback collection, and service interruption control. The optional restApi prop
    // provides configuration overrides (throttling, domain), not conditional creation.
    const restApi = new RestApi(this, 'RestApi', {
      encryptionKey: props.encryptionKey,
      xOriginVerifySecret: props.xOriginVerifySecret,
      naming: props.naming,
      roleHelper: props.roleHelper,
      userPool: props.userPool,
      userPoolClient: props.userPoolClient,
      sessionsTable: chatTables.sessionsTable,
      feedbackTable: userFeedback.feedbackTable,
      serviceInterruptionTable: webSocketApi.serviceInterruptionTable.table,
      feedbackReasons: props.userFeedback.reasons,
      adminGroup: props.adminGroup,
      vpc,
      appSubnets,
      appSecurityGroup: chatbotSecurityGroup,
      vpcOwnerAccountId: props.vpcOwnerAccountId,
      ...props.restApi,
    });

    // Expose the created resources for use by parent constructs
    this.restApi = restApi.api;
    this.webSocketEventApi = webSocketApi.eventApi;
    this.sessionsTable = chatTables.sessionsTable;
    this.feedbackTable = userFeedback.feedbackTable;
    this.serviceInterruptionTable = webSocketApi.serviceInterruptionTable.table;
  }
}
