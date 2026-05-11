/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ISubnet } from 'aws-cdk-lib/aws-ec2';
import { AdminUi, AdminUiProps } from './admin-ui/admin-ui';
import { ApiAuthentication } from './api-authentication/api-authentication';
import { Authentication, AuthenticationProps } from './authentication/authentication';
import { ChatBotApi } from './chatbot-api/chatbot-api';
import { ChatHistoryProps } from './chatbot-api/chat-history/chat-history';
import { ClientUi, ClientUiProps } from './client-ui/client-ui';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { RestApiProps } from './chatbot-api/rest-api/rest-api';
import { UserFeedbackProps } from './chatbot-api/user-feedback/user-feedback';
import { Waf, WafRulesProps } from './chatbot-api/waf/waf';
import { WebSocketApiProps } from './chatbot-api/websocket-api/websocket-api';

/**
 * VPC configuration for GAIA deployment
 */
export interface VpcProps {
  /** VPC ID where GAIA resources will be deployed */
  readonly vpcId: string;
  /** List of subnet IDs for application deployment */
  readonly appSubnets: string[];
  /** AWS account ID that owns the VPC. Required when using AWS RAM shared VPCs from a different account. If not specified, implies using the current account. */
  readonly vpcOwnerAccountId?: string;
}

/**
 * Amazon Bedrock configuration for RAG capabilities
 */
export interface BedrockProps {
  /** Knowledge base ID used to query and retrieve relevant information before generating responses */
  readonly knowledgeBaseId?: string;
}

/**
 * Web Application Firewall configuration for security protection
 */
export interface WafProps {
  /**
   * Skip creating the default regional WAF.
   *
   * When true, no regional WAF is created. API Gateway and Cognito will have
   * no WAF protection unless you provide an existing WAF ARN via `regionalWafArn`.
   *
   * Use cases: using AWS Firewall Manager, or providing a pre-created regional WAF.
   *
   * @default false
   */
  readonly skipRegionalDefaultWaf?: boolean;
  /**
   * ARN of an existing regional WAF Web ACL to associate with API Gateway and Cognito.
   * Only used when `skipRegionalDefaultWaf` is true.
   */
  readonly regionalWafArn?: string;
  /**
   * Skip creating the default global (CLOUDFRONT-scoped) WAF.
   *
   * When true, no global WAF is created. CloudFront distributions (client UI and admin UI)
   * will have no WAF protection unless you provide an existing WAF ARN via `globalWafArn`.
   * This means no IP allowlisting, rate limiting, or managed rules on the frontend.
   *
   * For non-us-east-1 deployments that want automatic global WAF creation, leave this
   * false and configure `additional_stacks: [{region: 'us-east-1'}]` in mdaa.yaml instead.
   *
   * Use cases: using AWS Firewall Manager, providing a pre-created global WAF via
   * `globalWafArn`, or intentionally running without CloudFront WAF protection.
   *
   * @default false
   */
  readonly skipGlobalDefaultWaf?: boolean;
  /**
   * ARN of an existing global (CLOUDFRONT-scoped) WAF Web ACL to associate with
   * CloudFront distributions. Must be in us-east-1. Only used when `skipGlobalDefaultWaf` is true.
   */
  readonly globalWafArn?: string;
  /** CIDR blocks allowed to access the application */
  readonly allowedCidrs?: string[];
  /** Custom WAF rules with priorities */
  readonly wafRules?: { [key: string]: WafRulesProps };
}

/**
 * Main GAIA configuration interface containing all component settings
 */
export interface GAIAProps {
  /** VPC configuration for network deployment */
  readonly vpc: VpcProps;
  /** WAF configuration for security protection */
  readonly waf?: WafProps;
  /** Authentication configuration using Cognito */
  readonly auth: AuthenticationProps;
  /** Bedrock configuration for AI capabilities */
  readonly bedrock?: BedrockProps;
  /** REST API configuration */
  readonly restApi?: RestApiProps;
  /** WebSocket API configuration for real-time chat */
  readonly webSocketApi?: WebSocketApiProps;
  /** Chat history storage configuration */
  readonly chatHistory?: ChatHistoryProps;
  /** User feedback collection configuration */
  readonly userFeedback: UserFeedbackProps;
  /** Client UI configuration for end users */
  readonly clientUi?: ClientUiProps;
  /** Admin UI configuration for administrators */
  readonly adminUi?: AdminUiProps;
  /** Cognito group name for admin users with elevated privileges */
  readonly adminGroup?: string;
  /** List of admin roles with access to team resources (KMS, S3, etc.) */
  readonly dataAdminRoles: MdaaRoleRef[];
}

/**
 * Complete properties for GAIA L3 Construct
 */
export interface GAIAL3ConstructProps extends MdaaL3ConstructProps {
  /** GAIA-specific configuration */
  readonly gaia: GAIAProps;
}

/**
 * GAIA v2 L3 Construct - Main construct for deploying a complete GenAI application
 *
 * This construct orchestrates the deployment of all GAIA components including:
 * - Authentication (Cognito with optional Entra ID integration)
 * - API infrastructure (REST and WebSocket APIs)
 * - UI components (Client and Admin interfaces)
 * - Security (WAF, KMS encryption, API authentication)
 * - AI capabilities (Bedrock integration, RAG support)
 * - Storage (Chat history, user feedback)
 *
 * The construct follows AWS Well-Architected principles and includes
 * comprehensive security controls, monitoring, and compliance features.
 */

/**
 * Validates the caller-supplied {@link GAIAProps} before any resource is
 * created. Throws a descriptive Error when a misconfiguration is detected.
 *
 * Checks:
 * - auth must specify at least one of cognitoDomain or
 *   entraIdOIDCConfiguration; without either the Cognito User Pool Client
 *   has no identity provider and the managed login UI has no domain.
 * - vpc.appSubnets must contain at least one subnet; an empty list would
 *   synthesize a Lambda function with no VPC attachment and produce a
 *   confusing CDK error downstream.
 */
function validateGaiaProps(gaia: GAIAProps): void {
  const auth = gaia.auth ?? {};
  if (!auth.cognitoDomain && !auth.entraIdOIDCConfiguration) {
    throw new Error('GAIAProps.auth must specify at least one of cognitoDomain or entraIdOIDCConfiguration.');
  }
  if (!gaia.vpc.appSubnets || gaia.vpc.appSubnets.length === 0) {
    throw new Error('GAIAProps.vpc.appSubnets must contain at least one subnet.');
  }
}

export class GAIAL3Construct extends MdaaL3Construct {
  protected readonly props: GAIAL3ConstructProps;

  constructor(scope: Construct, id: string, props: GAIAL3ConstructProps) {
    super(scope, id, props);
    validateGaiaProps(props.gaia);
    this.props = props;

    // Import VPC and subnet configurations for network deployment
    const vpc: ec2.IVpc = ec2.Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: props.gaia.vpc.vpcId,
      availabilityZones: [''], // AZs will be resolved automatically
    });
    const appSubnets: ISubnet[] = props.gaia.vpc.appSubnets.map(appSubnetId => {
      return ec2.Subnet.fromSubnetAttributes(this, `subnet-${appSubnetId}`, {
        subnetId: appSubnetId,
      });
    });

    // Create KMS encryption key for all GAIA resources
    // This key encrypts data at rest including S3 buckets, DynamoDB tables, and CloudWatch logs
    const stackEncryptionKey = new MdaaKmsKey(this, 'StackEncryptionKey', {
      naming: props.naming,
      createParams: true,
      createOutputs: false,
    });

    // Grant CloudWatch Logs permission to use the encryption key
    // This enables encrypted logging across all GAIA components
    this.addCloudWatchLogsKmsPolicy(stackEncryptionKey, this.region);

    // Configure Regional WAF for API Gateway protection
    // Regional WAF protects REST and WebSocket APIs from common web exploits
    const regionalWafArn =
      this.props.gaia.waf?.regionalWafArn || this.props.gaia.waf?.skipRegionalDefaultWaf
        ? this.props.gaia.waf?.regionalWafArn // Use existing WAF if provided
        : new Waf(this, 'regional-chatbot-waf', {
            naming: props.naming,
            roleHelper: props.roleHelper,
            encryptionKey: stackEncryptionKey,
            wafScope: 'REGIONAL', // For API Gateway
            wafNamePrefix: 'regional',
            allowedCidrs: props.gaia.waf?.allowedCidrs,
            wafRules: props.gaia.waf?.wafRules,
          }).webACL.attrArn;

    // Configure Global WAF for CloudFront protection
    // Global WAF protects the UI distributions and must be deployed in us-east-1
    const globalWafArn =
      this.props.gaia.waf?.globalWafArn || this.props.gaia.waf?.skipGlobalDefaultWaf
        ? this.props.gaia.waf?.globalWafArn // Use existing WAF if provided
        : this.createGlobalWaf(props, stackEncryptionKey); // Create new global WAF

    // Set up Cognito User Pool with optional Entra ID integration
    // Handles user authentication for both client and admin interfaces
    const authentication = new Authentication(this, 'Authentication', {
      ...props.gaia.auth,
      wafArn: regionalWafArn,
      naming: props.naming,
      roleHelper: props.roleHelper,
    });

    // Create X-Origin verification secret for API security
    // This secret validates that API requests come through CloudFront rather than directly
    const apiAuthentication = new ApiAuthentication(this, 'ApiAuthentication', {
      naming: props.naming,
      roleHelper: props.roleHelper,
      encryptionKey: stackEncryptionKey,
    });

    // Create the main ChatBot API infrastructure
    // This includes REST API, WebSocket API, Lambda functions, DynamoDB tables, and AI integrations
    const chatBotApi = new ChatBotApi(this, 'ChatBotApi', {
      ...props,
      xOriginVerifySecret: apiAuthentication.xOriginVerifySecret,
      chatHistory: props.gaia.chatHistory,
      userFeedback: props.gaia.userFeedback,
      restApi: {
        ...props.gaia.restApi,
        wafArn: regionalWafArn,
      },
      webSocketApi: {
        ...props.gaia.webSocketApi,
        wafArn: regionalWafArn,
      },
      knowledgeBaseId: props.gaia?.bedrock?.knowledgeBaseId,
      vpc,
      appSubnets,
      vpcOwnerAccountId: props.gaia.vpc.vpcOwnerAccountId,
      encryptionKey: stackEncryptionKey,
      userPool: authentication.userPool,
      userPoolClient: authentication.userPoolClient,
      adminGroup: props.gaia.adminGroup?.toString(),
    });

    // Create Client UI for end-user chat interactions
    // Deployed via CloudFront with custom domain support and WebSocket integration
    const clientUi = new ClientUi(this, 'UserInterface', {
      ...props.gaia.clientUi,
      naming: props.naming,
      roleHelper: props.roleHelper,
      xOriginVerifySecret: apiAuthentication.xOriginVerifySecret,
      userPool: authentication.userPool,
      userPoolDomain: authentication.userPoolDomain,
      userPoolClientId: authentication.userPoolClient.userPoolClientId,
      oAuthCallbackUrls: props.gaia.auth.oAuthCallbackUrls,
      oAuthLogoutUrls: props.gaia.auth.oAuthCallbackUrls,
      websocketHttpDns: chatBotApi.webSocketEventApi.httpDns, // Real-time chat endpoint
      restApiId: chatBotApi.restApi.restApiId,
      webACLId: globalWafArn, // Protect with global WAF
      encryptionKey: stackEncryptionKey,
    });

    // Create Admin UI for system administration and management
    // Provides workspace management, document ingestion, and system configuration
    const adminUi = new AdminUi(this, 'AdminInterface', {
      ...props.gaia.adminUi,
      naming: props.naming,
      roleHelper: props.roleHelper,
      xOriginVerifySecret: apiAuthentication.xOriginVerifySecret,
      userPool: authentication.userPool,
      userPoolDomain: authentication.userPoolDomain,
      userPoolClientId: authentication.userPoolClient.userPoolClientId,
      oAuthCallbackUrls: props.gaia.auth.oAuthCallbackUrls,
      oAuthLogoutUrls: props.gaia.auth.oAuthCallbackUrls,
      restApiId: chatBotApi.restApi.restApiId,
      webACLId: globalWafArn, // Protect with global WAF
      encryptionKey: stackEncryptionKey,
    });

    // Update Cognito User Pool Client with CloudFront domain URLs
    // This custom resource resolves the circular dependency between CloudFront and Cognito
    // by updating OAuth callback/logout URLs after CloudFront distributions are created
    const clientUiCloudfrontDomain = clientUi.distribution.distributionDomainName;
    const adminUiCloudfrontDomain = adminUi.distribution.distributionDomainName;
    const userPoolId = authentication.userPool.userPoolId;
    const clientId = authentication.userPoolClient.userPoolClientId;

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'UpdateUserPoolClient',
      code: Code.fromAsset(`${__dirname}/./function`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'update_user_pool_client.lambda_handler',
      handlerRolePolicyStatements: [
        new PolicyStatement({
          actions: ['cognito-idp:UpdateUserPoolClient', 'cognito-idp:DescribeUserPoolClient'],
          resources: [authentication.userPool.userPoolArn],
        }),
      ],
      handlerProps: {
        UserPoolId: userPoolId,
        ClientId: clientId,
        CloudfrontDomains: [clientUiCloudfrontDomain, adminUiCloudfrontDomain],
        OAuthCallbackUrls: props.gaia.auth.oAuthCallbackUrls,
        OAuthLogoutUrls: props.gaia.auth.oAuthCallbackUrls,
      },
      naming: props.naming,
      handlerTimeout: Duration.seconds(60),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    // Create custom resource with proper dependencies
    const mdaaCustomResource = new MdaaCustomResource(this, 'update-cognito-callback-url-cr', crProps);
    mdaaCustomResource.node.addDependency(authentication.userPool);
    mdaaCustomResource.node.addDependency(authentication.userPoolClient);
    mdaaCustomResource.node.addDependency(clientUi.distribution);
    mdaaCustomResource.node.addDependency(adminUi.distribution);

    // Suppress warnings for CDK-generated custom resources (BucketDeployment, LogRetention)
    Stack.of(this).node.children.forEach(child => {
      if (child.node.id.includes('Custom::CDKBucketDeployment') || child.node.id.includes('LogRetention')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
          [
            { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
            {
              id: 'NIST.800.53.R5-LambdaConcurrency',
              reason: 'Function is used only as custom resource during CDK deployment.',
            },
            {
              id: 'NIST.800.53.R5-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'NIST.800.53.R5-LambdaDLQ',
              reason:
                'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
            },
            {
              id: 'HIPAA.Security-LambdaConcurrency',
              reason: 'Function is used only as custom resource during CDK deployment.',
            },
            {
              id: 'HIPAA.Security-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'PCI.DSS.321-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'HIPAA.Security-LambdaDLQ',
              reason:
                'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
            },
            { id: 'AwsSolutions-IAM4', reason: 'Function is used only as custom resource during CDK deployment.' },
            { id: 'AwsSolutions-IAM5', reason: 'Function is used only as custom resource during CDK deployment.' },
            {
              id: 'HIPAA.Security-IAMNoInlinePolicy',
              reason: 'Policy managed by CDK and only used during deployment.',
            },
            { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy managed by CDK and only used during deployment.' },
            {
              id: 'NIST.800.53.R5-IAMNoInlinePolicy',
              reason: 'Policy managed by CDK and only used during deployment.',
            },
          ],
          true,
        );
      }
    });
  }

  /**
   * Creates a global WAF for CloudFront protection
   *
   * CloudFront WAF resources must be deployed in us-east-1 region.
   * If the main stack is in a different region, this method creates
   * a cross-region stack specifically for the global WAF.
   *
   * @param props - GAIA construct properties
   * @param stackEncryptionKey - KMS key for encryption
   * @returns ARN of the created global WAF
   */
  private createGlobalWaf(props: GAIAL3ConstructProps, stackEncryptionKey: MdaaKmsKey) {
    if (this.region === 'us-east-1') {
      // Create WAF directly in current stack if already in us-east-1
      return new Waf(this, 'global-chatbot-waf', {
        naming: props.naming,
        roleHelper: props.roleHelper,
        encryptionKey: stackEncryptionKey,
        wafScope: 'CLOUDFRONT', // Global scope for CloudFront
        wafNamePrefix: 'global',
        allowedCidrs: props.gaia.waf?.allowedCidrs,
        wafRules: props.gaia.waf?.wafRules,
      }).webACL.attrArn;
    }

    // Create cross-region stack in us-east-1 for CloudFront WAF
    const crossAccountStack = this.getCrossAccountStack(undefined, 'us-east-1');
    if (!crossAccountStack) {
      throw new Error(
        'CloudFront WAF requires a cross-region stack when your primary region is not us-east-1 (CloudFront WAF resources must be deployed in us-east-1).',
      );
    }

    // Create separate encryption key for the us-east-1 stack
    const globalStackEncryptionKey = new MdaaKmsKey(crossAccountStack, 'StackEncryptionKey', {
      naming: props.naming,
      createParams: true,
      createOutputs: false,
    });

    // Grant CloudWatch Logs permission for us-east-1 region
    this.addCloudWatchLogsKmsPolicy(globalStackEncryptionKey, 'us-east-1');

    // Create global WAF in the cross-region stack
    return new Waf(crossAccountStack, 'global-chatbot-waf', {
      naming: props.naming,
      roleHelper: props.roleHelper,
      encryptionKey: globalStackEncryptionKey,
      wafScope: 'CLOUDFRONT',
      wafNamePrefix: 'global',
      allowedCidrs: props.gaia.waf?.allowedCidrs,
      wafRules: props.gaia.waf?.wafRules,
    }).webACL.attrArn;
  }

  /**
   * Adds CloudWatch Logs encryption policy to a KMS key.
   * This grants the CloudWatch Logs service permission to use the key for log encryption.
   */
  private addCloudWatchLogsKmsPolicy(key: MdaaKmsKey, region: string): void {
    key.addToResourcePolicy(
      new PolicyStatement({
        sid: 'CloudWatchLogsEncryption',
        effect: Effect.ALLOW,
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
        principals: [new ServicePrincipal(`logs.${region}.amazonaws.com`)],
        resources: ['*'],
        conditions: {
          ArnEquals: {
            'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${region}:${this.account}:log-group:*`,
          },
        },
      }),
    );
  }
}
