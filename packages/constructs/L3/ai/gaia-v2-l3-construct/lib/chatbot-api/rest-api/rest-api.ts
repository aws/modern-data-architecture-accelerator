import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, Runtime, RuntimeFamily } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { ISecurityGroup, ISubnet, IVpc } from 'aws-cdk-lib/aws-ec2';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { MdaaAlarm, MdaaLogGroup, MdaaLogGroupProps } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { DEFAULT_LAMBDA_MEMORY_SIZE_MB, DEFAULT_LAMBDA_TIMEOUT_SECONDS } from '../../constants';
import { getVpcArn } from '../../utils/vpc-utils';

/**
 * Configuration for a single CloudWatch alarm threshold.
 */
export interface AlarmThresholdConfig {
  /** Whether this alarm is enabled. @default true */
  readonly enabled?: boolean;
  /** Threshold value for the alarm */
  readonly threshold: number;
  /** Evaluation period in seconds. @default 300 */
  readonly period?: number;
  /** Number of evaluation periods before alarming. @default 3 */
  readonly evaluationPeriods?: number;
}

/**
 * CloudWatch alarm configuration for the REST API.
 */
export interface RestApiAlarmConfig {
  /**
   * SNS topic ARN for alarm notifications. If not provided, a new topic is created.
   */
  readonly snsTopicArn?: string;
  /**
   * 5XX error rate alarm. Threshold is a percentage (0-100).
   * @default { threshold: 5, period: 300, evaluationPeriods: 3 }
   */
  readonly error5xxRate?: AlarmThresholdConfig;
  /**
   * 4XX error rate alarm. Threshold is a percentage (0-100).
   * @default { threshold: 20, period: 300, evaluationPeriods: 3 }
   */
  readonly error4xxRate?: AlarmThresholdConfig;
  /**
   * P99 latency alarm. Threshold is in milliseconds.
   * @default { threshold: 10000, period: 300, evaluationPeriods: 3 }
   */
  readonly latencyP99?: AlarmThresholdConfig;
}

export interface RestApiProps {
  /** Prefix for CloudWatch log group names */
  readonly logGroupNamePathPrefix?: string;
  /** Number of days to retain access logs in CloudWatch log group for access logs. If undefined, infinite is used. */
  readonly logGroupAccessLogRetentionDays?: number;
  /** Custom domain name for REST API. Will be configured if hostedZoneName is specified as well. */
  readonly restApiDomainName?: string;
  /** Route53 hosted zone name for domain setup */
  readonly hostedZoneName?: string;
  /** Specifies API GW throttling rate limit. The total rate of all requests in your AWS account is limited to 10,000 requests per second (rps). If undefined 2500 is used. */
  readonly apiGwThrottlingRateLimit?: number;
  /** Whether to set API Gateway account CloudWatch role */
  readonly setApiGateWayAccountCloudwatchRole?: boolean;
  /** Provisioned concurrency for Lambda functions */
  readonly provisionedConcurrentExecutions?: number;
  /** Timeout for the REST API handler Lambda function in seconds. If unspecified, 10 minutes is used (600 seconds) */
  readonly restApiHandlerLambdaTimeoutInSeconds?: number;
  /** Memory allocation for the REST API handler Lambda function in MB. If undefined, 1024MB is used. */
  readonly restApiHandlerLambdaMemorySize?: number;
  /** Lambda architecture (ARM64 or x86_64). If undefined, Architecture.X86_64 is used */
  readonly lambdaArchitecture?: 'ARM_64' | 'X86_64';
  /** Enable PowerTools development logging */
  readonly powertoolsDevLogging?: 'true' | 'false';
  /** Python runtime version. If undefined, Runtime.PYTHON_3_13 is used. */
  readonly pythonRuntime?: string;
  /** WAF ARN for API protection */
  readonly wafArn?: string;
  /** Admin group name for access to the admin interface */
  readonly adminGroup?: string;
  /** API Gateway endpoint type */
  readonly endpointType?: 'REGIONAL' | 'EDGE' | 'PRIVATE';
  /** VPC endpoint IDs for private API access (Restrict access to specific VPC endpoints if configured).*/
  readonly privateApiSourceVpcEndpointIds?: string[];
  /**
   * Disable the default execute-api endpoint. When true, clients must use the custom domain.
   * Recommended when a custom domain is configured to enforce TLS 1.2+ exclusively.
   * @default false
   */
  readonly disableExecuteApiEndpoint?: boolean;
  /**
   * CloudWatch alarm configuration for monitoring API health (5XX, 4XX, latency).
   * When provided, alarms and an SNS notification topic are created.
   */
  readonly alarms?: RestApiAlarmConfig;
}

export interface RestApiConstructProps extends RestApiProps, MdaaL3ConstructProps {
  /** Secret for X-Origin verification header */
  readonly xOriginVerifySecret: Secret;
  /** Cognito User Pool for authentication */
  readonly userPool: cognito.IUserPool;
  /** Cognito User Pool Client */
  readonly userPoolClient: cognito.IUserPoolClient;
  /** DynamoDB table for chat sessions */
  readonly sessionsTable: MdaaDDBTable;
  /** DynamoDB table for user feedback */
  readonly feedbackTable: MdaaDDBTable;
  /** DynamoDB table for service interruption management */
  readonly serviceInterruptionTable?: MdaaDDBTable;
  /** KMS encryption key */
  readonly encryptionKey: MdaaKmsKey;
  /** VPC for Lambda deployment */
  readonly vpc: IVpc;
  /** Application subnets for Lambda deployment */
  readonly appSubnets: ISubnet[];
  /** Security group for Lambda functions */
  readonly appSecurityGroup: ISecurityGroup;
  /** List of feedback reasons for validation */
  readonly feedbackReasons: string[];
  /** AWS account ID that owns the VPC. Required when using AWS RAM shared VPCs from a different account. If not specified, defaults to the current account. */
  readonly vpcOwnerAccountId?: string;
}

/**
 * AWS Lambda PowerTools configuration.
 * See: https://docs.powertools.aws.dev/lambda/python/latest/
 */
/** AWS account ID hosting the official Lambda Powertools layers */
const AWS_LAMBDA_POWERTOOLS_ACCOUNT_ID = '017000801446';
/** AWS Lambda PowerTools layer version */
const POWER_TOOLS_LAYER_VERSION = '46';

/**
 * REST API construct that creates the administrative and CRUD API for GAIA.
 *
 * This construct creates:
 * - API Gateway REST API with Cognito authentication
 * - Lambda function for handling API requests
 * - Custom domain and SSL certificate (optional)
 * - WAF integration for security protection
 * - CloudWatch logging and monitoring
 * - Route53 DNS records for custom domains
 *
 * The API provides endpoints for:
 * - Session and chat history management
 * - User feedback collection and analysis
 * - Service interruption management
 */
export class RestApi extends MdaaL3Construct {
  /** API Gateway REST API instance */
  public readonly api: apigateway.RestApi;
  /** Construct properties for internal use */
  private readonly props: RestApiConstructProps;

  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Create Lambda function to handle all API requests
    const apiHandler: MdaaLambdaFunction = this.createApiHandler(props);

    // Create API Gateway with authentication and logging
    const chatBotApi = this.createRestChatbotApi(apiHandler);

    // Store API ID in SSM for reference by other components
    if (this.props?.restApiDomainName === undefined) {
      new ssm.StringParameter(this, 'RestApiIdSSMParam', {
        parameterName: this.props.naming.ssmPath('rest/api/id'),
        stringValue: chatBotApi.restApiId,
      });
    }

    this.api = chatBotApi;

    // Create CloudWatch alarms for API health monitoring
    if (this.props.alarms) {
      this.createApiAlarms(chatBotApi);
    }
  }

  /**
   * Creates the REST API Gateway with authentication, logging, and security features
   */
  private createRestChatbotApi(apiHandler: MdaaLambdaFunction) {
    // Create CloudWatch log group for API Gateway access logs
    const accessLogGroupProps: MdaaLogGroupProps = {
      logGroupName: 'genai-admin-backend-rest-api-access-logs',
      encryptionKey: this.props.encryptionKey,
      logGroupNamePathPrefix: this.props.logGroupNamePathPrefix || '',
      retention: this.props.logGroupAccessLogRetentionDays ?? RetentionDays.INFINITE,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
    };
    const accessLogGroup = new MdaaLogGroup(this, 'rest-api-access-log-group', accessLogGroupProps);

    // Create Cognito authorizer for API authentication
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'cognito-authorizer', {
      authorizerName: this.props.naming.resourceName(),
      resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching for real-time auth
      cognitoUserPools: [this.props.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Create API Gateway with comprehensive configuration
    const chatBotApi = new apigateway.RestApi(this, 'ChatBotApi', {
      ...this.generateRestApiProps(cognitoAuthorizer, accessLogGroup),
    });

    // Set up custom domain with Route53 if configured
    if (this.props.hostedZoneName !== undefined && this.props.restApiDomainName) {
      new route53.ARecord(this, 'RestApiDnsRecord', {
        zone: route53.HostedZone.fromLookup(this, 'MainHostedZone', {
          domainName: this.props.hostedZoneName,
        }),
        recordName: this.props.restApiDomainName,
        target: route53.RecordTarget.fromAlias(new ApiGateway(chatBotApi)),
      });
    }

    // Associate WAF for security protection
    if (this.props.wafArn) {
      new CfnWebACLAssociation(this.scope, `rest-waf-association`, {
        resourceArn: chatBotApi.deploymentStage.stageArn,
        webAclArn: this.props.wafArn,
      });
    } else {
      // Suppress CDK Nag warnings when WAF is managed externally (e.g., Firewall Manager)
      MdaaNagSuppressions.addCodeResourceSuppressions(
        chatBotApi.deploymentStage.restApi,
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

    // Configure CloudWatch role for API Gateway logging (optional)
    if (this.props?.setApiGateWayAccountCloudwatchRole?.valueOf()) {
      const cloudwatchRole = new MdaaRole(this, 'cloudwatch-role', {
        roleName: 'genai-admin-backend-rest-api-cloudwatch',
        naming: this.props.naming,
        assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      });
      cloudwatchRole.addManagedPolicy(
        MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(
          this,
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs',
        ),
      );

      // Suppress CDK Nag warning for AWS managed policy
      MdaaNagSuppressions.addCodeResourceSuppressions(
        cloudwatchRole,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'AmazonAPIGatewayPushToCloudWatchLogs provides the minimum required permissions for API Gateway logging to Cloudwatch: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html',
          },
        ],
        true,
      );

      // Set up API Gateway account-level CloudWatch role
      const account = new apigateway.CfnAccount(this, 'api-gw-account', {
        cloudWatchRoleArn: cloudwatchRole.roleArn,
      });
      chatBotApi.node.addDependency(account);
    }

    // Configure API routes - all requests go through a single Lambda proxy
    const v1Resource = chatBotApi.root.addResource('v1');
    const v1ProxyResource = v1Resource.addResource('{proxy+}');
    v1ProxyResource.addMethod(
      // NOSONAR - Cognito auth is inherited from defaultMethodOptions set on the RestApi
      'ANY', // Handle all HTTP methods
      new apigateway.LambdaIntegration(apiHandler, {
        proxy: true,
      }),
      {
        requestValidatorOptions: {
          validateRequestParameters: true,
          validateRequestBody: true,
        },
      },
    );

    // CDK Nag suppressions
    MdaaNagSuppressions.addCodeResourceSuppressions(
      chatBotApi,
      [
        {
          id: 'NIST.800.53.R5-APIGWSSLEnabled',
          reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.',
        },
        {
          id: 'HIPAA.Security-APIGWSSLEnabled',
          reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.',
        },
        {
          id: 'PCI.DSS.321-APIGWSSLEnabled',
          reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.',
        },
        { id: 'NIST.800.53.R5-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        { id: 'HIPAA.Security-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        { id: 'PCI.DSS.321-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        {
          id: 'AwsSolutions-APIG4',
          reason:
            'All non-OPTIONS methods enforce Cognito User Pool authorization via the REST API defaultMethodOptions authorizer. ' +
            'OPTIONS methods intentionally require no authorization because CORS preflight requests from browsers are sent ' +
            'without credentials per the Fetch specification (https://fetch.spec.whatwg.org/#cors-preflight-fetch) and must be ' +
            'allowed through for the actual cross-origin request to succeed.',
        },
        {
          id: 'AwsSolutions-COG4',
          reason:
            'All non-OPTIONS methods require a valid Cognito User Pool token via the REST API defaultMethodOptions authorizer. ' +
            'OPTIONS methods are exempt because CORS preflight requests from browsers do not include credentials per the Fetch ' +
            'specification (https://fetch.spec.whatwg.org/#cors-preflight-fetch).',
        },
      ],
      true,
    );

    return chatBotApi;
  }

  /**
   * Generates REST API properties including endpoint configuration, domain setup, and policies
   */
  private generateRestApiProps(
    cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer,
    accessLogGroup: MdaaLogGroup,
  ): apigateway.RestApiProps {
    const getEndpointType = (endpointType?: string): apigateway.EndpointType => {
      switch (endpointType) {
        case 'EDGE':
          return apigateway.EndpointType.EDGE; // Global edge locations
        case 'PRIVATE':
          return apigateway.EndpointType.PRIVATE; // VPC-only access
        case 'REGIONAL':
        default:
          return apigateway.EndpointType.REGIONAL; // Regional deployment
      }
    };

    const endpointType = getEndpointType(this.props.endpointType);

    // Create resource policy for PRIVATE API Gateway
    let policyDocument: iam.PolicyDocument | undefined = undefined;
    if (endpointType === apigateway.EndpointType.PRIVATE) {
      // Private APIs require explicit resource policies
      // NOSONAR - AnyPrincipal is required for private API Gateway resource policies.
      // Access is restricted to specific VPC endpoints via a DENY statement below, and
      // method-level Cognito authorization is enforced on all routes.
      // See: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html#apigateway-private-api-set-up-resource-policy
      policyDocument = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            resources: ['execute-api:/*/*/*'],
          }),
        ],
      });

      // Restrict access to specific VPC endpoints if configured
      if (this.props.privateApiSourceVpcEndpointIds && this.props.privateApiSourceVpcEndpointIds.length > 0) {
        policyDocument.addStatements(
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            resources: ['execute-api:/*/*/*'],
            conditions: {
              StringNotEquals: {
                'aws:SourceVpce': this.props.privateApiSourceVpcEndpointIds,
              },
            },
          }),
        );
      }
    }

    // Base API Gateway configuration
    const baseProps: apigateway.RestApiProps = {
      endpointTypes: [endpointType],
      cloudWatchRole: false, // Created separately above
      deploy: true,
      policy: policyDocument,
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: cognitoAuthorizer,
      },
      deployOptions: {
        stageName: 'api',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.custom(
          JSON.stringify({
            extendedRequestId: apigateway.AccessLogField.contextExtendedRequestId(),
            ip: apigateway.AccessLogField.contextIdentitySourceIp(),
            user: apigateway.AccessLogField.contextIdentityUser(),
            caller: apigateway.AccessLogField.contextIdentityCaller(),
            requestTime: apigateway.AccessLogField.contextRequestTime(),
            httpMethod: apigateway.AccessLogField.contextHttpMethod(),
            resourcePath: apigateway.AccessLogField.contextResourcePath(),
            status: apigateway.AccessLogField.contextStatus(),
            protocol: apigateway.AccessLogField.contextProtocol(),
            responseLength: apigateway.AccessLogField.contextResponseLength(),
            tlsVersion: '$context.identity.tlsVersion',
            cipherSuite: '$context.identity.cipherSuite',
          }),
        ),
        tracingEnabled: true,
        metricsEnabled: true,
        throttlingRateLimit: this.props.apiGwThrottlingRateLimit ?? 2500,
        methodOptions: {
          '/*/*': {
            loggingLevel: apigateway.MethodLoggingLevel.INFO,
            cachingEnabled: false,
            cacheDataEncrypted: false,
          },
        },
      },
    };

    // Return base config if no custom domain is specified
    if (!this.props.hostedZoneName || !this.props.restApiDomainName) {
      return {
        ...baseProps,
        disableExecuteApiEndpoint: this.props.disableExecuteApiEndpoint ?? false,
      };
    }

    // Add custom domain configuration
    const hostedZone = route53.HostedZone.fromLookup(this, 'RestApiMainHostedZone', {
      domainName: this.props.hostedZoneName,
    });

    const certificate = new acm.Certificate(this, 'RestApiCertificate', {
      domainName: this.props.restApiDomainName,
      validation: {
        method: acm.ValidationMethod.DNS,
        props: {
          hostedZone,
        },
      },
    });

    return {
      ...baseProps,
      domainName: {
        domainName: this.props.restApiDomainName,
        certificate,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
      disableExecuteApiEndpoint: this.props.disableExecuteApiEndpoint ?? false,
      policy: undefined, // Remove policy for custom domain setup
    };
  }

  /**
   * Creates the Lambda function that handles all REST API requests
   */
  private createApiHandler(props: RestApiConstructProps) {
    // Select appropriate PowerTools layer based on architecture
    const powerToolsArn =
      this.props.lambdaArchitecture === 'ARM_64'
        ? `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${AWS_LAMBDA_POWERTOOLS_ACCOUNT_ID}:layer:AWSLambdaPowertoolsPythonV2-Arm64:${POWER_TOOLS_LAYER_VERSION}`
        : `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${AWS_LAMBDA_POWERTOOLS_ACCOUNT_ID}:layer:AWSLambdaPowertoolsPythonV2:${POWER_TOOLS_LAYER_VERSION}`;
    const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'PowertoolsLayer', powerToolsArn);

    // Create Lambda function with comprehensive configuration
    const apiHandler = new MdaaLambdaFunction(this, 'ApiHandler', {
      functionName: 'rest-api-handler',
      naming: this.props.naming,
      role: this.createApiHandlerRole(props),
      createParams: true,
      createOutputs: false,
      code: lambda.Code.fromAsset(path.join(__dirname, './function/api-handler')),
      handler: 'index.handler',
      runtime: this.props.pythonRuntime
        ? new Runtime(this.props.pythonRuntime, RuntimeFamily.PYTHON)
        : Runtime.PYTHON_3_13,
      architecture: this.props.lambdaArchitecture === 'ARM_64' ? Architecture.ARM_64 : Architecture.X86_64,
      timeout: cdk.Duration.seconds(this.props.restApiHandlerLambdaTimeoutInSeconds ?? DEFAULT_LAMBDA_TIMEOUT_SECONDS),
      memorySize: this.props.restApiHandlerLambdaMemorySize ?? DEFAULT_LAMBDA_MEMORY_SIZE_MB,
      tracing: lambda.Tracing.ACTIVE,
      layers: [powerToolsLayer],
      vpc: this.props.vpc,
      securityGroups: [this.props.appSecurityGroup],
      vpcSubnets: { subnets: this.props.appSubnets },
      environment: this.createApiHandlerEnvironment(),
    });

    // Configure provisioned concurrency if specified (for consistent performance)
    if (this.props.provisionedConcurrentExecutions !== undefined) {
      const version = apiHandler.currentVersion;

      new lambda.Alias(this, 'ApiHandlerAlias', {
        aliasName: 'live',
        version,
        provisionedConcurrentExecutions: this.props.provisionedConcurrentExecutions,
      });
    }

    // CDK Nag suppressions for Lambda security configurations
    MdaaNagSuppressions.addCodeResourceSuppressions(
      apiHandler,
      [
        { id: 'AwsSolutions-L1', reason: 'Runtime version is pinned for stability.' },
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );
    return apiHandler;
  }

  /**
   * Creates IAM role for the API handler Lambda with necessary permissions
   */
  private createApiHandlerRole(props: RestApiConstructProps) {
    const apiHandlerRole = new MdaaLambdaRole(this, 'ApiHandlerRole', {
      roleName: 'BackendRestApiHandlerRole',
      logGroupNames: [this.props.naming.resourceName('rest-api-handler')],
      naming: props.naming,
      createParams: true,
      createOutputs: false,
    });

    // Grant VPC permissions for Lambda in VPC
    // Using StringEqualsIfExists for ec2:Vpc condition - this enforces the VPC restriction
    // when the condition key is present in the request context, but allows the action when
    // it's not (which can happen with Lambda's internal service calls).
    // This provides better security than the AWS managed policy AWSLambdaVPCAccessExecutionRole
    // which uses Resource: '*' without any conditions.
    // @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
    // @see https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-permissions
    const vpcArn = getVpcArn(this, this.props.vpc, this.props.vpcOwnerAccountId);

    apiHandlerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface'],
        resources: ['*'],
        conditions: {
          StringEqualsIfExists: {
            'ec2:Vpc': vpcArn,
          },
        },
      }),
    );
    // Describe and IP assignment actions don't support ec2:Vpc condition
    apiHandlerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeSubnets'],
        resources: ['*'],
      }),
    );

    // Add standard Lambda execution permissions
    apiHandlerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaExecute'));

    // Grant access to required resources
    this.props.encryptionKey.grantEncryptDecrypt(apiHandlerRole);
    this.props.xOriginVerifySecret.grantRead(apiHandlerRole);
    this.props.sessionsTable.grantReadWriteData(apiHandlerRole);
    this.props.feedbackTable.grantReadWriteData(apiHandlerRole);

    // Grant permissions to service interruption table if provided
    if (this.props.serviceInterruptionTable) {
      this.props.serviceInterruptionTable.grantReadWriteData(apiHandlerRole);
    }

    // CDK Nag suppressions
    MdaaNagSuppressions.addCodeResourceSuppressions(
      apiHandlerRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'AWSLambdaExecute grants logs:* for CloudWatch logging and s3:GetObject/s3:PutObject for Lambda ' +
            'execution artifacts; these actions do not support resource-level permissions ' +
            '(https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaExecute.html). ' +
            'The managed policy is the standard AWS-provided policy for Lambda basic execution with S3 access ' +
            'and is used in place of maintaining an equivalent inline policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'xray:PutTraceSegments and xray:PutTelemetryRecords are added by CDK when Lambda tracing is enabled ' +
            'and do not support resource-level permissions ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsx-ray.html). ' +
            'ec2:DescribeNetworkInterfaces and ec2:DescribeSubnets do not support resource-level permissions ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html); ' +
            'ec2:CreateNetworkInterface and ec2:DeleteNetworkInterface use Resource: * but are further scoped ' +
            'via the ec2:Vpc StringEqualsIfExists condition. ' +
            'DynamoDB index ARN wildcards (<tableArn>/index/*) are added by table.grantReadWriteData() to cover ' +
            'the table and all its global secondary indexes ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html). ' +
            'KMS action wildcards (kms:ReEncrypt*, kms:GenerateDataKey*) are added by key.grantEncryptDecrypt() ' +
            'and are scoped to the specific customer-managed key ARN ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awskeymanagementservice.html).',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    return apiHandlerRole;
  }

  /**
   * Creates environment variables for the API handler Lambda
   */
  private createApiHandlerEnvironment() {
    const environment: { [key: string]: string } = {
      // PowerTools configuration
      POWERTOOLS_DEV: this.props.powertoolsDevLogging ?? 'false',
      LOG_LEVEL: 'INFO',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_SERVICE_NAME: 'chatbot',
      POWERTOOLS_METRICS_NAMESPACE: 'chatbot-admin-restapi',

      // Cognito configuration
      COGNITO_USER_POOL_ID: this.props.userPool.userPoolId,
      COGNITO_APP_CLIENT_ID: this.props.userPoolClient.userPoolClientId,
      COGNITO_REGION: cdk.Aws.REGION,

      // Security and data access
      X_ORIGIN_VERIFY_SECRET_ARN: this.props.xOriginVerifySecret.secretArn,
      SESSIONS_TABLE_NAME: this.props.sessionsTable.tableName,
      FEEDBACK_TABLE_NAME: this.props.feedbackTable.tableName,
      FEEDBACK_REASONS: this.props.feedbackReasons.join(','),
      ADMIN_GROUP: this.props.adminGroup ? this.props.adminGroup.toString() : '',
    };

    // Add service interruption table name if provided
    if (this.props.serviceInterruptionTable) {
      environment.SERVICE_INTERRUPTION_TABLE_NAME = this.props.serviceInterruptionTable.tableName;
    }

    return environment;
  }

  /**
   * Creates CloudWatch alarms for API Gateway health monitoring (5XX, 4XX, latency).
   */
  private createApiAlarms(api: apigateway.RestApi) {
    const alarmConfig = this.props.alarms!;

    // Resolve or create SNS topic for alarm notifications
    const alarmActions = alarmConfig.snsTopicArn
      ? [alarmConfig.snsTopicArn]
      : [
          new MdaaSnsTopic(this, 'AlarmTopic', {
            topicName: 'rest-api-alarms',
            masterKey: this.props.encryptionKey,
            naming: this.props.naming,
            createParams: true,
            createOutputs: false,
          }).topicArn,
        ];

    const apiName = api.restApiName;
    const stageName = api.deploymentStage.stageName;
    const dimensions = { ApiName: apiName, Stage: stageName };

    const createAlarm = (
      id: string,
      name: string,
      config: AlarmThresholdConfig,
      metricName: string,
      statistic: string,
      description: string,
    ) => {
      if (config.enabled === false) return;
      new MdaaAlarm(this, id, {
        alarmName: this.props.naming.resourceName(name, 255),
        metricName,
        namespace: 'AWS/ApiGateway',
        statistic,
        period: config.period ?? 300,
        evaluationPeriods: config.evaluationPeriods ?? 3,
        threshold: config.threshold,
        comparisonOperator: 'GreaterThanThreshold',
        treatMissingData: 'notBreaching',
        alarmDescription: description,
        dimensions,
        alarmActions,
        naming: this.props.naming,
        createParams: true,
        createOutputs: false,
      });
    };

    const error5xx = alarmConfig.error5xxRate ?? { threshold: 5 };
    createAlarm(
      '5xxAlarm',
      'rest-api-5xx-errors',
      error5xx,
      '5XXError',
      'Average',
      `REST API 5XX error rate exceeds ${error5xx.threshold}%`,
    );

    const error4xx = alarmConfig.error4xxRate ?? { threshold: 20 };
    createAlarm(
      '4xxAlarm',
      'rest-api-4xx-errors',
      error4xx,
      '4XXError',
      'Average',
      `REST API 4XX error rate exceeds ${error4xx.threshold}%`,
    );

    const latency = alarmConfig.latencyP99 ?? { threshold: 10000 };
    createAlarm(
      'LatencyAlarm',
      'rest-api-p99-latency',
      latency,
      'Latency',
      'p99',
      `REST API p99 latency exceeds ${latency.threshold}ms`,
    );
  }
}
