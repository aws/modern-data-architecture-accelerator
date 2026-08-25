/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Match } from 'aws-cdk-lib/assertions';
import { DeduplicationScope, FifoThroughputLimit } from 'aws-cdk-lib/aws-sqs';
import { MdaaSqsDeadLetterQueue, MdaaSqsQueue, MdaaSqsQueueProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const dlq = new MdaaSqsDeadLetterQueue(testApp.testStack, 'test-dlq', {
    naming: testApp.naming,
    queueName: 'test-dlq',
    encryptionMasterKey: testKey,
  });
  const testContstructProps: MdaaSqsQueueProps = {
    naming: testApp.naming,
    queueName: 'test-queue',
    encryptionMasterKey: testKey,
    deadLetterQueue: {
      queue: dlq,
      maxReceiveCount: 10,
    },
  };

  new MdaaSqsQueue(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('QueueName', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: testApp.naming.resourceName('test-queue'),
    });
  });

  test('QueueName uses SQS_QUEUE resource type', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: testApp.naming.withResourceType(MdaaResourceType.SQS_QUEUE).resourceName('test-queue', 80),
    });
  });

  test('KmsMasterKeyId', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      KmsMasterKeyId: testKey.keyArn,
    });
  });

  test('EnforceHTTPS', () => {
    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sqs:*',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });
});

describe('MDAA FIFO Queue Naming Tests', () => {
  const createFifoQueue = (props: Omit<MdaaSqsQueueProps, 'naming' | 'encryptionMasterKey'>): Template => {
    const testApp = new MdaaTestApp();
    const testKey = MdaaKmsKey.fromKeyArn(
      testApp.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    );
    new MdaaSqsQueue(testApp.testStack, 'test-construct', {
      ...props,
      naming: testApp.naming,
      encryptionMasterKey: testKey,
    });
    return Template.fromStack(testApp.testStack);
  };

  test('Fifo flag appends the .fifo suffix to the generated name', () => {
    createFifoQueue({ queueName: 'test-queue', fifo: true }).hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
      QueueName: 'test-org-test-env-test-domain-test-module-test-queue.fifo',
    });
  });

  test('Content based deduplication implies a .fifo suffix', () => {
    createFifoQueue({ queueName: 'test-queue', contentBasedDeduplication: true }).hasResourceProperties(
      'AWS::SQS::Queue',
      {
        FifoQueue: true,
        QueueName: 'test-org-test-env-test-domain-test-module-test-queue.fifo',
      },
    );
  });

  test('Deduplication scope implies a .fifo suffix', () => {
    createFifoQueue({
      queueName: 'test-queue',
      deduplicationScope: DeduplicationScope.MESSAGE_GROUP,
    }).hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
      QueueName: 'test-org-test-env-test-domain-test-module-test-queue.fifo',
    });
  });

  test('Fifo throughput limit implies a .fifo suffix', () => {
    // PER_QUEUE is set on its own, without deduplicationScope, so that the throughput limit is the
    // only signal reached in the inference chain. PER_MESSAGE_GROUP_ID would require
    // deduplicationScope, which short-circuits the chain before the throughput limit is read.
    createFifoQueue({
      queueName: 'test-queue',
      fifoThroughputLimit: FifoThroughputLimit.PER_QUEUE,
    }).hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
      QueueName: 'test-org-test-env-test-domain-test-module-test-queue.fifo',
    });
  });

  test('A configured .fifo suffix is not doubled up', () => {
    createFifoQueue({ queueName: 'test-queue.fifo' }).hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
      QueueName: 'test-org-test-env-test-domain-test-module-test-queue.fifo',
    });
  });

  test('The .fifo suffix survives truncation of an over-long name', () => {
    // 80 characters is the SQS limit, inclusive of the suffix. This name is long enough that the
    // generated name must be truncated, which replaces its tail with a '-<hash>' suffix.
    const longQueueName = 'test-queue-with-a-name-long-enough-to-force-truncation-of-the-generated-name';
    const template = createFifoQueue({ queueName: longQueueName, fifo: true });

    const queues = template.findResources('AWS::SQS::Queue');
    const queueName = Object.values(queues)[0].Properties.QueueName as string;
    expect(queueName).toHaveLength(80);
    expect(queueName.endsWith('.fifo')).toBe(true);
    // The base name must have been truncated to leave exactly enough room for the suffix, so that a
    // regression in the truncation budget cannot push the total past the SQS limit.
    expect(queueName.slice(0, -'.fifo'.length)).toHaveLength(75);
    template.hasResourceProperties('AWS::SQS::Queue', { FifoQueue: true });
  });

  test('A standard queue name is not given a suffix and still truncates at 80 characters', () => {
    const longQueueName = 'test-queue-with-a-name-long-enough-to-force-truncation-of-the-generated-name';
    const template = createFifoQueue({ queueName: longQueueName });

    const queues = template.findResources('AWS::SQS::Queue');
    const queueName = Object.values(queues)[0].Properties.QueueName as string;
    expect(queueName).toHaveLength(80);
    expect(queueName.endsWith('.fifo')).toBe(false);
  });
});
