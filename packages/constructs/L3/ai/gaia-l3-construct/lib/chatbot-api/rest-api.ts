import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import * as path from "path";
import { RagEngines } from "../rag-engines";
import { Shared } from "../shared";
import { SageMakerModelEndpoint, SystemConfig } from "../shared/types";
import {MdaaLambdaFunction, MdaaLambdaRole} from "@aws-mdaa/lambda-constructs";
import {MdaaL3Construct, MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaManagedPolicy, MdaaRole} from "@aws-mdaa/iam-constructs";
import {Effect, ManagedPolicy, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { MdaaLogGroup, MdaaLogGroupProps } from "@aws-mdaa/cloudwatch-constructs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { CfnWebACL, CfnIPSet, CfnLoggingConfiguration, CfnWebACLAssociation, CfnWebACLProps } from "aws-cdk-lib/aws-wafv2";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";

export interface RestApiProps extends MdaaL3ConstructProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
  readonly ragEngines?: RagEngines;
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
  readonly sessionsTable: dynamodb.Table;
  readonly byUserIdIndex: string;
  readonly modelsParameter: ssm.StringParameter;
  readonly models: SageMakerModelEndpoint[];
  readonly allowedCidrs?: string[]
  readonly stageName?: string;
  readonly encryptionKey: MdaaKmsKey;
}

export class RestApi extends MdaaL3Construct {
  public readonly api: apigateway.RestApi;
  private readonly props: RestApiProps
  constructor(scope: Construct, id: string, props: RestApiProps) {
    super(scope, id, props);
    this.props = props


    const apiHandlerRole = new MdaaLambdaRole(this, 'ApiHandlerRole', {
      roleName: 'BackendRestApiHandlerRole',
      logGroupNames: [ this.props.naming.resourceName( "rest-api-handler" ) ],
      naming: props.naming,
      createParams: true,
      createOutputs: false
    })

    apiHandlerRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }));

    const apiHandler = this.createApiHandler( apiHandlerRole )
    
    this.addApiHandlerRolePermissions(apiHandlerRole,apiHandler)

    const chatBotApi = this.createChatbotApi()

    if(this.props.config?.skipApiGatewayDefaultWaf) {
      NagSuppressions.addResourceSuppressions(chatBotApi.deploymentStage.restApi, [
        { id: "NIST.800.53.R5-APIGWAssociatedWithWAF", reason: "For organizations that leverage Firewall Manager to apply WAF, default is to create waf"},
        { id: "PCI.DSS.321-APIGWAssociatedWithWAF", reason: "For organizations that leverage Firewall Manager to apply WAF, default is to create waf"},
        { id: "AwsSolutions-APIG3", reason: "For organizations that leverage Firewall Manager to apply WAF, default is to create waf"}
      ], true)
    } else {
      this.createDefaultWaf(chatBotApi)
    }

    if (this.props.config?.api?.restApiDomainName === undefined) {
      new ssm.StringParameter(this, 'RestApiIdSSMParam', {
        parameterName: this.props.naming.ssmPath('rest/api/id'),
        stringValue: chatBotApi.restApiId
      });
    }


    const v1Resource = chatBotApi.root.addResource("v1");

    const integration = new apigateway.LambdaIntegration( apiHandler, {
      proxy: true,
    } )

    const v1ProxyResource = v1Resource.addResource("{proxy+}");
    v1ProxyResource.addMethod("ANY",integration,{
        requestValidatorOptions: {
          validateRequestParameters: true,
          validateRequestBody: true,
        },
      }
    );

    NagSuppressions.addResourceSuppressions(apiHandlerRole, [
      { id: 'AwsSolutions-IAM4', reason: 'Standard Lambda Execution Managed Policy' },
      { id: 'AwsSolutions-IAM5', reason: 'X-Ray and Comprehend actions only support wildcard, and bedrock foundation models access controlled by application along with region restriction, other resources managed by stack and not known at deployment time' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true)
    
    NagSuppressions.addResourceSuppressions(
      chatBotApi,
      [
        { id: 'NIST.800.53.R5-APIGWSSLEnabled', reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.' },
        { id: 'HIPAA.Security-APIGWSSLEnabled', reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.' },
        { id: 'PCI.DSS.321-APIGWSSLEnabled', reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.' },
        { id: 'NIST.800.53.R5-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        { id: 'HIPAA.Security-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        { id: 'PCI.DSS.321-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
        { id: 'AwsSolutions-APIG4', reason: 'Authorization implemented for non-OPTIONS methods' },
        { id: 'AwsSolutions-COG4', reason: 'Cognito User Pools implemented for non-OPTIONS methods' },
      ],
      true
    );
    this.api = chatBotApi;
  }

  private createDefaultWaf ( chatBotApi: apigateway.RestApi) {
    const ipAllowSet = new CfnIPSet( this, "ip-allow-set", {
      addresses: this.props.allowedCidrs || [],
      ipAddressVersion: "IPV4",
      scope: "REGIONAL",
      name: this.props.naming.resourceName( "ip-allow-set", 255 )
    } )

    const ipAllowRuleProps: CfnWebACL.RuleProperty = {
      name: "ipAllow",
      priority: 0,
      visibilityConfig: {
        cloudWatchMetricsEnabled: false,
        metricName: this.props.naming.resourceName( "ip-allow", 255 ),
        sampledRequestsEnabled: false,
      },
      statement: {
        ipSetReferenceStatement: {
          arn: ipAllowSet.attrArn
        }
      },
      action: {
        allow: {}
      }
    }

    const defaultWafProps: CfnWebACLProps = {
      name: this.props.naming.resourceName( "default-waf", 128 ),
      defaultAction: {
        block: {}
      },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: this.props.naming.resourceName( undefined, 255 ),
        sampledRequestsEnabled: false,
      },
      rules: [
        ipAllowRuleProps
      ]
    }
    const defaultWaf = new CfnWebACL( this, 'default-waf', defaultWafProps )

    const defaultWafLogGroupProps: MdaaLogGroupProps = {
      logGroupName: "genai-admin-default-waf",
      encryptionKey: this.props.encryptionKey,
      // WAF log group destination names must start with aws-waf-logs-
      // https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
      logGroupNamePathPrefix: "aws-waf-logs-",
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false
    }

    const defaultWafLogGroup = new MdaaLogGroup( this, "default-waf-log-group", defaultWafLogGroupProps )

    new CfnLoggingConfiguration( this, 'default-waf-logging-config', {
      logDestinationConfigs: [ defaultWafLogGroup.logGroupArn ],
      resourceArn: defaultWaf.attrArn
    } )

    new CfnWebACLAssociation( this, `default-waf-association`, {
      resourceArn: chatBotApi.deploymentStage.stageArn,
      webAclArn: defaultWaf.attrArn
    } )

  }
  private createChatbotApi () {
    const accessLogGroupProps: MdaaLogGroupProps = {
      logGroupName: "genai-admin-backend-rest-api-access-logs",
      encryptionKey: this.props.encryptionKey,
      logGroupNamePathPrefix: this.props.config.prefix || "",
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false
    }

    const accessLogGroup = new MdaaLogGroup( this, "rest-api-access-log-group", accessLogGroupProps )

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer( this, "cognito-authorizer", {
      authorizerName: this.props.naming.resourceName(),
      resultsCacheTtl: cdk.Duration.seconds( 0 ),
      cognitoUserPools: [ this.props.userPool ],
      identitySource: "method.request.header.Authorization",
    } );

    const chatBotApi = new apigateway.RestApi( this, "ChatBotApi", {
      ...this.generateRestApiProps(cognitoAuthorizer, accessLogGroup)
    });

    if (this.props.config?.api !== undefined) {
      new route53.ARecord(this, "RestApiDnsRecord", { // NOSONAR
        zone: route53.HostedZone.fromLookup(this, 'MainHostedZone', {
          domainName: this.props.config.api.hostedZoneName
        }),
        recordName: this.props.config.api.restApiDomainName,
        target: route53.RecordTarget.fromAlias(new ApiGateway(chatBotApi))
      });

    }

    if ( this.props.config.setApiGateWayAccountCloudwatchRole?.valueOf() ) {
      const cloudwatchRole = new MdaaRole( this, 'cloudwatch-role', {
        roleName: "genai-admin-backend-rest-api-cloudwatch",
        naming: this.props.naming,
        assumedBy: new ServicePrincipal( "apigateway.amazonaws.com" ),
      } )
      cloudwatchRole.addManagedPolicy( MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition( this, "service-role/AmazonAPIGatewayPushToCloudWatchLogs" ) )

      NagSuppressions.addResourceSuppressions(
        cloudwatchRole,
        [
          { id: 'AwsSolutions-IAM4', reason: 'AmazonAPIGatewayPushToCloudWatchLogs provides the minimum required permissions for API Gateway logging to Cloudwatch: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html' }
        ],
        true
      );
      const account = new apigateway.CfnAccount( this, 'api-gw-account', {
        cloudWatchRoleArn: cloudwatchRole.roleArn,
      } );
      chatBotApi.node.addDependency( account )
    }
    return chatBotApi
  }

  private generateRestApiProps (
      cognitoAuthorizer:  apigateway.CognitoUserPoolsAuthorizer,
      accessLogGroup: MdaaLogGroup
  ): apigateway.RestApiProps {
    let props: apigateway.RestApiProps  = {
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      cloudWatchRole: false, //Created below
      defaultCorsPreflightOptions: {
        allowOrigins: this.props.config?.mainDomain ? [this.props.config.mainDomain] : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization", "X-Amz-Date"],
        maxAge: cdk.Duration.minutes(10),
      },
      deploy: true,
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: cognitoAuthorizer,
      },
      deployOptions: {
        stageName: "api",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        tracingEnabled: true,
        metricsEnabled: true,
        throttlingRateLimit: 2500,
        methodOptions: {
          "/*/*": {
            loggingLevel: apigateway.MethodLoggingLevel.INFO,
            cachingEnabled: false,
            cacheDataEncrypted: false
          }
        }
      },
    }
    const apiDomainConfigs = this.props.config.api;
    if (apiDomainConfigs !== undefined) {

      const hostedZone = route53.HostedZone.fromLookup(this, 'RestApiMainHostedZone', {
        domainName: apiDomainConfigs.hostedZoneName
      });

      const certificate = new acm.Certificate(this, 'RestApiCertificate', {
        domainName: apiDomainConfigs.restApiDomainName,
        validation: {
          method: acm.ValidationMethod.DNS,
          props: {
            hostedZone
          }
        }
      });
      const domainProps = {
        domainName: {
          domainName: apiDomainConfigs.restApiDomainName,
          certificate
        }
      }

      props = {
        ...props,
        ...domainProps,
        policy: undefined
      }
    }
    return props
  }

  private addApiHandlerRolePermissions ( apiHandlerRole: MdaaRole, apiHandler: MdaaLambdaFunction ) {
    apiHandlerRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AWSLambdaExecute"
      )
    )

    this.addApiHandlerRoleRagPermissions(apiHandlerRole,apiHandler)

    for ( const model of this.props.models ) {
      apiHandlerRole.addToPolicy(
        new iam.PolicyStatement( {
          actions: [ "sagemaker:InvokeEndpoint" ],
          resources: [ model.endpoint.ref ],
        } )
      );
    }

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement( {
        actions: [
          "comprehend:DetectDominantLanguage",
          "comprehend:DetectSentiment",
        ],
        resources: [ "*" ],
      } )
    );

    this.props.encryptionKey.grantEncryptDecrypt( apiHandlerRole );
    this.props.shared.xOriginVerifySecret.grantRead( apiHandlerRole );
    this.props.shared.apiKeysSecret.grantRead( apiHandlerRole );
    this.props.shared.configParameter.grantRead( apiHandlerRole );
    this.props.modelsParameter.grantRead( apiHandlerRole );
    this.props.sessionsTable.grantReadWriteData( apiHandlerRole );
    this.props.ragEngines?.uploadBucket.grantReadWrite( apiHandlerRole );
    this.props.ragEngines?.processingBucket.grantReadWrite( apiHandlerRole );

    if ( this.props.config.bedrock?.enabled ) {
      if (this.props.config.rag?.engines?.knowledgeBase) {

        apiHandlerRole.addToPolicy(
          new iam.PolicyStatement( {
            actions: [
              "bedrock:ListFoundationModels",
              "bedrock:ListCustomModels",
              "bedrock:InvokeModelWithResponseStream",
              "bedrock:ListAgents",
              "bedrock:ListAgentAliases",
              "bedrock:ListKnowledgeBases",
              "bedrock:GetKnowledgeBase",
              "bedrock:ListDataSources",
              "bedrock:GetDataSource",
              "bedrock:StartIngestionJob",
              "bedrock:StopIngestionJob",
              "bedrock:ListIngestionJobs",
            ],
            resources: [ "*" ],
            conditions: {
              StringEquals: {
                "aws:RequestedRegion": this.props.config.bedrock.region
              }
            }
          } )
        );
      } else {
        apiHandlerRole.addToPolicy(
          new iam.PolicyStatement( {
            actions: [
              "bedrock:ListFoundationModels",
              "bedrock:ListCustomModels",
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream",
              "bedrock:ListAgents",
              "bedrock:ListAgentAliases",
            ],
            resources: [ "*" ],
            conditions: {
              StringEquals: {
                "aws:RequestedRegion": this.props.config.bedrock.region
              }
            }
          } )
        );
      }

      if ( this.props.config.bedrock?.roleArn ) {
        apiHandlerRole.addToPolicy(
          new iam.PolicyStatement( {
            actions: [ "sts:AssumeRole" ],
            resources: [ this.props.config.bedrock.roleArn ],
          } )
        );
      }
    }
  }
  private addApiHandlerRoleRagPermissions ( apiHandlerRole: MdaaRole, apiHandler: MdaaLambdaFunction ) {
    if ( this.props.ragEngines?.workspacesTable ) {
      this.props.ragEngines.workspacesTable.grantReadWriteData( apiHandlerRole );
    }

    if ( this.props.ragEngines?.documentsTable ) {
      this.props.ragEngines.documentsTable.grantReadWriteData( apiHandlerRole );
    }

    this.addApiHandlerRoleAuroraRagPermissions(apiHandlerRole,apiHandler)

    this.addApiHandlerRoleKendraRagPermissions(apiHandlerRole)
    this.addApiHandlerRoleBedrockRagPermissions(apiHandlerRole)
    this.addApiHandlerRoleRagWorkflowPermissions(apiHandlerRole)

  }
  
  private addApiHandlerRoleRagWorkflowPermissions ( apiHandlerRole: MdaaRole ) {
    if ( this.props.ragEngines?.fileImportWorkflow ) {
      this.props.ragEngines.fileImportWorkflow.grantStartExecution( apiHandlerRole );
    }

    if ( this.props.ragEngines?.websiteCrawlingWorkflow ) {
      this.props.ragEngines.websiteCrawlingWorkflow.grantStartExecution( apiHandlerRole );
    }

    if ( this.props.ragEngines?.deleteWorkspaceWorkflow ) {
      this.props.ragEngines.deleteWorkspaceWorkflow.grantStartExecution( apiHandlerRole );
    }
  }
  
  private addApiHandlerRoleAuroraRagPermissions ( apiHandlerRole: MdaaRole, apiHandler: MdaaLambdaFunction ) {
    if ( this.props.ragEngines?.auroraPgVector ) {
      this.props.ragEngines.auroraPgVector.database.secret?.grantRead( apiHandlerRole );
      this.props.ragEngines.auroraPgVector.database.connections.allowDefaultPortFrom(
        apiHandler
      );

      this.props.ragEngines.auroraPgVector.createAuroraWorkspaceWorkflow.grantStartExecution(
        apiHandlerRole
      );
    }
  }

  private addApiHandlerRoleBedrockRagPermissions (apiHandlerRole: MdaaRole) {
    if (this.props.config.rag?.engines?.knowledgeBase?.external) {
      for (const item of this.props.config.rag.engines.knowledgeBase.external || []) {
        if (item.roleArn) {
          apiHandlerRole.addToPolicy(
            new iam.PolicyStatement({
              actions: ["sts:AssumeRole"],
              resources: [item.roleArn],
            })
          );
        } else {
          apiHandlerRole.addToPolicy(
            new iam.PolicyStatement({
              actions: [
                  "bedrock:GetKnowledgeBase",
                  "bedrock:ListDataSources",
                  "bedrock:GetDataSource",
                  "bedrock:StartIngestionJob",
                  "bedrock:StopIngestionJob",
                  "bedrock:ListIngestionJobs",
              ],
              resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock:${
                  item.region ?? cdk.Aws.REGION
                }:${cdk.Aws.ACCOUNT_ID}:knowledge-base/${
                  item.kbId
                }`,
              ],
            })
          );
        }
      }
    }
  }
  
  private addApiHandlerRoleKendraRagPermissions ( apiHandlerRole: MdaaRole ) {
    if ( this.props.ragEngines?.kendraRetrieval ) {
      this.props.ragEngines.kendraRetrieval.createKendraWorkspaceWorkflow.grantStartExecution(
        apiHandlerRole
      );

      this.props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(
        apiHandlerRole
      );

      if ( this.props.ragEngines.kendraRetrieval.kendraIndex ) {
        apiHandlerRole.addToPolicy(
          new iam.PolicyStatement( {
            actions: [
              "kendra:Retrieve",
              "kendra:Query",
              "kendra:BatchDeleteDocument",
              "kendra:BatchPutDocument",
              "kendra:StartDataSourceSyncJob",
              "kendra:DescribeDataSourceSyncJob",
              "kendra:StopDataSourceSyncJob",
              "kendra:ListDataSourceSyncJobs",
              "kendra:ListDataSources",
              "kendra:DescribeIndex",
            ],
            resources: [
              this.props.ragEngines.kendraRetrieval.kendraIndex.attrArn,
              `${ this.props.ragEngines.kendraRetrieval.kendraIndex.attrArn }/*`,
            ],
          } )
        );
      }

      for ( const item of this.props.config.rag?.engines.kendra?.external || [] ) {
        if ( item.roleArn ) {
          apiHandlerRole.addToPolicy(
            new iam.PolicyStatement( {
              actions: [ "sts:AssumeRole" ],
              resources: [ item.roleArn ],
            } )
          );
        } else {
          apiHandlerRole.addToPolicy(
            new iam.PolicyStatement( {
              actions: [ "kendra:Retrieve", "kendra:Query" ],
              resources: [
                `arn:${ cdk.Aws.PARTITION }:kendra:${ item.region }:${ cdk.Aws.ACCOUNT_ID }:index/${ item.kendraId }`,
              ],
            } )
          );
        }
      }
    }
  }
  
  private createApiHandler ( apiHandlerRole: iam.IRole) {
    let codeAssets = this.props.config?.codeOverwrites?.restApiHandlerCodePath !== undefined ?
        this.props.config.codeOverwrites.restApiHandlerCodePath : path.join( __dirname, "./functions/api-handler" )
    const apiHandler = new MdaaLambdaFunction( this, "ApiHandler", {
      functionName: "rest-api-handler", naming: this.props.naming, role: apiHandlerRole,
      createParams: true,
      createOutputs: false,
      code: lambda.Code.fromAsset(codeAssets),
      handler: "index.handler",
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      timeout: cdk.Duration.minutes( 10 ),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      layers: [
        this.props.shared.powerToolsLayer,
        this.props.shared.commonLayer,
        this.props.shared.pythonSDKLayer,
      ],
      vpc: this.props.shared.vpc,
      securityGroups: [ this.props.shared.appSecurityGroup ],
      vpcSubnets: { subnets: this.props.shared.appSubnets },
      environment: this.createApiHandlerEnvironment()
    } );

    if (this.props.config?.concurrency?.restApiConcurrentLambdas !== undefined) {
      const version = apiHandler.currentVersion

      new lambda.Alias( this, "ApiHandlerAlias", {
        aliasName: "live",
        version,
        provisionedConcurrentExecutions: this.props.config?.concurrency?.restApiConcurrentLambdas || 1,
      } )
    }


    NagSuppressions.addResourceSuppressions(
      apiHandler,
      [
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'PCI.DSS.321-LambdaDLQ', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' }
      ],
      true
    );
    return apiHandler
  }

  private createApiHandlerEnvironment() {
    return {
      ...this.props.shared.defaultEnvironmentVariables,
      POWERTOOLS_METRICS_NAMESPACE: 'chatbot-admin-restapi',
      CONFIG_PARAMETER_NAME: this.props.shared.configParameter.parameterName,
      MODELS_PARAMETER_NAME: this.props.modelsParameter.parameterName,
      COGNITO_USER_POOL_ID:  this.props.userPool.userPoolId,
      COGNITO_APP_CLIENT_ID:  this.props.userPoolClient.userPoolClientId,
      COGNITO_REGION: cdk.Aws.REGION,
      CORS_ALLOWED_ORIGINS: this.props.config?.mainDomain || "*",
      X_ORIGIN_VERIFY_SECRET_ARN: this.props.shared.xOriginVerifySecret.secretArn,
      API_KEYS_SECRETS_ARN: this.props.shared.apiKeysSecret.secretArn,
      SESSIONS_TABLE_NAME: this.props.sessionsTable.tableName,
      SESSIONS_BY_USER_ID_INDEX_NAME: this.props.byUserIdIndex,
      UPLOAD_BUCKET_NAME: this.props.ragEngines?.uploadBucket?.bucketName ?? "",
      PROCESSING_BUCKET_NAME:
        this.props.ragEngines?.processingBucket?.bucketName ?? "",
      AURORA_DB_SECRET_ID: this.props.ragEngines?.auroraPgVector?.database?.secret
        ?.secretArn as string,
      WORKSPACES_TABLE_NAME:
        this.props.ragEngines?.workspacesTable.tableName ?? "",
      WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
        this.props.ragEngines?.workspacesByObjectTypeIndexName ?? "",
      DOCUMENTS_TABLE_NAME: this.props.ragEngines?.documentsTable.tableName ?? "",
      DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
        this.props.ragEngines?.documentsByCompountKeyIndexName ?? "",
      SAGEMAKER_RAG_MODELS_ENDPOINT: "",
      DELETE_WORKSPACE_WORKFLOW_ARN:
        this.props.ragEngines?.deleteWorkspaceWorkflow?.stateMachineArn ?? "",
      CREATE_AURORA_WORKSPACE_WORKFLOW_ARN:
        this.props.ragEngines?.auroraPgVector?.createAuroraWorkspaceWorkflow
          ?.stateMachineArn ?? "",
      FILE_IMPORT_WORKFLOW_ARN:
        this.props.ragEngines?.fileImportWorkflow?.stateMachineArn ?? "",
      WEBSITE_CRAWLING_WORKFLOW_ARN:
        this.props.ragEngines?.websiteCrawlingWorkflow?.stateMachineArn ?? "",
      ...this.createKendraHandlerEnv()
    }
  }
  private createKendraHandlerEnv () {
    return {
      DEFAULT_KENDRA_INDEX_ID:
        this.props.ragEngines?.kendraRetrieval?.kendraIndex?.attrId ?? "",
      DEFAULT_KENDRA_INDEX_NAME:
        this.props.ragEngines?.kendraRetrieval?.kendraIndex?.name ?? "",
      DEFAULT_KENDRA_S3_DATA_SOURCE_ID:
        this.props.ragEngines?.kendraRetrieval?.kendraS3DataSource?.attrId ?? "",
      DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME:
        this.props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket
          ?.bucketName ?? "",
      CREATE_KENDRA_WORKSPACE_WORKFLOW_ARN:
        this.props.ragEngines?.kendraRetrieval?.createKendraWorkspaceWorkflow
          ?.stateMachineArn ?? "",
    }
  }
}
