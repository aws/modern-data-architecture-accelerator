import * as path from "path";
import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {SystemConfig} from "../../shared/types";
import {Shared} from "../../shared";
import { FileImportBatchJob } from "./file-import-batch-job";
import {RagDynamoDBTables} from "../rag-dynamodb-tables";
import { FileImportWorkflow } from "./file-import-workflow";
import { WebsiteCrawlingWorkflow } from "./website-crawling-workflow";
import {KendraRetrieval} from "../kendra-retrieval";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import {MdaaL3Construct, MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaBucket} from "@aws-mdaa/s3-constructs";
import {MdaaSqsDeadLetterQueue, MdaaSqsQueue} from "@aws-mdaa/sqs-constructs";
import {MdaaLambdaFunction} from "@aws-mdaa/lambda-constructs";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {NagSuppressions} from "cdk-nag";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";

export interface DataImportProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly auroraDatabase?: rds.DatabaseCluster;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly kendraRetrieval?: KendraRetrieval;
  readonly workspacesTable: dynamodb.Table;
  readonly documentsTable: dynamodb.Table;
  readonly workspacesByObjectTypeIndexName: string;
  readonly documentsByCompountKeyIndexName: string;
  encryptionKey: MdaaKmsKey
}

export class DataImportWorkflows extends MdaaL3Construct {
  public readonly uploadBucket: MdaaBucket;
  public readonly processingBucket: MdaaBucket;
  public readonly ingestionQueue: MdaaSqsQueue;
  public readonly fileImportWorkflow: sfn.StateMachine;
  public readonly websiteCrawlingWorkflow: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: DataImportProps) {
    super(scope, id, props);

    const queueKey = new MdaaKmsKey(this, 'DataImportQueuesKey', {
      alias:  props.naming.resourceName('DataImportQueuesKey'),
      naming: props.naming,
      createParams: false,
      createOutputs: false,
    })

    const ingestionDealLetterQueue = new MdaaSqsDeadLetterQueue(
      this,
      "DataImportWorkFlowDLQ",
      {
        encryptionMasterKey: queueKey,
        naming: props.naming,
        createParams: false,
        createOutputs: false,
        queueName: "DataImportWorkFlowDLQ",
        visibilityTimeout: cdk.Duration.seconds(900)
      }
    );

    const ingestionQueue = new MdaaSqsQueue(this, "IngestionQueue", {
      encryptionMasterKey: queueKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "VectorDBDataIngestion",
      visibilityTimeout: cdk.Duration.seconds(900),
      deadLetterQueue: {
        queue: ingestionDealLetterQueue,
        maxReceiveCount: 3,
      }
    });

    const uploadBucket = new MdaaBucket(this, "UploadBucket", {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      bucketName: `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-rag-upload-bucket`,
      createParams: false,
      createOutputs: false,
      transferAcceleration: true,
    });
    NagSuppressions.addResourceSuppressions(
      uploadBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' }
      ],
      true
    );
    uploadBucket.addCorsRule({
      allowedHeaders: ["*"],
      allowedMethods: [
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.GET,
        s3.HttpMethods.HEAD,
      ],
      allowedOrigins: ["*"],
      exposedHeaders: ["ETag"],
      maxAge: 3000,
    })


    uploadBucket.addObjectCreatedNotification(
        new s3Notifications.SqsDestination(ingestionQueue)
    );

    uploadBucket.addObjectRemovedNotification(
        new s3Notifications.SqsDestination(ingestionQueue)
    );

    const processingBucket = new MdaaBucket(this, "ProcessingBucket", {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      bucketName: `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-rag-processing-bucket`,
      createParams: false,
      createOutputs: false,
    });

    NagSuppressions.addResourceSuppressions(
      processingBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' }
      ],
      true
    );

    const fileImportBatchJob = new FileImportBatchJob(
      this,
      "FileImportBatchJob",
      {
        encryptionKey:  props.encryptionKey,
        naming: props.naming,
        roleHelper:  props.roleHelper,
        shared: props.shared,
        config: props.config,
        uploadBucket,
        processingBucket,
        auroraDatabase: props.auroraDatabase,
        ragDynamoDBTables: props.ragDynamoDBTables,
      }
    );

    const fileImportWorkflow = new FileImportWorkflow(
      this,
      "FileImportWorkflow",
      {
        encryptionKey: props.encryptionKey,
        naming: props.naming,
        shared: props.shared,
        config: props.config,
        fileImportBatchJob,
        ragDynamoDBTables: props.ragDynamoDBTables,
      }
    );

    const websiteCrawlingWorkflow = new WebsiteCrawlingWorkflow(
      this,
      "WebsiteCrawlingWorkflow",
      {
        encryptionKey: props.encryptionKey,
        naming: props.naming,
        shared: props.shared,
        config: props.config,
        processingBucket,
        auroraDatabase: props.auroraDatabase,
        ragDynamoDBTables: props.ragDynamoDBTables,
      }
    );

    const uploadHandlerRole =  new MdaaRole(this, 'UploadHandlerRole', {
      naming: props.naming,
      roleName:  'VectorDbDataIngestionHandlerRole',
      createParams: false,
      createOutputs: false,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })

    uploadHandlerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }))

    const uploadDlq = new MdaaSqsDeadLetterQueue( this, "UploadHandlerDLQ", {
      encryptionMasterKey: queueKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "UploadHandlerDLQ"
    } );

    const dataImportUploadHandlerCodePath = props.config?.codeOverwrites?.dataImportUploadHandlerCodePath !== undefined ?
        props.config.codeOverwrites.dataImportUploadHandlerCodePath : path.join(__dirname, "./functions/upload-handler")

    const uploadHandler = new MdaaLambdaFunction(this, "UploadHandler", {
      functionName: "VectorDbDataIngestionHandler", naming: props.naming, role: uploadHandlerRole,
      createParams: false,
      createOutputs: false,
      code: lambda.Code.fromAsset(dataImportUploadHandlerCodePath),
      deadLetterQueue: uploadDlq,
      handler: "index.lambda_handler",
      runtime: props.shared.pythonRuntime,
      architecture: props.shared.lambdaArchitecture,
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      layers: [
        props.shared.powerToolsLayer,
        props.shared.commonLayer,
        props.shared.pythonSDKLayer,
      ],
      vpc: props.shared.vpc,
      vpcSubnets: { subnets: props.shared.appSubnets },
      environment: {
        ...props.shared.defaultEnvironmentVariables,
        CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
        API_KEYS_SECRETS_ARN: props.shared.apiKeysSecret.secretArn,
        PROCESSING_BUCKET_NAME: processingBucket.bucketName,
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
        WORKSPACES_TABLE_NAME: props.workspacesTable?.tableName ?? "",
        WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
          props.workspacesByObjectTypeIndexName ?? "",
        DOCUMENTS_TABLE_NAME: props.documentsTable.tableName ?? "",
        DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
          props.documentsByCompountKeyIndexName ?? "",
        SAGEMAKER_RAG_MODELS_ENDPOINT: "",
        FILE_IMPORT_WORKFLOW_ARN:
          fileImportWorkflow?.stateMachine.stateMachineArn ?? "",
        DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME:
          props.kendraRetrieval?.kendraS3DataSourceBucket?.bucketName ?? "",
      }
    });

    NagSuppressions.addResourceSuppressions( uploadHandler, [
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is S3 Event handler. S3 service will provide concurrency and anti-hammering protections.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is S3 Event handler. S3 service will provide concurrency and anti-hammering protections.' },
      { id: 'AwsSolutions-IAM5', reason: 'X-Ray actions only accept wildcard and s3 operations restricted to kms key and s3 buckets managed by stack' }
    ], true );

    uploadBucket.grantReadWrite(uploadHandlerRole);
    processingBucket.grantReadWrite(uploadHandlerRole);
    queueKey.grantEncryptDecrypt(uploadHandlerRole);
    props.encryptionKey.grantEncryptDecrypt(uploadHandlerRole);
    props.shared.apiKeysSecret.grantRead(uploadHandlerRole);
    props.shared.configParameter.grantRead(uploadHandlerRole);
    props.workspacesTable.grantReadWriteData(uploadHandlerRole);
    props.documentsTable.grantReadWriteData(uploadHandlerRole);
    props.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(
        uploadHandlerRole
    );

    ingestionQueue.grantConsumeMessages(uploadHandlerRole);
    fileImportWorkflow.stateMachine.grantStartExecution(uploadHandlerRole);

    if (props.config.bedrock?.roleArn) {
      uploadHandlerRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: [props.config.bedrock.roleArn],
        })
      );
    }

    uploadHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(ingestionQueue)
    );

    NagSuppressions.addResourceSuppressions(uploadHandlerRole, [
      { id: 'AwsSolutions-IAM5', reason: 'X-Ray actions only accept wildcard and s3 operations restricted to kms key and s3 buckets managed by stack' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true)

    this.uploadBucket = uploadBucket;
    this.processingBucket = processingBucket;
    this.ingestionQueue = ingestionQueue;
    this.fileImportWorkflow = fileImportWorkflow.stateMachine;
    this.websiteCrawlingWorkflow = websiteCrawlingWorkflow.stateMachine;
  }
}
