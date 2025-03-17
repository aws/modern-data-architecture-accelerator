import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { NagSuppressions } from "cdk-nag";
import {LogGroup, RetentionDays} from "aws-cdk-lib/aws-logs";
import {MdaaLogGroup} from "@aws-mdaa/cloudwatch-constructs";
import {MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";

export interface CreateKendraWorkspaceProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  encryptionKey: MdaaKmsKey;
}

export class CreateKendraWorkspace extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: CreateKendraWorkspaceProps) {
    super(scope, id);

    new tasks.DynamoUpdateItem(this, "HandleError", {
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
        cause: "Workspace creation failed",
      })
    );

    const setCreating = new tasks.DynamoUpdateItem(this, "SetCreating", {
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
        ":statusValue": tasks.DynamoAttributeValue.fromString("creating"),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const setReady = new tasks.DynamoUpdateItem(this, "SetReady", {
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
        ":statusValue": tasks.DynamoAttributeValue.fromString("ready"),
      },
      resultPath: sfn.JsonPath.DISCARD,
    });

    const workflow = setCreating
      .next(setReady)
      .next(new sfn.Succeed(this, "Success"));

    const logGroup: LogGroup = new MdaaLogGroup( this, `CreateAuroraWorkspace-loggroup`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: "create-kendra-workspace",
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: RetentionDays.INFINITE
    } )

    const stateMachine = new sfn.StateMachine(this, "CreateKendraWorkspaceStateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.minutes(5),
      comment: "Create Kendra Workspace Workflow",
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL
      },
    });
    props.encryptionKey.grantEncryptDecrypt(stateMachine);
    NagSuppressions.addResourceSuppressions( stateMachine, [
      { id: 'AwsSolutions-IAM5', reason: 'Invoke function restricted to delete workspace lambda.  The lambda arn is not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true )
    this.stateMachine = stateMachine;
  }
}
