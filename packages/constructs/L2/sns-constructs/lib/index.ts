/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface MdaaSnsTopicProps extends MdaaConstructProps {
  readonly topicName: string;

  readonly masterKey: IMdaaKmsKey;

  readonly contentBasedDeduplication?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable display name for the SNS topic providing user-friendly identification in management interfaces. Enables clear topic identification in AWS console and monitoring tools for improved operational visibility.
   *
   * Use cases: User-friendly identification; Management interface clarity; Operational visibility
   *
   * AWS: AWS SNS topic display name for user interface and management tool identification
   *
   * Validation: Must be descriptive text if provided; used for display purposes in AWS console
   **/
  readonly displayName?: string;

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
