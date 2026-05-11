import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { IKey } from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

export interface ChatHistoryProps {
  /** Chat session retention time in minutes (enables TTL if specified) */
  readonly chatRetentionInMinutes?: number;
}

export interface ChatHistoryConstructProps extends ChatHistoryProps, MdaaL3ConstructProps {
  /** KMS key for encrypting chat history data */
  readonly kmsKey: IKey;
}

/**
 * DynamoDB attribute names for chat history table.
 * These constants ensure consistency between CDK infrastructure and Lambda functions.
 * When modifying these values, also update the corresponding Python constants in:
 * - lib/chatbot-api/websocket-api/datasource/layer/python/chat_history_helpers.py
 * - lib/chatbot-api/rest-api/function/api-handler/routes/sessions.py
 */
export const CHAT_HISTORY_ATTRIBUTES = {
  /** Time-to-live attribute for automatic record expiration */
  TTL: 'TTL',
  /** Partition key - typically user identifier */
  PARTITION_KEY: 'PK',
  /** Sort key - typically session identifier (e.g., CONV#<uuid>) */
  SORT_KEY: 'SK',
  /** GSI partition key for cross-user queries */
  GSI_PARTITION_KEY: 'GSI1PK',
  /** Timestamp of last modification (epoch seconds) */
  DATE_MODIFIED: 'DateModified',
  /** Count of messages in the session */
  MESSAGE_COUNT: 'MessageCount',
  /** Chat history JSON blob */
  HISTORY: 'History',
} as const;

/**
 * Chat History construct that creates DynamoDB infrastructure for storing chat sessions.
 *
 * This construct creates:
 * - Sessions table with composite primary key (PK, SK) for hierarchical data
 * - Global Secondary Index for querying sessions by modification date
 * - Optional TTL for automatic chat history cleanup
 * - SSM parameter for table name reference
 *
 * The table stores:
 * - Chat sessions and their metadata
 * - Individual messages within sessions
 * - User interaction history
 * - Session statistics and timestamps
 */
export class ChatHistory extends MdaaL3Construct {
  /** DynamoDB table for storing chat sessions and messages */
  public readonly sessionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ChatHistoryConstructProps) {
    super(scope, id, props);

    // Create DynamoDB table for chat sessions with composite key structure
    const sessionsTable = new MdaaDDBTable(this, 'SessionsTable', {
      naming: props.naming,
      tableName: 'chat-history',
      createParams: false,
      createOutputs: false,
      encryptionKey: props.kmsKey,
      partitionKey: {
        name: CHAT_HISTORY_ATTRIBUTES.PARTITION_KEY,
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: CHAT_HISTORY_ATTRIBUTES.SORT_KEY,
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: props.chatRetentionInMinutes !== undefined ? CHAT_HISTORY_ATTRIBUTES.TTL : undefined,
    });

    // Add Global Secondary Index for querying sessions by modification date
    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'SessionsByDateIndex',
      partitionKey: {
        name: CHAT_HISTORY_ATTRIBUTES.GSI_PARTITION_KEY,
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: CHAT_HISTORY_ATTRIBUTES.DATE_MODIFIED,
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        CHAT_HISTORY_ATTRIBUTES.PARTITION_KEY,
        CHAT_HISTORY_ATTRIBUTES.SORT_KEY,
        CHAT_HISTORY_ATTRIBUTES.MESSAGE_COUNT,
      ],
    });

    // Store table name in SSM for Lambda function reference
    new ssm.StringParameter(this, 'SessionsTableSSMParam', {
      parameterName: props.naming.ssmPath('table/sessions/name'),
      stringValue: sessionsTable.tableName,
    });

    this.sessionsTable = sessionsTable;
  }
}
