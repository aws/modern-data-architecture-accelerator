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
  /** Physical table name override for custom naming requirements bypassing automatic MDAA naming conventions */
  readonly tableName?: string;
  readonly kinesisStream?: IStream;
  /** Read capacity units for provisioned throughput controlling read performance and cost management */
  readonly readCapacity?: number;
  /** Write capacity units for provisioned throughput controlling write performance and cost management */
  readonly writeCapacity?: number;
  /** Billing mode specification controlling cost model and capacity management for the DynamoDB table */
  readonly billingMode?: BillingMode;
  readonly tableClass?: TableClass;
  readonly encryptionKey: IKey;
  /** TTL attribute name for automatic item expiration enabling data lifecycle management and */
  readonly timeToLiveAttribute?: string;
  readonly stream?: StreamViewType;
  readonly replicationRegions?: string[];
  readonly replicationTimeout?: Duration;
  readonly waitForReplicationToFinish?: boolean;
  readonly contributorInsightsEnabled?: boolean;
  /** Partition key attribute definition for table primary key structure enabling data */
  readonly partitionKey: Attribute;
  /** Sort key attribute definition for composite primary key structure enabling range queries and data organization */
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
