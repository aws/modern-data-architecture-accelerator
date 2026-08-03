/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import {
  grantCloudWatchAlarmsTopicAccess,
  MdaaAlarm,
  validateAlarmPeriodSeconds,
} from '@aws-mdaa/cloudwatch-constructs';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Construct } from 'constructs';

/**
 * CloudWatch namespace under which every AgentCore service publishes its
 * operational metrics. Shared by Runtime, Gateway, and Memory.
 *
 * NOTE: This is NOT the same as the `bedrock-agentcore` namespace the agent's own
 * custom OTEL/EMF metrics are published under (which the execution-role policy
 * scopes `cloudwatch:PutMetricData` to). Service operational metrics live in
 * `AWS/Bedrock-AgentCore`, matching `aws-cdk-lib`'s own AgentCore metric helpers.
 */
export const DEFAULT_AGENTCORE_METRIC_NAMESPACE = 'AWS/Bedrock-AgentCore';

/**
 * Error metrics summed for the error-rate alarm's numerator.
 *
 * `SystemErrors` + `UserErrors` for both Runtime and Gateway. Verified against a
 * live deployment with `cloudwatch list-metrics --namespace AWS/Bedrock-AgentCore`:
 * Runtime publishes `Errors`, `SystemErrors`, and `UserErrors`, and **no
 * `TotalErrors`** - an earlier version of this constant used `TotalErrors` (taken
 * from `aws-cdk-lib`'s metric helpers rather than from the service) and the
 * error-rate alarm could therefore never fire.
 *
 * `Errors` also exists and is probably the service's own total, but it is not
 * documented as such, so the numerator is built from the two metrics whose meaning
 * is unambiguous rather than from one that might double-count.
 *
 * Callers may override via {@link CreateAgentCoreAlarmsProps.errorMetricNames}, but
 * any replacement must name metrics the target service actually publishes - the
 * failure is silent.
 */
export const AGENTCORE_RUNTIME_ERROR_METRICS = ['SystemErrors', 'UserErrors'];

/** @see AGENTCORE_RUNTIME_ERROR_METRICS */
export const AGENTCORE_GATEWAY_ERROR_METRICS = ['SystemErrors', 'UserErrors'];

/**
 * Dimension identifying the AgentCore resource. The *value* is the resource ARN,
 * not its name.
 *
 * NOTE: this alone is NOT a complete dimension set. CloudWatch matches dimensions
 * exactly, not as a subset, so an alarm on `{Resource}` when the service publishes
 * `{Resource, Operation, Name}` receives zero datapoints. Verified on a live
 * deployment: querying `Invocations` with only `Resource` returned 0 datapoints
 * while the full triple returned the real value. See
 * {@link AGENTCORE_METRIC_OPERATION_DIMENSION_NAME} and
 * {@link AGENTCORE_METRIC_NAME_DIMENSION_NAME}.
 *
 * Getting this wrong is silent: an alarm on an unpublished dimension set receives no
 * datapoints and, with `treatMissingData: notBreaching`, stays in OK forever
 * instead of ever firing.
 */
export const AGENTCORE_METRIC_DIMENSION_NAME = 'Resource';

/**
 * Dimension naming the API operation the metric was recorded for, e.g.
 * `InvokeAgentRuntime`. Part of the published dimension set alongside
 * {@link AGENTCORE_METRIC_DIMENSION_NAME} and
 * {@link AGENTCORE_METRIC_NAME_DIMENSION_NAME}.
 */
export const AGENTCORE_METRIC_OPERATION_DIMENSION_NAME = 'Operation';

/**
 * Dimension naming the resource-and-qualifier the metric was recorded for, in the
 * form `<resource-name-prefix>::<qualifier>` (e.g. `my_runtime_abc123::DEFAULT`).
 *
 * Because the qualifier is embedded, the service emits a SEPARATE metric stream per
 * endpoint. An alarm therefore covers exactly one qualifier - invocations through a
 * different endpoint are not counted by it. `SEARCH()` would span all qualifiers but
 * CloudWatch rejects it on alarms (`SEARCH is not supported on Metric Alarms`,
 * confirmed against `PutMetricAlarm`), so the qualifier must be chosen explicitly.
 */
export const AGENTCORE_METRIC_NAME_DIMENSION_NAME = 'Name';

/** Operation dimension value for AgentCore Runtime invocation metrics. */
export const AGENTCORE_RUNTIME_INVOKE_OPERATION = 'InvokeAgentRuntime';

/**
 * Name prefix shared by every alarm this helper creates (`agentcore-<kind>-<resource>`).
 *
 * Load-bearing beyond naming: it is also the prefix in the `aws:SourceArn` condition
 * on the CloudWatch grants, which is what scopes those grants to this helper's alarms
 * rather than to every alarm in the account. Changing the prefix here without changing
 * the alarm names (or vice versa) silently widens or breaks the grants, so both derive
 * from this constant.
 */
export const AGENTCORE_ALARM_NAME_PREFIX = 'agentcore';

/** Default evaluation period, in seconds, for AgentCore alarms. */
export const DEFAULT_ALARM_PERIOD_SECONDS = 300;

/** Default number of evaluation periods for AgentCore alarms. */
export const DEFAULT_ALARM_EVALUATION_PERIODS = 1;

/**
 * Builds the default dimension set, reproducing what the AgentCore service actually
 * publishes: `{Resource, Operation, Name}`. CloudWatch matches dimensions exactly,
 * so omitting any of them produces an alarm that receives no datapoints.
 *
 * Returns undefined when there is no resource ARN to scope by - an unscoped alarm
 * would evaluate the namespace account-wide.
 */
function buildDefaultDimensions(props: CreateAgentCoreAlarmsProps): { [key: string]: string } | undefined {
  if (!props.resourceArn) {
    return undefined;
  }
  const dimensions: { [key: string]: string } = {
    [AGENTCORE_METRIC_DIMENSION_NAME]: props.resourceArn,
    [AGENTCORE_METRIC_OPERATION_DIMENSION_NAME]: props.operation ?? AGENTCORE_RUNTIME_INVOKE_OPERATION,
  };
  if (props.metricNameDimensionValue) {
    dimensions[AGENTCORE_METRIC_NAME_DIMENSION_NAME] = props.metricNameDimensionValue;
  }
  return dimensions;
}

/**
 * Rejects prop combinations that would otherwise produce alerting which deploys
 * cleanly and never notifies anyone. Split out of {@link createAgentCoreAlarms} to
 * keep the guards together and the caller readable.
 */
function validateAlarmsProps(props: CreateAgentCoreAlarmsProps): void {
  if (!props.notificationTopicArn && !props.createNotificationTopic) {
    throw new Error(
      'Alarms require a notification target: set either alarms.notificationTopicArn ' +
        '(existing topic) or alarms.createNotificationTopic: true.',
    );
  }
  if (props.notificationTopicArn && props.createNotificationTopic) {
    throw new Error(
      'alarms.notificationTopicArn and alarms.createNotificationTopic are mutually exclusive. ' +
        'Either reference an existing topic or have the module create one, not both.',
    );
  }
  if (props.errorRateThreshold === undefined && props.throttleCountThreshold === undefined) {
    throw new Error(
      'Alarms require at least one threshold: set alarms.errorRateThreshold and/or alarms.throttleCountThreshold.',
    );
  }
  // MDAA does not modify a topic it did not create. CDK would render the
  // subscription against an imported ARN, but the deploying role holds no
  // sns:Subscribe on an externally-owned topic, so it would fail at deploy instead
  // of here. Reject at synth, where the message can say what to do.
  if (props.notificationEmails?.length && props.notificationTopicArn) {
    throw new Error(
      'alarms.notificationEmails cannot be combined with alarms.notificationTopicArn. MDAA does not add ' +
        'subscriptions to an SNS topic it does not create - subscribe the addresses on that existing topic ' +
        'directly, or switch to alarms.createNotificationTopic: true.',
    );
  }
}

/**
 * Resolves the SNS target for the alarms: either an existing topic referenced by
 * ARN, or a module-created CMK-encrypted topic with the subscriptions and service
 * grants it needs.
 *
 * @returns the created topic (absent when an existing ARN was referenced) and the
 * ARN the alarm actions publish to.
 */
function resolveNotificationTopic(
  container: Construct,
  props: CreateAgentCoreAlarmsProps,
): { topic?: MdaaSnsTopic; topicArn: string } {
  if (props.notificationTopicArn) {
    return { topicArn: props.notificationTopicArn };
  }

  const masterKey = props.masterKey;
  if (!masterKey) {
    throw new Error('A KMS key is required to create a CMK-encrypted alarm notification topic.');
  }

  const topic = new MdaaSnsTopic(container, 'AlarmTopic', {
    topicName: `agentcore-alarms-${props.resourceName}`,
    masterKey,
    naming: props.naming,
  });

  // Subscribe the configured addresses. Without a subscriber the topic receives
  // alarm and EventBridge notifications and discards them. Matches the convention
  // in dataops-project, datawarehouse, and opensearch (trimmed EmailSubscription).
  props.notificationEmails?.forEach(email => {
    topic.addSubscription(new EmailSubscription(email.trim()));
  });

  // Let the CloudWatch alarm service publish to the topic and use the CMK.
  //
  // Scoped to the alarm names this helper gives its alarms, so the grants cover only
  // this resource's alarms rather than every alarm in the account. The names are
  // deterministic (`agentcore-<kind>-<resourceName>`, built below), so the pattern is
  // known here even though the alarms are constructed afterwards - which is required,
  // since the alarms take the topic ARN as their action and granting afterwards would
  // be a circular dependency.
  //
  // Security review note: this widens an MDAA-created key's policy to a second
  // service principal, which AWS requires for CloudWatch to publish to a
  // CMK-encrypted topic at all. See grantCloudWatchAlarmsTopicAccess for the
  // reasoning and why the conditions here are correct (unlike the EventBridge case
  // in eventbridge-rules.ts). Callers that want the alarm topic on its own key can
  // pass a dedicated `masterKey`.
  grantCloudWatchAlarmsTopicAccess(container, {
    topic,
    masterKey,
    alarmNamePattern: `${AGENTCORE_ALARM_NAME_PREFIX}-*-${props.resourceName}`,
  });

  return { topic, topicArn: topic.topicArn };
}

export interface CreateAgentCoreAlarmsProps extends MdaaConstructProps {
  /** Logical name of the AgentCore resource the alarms monitor (used in alarm/topic naming). */
  readonly resourceName: string;
  /**
   * ARN of the AgentCore resource the alarms monitor. Used as the default
   * `Resource` metric dimension value, which is how the service scopes its
   * metrics to a single resource. Callers should always supply this; an explicit
   * `dimensions` override takes precedence.
   */
  readonly resourceArn?: string;
  /**
   * Error-rate alarm threshold as a percentage of invocations over the
   * evaluation period (e.g. 10 = alarm when TotalErrors/Invocations > 10%).
   * When omitted, no error-rate alarm is created.
   */
  readonly errorRateThreshold?: number;
  /**
   * Throttle-count alarm threshold (sum of Throttles over the evaluation
   * period). When omitted, no throttle alarm is created.
   */
  readonly throttleCountThreshold?: number;
  /**
   * ARN of an existing SNS topic to notify on alarm. Mutually exclusive with
   * a module-created topic; one of the two must be supplied.
   */
  readonly notificationTopicArn?: string;
  /**
   * When true, the helper creates a CMK-encrypted SNS topic (using the supplied
   * masterKey) and notifies it on alarm. Mutually exclusive with
   * notificationTopicArn.
   */
  readonly createNotificationTopic?: boolean;
  /**
   * KMS key encrypting a module-created SNS topic. The helper grants the CloudWatch
   * service principal use of the key so alarm notifications can be published.
   *
   * CMK encryption is NOT optional for a module-created topic: this is mandatory
   * whenever `createNotificationTopic` is true, enforced both by a synth-time throw
   * here and by `MdaaSnsTopic`, whose own `masterKey` is required. Optional only
   * because it is meaningless on the `notificationTopicArn` branch, where the topic is
   * not MDAA's to encrypt.
   */
  readonly masterKey?: IMdaaKmsKey;
  /**
   * Email addresses subscribed to a module-created notification topic. Each
   * address receives a confirmation request from SNS and must confirm before
   * delivery begins.
   *
   * Only valid alongside `createNotificationTopic`. Combining this with
   * `notificationTopicArn` throws: MDAA does not modify a topic it did not create.
   * (CDK would in fact render the subscription against an imported ARN, but the
   * deploying role holds no `sns:Subscribe` on an externally-owned topic, so it
   * would fail at deploy rather than at synth. Subscribe on the owning side.)
   *
   * Without at least one subscriber, every alarm - and every EventBridge rule
   * targeting this topic - publishes into a topic nobody receives, so the alerting
   * is inert while still deploying cleanly.
   */
  readonly notificationEmails?: string[];
  /** CloudWatch namespace for the service metrics. @default AWS/Bedrock-AgentCore */
  readonly metricNamespace?: string;
  /**
   * Error metrics summed for the error-rate alarm's numerator. Must name metrics
   * the target service actually publishes - see
   * {@link AGENTCORE_RUNTIME_ERROR_METRICS} and
   * {@link AGENTCORE_GATEWAY_ERROR_METRICS}. Alarming on an unpublished metric
   * is silent: no datapoints, and `treatMissingData: notBreaching` holds the
   * alarm in OK.
   * @default AGENTCORE_RUNTIME_ERROR_METRICS
   */
  readonly errorMetricNames?: string[];
  /**
   * Value for the `Operation` dimension, e.g. `InvokeAgentRuntime`. Required -
   * together with {@link metricNameDimensionValue} - for the default dimension set
   * to match what the service publishes.
   * @default AGENTCORE_RUNTIME_INVOKE_OPERATION
   */
  readonly operation?: string;
  /**
   * Value for the `Name` dimension, in the form `<resource-prefix>::<qualifier>`.
   * The caller must supply this because the qualifier is deployment-specific and
   * determines WHICH endpoint's metrics the alarm observes - see
   * {@link AGENTCORE_METRIC_NAME_DIMENSION_NAME}.
   *
   * When omitted, the default dimension set falls back to `{Resource, Operation}`,
   * which does NOT match the service's published set and yields an alarm that never
   * fires. A warning-worthy state; callers should always pass it.
   */
  readonly metricNameDimensionValue?: string;
  /**
   * Dimensions scoping the metrics to this specific resource. Overrides the
   * derived default entirely; supply only to correct a service-side change in the
   * published dimension set.
   *
   * A dimension set the service does not publish yields alarms that receive no data
   * and never fire, so prefer the derived default.
   * @default { Resource: resourceArn, Operation: operation, Name: metricNameDimensionValue }
   */
  readonly dimensions?: { [key: string]: string };
  /** Evaluation period in seconds. Must be 1, 5, 10, 30, or a multiple of 60. @default 300 */
  readonly periodSeconds?: number;
  /** Number of evaluation periods. @default 1 */
  readonly evaluationPeriods?: number;
  /**
   * Number of breaching datapoints within `evaluationPeriods` required to alarm
   * (M-of-N). Defaults to `evaluationPeriods`, i.e. every period must breach.
   * @default evaluationPeriods
   */
  readonly datapointsToAlarm?: number;
}

/** Result of {@link createAgentCoreAlarms}. */
export interface AgentCoreAlarmsResult {
  /** The module-created SNS topic, if one was created. */
  readonly topic?: MdaaSnsTopic;
  /** The created alarms, keyed by a short identifier. */
  readonly alarms: { [id: string]: MdaaAlarm };
}

/**
 * Creates CloudWatch alarms on AgentCore service operational metrics and wires
 * them to an SNS topic for notification. Supports an error-rate alarm (metric
 * math: summed error metrics as a percentage of Invocations) and a
 * throttle-count alarm (sum of Throttles).
 *
 * The SNS target is either an existing topic (notificationTopicArn) or a
 * module-created CMK-encrypted topic (createNotificationTopic + masterKey).
 *
 * Reusable across AgentCore resource types (Runtime, Gateway, Memory): the
 * namespace, the `Resource` dimension, `Invocations`, and `Throttles` are common
 * to all. The error metrics are NOT - pass `errorMetricNames` for the target
 * service (see {@link AGENTCORE_RUNTIME_ERROR_METRICS} /
 * {@link AGENTCORE_GATEWAY_ERROR_METRICS}); the default suits Runtime.
 */
export function createAgentCoreAlarms(
  scope: Construct,
  id: string,
  props: CreateAgentCoreAlarmsProps,
): AgentCoreAlarmsResult {
  validateAlarmsProps(props);

  const container = new Construct(scope, id);

  const namespace = props.metricNamespace ?? DEFAULT_AGENTCORE_METRIC_NAMESPACE;
  const periodSeconds = props.periodSeconds ?? DEFAULT_ALARM_PERIOD_SECONDS;
  const evaluationPeriods = props.evaluationPeriods ?? DEFAULT_ALARM_EVALUATION_PERIODS;
  validateAlarmPeriodSeconds(periodSeconds, 'alarms.periodSeconds');

  // Scope the metrics to this resource unless the caller overrides the dimensions
  // outright. CloudWatch matches dimensions EXACTLY, so this must reproduce the
  // service's full published set - {Resource, Operation, Name} - not just Resource.
  // A partial set silently receives zero datapoints; verified against a live
  // deployment. Alarms with no dimensions at all evaluate the namespace
  // account-wide, which is rarely what a per-resource alarm intends.
  const dimensions = props.dimensions ?? buildDefaultDimensions(props);

  // Resolve the notification topic ARN, creating a CMK-encrypted topic if requested.
  const { topic, topicArn } = resolveNotificationTopic(container, props);

  const alarms: { [id: string]: MdaaAlarm } = {};

  // Error-rate alarm: errors as a percentage of Invocations (metric math). The
  // error metrics vary by service, so they are summed from a configurable set.
  if (props.errorRateThreshold !== undefined) {
    const errorMetricNames = props.errorMetricNames ?? AGENTCORE_RUNTIME_ERROR_METRICS;
    if (errorMetricNames.length === 0) {
      throw new Error(
        'alarms.errorRateThreshold requires at least one error metric name. ' +
          'Pass errorMetricNames naming metrics the target AgentCore service publishes.',
      );
    }
    // One metric query per error metric (e0, e1, ...), summed in the expression.
    // Runtime needs only TotalErrors; Gateway sums SystemErrors + UserErrors.
    const errorMetricIds = errorMetricNames.map((_, idx) => `e${idx}`);
    const errorSum = errorMetricIds.join(' + ');

    alarms.errorRate = new MdaaAlarm(container, 'ErrorRateAlarm', {
      naming: props.naming,
      alarmName: `${AGENTCORE_ALARM_NAME_PREFIX}-error-rate-${props.resourceName}`,
      alarmDescription: `AgentCore error rate exceeds ${props.errorRateThreshold}% of invocations over ${periodSeconds}s`,
      metrics: [
        ...errorMetricNames.map((metricName, idx) => ({
          id: errorMetricIds[idx],
          metricName,
          namespace,
          statistic: 'Sum',
          period: periodSeconds,
          dimensions,
          returnData: false,
        })),
        {
          id: 'invocations',
          metricName: 'Invocations',
          namespace,
          statistic: 'Sum',
          period: periodSeconds,
          dimensions,
          returnData: false,
        },
        {
          id: 'errorRate',
          // IF() makes the zero-invocation case explicit: report 0% rather than
          // dividing by zero. A period with no Invocations datapoint at all
          // yields no datapoint here, and falls through to treatMissingData.
          expression: `IF(invocations > 0, 100 * (${errorSum}) / invocations, 0)`,
          label: 'Error rate (%)',
          returnData: true,
        },
      ],
      threshold: props.errorRateThreshold,
      evaluationPeriods,
      datapointsToAlarm: props.datapointsToAlarm,
      comparisonOperator: 'GreaterThanThreshold',
      // An idle resource emits no datapoints; treat that as healthy rather than
      // alarming. Note this also means a resource serving zero invocations
      // reports OK, indistinguishable from a healthy idle one.
      treatMissingData: 'notBreaching',
      alarmActions: [topicArn],
    });
  }

  // Throttle-count alarm: sum of Throttles over the period.
  if (props.throttleCountThreshold !== undefined) {
    alarms.throttle = new MdaaAlarm(container, 'ThrottleCountAlarm', {
      naming: props.naming,
      alarmName: `${AGENTCORE_ALARM_NAME_PREFIX}-throttle-count-${props.resourceName}`,
      alarmDescription: `AgentCore throttle count exceeds ${props.throttleCountThreshold} over ${periodSeconds}s`,
      metricName: 'Throttles',
      namespace,
      statistic: 'Sum',
      period: periodSeconds,
      dimensions,
      threshold: props.throttleCountThreshold,
      evaluationPeriods,
      datapointsToAlarm: props.datapointsToAlarm,
      comparisonOperator: 'GreaterThanThreshold',
      // An idle resource emits no Throttles datapoints; treat that as healthy.
      treatMissingData: 'notBreaching',
      alarmActions: [topicArn],
    });
  }

  return { topic, alarms };
}
