import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import {CfnEndpoint} from "aws-cdk-lib/aws-sagemaker";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import {Construct} from "constructs";
import * as path from "path";
import {RagEngines} from "../../rag-engines";
import {Shared} from "../../shared";
import {SystemConfig} from "../../shared/types";
import {CaefLambdaFunction, CaefLambdaRole} from "@aws-caef/lambda-constructs";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {CaefRole} from "@aws-caef/iam-constructs";
import {CaefSqsDeadLetterQueue, CaefSqsQueue} from "@aws-caef/sqs-constructs";
import {NagSuppressions} from "cdk-nag";
import {CaefKmsKey} from "@aws-caef/kms-constructs";

interface LangChainInterfaceProps extends CaefL3ConstructProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
  readonly ragEngines?: RagEngines;
  readonly messagesTopic: sns.Topic;
  readonly sessionsTable: dynamodb.Table;
  readonly byUserIdIndex: string;
  encryptionKey: CaefKmsKey;
}

export class LangChainInterface extends CaefL3Construct {
  public readonly ingestionQueue: sqs.Queue;
  public readonly requestHandler: CaefLambdaFunction;
  public readonly requestHandlerRole: CaefRole;
  private readonly props: LangChainInterfaceProps
  constructor(scope: Construct, id: string, props: LangChainInterfaceProps) {
    super(scope, id, props);
    this.props = props

    const requestHandlerRole = new CaefLambdaRole(this, 'RequestHandlerRole', {
      naming: props.naming,
      roleName:  'ModelInterfaceRequestHandlerRole',
      logGroupNames: [this.props.naming.resourceName( "model-interface-request-handler" )],
      createParams: false,
      createOutputs: false
    })

    const requestHandler = this.createRequestHandler( requestHandlerRole )

    this.addRequestHandlerRolePermissions( requestHandlerRole, requestHandler )

    const deadLetterQueue = new CaefSqsDeadLetterQueue(this, "LangchainIngestionDLQ", {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "LangChainIngestionDLQ"

    });
    const queue = new CaefSqsQueue(this, "LangchainIngestionQueue", {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "LangChainIngestionQueue",
      visibilityTimeout: cdk.Duration.minutes(15 * 6),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      }
    });

    queue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [queue.queueArn],
        principals: [
          new iam.ServicePrincipal("events.amazonaws.com"),
          new iam.ServicePrincipal("sqs.amazonaws.com"),
        ],
      })
    );

    requestHandler.addEventSource(new lambdaEventSources.SqsEventSource(queue));

    NagSuppressions.addResourceSuppressions(
        requestHandlerRole,
        [
          { id: 'AwsSolutions-IAM5', reason: 'X-Ray, Comprehend, & Bedrock actions only support wildcard, s3 bucket bound to stack managed bucket, and DDB index and KMS key deployed and managed by stack' },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
        ], true);

    NagSuppressions.addResourceSuppressions(
        requestHandler,
    [
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
    ], true)

    this.ingestionQueue = queue;
    this.requestHandler = requestHandler;
    this.requestHandlerRole = requestHandlerRole
  }
  
  private addRequestHandlerRolePermissions ( requestHandlerRole: CaefRole, requestHandler: lambda.IFunction ) {

    requestHandlerRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }));
    
    this.addRequestHandlerRoleBedrockPermissions(requestHandlerRole,requestHandler)
    this.addRequestHandlerRagPermissions( requestHandlerRole, requestHandler )
    this.props.encryptionKey.grantEncryptDecrypt( requestHandlerRole );
    this.props.sessionsTable.grantReadWriteData( requestHandlerRole );
    this.props.messagesTopic.grantPublish( requestHandlerRole );
    this.props.shared.apiKeysSecret.grantRead( requestHandlerRole );
    this.props.shared.configParameter.grantRead( requestHandlerRole );

    requestHandlerRole.addToPolicy(
      new iam.PolicyStatement( {
        actions: [
          "comprehend:DetectDominantLanguage",
          "comprehend:DetectSentiment",
        ],
        resources: [ "*" ],
      } )
    );
  }
  private addRequestHandlerRagPermissions ( requestHandlerRole: CaefRole, requestHandler: lambda.IFunction ) {
    if ( this.props.ragEngines?.auroraPgVector ) {
      this.props.ragEngines?.auroraPgVector.database.secret?.grantRead(
        requestHandlerRole
      );
      this.props.ragEngines?.auroraPgVector.database.connections.allowDefaultPortFrom(
        requestHandler
      );
    }

    if ( this.props.ragEngines ) {
      this.props.ragEngines.workspacesTable.grantReadWriteData( requestHandlerRole );
      this.props.ragEngines.documentsTable.grantReadWriteData( requestHandlerRole );
      if ( this.props.ragEngines?.sageMakerRagModelsEndpoint !== undefined  ) {
        requestHandlerRole.addToPolicy(
            new iam.PolicyStatement( {
              actions: [ "sagemaker:InvokeEndpoint" ],
              resources: [ this.props.ragEngines.sageMakerRagModelsEndpoint.ref ],
            } )
        );
      }
    }

    if ( this.props.ragEngines?.kendraRetrieval ) {
      this.props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket?.grantRead(
        requestHandlerRole
      );

      if ( this.props.ragEngines.kendraRetrieval.kendraIndex ) {
        requestHandlerRole.addToPolicy(
          new iam.PolicyStatement( {
            actions: [ "kendra:Retrieve", "kendra:Query" ],
            resources: [ this.props.ragEngines.kendraRetrieval.kendraIndex.attrArn ],
          } )
        );
      }

      for ( const item of this.props.config.rag?.engines.kendra?.external || [] ) {
        if ( item.roleArn ) {
          requestHandlerRole.addToPolicy(
            new iam.PolicyStatement( {
              actions: [ "sts:AssumeRole" ],
              resources: [ item.roleArn ],
            } )
          );
        } else {
          requestHandlerRole.addToPolicy(
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
  private addRequestHandlerRoleBedrockPermissions ( requestHandlerRole: CaefRole, requestHandler: lambda.IFunction ) {
    if ( this.props.config.bedrock?.enabled ) {
      requestHandlerRole.addToPolicy(
        new iam.PolicyStatement( {
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: [ "*" ],
          conditions: {
            StringEquals: {
              "aws:RequestedRegion": this.props.config.bedrock.region
            }
          }
        } )
      );

      if ( this.props.config.bedrock?.roleArn ) {
        requestHandler.addToRolePolicy(
          new iam.PolicyStatement( {
            actions: [ "sts:AssumeRole" ],
            resources: [ this.props.config.bedrock.roleArn ],
          } )
        );
      }
    }
  }
  private createRequestHandler ( requestHandlerRole : iam.IRole) {
    const langchainInterfaceHandlerCodePath = this.props.config?.codeOverwrites?.langchainInterfaceHandlerCodePath !== undefined ?
        this.props.config.codeOverwrites.langchainInterfaceHandlerCodePath : path.join(__dirname, "./functions/request-handler")
    return new CaefLambdaFunction(this, "RequestHandler", {
      functionName: "model-interface-request-handler", naming: this.props.naming, role: requestHandlerRole,
      createParams: false,
      createOutputs: false,
      vpc: this.props.shared.vpc,
      vpcSubnets: {subnets: this.props.shared.appSubnets},
      code: lambda.Code.fromAsset(langchainInterfaceHandlerCodePath),
      handler: "index.handler",
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      layers: [
        this.props.shared.powerToolsLayer,
        this.props.shared.commonLayer,
        this.props.shared.pythonSDKLayer,
      ],
      environment: this.createRequestHandlerEnv()
    })
  }
  private createRequestHandlerEnv (): { [ key: string ]: string; } | undefined {
    return {
      ...this.props.shared.defaultEnvironmentVariables,
      CONFIG_PARAMETER_NAME: this.props.shared.configParameter.parameterName,
      SESSIONS_TABLE_NAME: this.props.sessionsTable.tableName,
      SESSIONS_BY_USER_ID_INDEX_NAME: this.props.byUserIdIndex,
      API_KEYS_SECRETS_ARN: this.props.shared.apiKeysSecret.secretArn,
      MESSAGES_TOPIC_ARN: this.props.messagesTopic.topicArn,
      WORKSPACES_TABLE_NAME:
        this.props.ragEngines?.workspacesTable.tableName ?? "",
      WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
        this.props.ragEngines?.workspacesByObjectTypeIndexName ?? "",
      DOCUMENTS_TABLE_NAME: this.props.ragEngines?.documentsTable.tableName ?? "",
      DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
        this.props.ragEngines?.documentsByCompountKeyIndexName ?? "",
      AURORA_DB_SECRET_ID: this.props.ragEngines?.auroraPgVector?.database?.secret
        ?.secretArn as string,
      SAGEMAKER_RAG_MODELS_ENDPOINT:
        this.props.ragEngines?.sageMakerRagModelsEndpoint?.attrEndpointName ?? "",
      DEFAULT_KENDRA_INDEX_ID:
        this.props.ragEngines?.kendraRetrieval?.kendraIndex?.attrId ?? "",
      DEFAULT_KENDRA_INDEX_NAME:
        this.props.ragEngines?.kendraRetrieval?.kendraIndex?.name ?? "",
      DEFAULT_KENDRA_S3_DATA_SOURCE_ID:
        this.props.ragEngines?.kendraRetrieval?.kendraS3DataSource?.attrId ?? "",
      DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME:
        this.props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket
          ?.bucketName ?? "",
    }
  }

  public addSageMakerEndpoint({
    endpoint,
    name,
  }: {
    endpoint: CfnEndpoint;
    name: string;
  }) {
    this.requestHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [endpoint.ref],
      })
    );
    const cleanName = name.replace(/[\s.\-_]/g, "").toUpperCase();
    this.requestHandler.addEnvironment(
      `SAGEMAKER_ENDPOINT_${cleanName}`,
      endpoint.attrEndpointName
    );
  }
}
