import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import * as path from 'path';
import { Shared } from '../../shared';
import { SystemConfig } from '../../shared/types';
import { AuroraPgVector } from '../aurora-pgvector';
import { DataImportWorkflows } from '../data-import';
import { KendraRetrieval } from '../kendra-retrieval';
import { RagDynamoDBTables } from '../rag-dynamodb-tables';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { Effect } from 'aws-cdk-lib/aws-iam';
import { MdaaSqsDeadLetterQueue } from '@aws-mdaa/sqs-constructs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface DeleteWorkspaceProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly dataImport: DataImportWorkflows;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly auroraPgVector?: AuroraPgVector;
  readonly kendraRetrieval?: KendraRetrieval;
  encryptionKey: MdaaKmsKey;
}

export class DeleteWorkspace extends MdaaL3Construct {
  public readonly stateMachine?: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: DeleteWorkspaceProps) {
    super(scope, id, props);

    const deleteFunctionRole = new MdaaLambdaRole(this, 'DeleteFunctionRole', {
      naming: props.naming,
      roleName: 'DeleteWorkspaceFunctionRole',
      logGroupNames: [props.naming.resourceName('delete-workspace-handler')],
      createParams: false,
      createOutputs: false,
    });

    deleteFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
        resources: ['*'],
      }),
    );

    const deleteDlq = new MdaaSqsDeadLetterQueue(this, 'DeleteWorkspaceHandlerDLQ', {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: 'DeleteWorkspaceHandlerHandlerDLQ',
    });

    const deleteWorkspaceHandlerCodePath =
      props.config?.codeOverwrites?.deleteWorkspaceHandlerCodePath !== undefined
        ? props.config.codeOverwrites.deleteWorkspaceHandlerCodePath
        : path.join(__dirname, './functions/delete-workspace-workflow/delete');

    const deleteFunction = new MdaaLambdaFunction(this, 'DeleteWorkspaceFunction', {
      deadLetterQueue: deleteDlq,
      createParams: false,
      createOutputs: false,
      functionName: 'delete-workspace-handler',
      naming: props.naming,
      role: deleteFunctionRole,
      vpc: props.shared.vpc,
      vpcSubnets: { subnets: props.shared.appSubnets },
      code: lambda.Code.fromAsset(deleteWorkspaceHandlerCodePath),
      runtime: props.shared.pythonRuntime,
      architecture: props.shared.lambdaArchitecture,
      handler: 'index.lambda_handler',
      layers: [props.shared.powerToolsLayer, props.shared.commonLayer, props.shared.pythonSDKLayer],
      timeout: cdk.Duration.minutes(15),
      environment: {
        ...props.shared.defaultEnvironmentVariables,
        AURORA_DB_SECRET_ID: props.auroraPgVector?.database.secret?.secretArn as string,
        UPLOAD_BUCKET_NAME: props.dataImport.uploadBucket.bucketName,
        PROCESSING_BUCKET_NAME: props.dataImport.processingBucket.bucketName,
        WORKSPACES_TABLE_NAME: props.ragDynamoDBTables.workspacesTable.tableName,
        WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME: props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
        DOCUMENTS_TABLE_NAME: props.ragDynamoDBTables?.documentsTable.tableName ?? '',
        DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME: props.ragDynamoDBTables?.documentsByCompountKeyIndexName ?? '',
        DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME: props.kendraRetrieval?.kendraS3DataSourceBucket?.bucketName ?? '',
      },
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      deleteFunction,
      [
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
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );
    if (props.auroraPgVector) {
      props.auroraPgVector.database.secret?.grantRead(deleteFunctionRole);
      props.auroraPgVector.database.connections.allowDefaultPortFrom(deleteFunction);
    }
    props.encryptionKey.grantEncryptDecrypt(deleteFunctionRole);
    props.dataImport.uploadBucket.grantReadWrite(deleteFunctionRole);
    props.dataImport.processingBucket.grantReadWrite(deleteFunctionRole);
    props.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(deleteFunctionRole);
    props.ragDynamoDBTables.workspacesTable.grantReadWriteData(deleteFunctionRole);
    props.ragDynamoDBTables.documentsTable.grantReadWriteData(deleteFunctionRole);

    const handleError = new tasks.DynamoUpdateItem(this, 'HandleError', {
      table: props.ragDynamoDBTables.workspacesTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.workspace_id')),
        object_type: tasks.DynamoAttributeValue.fromString('workspace'),
      },
      updateExpression: 'set #status = :error',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':error': tasks.DynamoAttributeValue.fromString('error'),
      },
    }).next(
      new sfn.Fail(this, 'Fail', {
        cause: 'Workspace deletion failed',
      }),
    );

    const setDeleting = new tasks.DynamoUpdateItem(this, 'SetDeleting', {
      table: props.ragDynamoDBTables.workspacesTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.workspace_id')),
        object_type: tasks.DynamoAttributeValue.fromString('workspace'),
      },
      updateExpression: 'set #status=:statusValue',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':statusValue': tasks.DynamoAttributeValue.fromString('deleting'),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const deleteTask = new tasks.LambdaInvoke(this, 'Delete', {
      lambdaFunction: deleteFunction,
      resultPath: '$.deleteResult',
    }).addCatch(handleError, {
      errors: ['States.ALL'],
      resultPath: '$.deleteResult',
    });

    const workflow = setDeleting.next(deleteTask).next(new sfn.Succeed(this, 'Success'));

    const logGroup: logs.LogGroup = new MdaaLogGroup(this, `DeleteWorkspace-loggroup`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: 'delete-workspace',
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: logs.RetentionDays.INFINITE,
    });

    const stateMachine = new sfn.StateMachine(this, 'DeleteWorkspace', {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.minutes(5),
      comment: 'Delete Workspace Workflow',
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    props.encryptionKey.grantEncryptDecrypt(stateMachine);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      deleteFunctionRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Permissions are restrictive to stack resources. Processing s3 bucket managed and deployed by stack, not known at deployment.  KMS key resource deployed and managed by stack, not known at deployment time.',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      stateMachine,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Invoke function restricted to delete workspace lambda.  The lambda arn is not known at deployment time.',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    this.stateMachine = stateMachine;
  }
}
