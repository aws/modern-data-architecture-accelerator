import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import {MdaaDDBTable} from "@aws-mdaa/ddb-constructs";
import {MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {Shared} from "../../shared/index";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";


export interface RagDynamoDBTablesProps
  extends MdaaL3ConstructProps {
  readonly shared: Shared;
  encryptionKey: MdaaKmsKey;
}
export class RagDynamoDBTables extends Construct {
  public readonly workspacesTable: MdaaDDBTable;
  public readonly documentsTable: MdaaDDBTable;
  public readonly workspacesByObjectTypeIndexName: string =
    "by_object_type_idx";
  public readonly documentsByCompountKeyIndexName: string =
    "by_compound_key_idx";

  constructor(scope: Construct, id: string, props: RagDynamoDBTablesProps) {
    super(scope, id);

    const workspacesTable = new MdaaDDBTable(this, "WorkspacesTable", {
      partitionKey: {
        name: "workspace_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "object_type",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      tableName: props.naming.resourceName('Workspaces'),
      createParams: false,
      createOutputs: false
    });

    workspacesTable.addGlobalSecondaryIndex({
      indexName: this.workspacesByObjectTypeIndexName,
      partitionKey: {
        name: "object_type",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "created_at",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const documentsTable = new MdaaDDBTable(this, "DocumentsTable", {
      partitionKey: {
        name: "workspace_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "document_id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      tableName:  props.naming.resourceName('Documents'),
      createParams: false,
      createOutputs: false
    });

    documentsTable.addGlobalSecondaryIndex({
      indexName: this.documentsByCompountKeyIndexName,
      partitionKey: {
        name: "workspace_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "compound_sort_key",
        type: dynamodb.AttributeType.STRING,
      },
    });

    this.workspacesTable = workspacesTable;
    this.documentsTable = documentsTable;
  }
}
