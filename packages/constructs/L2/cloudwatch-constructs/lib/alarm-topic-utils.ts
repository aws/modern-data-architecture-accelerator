/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArnFormat, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/** The CloudWatch alarm service principal, which publishes alarm notifications to SNS. */
const CLOUDWATCH_SERVICE_PRINCIPAL = 'cloudwatch.amazonaws.com';

/**
 * Properties for {@link grantCloudWatchAlarmsTopicAccess}.
 */
export interface GrantCloudWatchAlarmsTopicAccessProps {
  /** The SNS topic the alarms publish to. Must be a topic this stack owns. */
  readonly topic: ITopic;

  /**
   * The KMS key encrypting the topic, when it is CMK-encrypted. CloudWatch cannot
   * publish to an encrypted topic without `kms:Decrypt` + `kms:GenerateDataKey*` on
   * the key, so omitting this for an encrypted topic yields alerting that deploys
   * cleanly and silently delivers nothing.
   *
   * @default - no key grant is added (topic uses SSE-SNS or no encryption)
   */
  readonly masterKey?: IKey;

  /**
   * Name pattern of the alarms the grants apply to, used as the resource name in the
   * `aws:SourceArn` condition. May contain `*` wildcards, e.g. `myapp-*-my-resource`.
   *
   * Required rather than defaulted: scoping to the caller's own alarm names is what
   * keeps these grants from applying to every alarm in the account, and a permissive
   * default is invisible at the call site - a caller who simply omitted it would get
   * an account-wide grant with nothing in the code to show for it. Passing `'*'`
   * explicitly is still possible, but it has to be a decision someone wrote down.
   *
   * Derive this from the same constant the alarm names are built from: a pattern that
   * drifts out of step with the actual alarm names silently breaks notification
   * delivery at runtime, with no synth or deploy error.
   */
  readonly alarmNamePattern: string;
}

/**
 * Grants the CloudWatch alarm service principal what it needs to publish alarm
 * notifications to an SNS topic: `sns:Publish` on the topic and, when the topic is
 * CMK-encrypted, `kms:Decrypt` + `kms:GenerateDataKey*` on the key.
 *
 * Both grants carry `aws:SourceAccount` and `aws:SourceArn` conditions to prevent the
 * confused-deputy problem, so the CloudWatch service principal may only act on behalf
 * of alarms in this account and region matching `alarmNamePattern`.
 *
 * The KMS grant is required for CloudWatch to publish to a CMK-encrypted topic at all
 * - see "Enable compatibility between event sources from AWS services and encrypted
 * topics":
 * https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html#compatibility-with-aws-services
 * It conveys no ability to read anything else the key protects: reading CloudWatch
 * Logs data additionally requires the `logs.<region>.amazonaws.com` grant with its
 * `kms:EncryptionContext:aws:logs:arn` condition. Callers that would rather not widen
 * a shared key's policy can pass a dedicated `masterKey`.
 *
 * NOTE: unlike the EventBridge-to-encrypted-topic case, conditions here are both
 * supported and correct. AWS documents that `aws:SourceAccount` / `aws:SourceArn` /
 * `aws:SourceOrgID` are *not supported* in a KMS policy for EventBridge delivery, so
 * do not copy this conditioning onto an EventBridge grant - the KMS request does not
 * carry those keys and every notification would be dropped silently.
 *
 * Because the conditions match on an alarm *name* pattern rather than on full alarm
 * ARNs, this can be called before the alarms are constructed. That ordering matters:
 * the alarms take the topic ARN as their action, so granting after the fact would
 * introduce a circular dependency.
 *
 * @param scope - Construct scope used to resolve the stack account and region
 * @param props - The topic, optional key, and alarm name pattern to scope the grants to
 */
export function grantCloudWatchAlarmsTopicAccess(scope: Construct, props: GrantCloudWatchAlarmsTopicAccessProps): void {
  const stack = Stack.of(scope);
  const alarmArnPattern = stack.formatArn({
    service: 'cloudwatch',
    resource: 'alarm',
    arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    resourceName: props.alarmNamePattern,
  });

  const confusedDeputyConditions = {
    StringEquals: {
      'aws:SourceAccount': stack.account,
    },
    ArnLike: {
      'aws:SourceArn': alarmArnPattern,
    },
  };

  props.masterKey?.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AllowCloudWatchAlarmsToUseKey',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal(CLOUDWATCH_SERVICE_PRINCIPAL)],
      actions: ['kms:Decrypt', 'kms:GenerateDataKey*'],
      resources: ['*'],
      conditions: confusedDeputyConditions,
    }),
  );

  props.topic.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AllowCloudWatchAlarmsToPublish',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal(CLOUDWATCH_SERVICE_PRINCIPAL)],
      actions: ['sns:Publish'],
      resources: [props.topic.topicArn],
      conditions: confusedDeputyConditions,
    }),
  );
}
