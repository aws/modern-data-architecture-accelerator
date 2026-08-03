/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { grantCloudWatchAlarmsTopicAccess } from '../lib/alarm-topic-utils';

// Unlike the pure converter helpers in this package, this one emits access-control
// policy: an SNS topic policy and a KMS key resource policy. The individual grants and
// their confused-deputy conditions are asserted in alarm-topic-utils.test.ts; this runs
// the Nag packs over the result as defence in depth, so a future change that widens a
// policy in a way the packs recognise fails here rather than in a consumer's baseline.
describe('grantCloudWatchAlarmsTopicAccess Compliance', () => {
  const testApp = new MdaaTestApp();

  // enableKeyRotation satisfies the KMS rotation rules in the AwsSolutions, NIST, and
  // PCI packs. Plain CDK constructs are used rather than MdaaSnsTopic/MdaaKmsKey to
  // keep this package free of a test-only dependency on sibling L2 packages.
  //
  // The same key encrypts the topic and receives the grant, which is how a real caller
  // uses this: the CMK-encrypted topic is unreachable by CloudWatch without it.
  const alarmTopicKey = new Key(testApp.testStack, 'AlarmTopicKey', { enableKeyRotation: true });

  grantCloudWatchAlarmsTopicAccess(testApp.testStack, {
    topic: new Topic(testApp.testStack, 'AlarmTopic', { masterKey: alarmTopicKey }),
    masterKey: alarmTopicKey,
    alarmNamePattern: 'myapp-*-my-resource',
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
