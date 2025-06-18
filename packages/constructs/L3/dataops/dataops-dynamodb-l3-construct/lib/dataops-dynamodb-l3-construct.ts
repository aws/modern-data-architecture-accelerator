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

export interface DynamodbProps {
  /**
   * Partition key attribute definition.
   */
  readonly partitionKey: Attribute;
  /**
   * Sort key attribute definition.
   *
   * @default no sort key
   */
  readonly sortKey?: Attribute;

  /**
   * For an item up to 4 KB, one read capacity unit (RCU) represents one strongly consistent read operation per second, or two eventually consistent read operations per second
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
   */
  readonly readCapacity?: number;

  /**
   * A write capacity unit (WCU) represents one write per second for an item up to 1 KB
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
   */
  readonly writeCapacity?: number;

  /**
   * PROVISIONED and PAY_PER_REQUEST billing modes
   * For more details, see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BillingModeSummary.html
   */
  readonly billingMode?: BillingMode;

  /**
   * a specific attribute to store the TTL expiration timestamp
   */
  readonly timeToLiveAttribute?: string;
}

export interface DynamodbL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Dataops project name
   */
  readonly projectName: string;
  /**
   * Dataops project KMS key ARN
   */
  readonly projectKMSArn: string;
  /**
   * The Dynamodb table Definitions
   */
  readonly tableDefinitions: TableDefinitionMap;
}

export class DynamodbL3Construct extends MdaaL3Construct {
  protected readonly props: DynamodbL3ConstructProps;

  private readonly projectKmsKey: IKey;

  constructor(scope: Construct, id: string, props: DynamodbL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.projectKmsKey = Key.fromKeyArn(this, this.props.projectName, this.props.projectKMSArn);

    // Build our Dynamodb tables!
    for (const [tableName, tableProps] of Object.entries(this.props.tableDefinitions)) {
      const dynamodb = this.createDynamodbFromDefinition(tableName, tableProps);
      DataOpsProjectUtils.createProjectSSMParam(
        this.scope,
        this.props.naming,
        this.props.projectName,
        `dynamodb/name/${tableName}`,
        dynamodb.tableName,
      );
    }
  }

  private createDynamodbFromDefinition(tableName: string, dynamodbProps: DynamodbProps): MdaaDDBTable {
    return new MdaaDDBTable(this, `Table ${tableName}`, {
      naming: this.props.naming,
      tableName: tableName,
      createParams: false,
      createOutputs: false,
      encryptionKey: this.projectKmsKey,
      ...dynamodbProps,
    });
  }
}
