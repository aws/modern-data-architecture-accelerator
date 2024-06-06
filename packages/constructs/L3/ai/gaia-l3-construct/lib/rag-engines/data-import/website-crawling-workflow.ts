import { MdaaLogGroup } from "@aws-mdaa/cloudwatch-constructs";
import { MdaaConstructProps } from "@aws-mdaa/construct";
import { MdaaSqsDeadLetterQueue } from "@aws-mdaa/sqs-constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import { MdaaLambdaFunction } from "@aws-mdaa/lambda-constructs";
import { MdaaRole } from "@aws-mdaa/iam-constructs";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

export interface WebsiteCrawlingWorkflowProps extends MdaaConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly auroraDatabase?: rds.DatabaseCluster;
  readonly processingBucket: s3.Bucket;
  readonly sageMakerRagModelsEndpoint?: sagemaker.CfnEndpoint;
  encryptionKey: MdaaKmsKey;
}

export class WebsiteCrawlingWorkflow extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(
    scope: Construct,
    id: string,
    props: WebsiteCrawlingWorkflowProps
  ) {
    super(scope, id);

    const uploadDlq = new MdaaSqsDeadLetterQueue( this, "WebsiteParserFunctionDLQ", {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "WebsiteParserFunctionDLQ"
    } );

    const websitParserRole = new MdaaRole( this, "WebsiteParserFunctionRole", {
      naming: props.naming,
      roleName:  "WebsiteParserFunctionRole",
      createParams: false,
      createOutputs: false,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })

    websitParserRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }));

    const websiteParserCodePath = props.config?.codeOverwrites?.websiteParserCodePath !== undefined ?
        props.config.codeOverwrites.websiteParserCodePath :
        path.join(
            __dirname,
            "./functions/website-crawling-workflow/website-parser"
        )

    const websiteParserFunction = new MdaaLambdaFunction(
      this,
      "WebsiteParserFunction",
      {
        functionName: "WebsiteParserFunction",
        deadLetterQueue: uploadDlq,
        vpc: props.shared.vpc,
        vpcSubnets: { subnets: props.shared.appSubnets},
        code: lambda.Code.fromAsset(websiteParserCodePath),
        runtime: props.shared.pythonRuntime,
        architecture: props.shared.lambdaArchitecture,
        memorySize: 1024,
        handler: "index.lambda_handler",
        layers: [
          props.shared.powerToolsLayer,
          props.shared.commonLayer,
          props.shared.pythonSDKLayer,
        ],
        timeout: cdk.Duration.minutes(15),
        naming: props.naming,
        role: websitParserRole,
        createParams: false,
        createOutputs: false,
        environment: {
          ...props.shared.defaultEnvironmentVariables,
          CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
          API_KEYS_SECRETS_ARN: props.shared.apiKeysSecret.secretArn,
          AURORA_DB_SECRET_ID: props.auroraDatabase?.secret
            ?.secretArn as string,
          PROCESSING_BUCKET_NAME: props.processingBucket.bucketName,
          WORKSPACES_TABLE_NAME:
            props.ragDynamoDBTables.workspacesTable.tableName,
          WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
            props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
          DOCUMENTS_TABLE_NAME:
            props.ragDynamoDBTables.documentsTable.tableName ?? "",
          DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
            props.ragDynamoDBTables.documentsByCompountKeyIndexName ?? "",
          SAGEMAKER_RAG_MODELS_ENDPOINT:
            props.sageMakerRagModelsEndpoint?.attrEndpointName ?? ""
        }
      }
    );

    NagSuppressions.addResourceSuppressions( websiteParserFunction, [
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function will be throttled by upstream services.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function will be throttled by upstream services.' },
    ], true );

    props.shared.configParameter.grantRead(websitParserRole);
    props.shared.apiKeysSecret.grantRead(websitParserRole);
    props.encryptionKey.grantEncryptDecrypt(websitParserRole);
    props.processingBucket.grantReadWrite(websitParserRole);
    props.ragDynamoDBTables.workspacesTable.grantReadWriteData(
        websitParserRole
    );
    props.ragDynamoDBTables.documentsTable.grantReadWriteData(
        websitParserRole
    );

    if (props.auroraDatabase) {
      props.auroraDatabase.secret?.grantRead(websitParserRole);
      props.auroraDatabase.connections.allowDefaultPortFrom(
        websiteParserFunction
      );
    }

    if (props.sageMakerRagModelsEndpoint) {
      websitParserRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sagemaker:InvokeEndpoint"],
          resources: [props.sageMakerRagModelsEndpoint.ref],
        })
      );
    }

    if (props.config.bedrock?.enabled) {
      websitParserRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: ["*"],
          conditions: {
            StringEquals: {
              "aws:RequestedRegion": props.config.bedrock.region
            }
          }
        })
      );

      if (props.config.bedrock?.roleArn) {
        websitParserRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: [props.config.bedrock.roleArn],
          })
        );
      }
    }

    const handleError = new tasks.DynamoUpdateItem(this, "HandleError", {
      table: props.ragDynamoDBTables.documentsTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.workspace_id")
        ),
        document_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.document_id")
        ),
      },
      updateExpression: "set #status = :error",
      expressionAttributeNames: {
        "#status": "status",
      },
      expressionAttributeValues: {
        ":error": tasks.DynamoAttributeValue.fromString("error"),
      },
    });

    handleError.next(
      new sfn.Fail(this, "Fail", {
        cause: "Import failed",
      })
    );

    const setProcessing = new tasks.DynamoUpdateItem(this, "SetProcessing", {
      table: props.ragDynamoDBTables.documentsTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.workspace_id")
        ),
        document_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.document_id")
        ),
      },
      updateExpression: "set #status=:statusValue",
      expressionAttributeNames: {
        "#status": "status",
      },
      expressionAttributeValues: {
        ":statusValue": tasks.DynamoAttributeValue.fromString("processing"),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const setProcessed = new tasks.DynamoUpdateItem(this, "SetProcessed", {
      table: props.ragDynamoDBTables.documentsTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.workspace_id")
        ),
        document_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.document_id")
        ),
      },
      updateExpression: "set #status=:statusValue",
      expressionAttributeNames: {
        "#status": "status",
      },
      expressionAttributeValues: {
        ":statusValue": tasks.DynamoAttributeValue.fromString("processed"),
      },
      resultPath: sfn.JsonPath.DISCARD,
    }).next(new sfn.Succeed(this, "Success"));

    const checkDoneCondition = new sfn.Choice(this, "Done?");
    const parserStep = new tasks.LambdaInvoke(this, "WebsiteParser", {
      lambdaFunction: websiteParserFunction,
      outputPath: "$.Payload",
    })
      .addCatch(handleError, {
        errors: ["States.ALL"],
        resultPath: "$.parsingResult",
      })
      .next(checkDoneCondition);

    const workflow = setProcessing.next(checkDoneCondition);
    checkDoneCondition
      .when(sfn.Condition.booleanEquals("$.done", false), parserStep)
      .otherwise(setProcessed);

    const logGroup: logs.LogGroup = new MdaaLogGroup( this, `WebsiteCrawling-log-group`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: "website-crawling",
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: logs.RetentionDays.INFINITE
    } )

    const stateMachine = new sfn.StateMachine(this, "WebsiteCrawlingStateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.minutes(120),
      comment: "Website crawling workflow",
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL
      },
    });

    props.encryptionKey.grantEncryptDecrypt(stateMachine);

    stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["events:CreateRule", "events:PutRule", "events:PutTargets"],
        resources: ["*"],
      })
    );

    NagSuppressions.addResourceSuppressions( websitParserRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed policies are restrictive, logs group resource unknown at deployment and only used during deployment',
      },
      { id: 'AwsSolutions-IAM5', reason: 'AmazonEC2ContainerServiceforEC2Role is restrictive enough.  Resources actions for ECS only support widlcard log group name not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy maintained by MDAA framework.'},
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy maintained by MDAA framework.'},
    ], true );

    NagSuppressions.addResourceSuppressions(websiteParserFunction, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed policies are restrictive, logs group resource unknown at deployment and only used during deployment'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Policy restricted to stack managed processing bucket and embedding model invoke endpoint unknown at deployment'
      },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true)

    NagSuppressions.addResourceSuppressions(stateMachine, [
      { id: 'AwsSolutions-IAM5', reason: 'Permissions are restrictive to stack resources. Processing s3 bucket managed and deployed by stack, not known at deployment.  KMS key resource deployed and managed by stack, not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true)

    this.stateMachine = stateMachine;
  }
}
