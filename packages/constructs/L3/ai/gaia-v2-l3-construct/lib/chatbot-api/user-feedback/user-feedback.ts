import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { IKey } from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

export interface UserFeedbackProps {
  /** Feedback retention period in days (enables TTL if specified) */
  readonly feedbackRetentionDays?: number;
  /** List of predefined feedback reasons (e.g., 'accuracy', 'unhelpful', 'app_issue', 'other') */
  readonly reasons: string[];
  /** Admin group name for feedback access control */
  readonly adminGroup?: string;
}

export interface UserFeedbackConstructProps extends UserFeedbackProps, MdaaL3ConstructProps {
  /** KMS key for encrypting feedback data */
  readonly kmsKey: IKey;
}

/** DynamoDB TTL attribute name for automatic feedback cleanup */
export const USER_FEEDBACK_TTL_ATTRIBUTE = 'TTL';

/**
 * User Feedback construct that creates DynamoDB infrastructure for collecting user feedback.
 *
 * This construct creates:
 * - Feedback table with composite primary key for chronological storage
 * - Global Secondary Index for feedback ID lookups
 * - Optional TTL for automatic feedback cleanup
 * - SSM parameter for table name reference
 *
 * The table stores:
 * - User feedback on AI responses (thumbs up/down, reasons, comments)
 * - Feedback metadata (user ID, session ID, message ID, timestamp)
 * - Feedback analytics data for model improvement
 */
export class UserFeedback extends MdaaL3Construct {
  /** DynamoDB table for storing user feedback */
  public readonly feedbackTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: UserFeedbackConstructProps) {
    super(scope, id, props);

    // Create DynamoDB table for user feedback with chronological ordering
    const feedbackTable = new MdaaDDBTable(this, 'FeedbackTable', {
      naming: props.naming,
      tableName: 'user-message-feedback',
      createParams: false,
      createOutputs: false,
      encryptionKey: props.kmsKey,
      partitionKey: {
        name: 'PK', // Single partition for all feedback (enables chronological queries)
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK', // Sort key using timestamps for chronological ordering
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Enable TTL for automatic cleanup if retention period is specified
      timeToLiveAttribute: props.feedbackRetentionDays !== undefined ? USER_FEEDBACK_TTL_ATTRIBUTE : undefined,
    });

    // Add Global Secondary Index for feedback ID lookups
    // Enables direct access to specific feedback entries by unique ID
    feedbackTable.addGlobalSecondaryIndex({
      indexName: 'FeedbackIdIndex',
      partitionKey: {
        name: 'feedback_id', // Unique feedback identifier
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL, // Include all attributes for complete feedback data
    });

    // Store table name in SSM for Lambda function reference
    new ssm.StringParameter(this, 'FeedbackTableSSMParam', {
      parameterName: props.naming.ssmPath('table/feedback/name'),
      stringValue: feedbackTable.tableName,
    });

    this.feedbackTable = feedbackTable;
  }
}
