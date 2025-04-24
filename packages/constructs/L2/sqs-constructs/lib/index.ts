/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  DeadLetterQueue,
  DeduplicationScope,
  FifoThroughputLimit,
  Queue,
  QueueEncryption,
  QueueProps,
} from 'aws-cdk-lib/aws-sqs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Properties for creating a MDAA SQS Queue
 */
export interface MdaaSqsQueueProps extends MdaaConstructProps {
  /**
   * A name for the queue.
   *
   * If specified and this is a FIFO queue, must end in the string '.fifo'.
   *
   * @default CloudFormation-generated name
   */
  readonly queueName: string;
  /**
   * The number of seconds that Amazon SQS retains a message.
   *
   * You can specify an integer value from 60 seconds (1 minute) to 1209600
   * seconds (14 days). The default value is 345600 seconds (4 days).
   *
   * @default Duration.days(4)
   */
  readonly retentionPeriod?: Duration;
  /**
   * The time in seconds that the delivery of all messages in the queue is delayed.
   *
   * You can specify an integer value of 0 to 900 (15 minutes). The default
   * value is 0.
   *
   * @default 0
   */
  readonly deliveryDelay?: Duration;
  /**
   * The limit of how many bytes that a message can contain before Amazon SQS rejects it.
   *
   * You can specify an integer value from 1024 bytes (1 KiB) to 262144 bytes
   * (256 KiB). The default value is 262144 (256 KiB).
   *
   * @default 256KiB
   */
  readonly maxMessageSizeBytes?: number;
  /**
   * Default wait time for ReceiveMessage calls.
   *
   * Does not wait if set to 0, otherwise waits this amount of seconds
   * by default for messages to arrive.
   *
   * For more information, see Amazon SQS Long Poll.
   *
   *  @default 0
   */
  readonly receiveMessageWaitTime?: Duration;
  /**
   * Timeout of processing a single message.
   *
   * After dequeuing, the processor has this much time to handle the message
   * and delete it from the queue before it becomes visible again for dequeueing
   * by another processor.
   *
   * Values must be from 0 to 43200 seconds (12 hours). If you don't specify
   * a value, AWS CloudFormation uses the default value of 30 seconds.
   *
   * @default Duration.seconds(30)
   */
  readonly visibilityTimeout?: Duration;
  /**
   * Send messages to this queue if they were unsuccessfully dequeued a number of times.
   *
   * @default no dead-letter queue
   */
  readonly deadLetterQueue?: DeadLetterQueue;
  /**
   * External KMS master key to use for queue encryption.
   *
   * Individual messages will be encrypted using data keys. The data keys in
   * turn will be encrypted using this key, and reused for a maximum of
   * `dataKeyReuseSecs` seconds.
   *
   * If the 'encryptionMasterKey' property is set, 'encryption' type will be
   * implicitly set to "KMS".
   *
   * @default If encryption is set to KMS and not specified, a key will be created.
   */
  readonly encryptionMasterKey: IMdaaKmsKey;
  /**
   * The length of time that Amazon SQS reuses a data key before calling KMS again.
   *
   * The value must be an integer between 60 (1 minute) and 86,400 (24
   * hours). The default is 300 (5 minutes).
   *
   * @default Duration.minutes(5)
   */
  readonly dataKeyReuse?: Duration;
  /**
   * Whether this a first-in-first-out (FIFO) queue.
   *
   * @default false, unless queueName ends in '.fifo' or 'contentBasedDeduplication' is true.
   */
  readonly fifo?: boolean;
  /**
   * Specifies whether to enable content-based deduplication.
   *
   * During the deduplication interval (5 minutes), Amazon SQS treats
   * messages that are sent with identical content (excluding attributes) as
   * duplicates and delivers only one copy of the message.
   *
   * If you don't enable content-based deduplication and you want to deduplicate
   * messages, provide an explicit deduplication ID in your SendMessage() call.
   *
   * (Only applies to FIFO queues.)
   *
   * @default false
   */
  readonly contentBasedDeduplication?: boolean;
  /**
   * For high throughput for FIFO queues, specifies whether message deduplication
   * occurs at the message group or queue level.
   *
   * (Only applies to FIFO queues.)
   *
   * @default DeduplicationScope.QUEUE
   */
  readonly deduplicationScope?: DeduplicationScope;
  /**
   * For high throughput for FIFO queues, specifies whether the FIFO queue
   * throughput quota applies to the entire queue or per message group.
   *
   * (Only applies to FIFO queues.)
   *
   * @default FifoThroughputLimit.PER_QUEUE
   */
  readonly fifoThroughputLimit?: FifoThroughputLimit;
  /**
   * Policy to apply when the queue is removed from the stack
   *
   * Even though queues are technically stateful, their contents are transient and it
   * is common to add and remove Queues while rearchitecting your application. The
   * default is therefore `DESTROY`. Change it to `RETAIN` if the messages are so
   * valuable that accidentally losing them would be unacceptable.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * A construct which creates a compliance SQS queue.
 * Specifically, we ensure the Queue will be encrypted through use of a KMS key.
 */
export class MdaaSqsQueue extends Queue {
  private static setProps(props: MdaaSqsQueueProps): QueueProps {
    const overrideProps = {
      encyption: QueueEncryption.KMS,
      queueName: props.naming.resourceName(props.queueName, 80),
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaSqsQueueProps) {
    super(scope, id, MdaaSqsQueue.setProps(props));
    const enforceSslStatement = new PolicyStatement({
      sid: 'EnforceSSL',
      effect: Effect.DENY,
      actions: ['sqs:*'],
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
          resourceType: 'queue',
          resourceId: props.queueName,
          name: 'name',
          value: this.queueName,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'queue',
          resourceId: props.queueName,
          name: 'arn',
          value: this.queueArn,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'queue',
          resourceId: props.queueName,
          name: 'url',
          value: this.queueUrl,
        },
        ...props,
      },
      scope,
    );
  }
}

/**
 * A construct for a complaince SQS queue which is suitable for use as a DeadLetterQueue.
 * Specifically, we suppress the Nag which requires a Queue to have a DLQ.
 */
export class MdaaSqsDeadLetterQueue extends MdaaSqsQueue {
  constructor(scope: Construct, id: string, props: MdaaSqsQueueProps) {
    super(scope, id, props);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [{ id: 'AwsSolutions-SQS3', reason: 'Queue is a DLQ.' }],
      true,
    );
  }
}
