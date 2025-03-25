import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { RagEngines } from '../rag-engines';
import { Shared } from '../shared';
import { SageMakerModelEndpoint, SystemConfig } from '../shared/types';
import { ChatBotDynamoDBTables } from './chatbot-dynamodb-tables';
import { RestApi } from './rest-api';
import { WebSocketApi } from './websocket-api';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { NagSuppressions } from 'cdk-nag';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface ChatBotApiProps extends MdaaL3ConstructProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
  readonly ragEngines?: RagEngines;
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
  readonly modelsParameter: ssm.StringParameter;
  readonly models: SageMakerModelEndpoint[];
  encryptionKey: MdaaKmsKey;
}

export class ChatBotApi extends MdaaL3Construct {
  public readonly restApi: apigateway.RestApi;
  public readonly webSocketApi: apigwv2.WebSocketApi;
  public readonly messagesTopic: sns.Topic;
  public readonly sessionsTable: MdaaDDBTable;
  public readonly byUserIdIndex: string;
  public readonly filesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ChatBotApiProps) {
    super(scope, id, props);

    const chatTables = new ChatBotDynamoDBTables(this, 'ChatDynamoDBTables', {
      naming: props.naming,
      kmsKey: props.encryptionKey,
    });

    const chatFilesBucket = new MdaaBucket(this, 'ChatBuckets', {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      bucketName: `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-chat-files-bucket`,
      createParams: false,
      createOutputs: false,
      transferAcceleration: true,
    });
    NagSuppressions.addResourceSuppressions(
      chatFilesBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
        { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
      ],
      true,
    );

    const restApi = new RestApi(this, 'RestApi', {
      ...props,
      sessionsTable: chatTables.sessionsTable,
      byUserIdIndex: chatTables.byUserIdIndex,
    });

    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', props);

    this.restApi = restApi.api;
    this.webSocketApi = webSocketApi.api;
    this.messagesTopic = webSocketApi.messagesTopic;
    this.sessionsTable = chatTables.sessionsTable;
    this.byUserIdIndex = chatTables.byUserIdIndex;
    this.filesBucket = chatFilesBucket;
  }
}
