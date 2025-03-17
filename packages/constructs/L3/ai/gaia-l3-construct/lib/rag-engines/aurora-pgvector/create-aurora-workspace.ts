import { MdaaLogGroup } from "@aws-mdaa/cloudwatch-constructs";
import { MdaaL3Construct, MdaaL3ConstructProps } from "@aws-mdaa/l3-construct";
import { MdaaLambdaFunction, MdaaLambdaRole } from "@aws-mdaa/lambda-constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import {Effect, ManagedPolicy, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export interface CreateAuroraWorkspaceProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly dbCluster: rds.DatabaseCluster;
  encryptionKey: MdaaKmsKey;
}

export class CreateAuroraWorkspace extends MdaaL3Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: CreateAuroraWorkspaceProps) {
    super(scope, id, props);

    const createFunctionRole = new MdaaLambdaRole(this, 'CreateAuroraWorkspaceFunctionRole', {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      roleName: "create-aurora-workspace-function-role",
      logGroupNames: [props.naming.resourceName("create-aurora-workspace")]
    })

    createFunctionRole.addToPolicy(new iam.PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ['*']
    }))

    createFunctionRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AWSLambdaExecute"
      )
    )

    const createAuroraWorkspaceCodePath = props.config?.codeOverwrites?.createAuroraWorkspaceCodePath !== undefined ?
        props.config.codeOverwrites.createAuroraWorkspaceCodePath : path.join(__dirname, "./functions/create-workflow/create")

    const createFunction = new MdaaLambdaFunction(
      this,
      "CreateAuroraWorkspaceFunction",
      {
        functionName: "create-aurora-workspace",
        naming: props.naming,
        createParams: false,
        createOutputs: false,
        role: createFunctionRole,
        vpc: props.shared.vpc,
        vpcSubnets: { subnets: props.shared.appSubnets },
        securityGroups: [props.shared.appSecurityGroup],
        code: lambda.Code.fromAsset(createAuroraWorkspaceCodePath),
        runtime: props.shared.pythonRuntime,
        architecture: props.shared.lambdaArchitecture,
        handler: "index.lambda_handler",
        layers: [
          props.shared.powerToolsLayer,
          props.shared.commonLayer,
          props.shared.pythonSDKLayer,
        ],
        timeout: cdk.Duration.minutes(5),
        environment: {
          ...props.shared.defaultEnvironmentVariables,
          AURORA_DB_SECRET_ID: props.dbCluster.secret?.secretArn as string,
          WORKSPACES_TABLE_NAME:
            props.ragDynamoDBTables.workspacesTable.tableName,
          WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
            props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
        }
      }
    );
    NagSuppressions.addResourceSuppressions( createFunction, [
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'PCI.DSS.321-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only'
      },
    ], true );

    props.dbCluster.secret?.grantRead(createFunctionRole);
    props.dbCluster.grantConnect(createFunction, 'postgres')
    props.encryptionKey.grantEncryptDecrypt(createFunctionRole);
    props.dbCluster.connections.allowDefaultPortFrom(createFunction);
    props.ragDynamoDBTables.workspacesTable.grantReadWriteData(createFunctionRole);

    NagSuppressions.addResourceSuppressions( createFunctionRole, [
      { id: 'AwsSolutions-IAM4', reason: 'Standard Lambda Execution Managed Policy' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'DDB index names not known at deployment time. KMS Permissions are appropriately scoped.'
      },
      {
        id: 'NIST.800.53.R5-IAMNoInlinePolicy',
        reason: 'Permissions are role specific. Inline policy use appropriate.'
      },
      {
        id: 'HIPAA.Security-IAMNoInlinePolicy',
        reason: 'Permissions are role specific. Inline policy use appropriate.'
      },
      {
        id: 'PCI.DSS.321-IAMNoInlinePolicy',
        reason: 'Permissions are role specific. Inline policy use appropriate.'
      },
    ], true );

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

    const createTask = new tasks.LambdaInvoke(this, "Create", {
      lambdaFunction: createFunction,
      resultPath: "$.createResult",
    }).addCatch(handleError, {
      errors: ["States.ALL"],
      resultPath: "$.createResult",
    });

    const workflow = setCreating
      .next(createTask)
      .next(setReady)
      .next(new sfn.Succeed(this, "Success"));

    const logGroup: LogGroup = new MdaaLogGroup( this, `CreateAuroraWorkspace-loggroup`, {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      logGroupName: "create-aurora-workspace",
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: props.encryptionKey,
      retention: RetentionDays.INFINITE
    } )

    props.encryptionKey.grantEncryptDecrypt( new ServicePrincipal( 'logs.amazonaws.com' ) );

    const stateMachine = new sfn.StateMachine(this, "CreateAuroraWorkspaceStateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(workflow),
      timeout: cdk.Duration.minutes(5),
      comment: "Create Aurora Workspace Workflow",
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL
      },
    });
    props.encryptionKey.grantEncryptDecrypt(stateMachine.role)
    NagSuppressions.addResourceSuppressions( stateMachine, [
      { id: 'AwsSolutions-IAM5', reason: 'Invoke function restricted to delete workspace lambda.  The lambda arn is not known at deployment time.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true )
    this.stateMachine = stateMachine;
  }
}
