/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mdaa_construct from '@aws-mdaa/construct';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Attribute, BillingMode, StreamViewType, Table, TableClass, TableEncryption, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { IKey } from 'aws-cdk-lib/aws-kms';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Properties for the creation of a MDAA DDB DDBTable
 */
export interface MdaaDDBTableProps extends mdaa_construct.MdaaConstructProps {
    /**
     * Enforces a particular physical table name.
     * @default <generated>
     */
    readonly tableName?: string;
    /**
     * Kinesis Data Stream to capture item-level changes for the table.
     *
     * @default - no Kinesis Data Stream
     */
    readonly kinesisStream?: IStream;
    /**
     * The read capacity for the table. Careful if you add Global Secondary Indexes, as
     * those will share the table's provisioned throughput.
     *
     * Can only be provided if billingMode is Provisioned.
     *
     * @default 5
     */
    readonly readCapacity?: number;
    /**
     * The write capacity for the table. Careful if you add Global Secondary Indexes, as
     * those will share the table's provisioned throughput.
     *
     * Can only be provided if billingMode is Provisioned.
     *
     * @default 5
     */
    readonly writeCapacity?: number;
    /**
     * Specify how you are charged for read and write throughput and how you manage capacity.
     *
     * @default PROVISIONED if `replicationRegions` is not specified, PAY_PER_REQUEST otherwise
     */
    readonly billingMode?: BillingMode;
    /**
     * Specify the table class.
     * @default STANDARD
     */
    readonly tableClass?: TableClass;

    /**
     * External KMS key to use for table encryption.
     *
     */
    readonly encryptionKey: IKey;
    /**
     * The name of TTL attribute.
     * @default - TTL is disabled
     */
    readonly timeToLiveAttribute?: string;
    /**
     * When an item in the table is modified, StreamViewType determines what information
     * is written to the stream for this table.
     *
     * @default - streams are disabled unless `replicationRegions` is specified
     */
    readonly stream?: StreamViewType;

    /**
     * Regions where replica tables will be created
     *
     * @default - no replica tables are created
     */
    readonly replicationRegions?: string[];
    /**
     * The timeout for a table replication operation in a single region.
     *
     * @default Duration.minutes(30)
     */
    readonly replicationTimeout?: Duration;
    /**
     * Indicates whether CloudFormation stack waits for replication to finish.
     * If set to false, the CloudFormation resource will mark the resource as
     * created and replication will be completed asynchronously. This property is
     * ignored if replicationRegions property is not set.
     *
     * WARNING:
     * DO NOT UNSET this property if adding/removing multiple replicationRegions
     * in one deployment, as CloudFormation only supports one region replication
     * at a time. CDK overcomes this limitation by waiting for replication to
     * finish before starting new replicationRegion.
     *
     * If the custom resource which handles replication has a physical resource
     * ID with the format `region` instead of `tablename-region` (this would happen
     * if the custom resource hasn't received an event since v1.91.0), DO NOT SET
     * this property to false without making a change to the table name.
     * This will cause the existing replicas to be deleted.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-globaltable.html#cfn-dynamodb-globaltable-replicas
     * @default true
     */
    readonly waitForReplicationToFinish?: boolean;
    /**
     * Whether CloudWatch contributor insights is enabled.
     *
     * @default false
     */
    readonly contributorInsightsEnabled?: boolean;
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
export class MdaaDDBTable extends Table  {

    private static setProps ( props: MdaaDDBTableProps ): TableProps {

        const overrideProps = {
            tableName: props.naming.resourceName(props.tableName,254),
            encryption: TableEncryption.CUSTOMER_MANAGED,
            removalPolicy: RemovalPolicy.RETAIN,
            deletionProtection: true,
            pointInTimeRecovery: true
        }
        return { ...props, ...overrideProps }
    }
    constructor( scope: Construct, id: string, props: MdaaDDBTableProps ) {
        super( scope, id, MdaaDDBTable.setProps( props ) );

        NagSuppressions.addResourceSuppressions(
            this,
            [
                { id: 'HIPAA.Security-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup'  },
                { id: 'PCI.DSS.321-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup'  },
                { id: 'NIST.800.53.R5-DynamoDBInBackupPlan', reason: 'MDAA does not enforce use of AWS Backup' },
                { id: 'NIST.800.53.R5-DynamoDBAutoScalingEnabled', reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.' },
                { id: 'HIPAA.Security-DynamoDBAutoScalingEnabled', reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.'  },
                { id: 'PCI.DSS.321-DynamoDBAutoScalingEnabled', reason: 'MDAA does not enforce use of Auto Scaling on Provisioned Capacity tables.'  },
            ],
            true
        );

        new mdaa_construct.MdaaParamAndOutput( this, {
            ...{
                resourceType: "table",
                resourceId: props.tableName,
                name: "name",
                value: this.tableName
            }, ...props
        } )

        new mdaa_construct.MdaaParamAndOutput( this, {
            ...{
                resourceType: "table",
                resourceId: props.tableName,
                name: "arn",
                value: this.tableArn
            }, ...props
        } )
        if ( this.tableStreamArn ) {
            new mdaa_construct.MdaaParamAndOutput( this, {
                ...{
                    resourceType: "table",
                    resourceId: props.tableName,
                    name: "streamArn",
                    value: this.tableStreamArn
                }, ...props
            } )
        }
    }

}
