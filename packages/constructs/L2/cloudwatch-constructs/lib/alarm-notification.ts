/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Annotations } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { grantCloudWatchAlarmsTopicAccess } from './alarm-topic-utils';

/**
 * Where a module's alarms send their notifications: an existing SNS topic, or a topic
 * the module creates and subscribes the given addresses to.
 */
export interface AlarmNotificationProps {
  /**
   * ARN of an existing SNS topic to notify on alarm. Mutually exclusive with
   * `createNotificationTopic`; one of the two must be supplied.
   */
  readonly notificationTopicArn?: string;
  /**
   * When true, a CMK-encrypted SNS topic is created and notified on alarm. Mutually
   * exclusive with `notificationTopicArn`.
   */
  readonly createNotificationTopic?: boolean;
  /**
   * Email addresses subscribed to a created topic. Only valid with
   * `createNotificationTopic`: MDAA does not modify a topic it did not create.
   */
  readonly notificationEmails?: string[];
}

/**
 * Rejects notification settings that would otherwise produce alerting which deploys
 * cleanly and never notifies anyone, or fails only at deploy.
 *
 * @param props - The notification settings to validate
 * @param configPath - Config path of the block holding the settings, used in the error
 *                     messages so they name the keys the user actually set
 * @throws Error if no target or both targets are set, or if emails are combined with an
 *         existing topic
 */
export function validateAlarmNotificationTarget(props: AlarmNotificationProps, configPath = 'alarms'): void {
  if (!props.notificationTopicArn && !props.createNotificationTopic) {
    throw new Error(
      `Alarms require a notification target: set either ${configPath}.notificationTopicArn ` +
        `(existing topic) or ${configPath}.createNotificationTopic: true.`,
    );
  }
  if (props.notificationTopicArn && props.createNotificationTopic) {
    throw new Error(
      `${configPath}.notificationTopicArn and ${configPath}.createNotificationTopic are mutually exclusive. ` +
        'Either reference an existing topic or have the module create one, not both.',
    );
  }
  // MDAA does not modify a topic it did not create. CDK would render the
  // subscription against an imported ARN, but the deploying role holds no
  // sns:Subscribe on an externally-owned topic, so it would fail at deploy instead
  // of here. Reject at synth, where the message can say what to do.
  if (props.notificationEmails?.length && props.notificationTopicArn) {
    throw new Error(
      `${configPath}.notificationEmails cannot be combined with ${configPath}.notificationTopicArn. MDAA does not add ` +
        'subscriptions to an SNS topic it does not create - subscribe the addresses on that existing topic ' +
        `directly, or switch to ${configPath}.createNotificationTopic: true.`,
    );
  }
}

/**
 * Properties for {@link resolveAlarmNotificationTopic}.
 */
export interface ResolveAlarmNotificationTopicProps extends AlarmNotificationProps, MdaaConstructProps {
  /** Name of a created topic, before the naming convention is applied. */
  readonly topicName: string;
  /**
   * KMS key encrypting a created topic. Required when `createNotificationTopic` is
   * true; unused for an existing topic, which is not MDAA's to encrypt.
   *
   * @default - none; a created topic then throws
   */
  readonly masterKey?: IKey;
  /**
   * Name pattern of the alarms publishing to a created topic, scoping the CloudWatch
   * grants on the topic and key. See {@link GrantCloudWatchAlarmsTopicAccessProps.alarmNamePattern}.
   */
  readonly alarmNamePattern: string;
  /**
   * Config path of the block holding the notification settings, used in error messages.
   *
   * @default 'alarms'
   */
  readonly configPath?: string;
}

/**
 * The SNS target alarm actions publish to.
 */
export interface AlarmNotificationTarget {
  /** The created topic, absent when an existing topic ARN was referenced. */
  readonly topic?: MdaaSnsTopic;
  /** ARN the alarm actions publish to. */
  readonly topicArn: string;
}

/**
 * Resolves the SNS target for a module's alarms: either an existing topic referenced by
 * ARN, or a created CMK-encrypted topic (construct id `AlarmTopic` under `scope`) with
 * the email subscriptions and CloudWatch grants it needs.
 *
 * Call {@link validateAlarmNotificationTarget} first; this only resolves.
 *
 * @param scope - Scope the created topic is added to
 * @param props - The notification settings, topic name, key, and alarm name pattern
 * @returns the created topic (absent for an existing ARN) and the ARN to publish to
 * @throws Error if a topic is to be created without a KMS key, or with an imported key
 *         whose policy cannot grant CloudWatch its use
 */
export function resolveAlarmNotificationTopic(
  scope: Construct,
  props: ResolveAlarmNotificationTopicProps,
): AlarmNotificationTarget {
  if (props.notificationTopicArn) {
    return { topicArn: props.notificationTopicArn };
  }

  const masterKey = props.masterKey;
  if (!masterKey) {
    throw new Error('A KMS key is required to create a CMK-encrypted alarm notification topic.');
  }

  const topic = new MdaaSnsTopic(scope, 'AlarmTopic', {
    topicName: props.topicName,
    masterKey,
    naming: props.naming,
  });

  // Subscribe the configured addresses. Without a subscriber the topic receives
  // alarm notifications and discards them. Matches the convention in
  // dataops-project, datawarehouse, and opensearch (trimmed EmailSubscription).
  props.notificationEmails?.forEach(email => {
    topic.addSubscription(new EmailSubscription(email.trim()));
  });

  // Let the CloudWatch alarm service publish to the topic and use the CMK, scoped to
  // the caller's alarm names. Granted here, before the alarms exist, because the alarms
  // take the topic ARN as their action and granting afterwards would be a circular
  // dependency.
  //
  // Security review note: this widens an MDAA-created key's policy to a second
  // service principal, which AWS requires for CloudWatch to publish to a
  // CMK-encrypted topic at all. See grantCloudWatchAlarmsTopicAccess for the
  // reasoning and why the conditions here are correct.
  const { keyPolicyUpdated } = grantCloudWatchAlarmsTopicAccess(scope, {
    topic,
    masterKey,
    alarmNamePattern: props.alarmNamePattern,
  });
  // An imported key's policy cannot be changed, so the topic would deploy cleanly and
  // never receive a notification.
  if (!keyPolicyUpdated) {
    const configPath = props.configPath ?? 'alarms';
    throw new Error(
      `${configPath}.createNotificationTopic cannot use an imported KMS key: MDAA cannot grant CloudWatch use of ` +
        `it, so the topic would never receive a notification. Set ${configPath}.notificationTopicArn to an ` +
        'existing topic that allows CloudWatch to publish instead.',
    );
  }

  return { topic, topicArn: topic.topicArn };
}

/**
 * Properties for {@link addAlarmNotificationWarnings}.
 */
export interface AlarmNotificationWarningProps extends AlarmNotificationProps {
  /** Config path of the block holding the notification settings, used in the messages. */
  readonly configPath: string;
  /** Prefix of the warning ids, e.g. `@aws-mdaa/bedrock-settings`. */
  readonly warningIdPrefix: string;
}

/**
 * Adds synth-time warnings for notification settings that are valid but whose delivery
 * MDAA cannot guarantee:
 * - a created topic with no email subscribers, which accepts every notification and
 *   discards it (subscriptions may legitimately be managed out-of-band, so not an error)
 * - an existing topic, whose encryption, resource policy, and subscriptions are
 *   invisible at synth
 *
 * @param scope - Scope the warnings are attached to
 * @param props - The notification settings, config path, and warning id prefix
 */
export function addAlarmNotificationWarnings(scope: Construct, props: AlarmNotificationWarningProps): void {
  if (props.createNotificationTopic && !props.notificationEmails?.length) {
    Annotations.of(scope).addWarningV2(
      `${props.warningIdPrefix}:alarmTopicWithoutSubscribers`,
      `${props.configPath}.createNotificationTopic is true but ${props.configPath}.notificationEmails is not set, ` +
        'so the created SNS topic has no subscribers and alarm notifications will be discarded. Set ' +
        `${props.configPath}.notificationEmails, or subscribe to the topic ARN exported to SSM out-of-band.`,
    );
  }
  if (props.notificationTopicArn) {
    Annotations.of(scope).addWarningV2(
      `${props.warningIdPrefix}:alarmsImportedTopicEncryption`,
      `${props.configPath}.notificationTopicArn references the existing SNS topic ${props.notificationTopicArn}, ` +
        'whose configuration MDAA cannot verify or modify at synth. Ensure that topic is encrypted with a ' +
        'customer-managed KMS key, allows the cloudwatch.amazonaws.com service principal to sns:Publish and to ' +
        'use that key, and has at least one subscriber.',
    );
  }
}
