import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

export interface ServiceInterruptionProps {
  /** KMS key for encrypting service interruption data */
  readonly encryptionKey: MdaaKmsKey;
}

export interface ServiceInterruptionConstructProps extends ServiceInterruptionProps, MdaaL3ConstructProps {}

/**
 * Service Interruption construct that creates DynamoDB infrastructure for managing service interruptions.
 *
 * This construct creates:
 * - DynamoDB table for storing service interruption notifications
 * - TTL configuration for automatic cleanup of expired interruptions
 */
export class ServiceInterruption extends MdaaL3Construct {
  /** DynamoDB table for storing service interruption data */
  public readonly table: MdaaDDBTable;

  constructor(scope: Construct, id: string, props: ServiceInterruptionConstructProps) {
    super(scope, id, props);

    // Create DynamoDB table for service interruption management
    this.table = new MdaaDDBTable(this, 'ServiceInterruptionTable', {
      tableName: 'ServiceInterruptionTable',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Cost-effective for variable workloads
      encryptionKey: props.encryptionKey,
      timeToLiveAttribute: 'ttl', // Enable TTL for automatic cleanup of expired interruptions
      naming: props.naming,
    });
  }
}
