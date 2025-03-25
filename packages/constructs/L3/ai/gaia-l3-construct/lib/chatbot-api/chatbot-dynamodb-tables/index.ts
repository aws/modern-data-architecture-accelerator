import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaConstructProps } from '@aws-mdaa/construct';
import { IKey } from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface ChatBotDynamoDBTablesProps extends MdaaConstructProps {
  readonly kmsKey: IKey;
}

export class ChatBotDynamoDBTables extends Construct {
  public readonly sessionsTable: dynamodb.Table;
  public readonly byUserIdIndex: string = 'byUserId';

  constructor(scope: Construct, id: string, props: ChatBotDynamoDBTablesProps) {
    super(scope, id);

    const sessionsTable = new MdaaDDBTable(this, 'SessionsTable', {
      naming: props.naming,
      tableName: props.naming.resourceName('Sessions'),
      createParams: false,
      createOutputs: false,
      encryptionKey: props.kmsKey,
      partitionKey: {
        name: 'SessionId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'UserId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    sessionsTable.addGlobalSecondaryIndex({
      indexName: this.byUserIdIndex,
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
    });

    new ssm.StringParameter(this, 'UserPoolDomainSSMParam', {
      parameterName: props.naming.ssmPath('table/sessions/name'),
      stringValue: sessionsTable.tableName,
    });

    this.sessionsTable = sessionsTable;
  }
}
