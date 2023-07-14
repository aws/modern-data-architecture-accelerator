/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { ICaefKmsKey } from '@aws-caef/kms-constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/**
 * Properties for creating a CAEF SNS Topic
 */
export interface CaefSnsTopicProps extends CaefConstructProps {

    // A name for the topic.
    readonly topicName: string;

    // A KMS Key, either managed by this CDK app, or imported.
    readonly masterKey: ICaefKmsKey;

    // Enables content-based deduplication for FIFO topics.
    readonly contentBasedDeduplication?: boolean;

    // A developer-defined string that can be used to identify this SNS topic.
    readonly displayName?: string;

    // Set to true to create a FIFO topic.
    readonly fifo?: boolean;

}

/**
 * A construct which creates a compliant SNS Topic.
 */
export class CaefSnsTopic extends Topic {

    private static setProps ( props: CaefSnsTopicProps ): TopicProps {
        const overrideProps = {
            topicName: props.naming.resourceName( props.topicName, 80 )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefSnsTopicProps ) {
        super( scope, id, CaefSnsTopic.setProps( props ) )

        const enforceSslStatement = new PolicyStatement( {
            sid: "EnforceSSL",
            effect: Effect.DENY,
            actions: [
                "sns:Publish",
                "sns:RemovePermission",
                "sns:SetTopicAttributes",
                "sns:DeleteTopic",
                "sns:ListSubscriptionsByTopic",
                "sns:GetTopicAttributes",
                "sns:Receive",
                "sns:AddPermission",
                "sns:Subscribe" ],
            resources: [ "*" ],
            conditions: {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        } )
        enforceSslStatement.addAnyPrincipal()
        this.addToResourcePolicy( enforceSslStatement )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "Topic",
                resourceId: props.topicName,
                name: "name",
                value: this.topicName
            }, ...props
        } )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "Topic",
                resourceId: props.topicName,
                name: "arn",
                value: this.topicArn
            }, ...props
        } )
    }
}

