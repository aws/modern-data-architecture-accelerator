import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";
import { AuroraPgVector } from "./aurora-pgvector";
import { DataImportWorkflows } from "./data-import";
import { KendraRetrieval } from "./kendra-retrieval";
import { RagDynamoDBTables } from "./rag-dynamodb-tables";
import { SageMakerRagModels } from "./sagemaker-rag-models";
import { Workspaces } from "./workspaces";
import { CaefL3Construct, CaefL3ConstructProps } from "@aws-caef/l3-construct";
import { CaefDDBTable } from "@aws-caef/ddb-constructs";
import { CaefBucket } from "@aws-caef/s3-constructs";
import { CaefKmsKey } from "@aws-caef/kms-constructs";

export interface RagEnginesProps extends CaefL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  encryptionKey: CaefKmsKey;
}

export class RagEngines extends CaefL3Construct {
  public readonly auroraPgVector: AuroraPgVector | null;
  public readonly kendraRetrieval: KendraRetrieval | null;
  public readonly uploadBucket: CaefBucket;
  public readonly processingBucket: CaefBucket;
  public readonly documentsTable: CaefDDBTable;
  public readonly workspacesTable: CaefDDBTable;
  public readonly workspacesByObjectTypeIndexName: string;
  public readonly documentsByCompountKeyIndexName: string;
  public readonly sageMakerRagModelsEndpoint?: sagemaker.CfnEndpoint;
  public readonly fileImportWorkflow?: sfn.StateMachine;
  public readonly websiteCrawlingWorkflow?: sfn.StateMachine;
  public readonly deleteWorkspaceWorkflow?: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: RagEnginesProps) {
    super(scope, id, props);

    const tables = new RagDynamoDBTables(this, "RagDynamoDBTables", {
      ...props,
    });

    const sageMakerRagModels = new SageMakerRagModels(
      this,
      "SageMaker",
      {
        ...props,
        shared: props.shared,
        config: props.config,
      }
    );

    let auroraPgVector: AuroraPgVector | null = null;
    if (props.config.rag?.engines.aurora) {
      auroraPgVector = new AuroraPgVector(this, "AuroraPgVector", {
        naming: props.naming,
        roleHelper: props.roleHelper,
        encryptionKey: props.encryptionKey,
        shared: props.shared,
        config: props.config,
        ragDynamoDBTables: tables
      });
    }

    let kendraRetrieval: KendraRetrieval | null = null;
    if (props.config.rag?.engines.kendra) {
      kendraRetrieval = new KendraRetrieval(this, "KendraRetrieval", {
        ...props,
        shared: props.shared,
        config: props.config,
        ragDynamoDBTables: tables,
      });
    }

    const dataImport = new DataImportWorkflows(this, "DataImport", {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      roleHelper: props.roleHelper,
      shared: props.shared,
      config: props.config,
      auroraDatabase: auroraPgVector?.database,
      sageMakerRagModelsEndpoint: sageMakerRagModels?.model?.endpoint,
      workspacesTable: tables.workspacesTable,
      documentsTable: tables.documentsTable,
      ragDynamoDBTables: tables,
      workspacesByObjectTypeIndexName: tables.workspacesByObjectTypeIndexName,
      documentsByCompountKeyIndexName: tables.documentsByCompountKeyIndexName,
      kendraRetrieval: kendraRetrieval ?? undefined
    });

    const workspaces = new Workspaces(this, "Workspaces", {
      ...props,
      shared: props.shared,
      config: props.config,
      dataImport,
      ragDynamoDBTables: tables,
      auroraPgVector: auroraPgVector ?? undefined,
      kendraRetrieval: kendraRetrieval ?? undefined,
    });

    this.auroraPgVector = auroraPgVector;
    this.kendraRetrieval = kendraRetrieval;
    this.sageMakerRagModelsEndpoint = sageMakerRagModels?.model?.endpoint;
    this.uploadBucket = dataImport.uploadBucket;
    this.processingBucket = dataImport.processingBucket;
    this.workspacesTable = tables.workspacesTable;
    this.documentsTable = tables.documentsTable;
    this.workspacesByObjectTypeIndexName = tables.workspacesByObjectTypeIndexName;
    this.documentsByCompountKeyIndexName = tables.documentsByCompountKeyIndexName;
    this.fileImportWorkflow = dataImport.fileImportWorkflow;
    this.websiteCrawlingWorkflow = dataImport.websiteCrawlingWorkflow;
    this.deleteWorkspaceWorkflow = workspaces.deleteWorkspaceWorkflow;
  }
}
