import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AppSyncAuthorizationType, AppSyncFieldLogLevel, Code, EventApi } from 'aws-cdk-lib/aws-appsync';
import { BedrockRagDataSource, BedrockRagDataSourceProps } from './datasource/bedrock-rag/bedrock-rag-data-source';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { CustomDataSource, CustomDataSourceProps } from './datasource/custom/custom-data-source';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ISecurityGroup, ISubnet, IVpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ServiceInterruption } from '../service-interruption/service-interruption';
import { Annotations, Stack } from 'aws-cdk-lib';
import * as path from 'node:path';
import {
  InvokeModelDataSource,
  InvokeModelDataSourceProps,
} from './datasource/bedrock-invoke-model/invoke-model-data-source';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

/**
 * Configuration for the GAIA v2 WebSocket API (AppSync Event API).
 *
 * **Data source selection (mutually exclusive).** Configure at most one of the
 * following three properties. Configuring more than one is rejected at synth
 * time because the 'in' namespace can only route messages to a single data
 * source:
 *
 * - {@link bedrockRagDataSource} - Bedrock Knowledge Base RAG. Requires
 *   `bedrock.knowledgeBaseId` to be set on the parent GAIAProps; configuring
 *   this without a knowledge base is rejected at synth time.
 * - {@link invokeModelDataSource} - Direct Bedrock `InvokeModel` / streaming.
 * - {@link customDataSource} - Customer-provided Lambda data source.
 *
 * Configuring zero data sources is allowed; the construct still synthesizes
 * the AppSync Event API and service-interruption sub-resources.
 */
export interface WebSocketApiProps {
  /** Lambda architecture (ARM64 or x86_64). If undefined, Architecture.X86_64 is used */
  readonly lambdaArchitecture?: 'ARM_64' | 'X86_64';
  /** Python runtime version. If undefined, Runtime.PYTHON_3_13 is used. */
  readonly pythonRuntime?: string;
  /** Bedrock RAG data source configuration */
  readonly bedrockRagDataSource?: BedrockRagDataSourceProps;
  /** Bedrock invoke model data source configuration */
  readonly invokeModelDataSource?: InvokeModelDataSourceProps;
  /** Custom data source configuration */
  readonly customDataSource?: CustomDataSourceProps;
  /** WAF ARN for API protection */
  readonly wafArn?: string;
  /** CloudWatch log retention period */
  readonly logRetentionInDays?: RetentionDays;
  /**
   * AppSync field log level. Controls what AppSync logs about resolver execution.
   * - NONE: No field-level logging
   * - ERROR: Only errors (default - recommended for production)
   * - INFO: Errors + informational messages
   * - DEBUG: Detailed debugging information
   * - ALL: Full verbose logging
   *
   * Note: Higher log levels may capture request/response data. For sensitive workloads,
   * consider using ERROR or NONE to minimize PII exposure in logs.
   * @default AppSyncFieldLogLevel.ERROR
   */
  readonly fieldLogLevel?: AppSyncFieldLogLevel;
  /**
   * Lambda handler log level. Controls what the Lambda functions log.
   * - ERROR: Only errors
   * - WARNING: Errors and warnings (default - recommended for production)
   * - INFO: General operational information
   * - DEBUG: Detailed debugging information (may include request/response data with PII)
   *
   * Note: DEBUG level logs request bodies which may contain user messages and chat history.
   * Use DEBUG only for troubleshooting in non-production environments.
   * @default 'WARNING'
   */
  readonly lambdaLogLevel?: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
  /** Custom domain name for WebSocket API */
  readonly domainName?: string;
  /** ACM certificate ARN for custom domain */
  readonly domainAcmCertArn?: string;
}

/**
 * Complete properties for WebSocketApi construct
 */
interface WebSocketApiConstructProps extends WebSocketApiProps, MdaaL3ConstructProps {
  /** Cognito User Pool for authentication */
  readonly userPool: cognito.IUserPool;
  /** DynamoDB table for chat sessions */
  readonly sessionsTable: dynamodb.Table;
  /** Chat retention period in minutes for dynamodb */
  readonly chatRetentionInMinutes?: number;
  /** Bedrock Knowledge Base ID for RAG capabilities */
  readonly knowledgeBaseId?: string;
  /** KMS encryption key */
  readonly encryptionKey: MdaaKmsKey;
  /** VPC for Lambda deployment */
  readonly vpc: IVpc;
  /** Application subnets for Lambda deployment */
  readonly appSubnets: ISubnet[];
  /** Security group for Lambda functions */
  readonly appSecurityGroup: ISecurityGroup;
  /** AWS account ID that owns the VPC. Required when using AWS RAM shared VPCs from a different account. */
  readonly vpcOwnerAccountId?: string;
}

/**
 * Validates that at most one of the three mutually exclusive WebSocketApiProps
 * data source properties is configured. Throws a descriptive Error when two or
 * more are set.
 *
 * Zero is allowed because the construct is valid with no data source
 * configured (the consumer may be exercising only the service-interruption
 * sub-construct or a different integration pattern).
 */
function validateDataSourceMutualExclusivity(props: WebSocketApiProps): void {
  const configured: string[] = [];
  if (props.bedrockRagDataSource) {
    configured.push('bedrockRagDataSource');
  }
  if (props.invokeModelDataSource) {
    configured.push('invokeModelDataSource');
  }
  if (props.customDataSource) {
    configured.push('customDataSource');
  }
  if (configured.length > 1) {
    throw new Error(
      'WebSocketApiProps: configure exactly one of bedrockRagDataSource, ' +
        `invokeModelDataSource, customDataSource. Got: ${configured.join(', ')}.`,
    );
  }
}

/**
 * WebSocket API construct that creates real-time chat infrastructure for GAIA.
 *
 * This construct creates:
 * - AppSync Event API for WebSocket communication
 * - Multiple data sources for different AI capabilities
 * - Service interruption management
 * - Channel namespaces for message routing
 * - Authentication and authorization
 * - Custom domain support
 * - WAF integration for security
 *
 * The WebSocket API provides:
 * - Real-time bidirectional communication
 * - Multiple AI data source integration (Bedrock RAG, direct model invocation, custom)
 * - Session management and chat history
 * - Service interruption handling
 * - Scalable message routing
 * - Secure authentication with Cognito
 *
 * Architecture:
 * - Inbound messages route through channel namespaces to appropriate data sources
 * - Data sources process messages and invoke AI services
 * - Outbound messages are sent back through the 'out' namespace
 * - Service interruptions are checked before processing requests
 */
export class WebSocketApi extends MdaaL3Construct {
  /** AppSync Event API for WebSocket communication */
  public readonly eventApi: EventApi;
  /** Service interruption management table */
  public readonly serviceInterruptionTable: ServiceInterruption;
  /** Construct properties for internal use */
  private readonly props: WebSocketApiConstructProps;

  constructor(scope: Construct, id: string, props: WebSocketApiConstructProps) {
    super(scope, id, props);
    validateDataSourceMutualExclusivity(props);
    this.props = props;

    // Create service interruption management infrastructure
    this.serviceInterruptionTable = new ServiceInterruption(this, 'ServiceInterruption', {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      roleHelper: props.roleHelper,
    });

    // Create AppSync Event API for WebSocket functionality
    const eventApi = this.createAppSyncEventApi(props);
    this.eventApi = eventApi;

    // Create shared Lambda layer for all data sources
    const datasourceLayerCode = new lambda.LayerVersion(this, 'DataSourceLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, './datasource/layer')),
    });

    // Create Bedrock RAG data source if Knowledge Base is configured.
    // Fail fast when bedrockRagDataSource is configured without the companion
    // knowledgeBaseId; previously the data source was silently skipped,
    // leaving the namespace with no handler.
    if (props.bedrockRagDataSource) {
      if (!props.knowledgeBaseId) {
        throw new Error('WebSocketApiProps: bedrockRagDataSource requires bedrock.knowledgeBaseId to be set.');
      }
      new BedrockRagDataSource(this, 'BedrockRagDataSource', {
        eventApi,
        knowledgeBaseId: props.knowledgeBaseId,
        naming: props.naming,
        roleHelper: props.roleHelper,
        sessionsTable: props.sessionsTable,
        chatRetentionInMinutes: props.chatRetentionInMinutes,
        vpc: props.vpc,
        appSubnets: props.appSubnets,
        appSecurityGroup: props.appSecurityGroup,
        vpcOwnerAccountId: props.vpcOwnerAccountId,
        lambdaArchitecture: props.lambdaArchitecture,
        pythonRuntime: props.pythonRuntime,
        lambdaLogLevel: props.lambdaLogLevel,
        layers: [datasourceLayerCode],
        serviceInterruptionTable: this.serviceInterruptionTable.table,
        ...props.bedrockRagDataSource,
      });
    }

    // Create direct Bedrock model invocation data source
    if (props.invokeModelDataSource) {
      new InvokeModelDataSource(this, 'InvokeModelDataSource', {
        eventApi,
        naming: props.naming,
        roleHelper: props.roleHelper,
        sessionsTable: props.sessionsTable,
        chatRetentionInMinutes: props.chatRetentionInMinutes,
        vpc: props.vpc,
        appSubnets: props.appSubnets,
        appSecurityGroup: props.appSecurityGroup,
        vpcOwnerAccountId: props.vpcOwnerAccountId,
        lambdaArchitecture: props.lambdaArchitecture,
        pythonRuntime: props.pythonRuntime,
        lambdaLogLevel: props.lambdaLogLevel,
        layers: [datasourceLayerCode],
        serviceInterruptionTable: this.serviceInterruptionTable.table,
        ...props.invokeModelDataSource,
      });
    }

    // Create custom data source for external integrations
    if (props.customDataSource) {
      new CustomDataSource(this, 'CustomDataSource', {
        eventApi,
        naming: props.naming,
        roleHelper: props.roleHelper,
        ...props.customDataSource,
      });
    }

    // Create outbound message namespace for responses
    this.createOutNamespace(eventApi);

    // Associate WAF for security protection
    if (this.props.wafArn) {
      new CfnWebACLAssociation(scope, `socket-waf-association`, {
        resourceArn: eventApi.apiArn,
        webAclArn: this.props.wafArn,
      });
    } else {
      // Warn users that WAF is not explicitly configured
      Annotations.of(this).addWarning(
        'No WAF ARN provided. If your organization uses AWS Firewall Manager, WAF will be applied automatically. ' +
          'Otherwise, this API will have no WAF protection. To explicitly associate a WAF, provide the wafArn property.',
      );

      // Suppress CDK Nag warnings when WAF is managed by AWS Firewall Manager.
      // Organizations using Firewall Manager apply WAF rules centrally via organizational policies,
      // so no explicit WAF association is needed in this construct.
      // IMPORTANT: If Firewall Manager is NOT configured, this API will have no WAF protection.
      MdaaNagSuppressions.addCodeResourceSuppressions(
        eventApi,
        [
          {
            id: 'NIST.800.53.R5-APIGWAssociatedWithWAF',
            reason:
              'WAF association is skipped when no wafArn is provided, as the organization is expected to apply WAF centrally via AWS Firewall Manager policies.',
          },
          {
            id: 'PCI.DSS.321-APIGWAssociatedWithWAF',
            reason:
              'WAF association is skipped when no wafArn is provided, as the organization is expected to apply WAF centrally via AWS Firewall Manager policies.',
          },
          {
            id: 'AwsSolutions-APIG3',
            reason:
              'WAF association is skipped when no wafArn is provided, as the organization is expected to apply WAF centrally via AWS Firewall Manager policies.',
          },
        ],
        true,
      );
    }
  }

  /**
   * Creates the AppSync Event API with authentication, logging, and custom domain support
   */
  private createAppSyncEventApi(props: WebSocketApiConstructProps) {
    // Create IAM role for AppSync logging
    const appsyncEventLogRole = new MdaaRole(this, 'appsync-log-role', {
      roleName: 'appsync-event-log-role',
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('appsync.amazonaws.com').withConditions({
        StringEquals: {
          'aws:SourceAccount': this.account, // Restrict to current account
        },
      }),
    });

    const resourceApiName = 'ChatbotSocketApi';
    const apiName = this.props.naming.resourceName(resourceApiName, 50);

    // Build custom domain configuration if certificate and domain are provided
    const domainConfig =
      props.domainName && props.domainAcmCertArn
        ? {
            domainName: {
              domainName: props.domainName,
              certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domainAcmCertArn),
            },
          }
        : {};

    // Create AppSync Event API with comprehensive configuration
    const api = new EventApi(this, 'ChatbotSocketApi', {
      apiName: apiName,
      logConfig: {
        fieldLogLevel: props.fieldLogLevel ?? AppSyncFieldLogLevel.ERROR,
        retention: props.logRetentionInDays,
        role: appsyncEventLogRole,
      },
      authorizationConfig: {
        authProviders: [
          {
            authorizationType: AppSyncAuthorizationType.USER_POOL,
            cognitoConfig: {
              userPool: props.userPool,
            },
          },
        ],
        connectionAuthModeTypes: [AppSyncAuthorizationType.USER_POOL],
        defaultPublishAuthModeTypes: [AppSyncAuthorizationType.USER_POOL],
        defaultSubscribeAuthModeTypes: [AppSyncAuthorizationType.USER_POOL],
      },
      ...domainConfig,
    });

    // Remove default log retention if not specified (workaround for CDK issue)
    if (props.logRetentionInDays === undefined) {
      const resourceToRemove = api.node.findChild('LogRetention');
      if (resourceToRemove) {
        api.node.tryRemoveChild(resourceToRemove.node.id);
      }
    }

    // Create SSM parameters and CloudFormation outputs for API endpoints
    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'domain',
        resourceId: resourceApiName,
        name: 'httpDns',
        value: api.httpDns,
        ...props,
      },
      api,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'domain',
        resourceId: resourceApiName,
        name: 'realtimeDns',
        value: api.realtimeDns,
        ...props,
      },
      api,
    );

    // Export API ID and event URL for external integrations
    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'api',
        resourceId: resourceApiName,
        name: 'id',
        value: api.apiId,
        ...props,
      },
      api,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'api',
        resourceId: resourceApiName,
        name: 'eventUrl',
        value: `https://${api.httpDns}/event`,
        ...props,
      },
      api,
    );

    // Grant CloudWatch logging permissions to AppSync role
    appsyncEventLogRole.addToPolicy(
      new PolicyStatement({
        sid: 'AllowLogCreation',
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${
            Stack.of(this).account
          }:log-group:/aws/appsync/apis/${api.apiId}*`,
        ],
      }),
    );

    // Apply CDK Nag suppressions for AppSync logging role
    MdaaNagSuppressions.addCodeResourceSuppressions(
      appsyncEventLogRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'logs:CreateLogGroup, logs:CreateLogStream, and logs:PutLogEvents are granted against the AppSync API ' +
            'log group ARN pattern /aws/appsync/apis/<apiId>*; log stream ARNs within that log group are generated ' +
            'at runtime and cannot be enumerated at deployment time ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html).',
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason:
            'AppSync logging role carries an inline policy scoped to a single log group ARN pattern ' +
            '(/aws/appsync/apis/<apiId>*). The policy is service-specific to this AppSync API and not reusable across ' +
            'roles, which is the AWS best-practice case for inline attachment ' +
            '(https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason:
            'AppSync logging role carries an inline policy scoped to a single log group ARN pattern ' +
            '(/aws/appsync/apis/<apiId>*). The policy is service-specific to this AppSync API and not reusable across ' +
            'roles, which is the AWS best-practice case for inline attachment ' +
            '(https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason:
            'AppSync logging role carries an inline policy scoped to a single log group ARN pattern ' +
            '(/aws/appsync/apis/<apiId>*). The policy is service-specific to this AppSync API and not reusable across ' +
            'roles, which is the AWS best-practice case for inline attachment ' +
            '(https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
      ],
      true,
    );

    return api;
  }

  /**
   * Creates the 'out' namespace for sending responses back to WebSocket clients
   * This namespace handles outbound messages from data sources to connected clients
   */
  private createOutNamespace(eventApi: EventApi) {
    eventApi.addChannelNamespace('out', {
      channelNamespaceName: 'out',
      code: Code.fromAsset(path.join(__dirname, './namespace/out/index.js')),
    });
  }
}
