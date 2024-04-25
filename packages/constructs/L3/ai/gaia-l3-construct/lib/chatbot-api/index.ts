import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { RagEngines } from "../rag-engines";
import { Shared } from "../shared";
import { SageMakerModelEndpoint, SystemConfig } from "../shared/types";
import { ChatBotDynamoDBTables } from "./chatbot-dynamodb-tables";
import { RestApi } from "./rest-api";
import { WebSocketApi } from "./websocket-api";
import {CaefBucket} from "@aws-caef/s3-constructs";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {CaefDDBTable} from "@aws-caef/ddb-constructs";
import { NagSuppressions } from "cdk-nag";
import {CaefKmsKey} from "@aws-caef/kms-constructs";

export interface ChatBotApiProps extends CaefL3ConstructProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
  readonly ragEngines?: RagEngines;
  readonly userPool: cognito.IUserPool;
  readonly modelsParameter: ssm.StringParameter;
  readonly models: SageMakerModelEndpoint[];
  encryptionKey: CaefKmsKey;
}

export class ChatBotApi extends CaefL3Construct {
  public readonly restApi: apigateway.RestApi;
  public readonly webSocketApi: apigwv2.WebSocketApi;
  public readonly messagesTopic: sns.Topic;
  public readonly sessionsTable: CaefDDBTable;
  public readonly byUserIdIndex: string;
  public readonly filesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ChatBotApiProps) {
    super(scope, id, props);

    const chatTables = new ChatBotDynamoDBTables(this, "ChatDynamoDBTables",{
      naming: props.naming,
      kmsKey: props.encryptionKey
    });

    const chatFilesBucket = new CaefBucket(this, "ChatBuckets", {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      bucketName:  `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-chat-files-bucket`,
      createParams: false,
      createOutputs: false,
      transferAcceleration: true
    });
    NagSuppressions.addResourceSuppressions(
      chatFilesBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF does not enforce bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF does not enforce bucket replication.' }
      ],
      true
    ); 

    const restApi = new RestApi(this, "RestApi", {
      ...props,
      sessionsTable: chatTables.sessionsTable,
      byUserIdIndex: chatTables.byUserIdIndex,
    });

    const webSocketApi = new WebSocketApi(this, "WebSocketApi", props);

    this.restApi = restApi.api;
    this.webSocketApi = webSocketApi.api;
    this.messagesTopic = webSocketApi.messagesTopic;
    this.sessionsTable = chatTables.sessionsTable;
    this.byUserIdIndex = chatTables.byUserIdIndex;
    this.filesBucket = chatFilesBucket;
  }
}
