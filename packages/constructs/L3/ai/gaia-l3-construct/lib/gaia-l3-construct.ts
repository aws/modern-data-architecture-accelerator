/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaL3Construct, MdaaL3ConstructProps } from "@aws-mdaa/l3-construct";

import { FilterOrPolicy, SubscriptionFilter } from "aws-cdk-lib/aws-sns";
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { Authentication } from "./authentication";
import { ChatBotApi } from "./chatbot-api";
import { LangChainInterface } from "./model-interfaces/langchain";
import { Models } from "./models";
import { RagEngines } from "./rag-engines";
import { Shared } from "./shared";
import { Direction, ModelInterface, SystemConfig } from "./shared/types";
import { Stack } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from "@aws-mdaa/kms-constructs";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";




export interface GAIAProps extends SystemConfig {
  /**
   * List of admin roles which will be provided access to team resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[]


}

export interface GAIAL3ConstructProps extends MdaaL3ConstructProps {
  readonly gaia: GAIAProps
}

//This stack creates all the resources required for a Gen AI Factory Application
export class GAIAL3Construct extends MdaaL3Construct {
  protected readonly props: GAIAL3ConstructProps


  constructor( scope: Construct, id: string, props: GAIAL3ConstructProps ) {
    super( scope, id, props )
    this.props = props

    const stackEncryptionKey = new MdaaKmsKey(this, 'StackEncryptionKey', {
      naming: props.naming,
      createParams: true,
      createOutputs: false,
    })

    const cloudwatchStatement = new PolicyStatement( {
      sid: "CloudWatchLogsEncryption",
      effect: Effect.ALLOW,
      actions: [
          ...DECRYPT_ACTIONS,
          ...ENCRYPT_ACTIONS
      ],
      principals: [ new ServicePrincipal( `logs.${ this.region }.amazonaws.com` ) ],
      resources: [ "*" ],
      //Limit access to use this key only for log groups within this account
      conditions: {
          "ArnEquals": {
              "kms:EncryptionContext:aws:logs:arn": `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*`
          }
      }
    } )

    stackEncryptionKey.addToResourcePolicy(cloudwatchStatement)

    const shared = new Shared( this, "Shared", {
        config: props.gaia,
        encryptionKey: stackEncryptionKey,
        ...props }
    );
    const authentication = new Authentication( this, "Authentication", {
      config: props.gaia,
      naming: props.naming
    } );
    const models = new Models( this, "Models", {
      ...props,
      encryptionKey: stackEncryptionKey,
      config: props.gaia,
      shared,
    } );

    let ragEngines: RagEngines | undefined = undefined;
    if ( props.gaia.rag ) {
        ragEngines = new RagEngines( this, "RagEngines", {
        ...props,
        shared,
        encryptionKey: stackEncryptionKey,
        config: props.gaia,
      } );
    }

    const chatBotApi = new ChatBotApi( this, "ChatBotApi", {
        ...props,
        shared,
        encryptionKey: stackEncryptionKey,
        config: props.gaia,
        ragEngines: ragEngines,
        userPool: authentication.userPool,
        userPoolClient: authentication.userPoolClient,
        modelsParameter: models.modelsParameter,
        models: models.models,
    });

    // Langchain Interface Construct
    // This is the model interface recieving messages from the websocket interface via the message topic
    // and interacting with the model via LangChain library
    const langchainModels = models.models.filter(
        ( model ) => model.modelInterface === ModelInterface.LANG_CHAIN
    );

    // check if any deployed model requires langchain interface or if bedrock is enabled from config
    if ( langchainModels.length > 0 || props.gaia.bedrock?.enabled ) {
        const langchainInterface = new LangChainInterface(
            this,
            "LangchainInterface",
            {
                ...props,
                shared,
                encryptionKey: stackEncryptionKey,
                config: props.gaia,
                ragEngines,
                messagesTopic: chatBotApi.messagesTopic,
                sessionsTable: chatBotApi.sessionsTable,
                byUserIdIndex: chatBotApi.byUserIdIndex,
            }
        );

        // Route all incoming messages targeted to langchain to the langchain model interface queue
        chatBotApi.messagesTopic.addSubscription(
            new SqsSubscription( langchainInterface.ingestionQueue, {
                filterPolicyWithMessageBody: {
                    direction: FilterOrPolicy.filter(
                        SubscriptionFilter.stringFilter( {
                            allowlist: [ Direction.IN ],
                        } )
                    ),
                    modelInterface: FilterOrPolicy.filter(
                        SubscriptionFilter.stringFilter( {
                            allowlist: [ ModelInterface.LANG_CHAIN ],
                        } )
                    ),
                },
            } )
        );

        for ( const model of models.models ) {
            if ( model.modelInterface === ModelInterface.LANG_CHAIN ) {
                langchainInterface.addSageMakerEndpoint( model );
            }
        }
    }

    NagSuppressions.addResourceSuppressions(
      this,
      [
        { id: 'AwsSolutions-L1', reason: 'GAIA designed for Python 3.11.' },
      ],
      true
    );
  
    // BucketDeployment uses a Custom Resource Lambda to copy assets
    // from CDK Deployment bucket to destination bucket.
    Stack.of( this ).node.children.forEach( child => {
      if (
          child.node.id.includes( "Custom::CDKBucketDeployment" ) ||
          child.node.id.includes( "BucketNotificationsHandler" ) ||
          child.node.id.includes( "DatabaseSetupFunction" ) ||
          child.node.id.includes( "LogRetention" )
      ) {
        console.log(child.node.id)
        NagSuppressions.addResourceSuppressions(
            child,
            [
              { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
              { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.' },
              { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.' },
              { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.' },
              { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.' },
              { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.' },
              { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.' },
              { id: 'AwsSolutions-IAM4', reason: 'Function is used only as custom resource during CDK deployment.' },
              { id: 'AwsSolutions-IAM5', reason: 'Function is used only as custom resource during CDK deployment.' },
              { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy managed by CDK and only used during deployment.' },
              { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy managed by CDK and only used during deployment.' },
            ],
            true
        );
      }
    } )

  }

  

}