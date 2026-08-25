/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaSqsDeadLetterQueue, MdaaSqsQueue } from '@aws-mdaa/sqs-constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FilterCriteria } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

/**
 * Redrive configuration for the dead letter queue automatically created alongside each queue.
 *
 * Controls how many failed deliveries a message tolerates before SQS moves it to the DLQ,
 * where it can be inspected and replayed without blocking the source queue.
 *
 * Use cases: Poison message isolation; Controlled reprocessing; Partial failure handling
 *
 * AWS: SQS redrive policy on the source queue, targeting the generated dead letter queue
 *
 * Validation: Optional; maxReceiveCount must be a number between 1 and 1000
 */
export interface QueueDlqProps {
  // The bounds are carried as @minimum/@maximum so the generated config schema rejects an
  // out-of-range count at config-parse time. The upper bound is the one that matters: CDK
  // validates only that the count is 1 or more, so a value above the SQS limit of 1000 would
  // otherwise pass synthesis and be rejected when the queue is created.
  /**
   * Number of failed deliveries after which a message is moved to the dead letter queue.
   * AWS recommends at least 5, so that Lambda retries a transient failure several times
   * before the message is set aside.
   *
   * Validation: Optional; number between 1 and 1000
   * @default 5
   * @minimum 1
   * @maximum 1000
   */
  readonly maxReceiveCount?: number;
}

/**
 * SQS queue configuration for buffering and decoupling Lambda producers from consumers.
 *
 * Each queue is encrypted with the project KMS key, denies non-SSL access, and is created with
 * a redrive dead letter queue. Queue name, ARN, and URL are published as SSM parameters so other
 * modules can reference the queue.
 *
 * Use cases: Ingestion buffering; Producer/consumer decoupling; Backpressure; Message-level retry
 *
 * AWS: SQS queue with CMK encryption and a redrive dead letter queue
 *
 * Validation: Optional properties only; visibilityTimeoutSeconds must be at least the timeout of
 * every function consuming the queue as an event source
 */
export interface SqsQueueProps {
  /**
   * Whether this is a first-in-first-out (FIFO) queue. The '.fifo' suffix SQS requires is appended
   * to the generated queue name automatically and must not be included in the queue key.
   * @default false
   */
  readonly fifo?: boolean;
  /**
   * Whether to deduplicate messages by content instead of requiring an explicit deduplication ID
   * on each send. Only applies to FIFO queues, and implies `fifo`.
   * @default false
   */
  readonly contentBasedDeduplication?: boolean;
  /**
   * Seconds a message stays invisible to other consumers after being received. Must be at least
   * the timeout of every function consuming this queue as an event source, otherwise Lambda
   * rejects the event source mapping. AWS recommends six times the function timeout.
   * @default 30 seconds, as applied by SQS
   */
  readonly visibilityTimeoutSeconds?: number;
  /**
   * Seconds a message is retained before SQS discards it.
   * @default 345600 seconds (4 days), as applied by SQS
   */
  readonly retentionPeriodSeconds?: number;
  /**
   * Seconds to delay delivery of every message sent to the queue.
   * @default 0 seconds, as applied by SQS
   */
  readonly deliveryDelaySeconds?: number;
  /**
   * Maximum size in bytes of a single message.
   * @default 262144 bytes (256 KiB), as applied by SQS
   */
  readonly maxMessageSizeBytes?: number;
  /**
   * Seconds a receive call waits for a message to arrive before returning empty (long polling).
   * @default 0 seconds, as applied by SQS
   */
  readonly receiveMessageWaitTimeSeconds?: number;
  /**
   * Redrive configuration for the dead letter queue created alongside this queue. A dead letter
   * queue is always created, so that queues satisfy the AwsSolutions-SQS3 rule without a
   * per-deployment suppression.
   * @default - a dead letter queue with a maxReceiveCount of 5
   */
  readonly dlq?: QueueDlqProps;
}

/**
 * Map of queue key to queue configuration. The key identifies the queue within the module config:
 * it is the suffix of the generated queue name, and the value referenced by a function's
 * `sqsEventSources` and `queueUrlEnvironment` entries.
 *
 * Keys must satisfy the SQS queue name rules, which are validated at synthesis time:
 *
 * - Only alphanumeric characters, hyphens and underscores. A '.' is rejected, including the '.fifo'
 *   suffix -- set `fifo: true` and the suffix is appended to the generated name for you.
 * - Uppercase characters are lowercased in the generated name.
 * - Keys must be unique against each other and against every function name, because a queue's dead
 *   letter queue and a function's async-invoke dead letter queue are both named '<key>-dlq'.
 *
 * The generated name is `<org>-<env>-<domain>-<module>-<key>`, capped at the SQS limit of 80
 * characters. A key long enough to exceed the cap has its tail replaced by a hash, which keeps the
 * name unique and stable but no longer readable, so keep keys short relative to that budget.
 */
export interface NamedSqsQueueProps {
  /** @jsii ignore */
  readonly [queueName: string]: SqsQueueProps;
}

/**
 * Event filter pattern restricting which messages are delivered to the consuming function.
 * Messages that do not match are dropped from the queue without invoking the function.
 */
export interface SqsEventFilterPattern {
  /** @jsii ignore */
  readonly [key: string]: unknown;
}

/**
 * Binding between a function and a queue declared in the same module config, creating a Lambda
 * event source mapping which polls the queue and invokes the function with batches of messages.
 *
 * Use cases: Queue-driven data processing; Batched transformation; Partial failure handling
 *
 * AWS: Lambda event source mapping with an SQS event source
 *
 * Validation: Optional properties only; the binding's key must name a queue declared under the
 * module's `queues` section
 */
export interface SqsEventSourceProps {
  /**
   * Maximum number of messages delivered to the function in a single invocation. Batches above 10
   * require maxBatchingWindowSeconds to also be set.
   * @default 10
   */
  readonly batchSize?: number;
  /**
   * Maximum seconds to gather messages before invoking the function, trading latency for fewer,
   * larger batches.
   * @default 0 seconds - invoke as soon as batchSize messages are available
   */
  readonly maxBatchingWindowSeconds?: number;
  /**
   * Whether the function reports individual message failures, so that only the failed messages
   * return to the queue instead of the entire batch. Requires the function to return a
   * batchItemFailures payload.
   * @default false
   */
  readonly reportBatchItemFailures?: boolean;
  /**
   * Maximum concurrent function invocations this event source will drive, applying backpressure
   * so that a queue backlog cannot exhaust account concurrency.
   * @default - unlimited, bounded only by account concurrency
   */
  readonly maxConcurrency?: number;
  /**
   * Whether the event source mapping polls the queue. Set to false to deploy the mapping in a
   * stopped state and enable it later.
   * @default true
   */
  readonly enabled?: boolean;
  /**
   * Filter patterns restricting which messages are delivered to the function. A message is
   * delivered if it matches any one of the patterns.
   * @default - all messages are delivered
   */
  readonly filterCriteria?: SqsEventFilterPattern[];
}

/**
 * Map of queue key to event source configuration. The key names a queue declared under the module's
 * `queues` section, so a function cannot bind to the same queue twice.
 */
export interface NamedSqsEventSourceProps {
  /** @jsii ignore */
  readonly [queueName: string]: SqsEventSourceProps;
}

/**
 * Creates the SQS queues declared in a module config, and binds them to Lambda functions as event
 * sources with the permissions and validation the pairing requires.
 */
export class SqsQueueHelper {
  /**
   * Deliveries before a message is redriven to the dead letter queue. AWS recommends at least 5,
   * so Lambda retries a transient failure several times before the message is set aside.
   */
  public static readonly DEFAULT_MAX_RECEIVE_COUNT = 5;
  /** Visibility timeout SQS applies when the queue does not configure one. */
  public static readonly DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
  /** Timeout Lambda applies when the function does not configure one. */
  public static readonly DEFAULT_FUNCTION_TIMEOUT_SECONDS = 3;
  /**
   * Queue actions the Lambda event source mapping requires of the consuming function's execution
   * role in order to poll the queue.
   */
  public static readonly CONSUME_ACTIONS = ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'];
  /** Queue action a producing function's execution role requires in order to send to the queue. */
  public static readonly SEND_ACTIONS = ['sqs:SendMessage'];
  /** Suffix SQS requires of FIFO queue names, appended by `MdaaSqsQueue` after name truncation. */
  public static readonly FIFO_SUFFIX = '.fifo';
  /** Suffix applied to the name of every generated dead letter queue. */
  public static readonly DLQ_SUFFIX = '-dlq';
  /**
   * Characters SQS permits in a queue name, beyond the '.fifo' suffix on FIFO queues. Used to strip
   * the permitted characters from a name, leaving only those SQS would reject.
   */
  private static readonly QUEUE_NAME_ALLOWED_CHARS = /[A-Za-z0-9_-]/g;

  /**
   * Whether a queue is FIFO, and so whether its generated name carries the '.fifo' suffix.
   *
   * `contentBasedDeduplication` applies only to FIFO queues, so setting it implies FIFO. Resolved
   * here rather than at each use so that queue creation and name-collision validation cannot drift
   * apart on which queues are FIFO.
   */
  public static isFifo(queueProps: SqsQueueProps): boolean {
    return queueProps.fifo ?? queueProps.contentBasedDeduplication ?? false;
  }

  /**
   * The suffix a queue's generated physical name carries: '.fifo' for a FIFO queue, otherwise none.
   */
  public static nameSuffix(queueProps: SqsQueueProps): string {
    return SqsQueueHelper.isFifo(queueProps) ? SqsQueueHelper.FIFO_SUFFIX : '';
  }

  /**
   * Creates a queue and its redrive dead letter queue, both encrypted with the project key.
   */
  public static createQueue(
    scope: Construct,
    naming: IMdaaResourceNaming,
    queueName: string,
    queueProps: SqsQueueProps,
    encryptionMasterKey: IMdaaKmsKey,
  ): MdaaSqsQueue {
    // A FIFO queue can only redrive to a FIFO dead letter queue, so the flag is resolved once and
    // applied to both rather than left to per-queue inference.
    const fifo = SqsQueueHelper.isFifo(queueProps);

    const dlq = new MdaaSqsDeadLetterQueue(scope, `queue-dlq-${queueName}`, {
      queueName: `${queueName}${SqsQueueHelper.DLQ_SUFFIX}`,
      encryptionMasterKey,
      naming,
      fifo,
    });

    return new MdaaSqsQueue(scope, `queue-${queueName}`, {
      queueName,
      encryptionMasterKey,
      naming,
      fifo,
      contentBasedDeduplication: queueProps.contentBasedDeduplication,
      visibilityTimeout: SqsQueueHelper.optionalSeconds(queueProps.visibilityTimeoutSeconds),
      retentionPeriod: SqsQueueHelper.optionalSeconds(queueProps.retentionPeriodSeconds),
      deliveryDelay: SqsQueueHelper.optionalSeconds(queueProps.deliveryDelaySeconds),
      maxMessageSizeBytes: queueProps.maxMessageSizeBytes,
      receiveMessageWaitTime: SqsQueueHelper.optionalSeconds(queueProps.receiveMessageWaitTimeSeconds),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: queueProps.dlq?.maxReceiveCount ?? SqsQueueHelper.DEFAULT_MAX_RECEIVE_COUNT,
      },
    });
  }

  /**
   * Looks up a queue created by this module, failing with the available keys when the reference
   * does not resolve.
   */
  public static resolveQueue(
    queuesByName: { [queueName: string]: MdaaSqsQueue },
    queueName: string,
    functionName: string,
  ): MdaaSqsQueue {
    const queue = queuesByName[queueName];
    if (!queue) {
      const availableQueues = Object.keys(queuesByName).join(', ');
      throw new Error(
        `Function "${functionName}" references undefined queue "${queueName}". ` +
          `Available queues: ${availableQueues || 'none'}`,
      );
    }
    return queue;
  }

  /**
   * Builds the SQS event source which polls the queue on the function's behalf.
   */
  public static createEventSource(queue: IQueue, eventSourceProps: SqsEventSourceProps): SqsEventSource {
    return new SqsEventSource(queue, {
      batchSize: eventSourceProps.batchSize,
      maxBatchingWindow: SqsQueueHelper.optionalSeconds(eventSourceProps.maxBatchingWindowSeconds),
      reportBatchItemFailures: eventSourceProps.reportBatchItemFailures,
      maxConcurrency: eventSourceProps.maxConcurrency,
      enabled: eventSourceProps.enabled,
      filters: eventSourceProps.filterCriteria?.map(pattern => FilterCriteria.filter(pattern)),
    });
  }

  /**
   * Builds an empty allow statement for a queue resource policy. Principals are added by the
   * caller, which shares one statement per queue and grant type across every function granted it.
   *
   * `resources: ['*']` denotes the queue the policy is attached to, matching the queue's own
   * EnforceSSL statement and the dead letter queue grant in `EventBridgeHelper.createDlq`.
   */
  public static createGrantStatement(sid: string, actions: string[]): PolicyStatement {
    return new PolicyStatement({
      sid,
      effect: Effect.ALLOW,
      actions: [...actions],
      resources: ['*'],
    });
  }

  /**
   * Throws when a queue name is not usable as an SQS queue name, carries the '.fifo' suffix, or
   * contradicts itself on FIFO.
   *
   * SQS permits only alphanumeric characters, hyphens and underscores, rejecting anything else with
   * `InvalidParameterValue` when the queue is created. MDAA's own resource-name validation is more
   * permissive -- it allows '.' so that the FIFO suffix survives -- so a name containing a '.'
   * would otherwise synthesize cleanly and fail on deploy.
   */
  public static validateQueueProps(queueName: string, queueProps: SqsQueueProps): void {
    // Checked before the character set, so that a name carrying the suffix is pointed at the
    // 'fifo' flag rather than merely reported as containing an illegal '.'.
    if (queueName.endsWith(SqsQueueHelper.FIFO_SUFFIX)) {
      throw new Error(
        `Queue "${queueName}" must not carry the '${SqsQueueHelper.FIFO_SUFFIX}' suffix in its name. ` +
          `Set 'fifo: true' instead, and the suffix is appended to the generated queue name.`,
      );
    }
    if (queueName.length === 0) {
      throw new Error('Queue names must not be empty.');
    }
    const invalidCharacters = [...new Set(queueName.replace(SqsQueueHelper.QUEUE_NAME_ALLOWED_CHARS, ''))];
    if (invalidCharacters.length > 0) {
      const quoted = invalidCharacters.map(character => `'` + character + `'`).join(', ');
      throw new Error(
        `Queue "${queueName}" contains ${quoted}, which SQS does not permit in a queue name. ` +
          `Use only alphanumeric characters, hyphens and underscores.`,
      );
    }
    if (queueProps.fifo === false && queueProps.contentBasedDeduplication) {
      throw new Error(
        `Queue "${queueName}" sets 'contentBasedDeduplication: true', which applies only to FIFO ` +
          `queues, but also sets 'fifo: false'. Remove one of them.`,
      );
    }
  }

  /**
   * Throws when the queue a function is bound to has a visibility timeout shorter than the
   * function's own timeout. Does nothing when the queue key does not resolve — that is reported,
   * with the available keys for context, when the event source is bound.
   *
   * Lambda rejects this pairing when the event source mapping is created or updated, but CDK does
   * not validate it, so without this guard a misconfigured pipeline passes synthesis and fails
   * only on deploy. Lambda also enforces the constraint *only* at mapping create/update — raising
   * a function timeout afterwards leaves the existing mapping enabled in an invalid state, where
   * messages can become visible again mid-processing and be delivered twice. This guard therefore
   * has to run on every synthesis, not only when a queue or mapping is newly introduced.
   */
  public static validateVisibilityTimeout(
    queues: NamedSqsQueueProps,
    queueName: string,
    functionName: string,
    functionTimeoutSeconds?: number,
  ): void {
    const queueProps = queues[queueName];
    if (!queueProps) {
      return;
    }
    const visibilityTimeout = queueProps.visibilityTimeoutSeconds ?? SqsQueueHelper.DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
    const functionTimeout = functionTimeoutSeconds ?? SqsQueueHelper.DEFAULT_FUNCTION_TIMEOUT_SECONDS;
    if (visibilityTimeout >= functionTimeout) {
      return;
    }
    const visibilityDescription = SqsQueueHelper.describeSeconds(
      visibilityTimeout,
      queueProps.visibilityTimeoutSeconds === undefined ? 'SQS default' : undefined,
    );
    const timeoutDescription = SqsQueueHelper.describeSeconds(
      functionTimeout,
      functionTimeoutSeconds === undefined ? 'Lambda default' : undefined,
    );
    throw new Error(
      `Queue "${queueName}" has a visibility timeout of ${visibilityDescription}, which is less ` +
        `than the ${timeoutDescription} timeout of consuming function "${functionName}". Lambda rejects this when ` +
        `creating the event source mapping. Set the queue's visibilityTimeoutSeconds to at least ${functionTimeout} ` +
        `(AWS recommends six times the function timeout).`,
    );
  }

  private static describeSeconds(seconds: number, qualifier?: string): string {
    return qualifier ? `${seconds} seconds (${qualifier})` : `${seconds} seconds`;
  }

  private static optionalSeconds(seconds?: number): Duration | undefined {
    return seconds === undefined ? undefined : Duration.seconds(seconds);
  }
}
