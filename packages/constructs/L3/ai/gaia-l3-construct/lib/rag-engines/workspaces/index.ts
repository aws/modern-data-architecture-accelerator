import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { AuroraPgVector } from "../aurora-pgvector";
import { DataImportWorkflows } from "../data-import";
import { KendraRetrieval } from "../kendra-retrieval";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import { DeleteWorkspace } from "./delete-workspace";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {CaefKmsKey} from "@aws-caef/kms-constructs";

export interface WorkkspacesProps extends CaefL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly dataImport: DataImportWorkflows;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly auroraPgVector?: AuroraPgVector;
  readonly kendraRetrieval?: KendraRetrieval;
  encryptionKey: CaefKmsKey;
}

export class Workspaces extends CaefL3Construct {
  public readonly deleteWorkspaceWorkflow?: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: WorkkspacesProps) {
    super(scope, id, props);

    const workflow = new DeleteWorkspace(this, "DeleteWorkspace", {
      ...props,
      config: props.config,
      shared: props.shared,
      dataImport: props.dataImport,
      ragDynamoDBTables: props.ragDynamoDBTables,
      auroraPgVector: props.auroraPgVector,
      kendraRetrieval: props.kendraRetrieval,
    });

    this.deleteWorkspaceWorkflow = workflow.stateMachine;
  }
}
