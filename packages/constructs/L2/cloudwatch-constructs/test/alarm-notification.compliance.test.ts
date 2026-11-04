/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { resolveAlarmNotificationTopic } from '../lib/alarm-notification';

// resolveAlarmNotificationTopic composes a CMK-encrypted topic, its email subscriptions,
// and the CloudWatch grants on the topic and key. The individual resources are asserted
// in alarm-notification.test.ts; this runs the Nag packs over the composition.
describe('resolveAlarmNotificationTopic Compliance', () => {
  const testApp = new MdaaTestApp();

  resolveAlarmNotificationTopic(testApp.testStack, {
    naming: testApp.naming,
    createNotificationTopic: true,
    notificationEmails: ['ops@example.com'],
    topicName: 'alarms',
    // enableKeyRotation satisfies the KMS rotation rules in the AwsSolutions, NIST, and PCI packs.
    masterKey: new Key(testApp.testStack, 'AlarmTopicKey', { enableKeyRotation: true }),
    alarmNamePattern: 'myapp-*',
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
