/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { grantCloudWatchAlarmsTopicAccess } from '../lib/alarm-topic-utils';

describe('grantCloudWatchAlarmsTopicAccess', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('grants the CloudWatch service principal publish access on the topic', () => {
    const topic = new Topic(testApp.testStack, 'Topic');

    grantCloudWatchAlarmsTopicAccess(testApp.testStack, { topic, alarmNamePattern: 'myapp-*-my-resource' });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowCloudWatchAlarmsToPublish',
            Effect: 'Allow',
            Principal: { Service: 'cloudwatch.amazonaws.com' },
            Action: 'sns:Publish',
          }),
        ]),
      }),
    });
  });

  // Without kms:Decrypt + kms:GenerateDataKey* CloudWatch cannot publish to a
  // CMK-encrypted topic at all, and the failure is silent: the alarm fires and the
  // notification is dropped.
  test('grants key usage when a masterKey is supplied', () => {
    const topic = new Topic(testApp.testStack, 'Topic');

    grantCloudWatchAlarmsTopicAccess(testApp.testStack, {
      topic,
      masterKey: new Key(testApp.testStack, 'TestKey'),
      alarmNamePattern: 'myapp-*-my-resource',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowCloudWatchAlarmsToUseKey',
            Effect: 'Allow',
            Principal: { Service: 'cloudwatch.amazonaws.com' },
            Action: ['kms:Decrypt', 'kms:GenerateDataKey*'],
          }),
        ]),
      }),
    });
  });

  test('adds no CloudWatch key policy statement when no masterKey is supplied', () => {
    const topic = new Topic(testApp.testStack, 'Topic');
    new Key(testApp.testStack, 'TestKey');

    grantCloudWatchAlarmsTopicAccess(testApp.testStack, { topic, alarmNamePattern: 'myapp-*-my-resource' });

    const statements = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::KMS::Key')).flatMap(
      key => key.Properties.KeyPolicy.Statement as { Sid?: string }[],
    );
    expect(statements.filter(statement => statement.Sid === 'AllowCloudWatchAlarmsToUseKey')).toHaveLength(0);
  });

  // Confused-deputy guard: without these conditions the CloudWatch service principal
  // could be induced to publish on behalf of an alarm in another account.
  test('scopes both grants to the deployment account and the alarm name pattern', () => {
    const topic = new Topic(testApp.testStack, 'Topic');

    grantCloudWatchAlarmsTopicAccess(testApp.testStack, {
      topic,
      masterKey: new Key(testApp.testStack, 'TestKey'),
      alarmNamePattern: 'myapp-*-my-resource',
    });

    const expectedConditions = {
      StringEquals: { 'aws:SourceAccount': 'test-account' },
      ArnLike: {
        'aws:SourceArn': 'arn:test-partition:cloudwatch:test-region:test-account:alarm:myapp-*-my-resource',
      },
    };
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AllowCloudWatchAlarmsToPublish', Condition: expectedConditions }),
        ]),
      }),
    });
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AllowCloudWatchAlarmsToUseKey', Condition: expectedConditions }),
        ]),
      }),
    });
  });

  // '*' is still expressible, but only by asking for it: alarmNamePattern is required,
  // so an account-wide grant cannot happen by omission. This pins that an explicit
  // wildcard produces the widest form of the condition rather than dropping it.
  test('scopes to any alarm in the account and region when passed an explicit wildcard', () => {
    const topic = new Topic(testApp.testStack, 'Topic');

    grantCloudWatchAlarmsTopicAccess(testApp.testStack, { topic, alarmNamePattern: '*' });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowCloudWatchAlarmsToPublish',
            Condition: Match.objectLike({
              ArnLike: {
                'aws:SourceArn': 'arn:test-partition:cloudwatch:test-region:test-account:alarm:*',
              },
            }),
          }),
        ]),
      }),
    });
  });
});
