/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { Attribute, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';

export type TableDefinitionMap = { [key: string]: DynamodbProps };

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DynamoDB table properties providing NoSQL database configuration and performance tuning capabilities. Defines table schema, capacity settings, billing modes, and TTL configuration for DataOps NoSQL database operations and data storage patterns.
 *
 * Use cases: NoSQL table configuration; Database schema definition; Capacity planning; TTL management
 *
 * AWS: DynamoDB table configuration for NoSQL database deployment and performance optimization
 *
 * Validation: partitionKey is required; all other properties are optional with specific constraints and defaults
 */
export interface DynamodbProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required partition key attribute definition for DynamoDB table primary key enabling data distribution and access patterns. Defines the primary key attribute that determines how data is distributed across partitions for optimal performance and access patterns.
   *
   * Use cases: Primary key definition; Data distribution; Access patterns; Query optimization
   *
   * AWS: DynamoDB partition key for table primary key and data distribution
   *
   * Validation: Must be valid Attribute with name and type; required for table creation and data distribution
   **/
  readonly partitionKey: Attribute;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional sort key attribute definition for DynamoDB table composite primary key enabling range queries and data organization. When specified, creates composite primary key allowing range queries and hierarchical data organization within partitions.
   *
   * Use cases: Composite keys; Range queries; Data organization; Hierarchical data
   *
   * AWS: DynamoDB sort key for composite primary key and range query capabilities
   *
   * Validation: Must be valid Attribute if provided; enables composite primary key and range queries
   **/
  readonly sortKey?: Attribute;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional read capacity units for DynamoDB table provisioned throughput controlling read performance and cost management. Defines the number of strongly consistent reads per second (or twice as many eventually consistent reads) for items up to 4 KB.
   *
   * Use cases: Read performance tuning; Cost management; Capacity planning; Performance optimization
   *
   * AWS: DynamoDB read capacity units for provisioned throughput and read performance
   *
   * Validation: Must be positive integer if provided; represents reads per second for 4KB items
   **/
  readonly readCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional write capacity units for DynamoDB table provisioned throughput controlling write performance and cost management. Defines the number of writes per second for items up to 1 KB enabling predictable performance and cost control.
   *
   * Use cases: Write performance tuning; Cost management; Capacity planning; Performance optimization
   *
   * AWS: DynamoDB write capacity units for provisioned throughput and write performance
   *
   * Validation: Must be positive integer if provided; represents writes per second for 1KB items
   **/
  readonly writeCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional billing mode specification for DynamoDB table cost optimization controlling pricing model and capacity management. Defines whether to use provisioned capacity with predictable costs or pay-per-request for variable workloads.
   *
   * Use cases: Cost optimization; Billing model selection; Capacity management; Workload adaptation
   *
   * AWS: DynamoDB billing mode for cost optimization and capacity management
   *
   * Validation: Must be PROVISIONED or PAY_PER_REQUEST if provided; controls pricing and capacity model
   **/
  readonly billingMode?: BillingMode;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional TTL attribute name for DynamoDB automatic item expiration enabling data lifecycle management and storage cost optimization. When specified, enables automatic deletion of expired items based on the timestamp value in the specified attribute.
   *
   * Use cases: Data lifecycle management; Automatic cleanup; Storage cost optimization; Data retention policies
   *
   * AWS: DynamoDB TTL attribute for automatic item expiration and data lifecycle management
   *
   * Validation: Must be valid attribute name if provided; enables automatic item expiration based on timestamp
   **/
  readonly timeToLiveAttribute?: string;
}

export interface DynamodbL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for DynamoDB integration and resource coordination enabling project-based resource organization and management. Provides the project identifier that coordinates DynamoDB resources with other DataOps infrastructure and workflows.
   *
   * Use cases: Project coordination; Resource organization; DataOps integration; Project management
   *
   * AWS: DataOps project name for DynamoDB resource coordination and project-based organization
   *
   * Validation: Must be valid project name; required for project coordination and resource organization
   **/
  readonly projectName?: string;
  readonly kmsArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of DynamoDB table definitions for NoSQL database deployment enabling table configuration and management. Provides table specifications including schema, capacity, billing, and TTL settings for DataOps NoSQL database operations and data storage.
   *
   * Use cases: Table configuration; NoSQL schema definition; Database deployment; Data storage patterns
   *
   * AWS: DynamoDB table definitions for NoSQL database deployment and configuration
   *
   * Validation: Must be valid TableDefinitionMap; required for DynamoDB table deployment and configuration
   *   **/
  readonly tableDefinitions: TableDefinitionMap;
}

export class DynamodbL3Construct extends MdaaL3Construct {
  protected readonly props: DynamodbL3ConstructProps;

  private readonly kmsKey: IKey;

  constructor(scope: Construct, id: string, props: DynamodbL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.kmsArn) {
      throw new Error('Project KMS ARN is required for DynamoDB L3 construct');
    }
    this.kmsKey = Key.fromKeyArn(this, this.props.projectName ?? 'kms-key', this.props.kmsArn);

    // Build our Dynamodb tables!
    for (const [tableName, tableProps] of Object.entries(this.props.tableDefinitions)) {
      const dynamodb = this.createDynamodbFromDefinition(tableName, tableProps);
      if (this.props.projectName) {
        DataOpsProjectUtils.createProjectSSMParam(
          this.scope,
          this.props.naming,
          this.props.projectName,
          `dynamodb/name/${tableName}`,
          dynamodb.tableName,
        );
      }
    }
  }

  private createDynamodbFromDefinition(tableName: string, dynamodbProps: DynamodbProps): MdaaDDBTable {
    return new MdaaDDBTable(this, `Table ${tableName}`, {
      naming: this.props.naming,
      tableName: tableName,
      createParams: false,
      createOutputs: false,
      encryptionKey: this.kmsKey,
      ...dynamodbProps,
    });
  }
}
