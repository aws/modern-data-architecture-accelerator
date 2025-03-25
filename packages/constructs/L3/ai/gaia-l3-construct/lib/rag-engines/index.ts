import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Shared } from '../shared';
import { SystemConfig } from '../shared/types';
import { AuroraPgVector } from './aurora-pgvector';
import { DataImportWorkflows } from './data-import';
import { KendraRetrieval } from './kendra-retrieval';
import { RagDynamoDBTables } from './rag-dynamodb-tables';
import { Workspaces } from './workspaces';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface RagEnginesProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  encryptionKey: MdaaKmsKey;
}

export class RagEngines extends MdaaL3Construct {
  public readonly auroraPgVector: AuroraPgVector | null;
  public readonly kendraRetrieval: KendraRetrieval | null;
  public readonly uploadBucket: MdaaBucket;
  public readonly processingBucket: MdaaBucket;
  public readonly documentsTable: MdaaDDBTable;
  public readonly workspacesTable: MdaaDDBTable;
  public readonly workspacesByObjectTypeIndexName: string;
  public readonly documentsByCompountKeyIndexName: string;
  public readonly fileImportWorkflow?: sfn.StateMachine;
  public readonly websiteCrawlingWorkflow?: sfn.StateMachine;
  public readonly deleteWorkspaceWorkflow?: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: RagEnginesProps) {
    super(scope, id, props);

    const tables = new RagDynamoDBTables(this, 'RagDynamoDBTables', {
      ...props,
    });

    let auroraPgVector: AuroraPgVector | null = null;
    if (props.config.rag?.engines.aurora) {
      auroraPgVector = new AuroraPgVector(this, 'AuroraPgVector', {
        naming: props.naming,
        roleHelper: props.roleHelper,
        encryptionKey: props.encryptionKey,
        shared: props.shared,
        config: props.config,
        ragDynamoDBTables: tables,
      });
    }

    let kendraRetrieval: KendraRetrieval | null = null;
    if (props.config.rag?.engines.kendra) {
      kendraRetrieval = new KendraRetrieval(this, 'KendraRetrieval', {
        ...props,
        shared: props.shared,
        config: props.config,
        ragDynamoDBTables: tables,
      });
    }

    const dataImport = new DataImportWorkflows(this, 'DataImport', {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      roleHelper: props.roleHelper,
      shared: props.shared,
      config: props.config,
      auroraDatabase: auroraPgVector?.database,
      workspacesTable: tables.workspacesTable,
      documentsTable: tables.documentsTable,
      ragDynamoDBTables: tables,
      workspacesByObjectTypeIndexName: tables.workspacesByObjectTypeIndexName,
      documentsByCompountKeyIndexName: tables.documentsByCompountKeyIndexName,
      kendraRetrieval: kendraRetrieval ?? undefined,
    });

    const workspaces = new Workspaces(this, 'Workspaces', {
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
