/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mdaa_construct from '@aws-mdaa/construct'; //NOSONAR
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Attribute,
  BillingMode,
  StreamViewType,
  Table,
  TableClass,
  TableEncryption,
  TableProps,
} from 'aws-cdk-lib/aws-dynamodb';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { IKey } from 'aws-cdk-lib/aws-kms';

import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

export interface MdaaDDBTableProps extends mdaa_construct.MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional physical table name override for custom naming requirements bypassing automatic MDAA naming conventions. When specified, provides exact control over DynamoDB table naming for integration with existing systems or specific naming requirements.
   *
   * Use cases: Custom naming requirements; Legacy system integration; Specific naming conventions; External tool integration
   *
   * AWS: DynamoDB table name specification for custom naming and integration requirements
   *
   * Validation: Must be valid DynamoDB table name if provided; overrides automatic MDAA naming when specified
   **/
  readonly tableName?: string;
  readonly kinesisStream?: IStream;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional read capacity units for provisioned throughput controlling read performance and cost management. Defines the number of read capacity units for the table when using provisioned billing mode for predictable performance and cost control.
   *
   * Use cases: Performance tuning; Cost management; Predictable workloads; Capacity planning
   *
   * AWS: DynamoDB read capacity units for provisioned throughput and performance control
   *
   * Validation: Must be positive integer if provided; only valid with PROVISIONED billing mode; defaults to 5
   **/
  readonly readCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional write capacity units for provisioned throughput controlling write performance and cost management. Defines the number of write capacity units for the table when using provisioned billing mode for predictable performance and cost control.
   *
   * Use cases: Performance tuning; Cost management; Predictable workloads; Capacity planning
   *
   * AWS: DynamoDB write capacity units for provisioned throughput and performance control
   *
   * Validation: Must be positive integer if provided; only valid with PROVISIONED billing mode; defaults to 5
   **/
  readonly writeCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional billing mode specification controlling cost model and capacity management for the DynamoDB table. Determines whether the table uses provisioned capacity with predictable costs or pay-per-request for variable workloads.
   *
   * Use cases: Cost optimization; Capacity management; Workload matching; Performance predictability
   *
   * AWS: DynamoDB billing mode for cost control and capacity management configuration
   *
   * Validation: Must be PROVISIONED or PAY_PER_REQUEST; defaults based on replication configuration
   **/
  readonly billingMode?: BillingMode;
  readonly tableClass?: TableClass;
  readonly encryptionKey: IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional TTL attribute name for automatic item expiration enabling data lifecycle management and storage cost optimization. Provides automatic cleanup of expired items based on timestamp values for efficient data management and cost control.
   *
   * Use cases: Data lifecycle management; Automatic cleanup; Cost optimization; Storage management
   *
   * AWS: DynamoDB TTL attribute for automatic item expiration and data lifecycle management
   *
   * Validation: Must be valid attribute name if provided; enables automatic item expiration based on timestamp
   **/
  readonly timeToLiveAttribute?: string;
  readonly stream?: StreamViewType;
  readonly replicationRegions?: string[];
  readonly replicationTimeout?: Duration;
  readonly waitForReplicationToFinish?: boolean;
  readonly contributorInsightsEnabled?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required partition key attribute definition for table primary key structure enabling data distribution and access patterns. Defines the primary key attribute that determines data distribution across partitions for optimal performance and access patterns.
   *
   * Use cases: Primary key definition; Data distribution; Access pattern optimization; Table structure design
   *
   * AWS: DynamoDB partition key attribute for primary key structure and data distribution
   *
   * Validation: Must be valid Attribute definition; required for table primary key structure and data distribution
   **/
  readonly partitionKey: Attribute;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional sort key attribute definition for composite primary key structure enabling range queries and data organization. Provides secondary key component for composite primary keys enabling range queries and hierarchical data organization within partitions.
   *
   * Use cases: Composite primary keys; Range queries; Data organization; Hierarchical data structure
   *
   * AWS: DynamoDB sort key attribute for composite primary key structure and range query capabilities
   *
   * Validation: Must be valid Attribute definition if provided; enables composite primary keys and range queries
   **/
  readonly sortKey?: Attribute;
}

/**
 * Compliance construct for DDB Table
 * Enforces:
 * Table name convention
 * KMS Encryption at Rest
 * Deletion Protection
 * PITR
 * RETAIN RemovalPolicy
 */
export class MdaaDDBTable extends Table {
  private static setProps(props: MdaaDDBTableProps): TableProps {
    const overrideProps = {
      tableName: props.naming.resourceName(props.tableName, 254),
      encryption: TableEncryption.CUSTOMER_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      deletionProtection: true,
      pointInTimeRecovery: true,
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaDDBTableProps) {
    super(scope, id, MdaaDDBTable.setProps(props));

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
        { id: 'HIPAA.Security-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup' },
        { id: 'PCI.DSS.321-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup' },
        { id: 'NIST.800.53.R5-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup' },
        {
          id: 'NIST.800.53.R5-DynamoDBAutoScalingEnabled',
          reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.',
        },
        {
          id: 'HIPAA.Security-DynamoDBAutoScalingEnabled',
          reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.',
        },
        {
          id: 'PCI.DSS.321-DynamoDBAutoScalingEnabled',
          reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.',
        },
      ],
      true,
    );

    new mdaa_construct.MdaaParamAndOutput(this, {
      ...{
        resourceType: 'table',
        resourceId: props.tableName,
        name: 'name',
        value: this.tableName,
      },
      ...props,
    });

    new mdaa_construct.MdaaParamAndOutput(this, {
      ...{
        resourceType: 'table',
        resourceId: props.tableName,
        name: 'arn',
        value: this.tableArn,
      },
      ...props,
    });
    if (this.tableStreamArn) {
      new mdaa_construct.MdaaParamAndOutput(this, {
        ...{
          resourceType: 'table',
          resourceId: props.tableName,
          name: 'streamArn',
          value: this.tableStreamArn,
        },
        ...props,
      });
    }
  }
}
