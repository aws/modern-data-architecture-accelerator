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
 * Configuration for a DynamoDB table including schema, capacity, and TTL settings.
 *
 * Use cases: NoSQL table configuration, database schema definition, capacity planning, TTL management
 *
 * AWS: Amazon DynamoDB table configuration for NoSQL database deployment
 *
 * Validation: partitionKey is required; sortKey, readCapacity, writeCapacity, billingMode, and timeToLiveAttribute are optional
 */
export interface DynamodbProps {
  /**
   * Partition key attribute for the table primary key.
   *
   * Use cases: Primary key definition, data distribution, access pattern design
   *
   * AWS: DynamoDB partition key attribute
   *
   * Validation: Must be a valid Attribute with name and type; required
   **/
  readonly partitionKey: Attribute;
  /**
   * Optional sort key attribute for composite primary key enabling range queries.
   *
   * Use cases: Composite keys, range queries, hierarchical data organization
   *
   * AWS: DynamoDB sort key attribute
   *
   * Validation: Must be a valid Attribute if provided
   **/
  readonly sortKey?: Attribute;
  /**
   * Provisioned read capacity units (reads per second for items up to 4 KB).
   *
   * Use cases: Read performance tuning, cost management, capacity planning
   *
   * AWS: DynamoDB provisioned read capacity units
   *
   * Validation: Must be a positive integer if provided; only applies when billingMode is PROVISIONED
   **/
  readonly readCapacity?: number;
  /**
   * Provisioned write capacity units (writes per second for items up to 1 KB).
   *
   * Use cases: Write performance tuning, cost management, capacity planning
   *
   * AWS: DynamoDB provisioned write capacity units
   *
   * Validation: Must be a positive integer if provided; only applies when billingMode is PROVISIONED
   **/
  readonly writeCapacity?: number;
  /**
   * Billing mode controlling the pricing model (PROVISIONED or PAY_PER_REQUEST).
   *
   * Use cases: Cost optimization, billing model selection, workload adaptation
   *
   * AWS: DynamoDB billing mode
   *
   * Validation: Must be PROVISIONED or PAY_PER_REQUEST if provided
   **/
  readonly billingMode?: BillingMode;
  /**
   * TTL attribute name for automatic item expiration based on a timestamp value.
   *
   * Use cases: Data lifecycle management, automatic cleanup, storage cost optimization
   *
   * AWS: DynamoDB TTL attribute for automatic item expiration
   *
   * Validation: Must be a valid attribute name if provided; attribute value must be a Unix epoch timestamp
   **/
  readonly timeToLiveAttribute?: string;
}

export interface DynamodbL3ConstructProps extends MdaaL3ConstructProps {
  // DataOps project name for DynamoDB resource coordination and SSM parameters
  readonly projectName?: string;
  readonly kmsArn?: string;
  // Map of table names to DynamoDB table definitions to deploy
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
