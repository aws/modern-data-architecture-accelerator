/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/**
 * Properties for creating a MDAA SNS Topic
 */
export interface MdaaSnsTopicProps extends MdaaConstructProps {
  // A name for the topic.
  readonly topicName: string;

  // A KMS Key, either managed by this CDK app, or imported.
  readonly masterKey: IMdaaKmsKey;

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
export class MdaaSnsTopic extends Topic {
  private static setProps(props: MdaaSnsTopicProps): TopicProps {
    const overrideProps = {
      topicName: props.naming.resourceName(props.topicName, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaSnsTopicProps) {
    super(scope, id, MdaaSnsTopic.setProps(props));

    const enforceSslStatement = new PolicyStatement({
      sid: 'EnforceSSL',
      effect: Effect.DENY,
      actions: [
        'sns:Publish',
        'sns:RemovePermission',
        'sns:SetTopicAttributes',
        'sns:DeleteTopic',
        'sns:ListSubscriptionsByTopic',
        'sns:GetTopicAttributes',
        'sns:Receive',
        'sns:AddPermission',
        'sns:Subscribe',
      ],
      resources: ['*'],
      conditions: {
        Bool: {
          'aws:SecureTransport': 'false',
        },
      },
    });
    enforceSslStatement.addAnyPrincipal();
    this.addToResourcePolicy(enforceSslStatement);

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Topic',
          resourceId: props.topicName,
          name: 'name',
          value: this.topicName,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Topic',
          resourceId: props.topicName,
          name: 'arn',
          value: this.topicArn,
        },
        ...props,
      },
      scope,
    );
  }
}
