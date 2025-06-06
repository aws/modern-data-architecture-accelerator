import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SystemConfig } from '../../shared/types';
import { Shared } from '../../shared';
import { FileImportBatchJob } from './file-import-batch-job';
import { RagDynamoDBTables } from '../rag-dynamodb-tables';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface FileImportWorkflowProps extends MdaaConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly fileImportBatchJob: FileImportBatchJob;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  encryptionKey: MdaaKmsKey;
}

export class FileImportWorkflow extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: FileImportWorkflowProps) {
    super(scope, id);

    const setProcessing = new tasks.DynamoUpdateItem(this, 'SetProcessing', {
      table: props.ragDynamoDBTables.documentsTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.workspace_id')),
        document_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.document_id')),
      },
      updateExpression: 'set #status=:statusValue',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':statusValue': tasks.DynamoAttributeValue.fromString('processing'),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const setProcessed = new tasks.DynamoUpdateItem(this, 'SetProcessed', {
      table: props.ragDynamoDBTables.documentsTable,
      key: {
        workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.workspace_id')),
        document_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.document_id')),
      },
      updateExpression: 'set #status=:statusValue',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':statusValue': tasks.DynamoAttributeValue.fromString('processed'),
      },
      resultPath: sfn.JsonPath.DISCARD,
    }).next(new sfn.Succeed(this, 'Success'));

    const fileImportJob = new sfn.CustomState(this, 'FileImportJob', {
      stateJson: {
        Type: 'Task',
        Resource: `arn:${cdk.Aws.PARTITION}:states:::batch:submitJob.sync`,
        Parameters: {
          JobDefinition: props.fileImportBatchJob.fileImportJob.jobDefinitionArn,
          'JobName.$': "States.Format('FileImport-{}-{}', $.workspace_id, $.document_id)",
          JobQueue: props.fileImportBatchJob.jobQueue.jobQueueArn,
          ContainerOverrides: {
            Environment: [
              {
                Name: 'WORKSPACE_ID',
                'Value.$': '$.workspace_id',
              },
              {
                Name: 'DOCUMENT_ID',
                'Value.$': '$.document_id',
              },
              {
                Name: 'INPUT_BUCKET_NAME',
                'Value.$': '$.input_bucket_name',
              },
              {
                Name: 'INPUT_OBJECT_KEY',
                'Value.$': '$.input_object_key',
              },
              {
                Name: 'PROCESSING_BUCKET_NAME',
                'Value.$': '$.processing_bucket_name',
              },
              {
                Name: 'PROCESSING_OBJECT_KEY',
                'Value.$': '$.processing_object_key',
              },
            ],
          },
        },
        ResultPath: '$.job',
      },
    });
    const logGroup: logs.LogGroup = new MdaaLogGroup(this, `file-import-log-group`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: 'file-import',
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: logs.RetentionDays.INFINITE,
    });
    const workflow = setProcessing.next(fileImportJob).next(setProcessed);
    const stateMachine = new sfn.StateMachine(this, 'FileImportStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.hours(12),
      comment: 'File import workflow',
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    props.encryptionKey.grantEncryptDecrypt(stateMachine);

    stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:CreateRule', 'events:PutRule', 'events:PutTargets'],
        resources: ['*'],
      }),
    );

    stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['batch:SubmitJob'],
        resources: [
          props.fileImportBatchJob.jobQueue.jobQueueArn,
          props.fileImportBatchJob.fileImportJob.jobDefinitionArn,
        ],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      stateMachine,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Events handled by upstream dynamodb service, resource unknown at deployment time',
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
