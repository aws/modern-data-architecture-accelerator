/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MdaaAlarm,
  validateAlarmNameMatchesPattern,
  validateDatapointsToAlarm,
  validateMetricsInsightsAlarmWindow,
} from '@aws-mdaa/cloudwatch-constructs';
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { Construct } from 'constructs';

/** CloudWatch namespace of the Amazon Bedrock Guardrails runtime metrics. */
export const GUARDRAIL_METRIC_NAMESPACE = 'AWS/Bedrock/Guardrails';

/**
 * Metric counting guardrail interventions. Each datapoint is one guardrail evaluation
 * with value 0 or 1, so `SUM` is the number of interventions and `AVG` the share of
 * evaluations that intervened.
 */
export const GUARDRAIL_INTERVENTIONS_METRIC = 'InvocationsIntervened';

/**
 * Name prefix shared by every guardrail alarm, after the naming convention.
 *
 * Load-bearing beyond naming: the alarm notification topic's CloudWatch grants are
 * scoped to `<prefix>-*` (see {@link guardrailAlarmNamePattern}), so changing the
 * alarm names without this prefix silently breaks notification delivery.
 */
export const GUARDRAIL_ALARM_NAME_PREFIX = 'guardrail';

/** Default alarm period, in seconds, for guardrail alarms. */
export const DEFAULT_GUARDRAIL_ALARM_PERIOD_SECONDS = 300;

/** Default number of evaluation periods for guardrail alarms. */
export const DEFAULT_GUARDRAIL_ALARM_EVALUATION_PERIODS = 1;

/**
 * Intervention alarms on one guardrail. Each threshold set creates one CloudWatch alarm on
 * a Metrics Insights query that aggregates the guardrail's `InvocationsIntervened` metric
 * across every version of the guardrail, `DRAFT` included, so the alarm counts traffic
 * whichever version a caller invokes. Notification target and timing come from the
 * module-level `guardrailAlarms` block.
 *
 * Use cases: detecting a spike in blocked prompts or responses, prompt-attack bursts,
 * policy-violation trend alerting
 *
 * AWS: CloudWatch alarm on a Metrics Insights query over AWS/Bedrock/Guardrails InvocationsIntervened
 *
 * Validation: at least one of countThreshold or ratePercentThreshold; requires the module-level guardrailAlarms block
 */
export interface GuardrailInterventionAlarmProps {
  /**
   * Alarm when the number of guardrail interventions in one alarm period exceeds this
   * value. Counts every evaluation that intervened, on input or output, for inline use
   * (Converse, ConverseStream, InvokeModel with a guardrail) and `ApplyGuardrail` alike.
   * Omit to skip the count alarm.
   *
   * Use cases: catching a burst of blocked content regardless of traffic volume
   *
   * AWS: CloudWatch alarm on SUM(InvocationsIntervened)
   *
   * Validation: Optional; Number; >= 0
   *
   * @minimum 0
   **/
  readonly countThreshold?: number;
  /**
   * Alarm when the percentage of guardrail evaluations that intervened in one alarm
   * period exceeds this value. An inline call is evaluated on its input and, if the input
   * passes, again on its output, so the denominator is evaluations, not calls. Omit to
   * skip the rate alarm.
   *
   * In a period with few evaluations one intervention is a large share: one intervention
   * in a period with a single evaluation is 100%. On a low-traffic guardrail, require
   * several breaching periods with `datapointsToAlarm`, or use `countThreshold` instead.
   *
   * Use cases: intervention-rate alerting that scales with traffic, detecting policy drift
   *
   * AWS: CloudWatch alarm on AVG(InvocationsIntervened), the share of evaluations that
   * intervened, with a threshold of ratePercentThreshold / 100
   *
   * Validation: Optional; Number; percentage, at least 0 and below 100
   *
   * @minimum 0
   * @exclusiveMaximum 100
   **/
  readonly ratePercentThreshold?: number;
}

/**
 * Notification target and evaluation timing shared by every guardrail intervention
 * alarm in the module. Each guardrail opts in with its own `interventionAlarm`
 * thresholds; this block says where their notifications go: an existing SNS topic
 * (`notificationTopicArn`) or a module-created one (`createNotificationTopic: true`),
 * never both.
 *
 * Use cases: routing guardrail intervention alarms to a security team topic,
 * self-contained alerting with a module-created topic
 *
 * AWS: CloudWatch Metrics Insights alarms + SNS notification
 *
 * Validation: requires exactly one notification target and at least one guardrail with interventionAlarm
 */
export type GuardrailAlarmsProps = GuardrailAlarmsExistingTopicProps | GuardrailAlarmsCreatedTopicProps;

/**
 * Guardrail intervention alarms notifying an existing SNS topic.
 *
 * Use cases: routing guardrail intervention alarms to a central security or incident topic
 *
 * AWS: CloudWatch Metrics Insights alarms publishing to an existing SNS topic
 *
 * Validation: notificationTopicArn required; createNotificationTopic and notificationEmails not allowed
 */
export interface GuardrailAlarmsExistingTopicProps extends GuardrailAlarmsCommonProps {
  /**
   * ARN of an existing SNS topic to notify on alarm, e.g. a central security
   * notification topic. Mutually exclusive with `createNotificationTopic`.
   *
   * MDAA cannot verify or modify a topic it did not create: the topic should be
   * encrypted with a customer-managed KMS key, must allow the `cloudwatch.amazonaws.com`
   * service principal to `sns:Publish` (and to use that key), and needs at least one
   * subscriber. MDAA emits a synth-time warning restating this.
   *
   * Use cases: routing alarms to an existing security or incident topic
   *
   * AWS: SNS topic ARN used as the CloudWatch alarm action
   *
   * Validation: Required; String; valid SNS topic ARN; mutually exclusive with createNotificationTopic
   **/
  readonly notificationTopicArn: string;
}

/**
 * Guardrail intervention alarms notifying a module-created SNS topic.
 *
 * Use cases: self-contained alerting without a pre-existing topic
 *
 * AWS: CloudWatch Metrics Insights alarms publishing to an MDAA-created CMK-encrypted SNS topic
 *
 * Validation: createNotificationTopic: true required; notificationTopicArn not allowed; not allowed with kmsKeyArn
 */
export interface GuardrailAlarmsCreatedTopicProps extends GuardrailAlarmsCommonProps {
  /**
   * Set to true to have MDAA create an SNS topic encrypted with the module KMS key, grant
   * CloudWatch alarms in this module publish access, and export its ARN to SSM.
   * Mutually exclusive with `notificationTopicArn`. Not supported with `kmsKeyArn`:
   * MDAA cannot grant CloudWatch use of an imported key, so the topic would never
   * receive a notification.
   *
   * Use cases: self-contained alerting without a pre-existing topic
   *
   * AWS: MDAA-created CMK-encrypted SNS topic
   *
   * Validation: Required; Boolean; must be true; mutually exclusive with notificationTopicArn; not allowed with kmsKeyArn
   **/
  readonly createNotificationTopic: boolean;
  /**
   * Email addresses subscribed to the module-created notification topic. Each address
   * receives an SNS confirmation request and must confirm before delivery begins.
   * Without a subscriber the created topic discards every notification; MDAA warns at
   * synth in that case.
   *
   * Use cases: security team paging, routing alarms to a distribution list
   *
   * AWS: SNS email subscriptions on the created topic
   *
   * Validation: Optional; String[]; valid email addresses
   **/
  readonly notificationEmails?: string[];
}

/**
 * Evaluation timing shared by both notification targets of {@link GuardrailAlarmsProps}.
 */
export interface GuardrailAlarmsCommonProps {
  /**
   * Alarm period in seconds. Each period's interventions are compared to the
   * threshold. Must be a multiple of 60, and periodSeconds x evaluationPeriods must not
   * exceed 10800 (3 hours): CloudWatch evaluates Metrics Insights alarms over the most
   * recent 3 hours only.
   *
   * Use cases: tuning alarm sensitivity vs. noise
   *
   * AWS: CloudWatch alarm period
   *
   * Validation: Optional; Number; multiple of 60; periodSeconds x evaluationPeriods <= 10800
   * @default 300
   * @TJS-type integer
   * @minimum 60
   * @multipleOf 60
   **/
  readonly periodSeconds?: number;
  /**
   * Number of periods over which interventions are compared to the threshold.
   *
   * Use cases: requiring sustained breaches before alarming
   *
   * AWS: CloudWatch alarm evaluation periods
   *
   * Validation: Optional; Number; periodSeconds x evaluationPeriods <= 10800
   * @default 1
   * @TJS-type integer
   * @minimum 1
   **/
  readonly evaluationPeriods?: number;
  /**
   * Number of breaching periods within `evaluationPeriods` required to alarm (an "M of
   * N" alarm).
   *
   * Use cases: reducing false positives on low-traffic guardrails
   *
   * AWS: CloudWatch alarm datapointsToAlarm
   *
   * Validation: Optional; Number; between 1 and evaluationPeriods
   * @default evaluationPeriods
   * @TJS-type integer
   * @minimum 1
   **/
  readonly datapointsToAlarm?: number;
}

/**
 * Resolved notification target and timing passed to each guardrail by the module that
 * owns the `guardrailAlarms` block.
 */
export interface GuardrailAlarmSettings {
  /** ARN of the SNS topic the alarms publish to. */
  readonly alarmTopicArn: string;
  /** Alarm period, in seconds. */
  readonly periodSeconds: number;
  /** Number of evaluation periods. */
  readonly evaluationPeriods: number;
  /** Number of breaching periods required to alarm. @default evaluationPeriods */
  readonly datapointsToAlarm?: number;
  /**
   * Name pattern the notification topic's CloudWatch grants are scoped to, when the module
   * created the topic. Each alarm name is checked against it.
   *
   * @default - no check; the alarms notify an existing topic
   */
  readonly alarmNamePattern?: string;
}

/**
 * Name pattern matching every guardrail alarm created with this naming, for scoping the
 * notification topic's CloudWatch grants.
 *
 * @param naming - The module's resource naming
 */
export function guardrailAlarmNamePattern(naming: IMdaaResourceNaming): string {
  const prefix = naming.withResourceType(MdaaResourceType.CLOUDWATCH_ALARM).resourceName(GUARDRAIL_ALARM_NAME_PREFIX);
  return `${prefix}-*`;
}

/**
 * Builds the Metrics Insights query aggregating a guardrail's interventions across all
 * of its versions. Bedrock publishes the metric per `{GuardrailArn, GuardrailVersion}`
 * and callers choose the version, so the query pins only the ARN.
 *
 * @param aggregation - `SUM` for the intervention count, `AVG` for the share intervened
 * @param guardrailArn - ARN of the guardrail, as published in the `GuardrailArn` dimension
 */
export function guardrailInterventionsQuery(aggregation: 'SUM' | 'AVG', guardrailArn: string): string {
  return (
    `SELECT ${aggregation}(${GUARDRAIL_INTERVENTIONS_METRIC}) ` +
    `FROM SCHEMA("${GUARDRAIL_METRIC_NAMESPACE}", GuardrailArn, GuardrailVersion) ` +
    `WHERE GuardrailArn = '${guardrailArn}'`
  );
}

/**
 * Rejects an intervention alarm with no threshold, or with a threshold that could never
 * be crossed.
 *
 * @param guardrailName - Name of the guardrail, for the error message
 * @param alarm - The guardrail's intervention alarm config
 * @throws Error if no threshold is set or a threshold is out of range
 */
export function validateGuardrailInterventionAlarm(
  guardrailName: string,
  alarm: GuardrailInterventionAlarmProps,
): void {
  const location = `Guardrail '${guardrailName}' interventionAlarm`;
  if (alarm.countThreshold === undefined && alarm.ratePercentThreshold === undefined) {
    throw new Error(`${location} requires at least one threshold: set countThreshold and/or ratePercentThreshold.`);
  }
  if (alarm.countThreshold !== undefined && alarm.countThreshold < 0) {
    throw new Error(`${location}.countThreshold must be >= 0 (got ${alarm.countThreshold}).`);
  }
  const rate = alarm.ratePercentThreshold;
  if (rate !== undefined && (rate < 0 || rate >= 100)) {
    throw new Error(
      `${location}.ratePercentThreshold must be at least 0 and below 100 (got ${rate}). ` +
        'The alarm fires when the rate exceeds the threshold, which a rate of 100% or more never does.',
    );
  }
}

/**
 * Name of a guardrail's intervention alarm, after the naming convention.
 *
 * @param naming - The module's resource naming
 * @param kind - `count` or `rate`
 * @param guardrailName - Name of the guardrail, as keyed in the module config
 */
export function guardrailAlarmName(naming: IMdaaResourceNaming, kind: 'count' | 'rate', guardrailName: string): string {
  return naming
    .withResourceType(MdaaResourceType.CLOUDWATCH_ALARM)
    .resourceName(`${GUARDRAIL_ALARM_NAME_PREFIX}-intervention-${kind}-${guardrailName}`, 255);
}

/** What {@link createGuardrailInterventionAlarms} needs besides the scope. */
export interface CreateGuardrailInterventionAlarmsProps {
  /** The module's resource naming. */
  readonly naming: IMdaaResourceNaming;
  /** Name of the guardrail, as keyed in the module config. */
  readonly guardrailName: string;
  /** ARN of the deployed guardrail. */
  readonly guardrailArn: string;
  /** The guardrail's intervention alarm thresholds. */
  readonly alarm: GuardrailInterventionAlarmProps;
  /** Notification target and timing. */
  readonly settings: GuardrailAlarmSettings;
}

/** One intervention alarm to create, derived from a configured threshold. */
interface InterventionAlarmSpec {
  readonly constructId: string;
  readonly kind: 'count' | 'rate';
  readonly queryId: string;
  readonly aggregation: 'SUM' | 'AVG';
  readonly label: string;
  /** Threshold as CloudWatch compares it: a count, or a share between 0 and 1. */
  readonly threshold: number;
  readonly description: string;
}

/** Expands a guardrail's thresholds into one spec per alarm to create. */
function interventionAlarmSpecs(props: CreateGuardrailInterventionAlarmsProps): InterventionAlarmSpec[] {
  const { countThreshold, ratePercentThreshold } = props.alarm;
  const window = `in ${props.settings.periodSeconds}s, across all guardrail versions`;
  const specs: InterventionAlarmSpec[] = [];
  if (countThreshold !== undefined) {
    specs.push({
      constructId: 'intervention-count-alarm',
      kind: 'count',
      queryId: 'interventions',
      aggregation: 'SUM',
      label: 'Guardrail interventions',
      threshold: countThreshold,
      description: `Guardrail ${props.guardrailName} intervened more than ${countThreshold} times ${window}`,
    });
  }
  if (ratePercentThreshold !== undefined) {
    specs.push({
      constructId: 'intervention-rate-alarm',
      kind: 'rate',
      queryId: 'interventionShare',
      aggregation: 'AVG',
      label: 'Share of guardrail evaluations that intervened',
      // AVG of the 0/1 datapoints is a share, so the percentage is compared as a fraction.
      // Rounded so a value like 33.3 renders as 0.333 rather than a binary approximation.
      threshold: Number.parseFloat((ratePercentThreshold / 100).toFixed(10)),
      description: `Guardrail ${props.guardrailName} intervened on more than ${ratePercentThreshold}% of evaluations ${window}`,
    });
  }
  return specs;
}

/** Creates one intervention alarm on a Metrics Insights query over every guardrail version. */
function createInterventionAlarm(
  scope: Construct,
  props: CreateGuardrailInterventionAlarmsProps,
  spec: InterventionAlarmSpec,
): MdaaAlarm {
  const { settings } = props;
  const alarmName = guardrailAlarmName(props.naming, spec.kind, props.guardrailName);
  if (settings.alarmNamePattern) {
    validateAlarmNameMatchesPattern(alarmName, settings.alarmNamePattern);
  }
  return new MdaaAlarm(scope, spec.constructId, {
    naming: props.naming,
    alarmName,
    alarmDescription: spec.description,
    metrics: [
      {
        id: spec.queryId,
        expression: guardrailInterventionsQuery(spec.aggregation, props.guardrailArn),
        period: settings.periodSeconds,
        label: spec.label,
        returnData: true,
      },
    ],
    threshold: spec.threshold,
    evaluationPeriods: settings.evaluationPeriods,
    datapointsToAlarm: settings.datapointsToAlarm,
    comparisonOperator: 'GreaterThanThreshold',
    treatMissingData: 'notBreaching',
    alarmActions: [settings.alarmTopicArn],
  });
}

/**
 * Creates the intervention alarms configured on one guardrail: a count alarm on
 * `SUM(InvocationsIntervened)` and/or a rate alarm on `AVG(InvocationsIntervened)`, each
 * over every version of the guardrail.
 *
 * A period with no evaluations publishes no datapoint and is treated as not breaching,
 * so an idle guardrail stays in OK.
 *
 * @param scope - Scope the alarms are added to
 * @param props - The guardrail, its thresholds, and the notification settings
 * @returns the created alarms, keyed by `count` and `rate`
 * @throws Error if a threshold or the alarm timing is invalid, or an alarm name falls
 *         outside the notification topic's grant pattern
 */
export function createGuardrailInterventionAlarms(
  scope: Construct,
  props: CreateGuardrailInterventionAlarmsProps,
): { [kind: string]: MdaaAlarm } {
  validateGuardrailInterventionAlarm(props.guardrailName, props.alarm);
  const { settings } = props;
  validateMetricsInsightsAlarmWindow(settings, {
    period: 'alarmSettings.periodSeconds',
    evaluationPeriods: 'alarmSettings.evaluationPeriods',
  });
  validateDatapointsToAlarm(settings, {
    evaluationPeriods: 'alarmSettings.evaluationPeriods',
    datapointsToAlarm: 'alarmSettings.datapointsToAlarm',
  });
  return Object.fromEntries(
    interventionAlarmSpecs(props).map(spec => [spec.kind, createInterventionAlarm(scope, props, spec)]),
  );
}
