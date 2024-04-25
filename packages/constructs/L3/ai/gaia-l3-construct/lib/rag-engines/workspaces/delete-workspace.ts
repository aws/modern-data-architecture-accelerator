import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import * as path from "path";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { AuroraPgVector } from "../aurora-pgvector";
import { DataImportWorkflows } from "../data-import";
import { KendraRetrieval } from "../kendra-retrieval";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {CaefLambdaFunction, CaefLambdaRole} from "@aws-caef/lambda-constructs";
import {Effect} from "aws-cdk-lib/aws-iam";
import { CaefSqsDeadLetterQueue } from "@aws-caef/sqs-constructs";
import { CaefLogGroup } from "@aws-caef/cloudwatch-constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import {CaefKmsKey} from "@aws-caef/kms-constructs";
import * as iam from "aws-cdk-lib/aws-iam";


export interface DeleteWorkspaceProps extends CaefL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly dataImport: DataImportWorkflows;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly auroraPgVector?: AuroraPgVector;
  readonly kendraRetrieval?: KendraRetrieval;
  encryptionKey: CaefKmsKey;
}

export class DeleteWorkspace extends CaefL3Construct {
  public readonly stateMachine?: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: DeleteWorkspaceProps) {
    super(scope, id, props);

    const deleteFunctionRole = new CaefLambdaRole(this, 'DeleteFunctionRole', {
      naming: props.naming,
      roleName: 'DeleteWorkspaceFunctionRole',
      logGroupNames: [props.naming.resourceName('delete-workspace-handler')],
      createParams: false,
      createOutputs: false,
    })

    deleteFunctionRole.addToPolicy(new iam.PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }))

    const deleteDlq = new CaefSqsDeadLetterQueue( this, "DeleteWorkspaceHandlerDLQ", {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: "DeleteWorkspaceHandlerHandlerDLQ"
    } );

    const deleteWorkspaceHandlerCodePath = props.config?.codeOverwrites?.deleteWorkspaceHandlerCodePath !== undefined ?
        props.config.codeOverwrites.deleteWorkspaceHandlerCodePath :
        path.join(__dirname, "./functions/delete-workspace-workflow/delete")

    const deleteFunction = new CaefLambdaFunction(
      this,
      "DeleteWorkspaceFunction",
      {
        deadLetterQueue: deleteDlq,
        createParams: false,
        createOutputs: false,
        functionName: "delete-workspace-handler",
        naming: props.naming, role: deleteFunctionRole,
        vpc: props.shared.vpc,
        vpcSubnets: { subnets: props.shared.appSubnets },
        code: lambda.Code.fromAsset(deleteWorkspaceHandlerCodePath),
        runtime: props.shared.pythonRuntime,
        architecture: props.shared.lambdaArchitecture,
        handler: "index.lambda_handler",
        layers: [
          props.shared.powerToolsLayer,
          props.shared.commonLayer,
          props.shared.pythonSDKLayer,
        ],
        timeout: cdk.Duration.minutes(15),
        environment: {
          ...props.shared.defaultEnvironmentVariables,
          AURORA_DB_SECRET_ID: props.auroraPgVector?.database.secret
            ?.secretArn as string,
          UPLOAD_BUCKET_NAME: props.dataImport.uploadBucket.bucketName,
          PROCESSING_BUCKET_NAME: props.dataImport.processingBucket.bucketName,
          WORKSPACES_TABLE_NAME:
            props.ragDynamoDBTables.workspacesTable.tableName,
          WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
            props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
          DOCUMENTS_TABLE_NAME:
            props.ragDynamoDBTables?.documentsTable.tableName ?? "",
          DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
            props.ragDynamoDBTables?.documentsByCompountKeyIndexName ?? "",
          DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME:
            props.kendraRetrieval?.kendraS3DataSourceBucket?.bucketName ?? ""
        }
      }
    );
    NagSuppressions.addResourceSuppressions(
      deleteFunction,
      [
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' },
        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.' }
      ],
      true
    );
    if (props.auroraPgVector) {
      props.auroraPgVector.database.secret?.grantRead(deleteFunctionRole);
      props.auroraPgVector.database.connections.allowDefaultPortFrom(
        deleteFunction
      );
    }
    props.encryptionKey.grantEncryptDecrypt(deleteFunctionRole);
    props.dataImport.uploadBucket.grantReadWrite(deleteFunctionRole);
    props.dataImport.processingBucket.grantReadWrite(deleteFunctionRole);
    props.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(
        deleteFunctionRole
    );
    props.ragDynamoDBTables.workspacesTable.grantReadWriteData(deleteFunctionRole);
    props.ragDynamoDBTables.documentsTable.grantReadWriteData(deleteFunctionRole);

    const handleError = new tasks.DynamoUpdateItem(this, "HandleError", {
      table: props.ragDynamoDBTables.workspacesTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.workspace_id")
        ),
        object_type: tasks.DynamoAttributeValue.fromString("workspace"),
      },
      updateExpression: "set #status = :error",
      expressionAttributeNames: {
        "#status": "status",
      },
      expressionAttributeValues: {
        ":error": tasks.DynamoAttributeValue.fromString("error"),
      },
    }).next(
      new sfn.Fail(this, "Fail", {
        cause: "Workspace deletion failed",
      })
    );

    const setDeleting = new tasks.DynamoUpdateItem(this, "SetDeleting", {
      table: props.ragDynamoDBTables.workspacesTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.workspace_id")
        ),
        object_type: tasks.DynamoAttributeValue.fromString("workspace"),
      },
      updateExpression: "set #status=:statusValue",
      expressionAttributeNames: {
        "#status": "status",
      },
      expressionAttributeValues: {
        ":statusValue": tasks.DynamoAttributeValue.fromString("deleting"),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const deleteTask = new tasks.LambdaInvoke(this, "Delete", {
      lambdaFunction: deleteFunction,
      resultPath: "$.deleteResult",
    }).addCatch(handleError, {
      errors: ["States.ALL"],
      resultPath: "$.deleteResult",
    });

    const workflow = setDeleting
      .next(deleteTask)
      .next(new sfn.Succeed(this, "Success"));

    const logGroup: logs.LogGroup = new CaefLogGroup( this, `DeleteWorkspace-loggroup`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: "delete-workspace",
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: logs.RetentionDays.INFINITE
    } )

    const stateMachine = new sfn.StateMachine(this, "DeleteWorkspace", {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.minutes(5),
      comment: "Delete Workspace Workflow",
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL
      },
    });

    NagSuppressions.addResourceSuppressions(deleteFunctionRole, [
      { id: 'AwsSolutions-IAM5', reason: 'Permissions are restrictive to stack resources. Processing s3 bucket managed and deployed by stack, not known at deployment.  KMS key resource deployed and managed by stack, not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
    ], true)

    NagSuppressions.addResourceSuppressions(stateMachine, [
      { id: 'AwsSolutions-IAM5', reason: 'Invoke function restricted to delete workspace lambda.  The lambda arn is not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by CAEF framework.' },
    ], true)

    this.stateMachine = stateMachine;
  }
}
