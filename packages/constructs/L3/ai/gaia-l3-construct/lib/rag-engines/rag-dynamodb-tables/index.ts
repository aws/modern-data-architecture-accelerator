import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Shared } from '../../shared/index';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface RagDynamoDBTablesProps extends MdaaL3ConstructProps {
  readonly shared: Shared;
  readonly encryptionKey: MdaaKmsKey;
}
export class RagDynamoDBTables extends Construct {
  public readonly workspacesTable: MdaaDDBTable;
  public readonly documentsTable: MdaaDDBTable;
  public readonly workspacesByObjectTypeIndexName: string = 'by_object_type_idx';
  public readonly documentsByCompountKeyIndexName: string = 'by_compound_key_idx';

  constructor(scope: Construct, id: string, props: RagDynamoDBTablesProps) {
    super(scope, id);

    const workspacesTable = new MdaaDDBTable(this, 'WorkspacesTable', {
      /**
       * Q-ENHANCED-PROPERTY
       * Required DynamoDB partition key configuration for workspace table primary key definition enabling efficient workspace data organization and retrieval. Defines the primary partition key structure for workspace identification and data distribution across DynamoDB partitions.
       *
       * Use cases: Workspace identification; Data partitioning; Primary key definition; Efficient data retrieval
       *
       * AWS: DynamoDB table partition key for workspace data organization and query performance
       *
       * Validation: Must be valid partition key configuration with name and type; required for table creation
       */
      partitionKey: {
        name: 'workspace_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'object_type',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      tableName: props.naming.resourceName('Workspaces'),
      createParams: false,
      createOutputs: false,
    });

    workspacesTable.addGlobalSecondaryIndex({
      indexName: this.workspacesByObjectTypeIndexName,
      /**
       * Q-ENHANCED-PROPERTY
       * Required DynamoDB Global Secondary Index partition key for workspace object type queries enabling efficient workspace filtering by object type. Defines the partition key for GSI to support queries filtering workspaces by their object type classification.
       *
       * Use cases: Object type filtering; Workspace categorization; Efficient GSI queries; Type-based workspace retrieval
       *
       * AWS: DynamoDB GSI partition key for workspace object type query optimization and filtering
       *
       * Validation: Must be valid partition key configuration with name and type; required for GSI creation
       */
      partitionKey: {
        name: 'object_type',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const documentsTable = new MdaaDDBTable(this, 'DocumentsTable', {
      /**
       * Q-ENHANCED-PROPERTY
       * Required DynamoDB partition key configuration for documents table primary key definition enabling efficient document data organization and workspace-based retrieval. Defines the primary partition key structure for document identification and workspace-based data distribution.
       *
       * Use cases: Document identification; Workspace-based partitioning; Primary key definition; Efficient document retrieval
       *
       * AWS: DynamoDB table partition key for document data organization and workspace-based query performance
       *
       * Validation: Must be valid partition key configuration with name and type; required for documents table creation
       */
      partitionKey: {
        name: 'workspace_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'document_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      tableName: props.naming.resourceName('Documents'),
      createParams: false,
      createOutputs: false,
    });

    documentsTable.addGlobalSecondaryIndex({
      indexName: this.documentsByCompountKeyIndexName,
      /**
       * Q-ENHANCED-PROPERTY
       * Required DynamoDB Global Secondary Index partition key for documents compound key queries enabling efficient document retrieval by workspace and compound key combinations. Defines the partition key for GSI to support complex document queries with workspace-based filtering.
       *
       * Use cases: Compound key queries; Workspace-based document filtering; Efficient GSI queries; Complex document retrieval patterns
       *
       * AWS: DynamoDB GSI partition key for document compound key query optimization and workspace filtering
       *
       * Validation: Must be valid partition key configuration with name and type; required for documents GSI creation
       */
      partitionKey: {
        name: 'workspace_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'compound_sort_key',
        type: dynamodb.AttributeType.STRING,
      },
    });

    this.workspacesTable = workspacesTable;
    this.documentsTable = documentsTable;
  }
}
