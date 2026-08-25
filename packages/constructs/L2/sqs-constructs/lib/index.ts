/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
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

export interface MdaaSqsQueueProps extends MdaaConstructProps {
  readonly queueName: string;
  readonly retentionPeriod?: Duration;
  readonly deliveryDelay?: Duration;
  readonly maxMessageSizeBytes?: number;
  readonly receiveMessageWaitTime?: Duration;
  readonly visibilityTimeout?: Duration;
  readonly deadLetterQueue?: DeadLetterQueue;
  /**
   * External KMS master key to use for queue encryption.
   * Individual messages will be encrypted using data keys. The data keys in
   * turn will be encrypted using this key, and reused for a maximum of
   * `dataKeyReuseSecs` seconds.
   * If the 'encryptionMasterKey' property is set, 'encryption' type will be
   * implicitly set to "KMS".
   * @default If encryption is set to KMS and not specified, a key will be created.
   */
  readonly encryptionMasterKey: IMdaaKmsKey;
  /**
   * The length of time that Amazon SQS reuses a data key before calling KMS again.
   * The value must be an integer between 60 (1 minute) and 86,400 (24
   * hours). The default is 300 (5 minutes).
   * @default Duration.minutes(5)
   */
  readonly dataKeyReuse?: Duration;
  /**
   * Whether this a first-in-first-out (FIFO) queue.
   * @default false, unless queueName ends in '.fifo' or 'contentBasedDeduplication' is true.
   */
  readonly fifo?: boolean;
  /**
   * Specifies whether to enable content-based deduplication.
   * During the deduplication interval (5 minutes), Amazon SQS treats
   * messages that are sent with identical content (excluding attributes) as
   * duplicates and delivers only one copy of the message.
   * If you don't enable content-based deduplication and you want to deduplicate
   * messages, provide an explicit deduplication ID in your SendMessage() call.
   * (Only applies to FIFO queues.)
   * @default false
   */
  readonly contentBasedDeduplication?: boolean;
  /**
   * For high throughput for FIFO queues, specifies whether message deduplication
   * occurs at the message group or queue level.
   * (Only applies to FIFO queues.)
   * @default DeduplicationScope.QUEUE
   */
  readonly deduplicationScope?: DeduplicationScope;
  /**
   * For high throughput for FIFO queues, specifies whether the FIFO queue
   * throughput quota applies to the entire queue or per message group.
   * (Only applies to FIFO queues.)
   * @default FifoThroughputLimit.PER_QUEUE
   */
  readonly fifoThroughputLimit?: FifoThroughputLimit;
  /**
   * Policy to apply when the queue is removed from the stack
   * Even though queues are technically stateful, their contents are transient and it
   * is common to add and remove Queues while rearchitecting your application. The
   * default is therefore `DESTROY`. Change it to `RETAIN` if the messages are so
   * valuable that accidentally losing them would be unacceptable.
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * A construct which creates a compliance SQS queue.
 * Specifically, we ensure the Queue will be encrypted through use of a KMS key.
 */
export class MdaaSqsQueue extends Queue {
  /** SQS limits queue names to 80 characters, inclusive of the '.fifo' suffix on FIFO queues. */
  private static readonly MAX_QUEUE_NAME_LENGTH = 80;
  private static readonly FIFO_SUFFIX = '.fifo';

  private static setProps(props: MdaaSqsQueueProps): QueueProps {
    const sqsNaming = props.naming.withResourceType(MdaaResourceType.SQS_QUEUE);
    const overrideProps = {
      // KMS mode is already inferred from the required encryptionMasterKey prop, but this is belt and suspenders
      encryption: QueueEncryption.KMS,
      queueName: MdaaSqsQueue.generateQueueName(sqsNaming, props),
    };
    return { ...props, ...overrideProps };
  }

  /**
   * Generates the queue name, appending the '.fifo' suffix required of FIFO queues.
   *
   * The suffix is appended after naming truncation rather than being embedded in the configured
   * name, because `resourceName` truncation replaces the tail of the name with a '-<hash>'
   * suffix — which would destroy a '.fifo' suffix whenever the generated name reaches the
   * 80 character limit.
   */
  private static generateQueueName(sqsNaming: IMdaaResourceNaming, props: MdaaSqsQueueProps): string {
    if (!MdaaSqsQueue.isFifo(props)) {
      return sqsNaming.resourceName(props.queueName, MdaaSqsQueue.MAX_QUEUE_NAME_LENGTH);
    }
    const suffixLength = MdaaSqsQueue.FIFO_SUFFIX.length;
    // Tolerate a configured name which already carries the suffix, so it is not doubled up.
    const baseName = props.queueName.endsWith(MdaaSqsQueue.FIFO_SUFFIX)
      ? props.queueName.slice(0, -suffixLength)
      : props.queueName;
    const truncatedName = sqsNaming.resourceName(baseName, MdaaSqsQueue.MAX_QUEUE_NAME_LENGTH - suffixLength);
    return `${truncatedName}${MdaaSqsQueue.FIFO_SUFFIX}`;
  }

  /**
   * Determines whether the queue is FIFO, mirroring the inference the underlying CDK Queue
   * applies, so that the generated name always agrees with the rendered FifoQueue property.
   */
  private static isFifo(props: MdaaSqsQueueProps): boolean {
    return (
      props.fifo ??
      (props.queueName.endsWith(MdaaSqsQueue.FIFO_SUFFIX) ||
        props.contentBasedDeduplication === true ||
        props.deduplicationScope !== undefined ||
        props.fifoThroughputLimit !== undefined)
    );
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
